import { NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/cron-auth";
import { getAllWorkspaces, getWorkspaceBySlug } from "@/lib/workspaces";
import { EmailBisonClient } from "@/lib/emailbison/client";
import type { Reply } from "@/lib/emailbison/types";
import { prisma } from "@/lib/db";
import { notifyReply } from "@/lib/notifications";
import { bumpPriority, enqueueAction } from "@/lib/linkedin/queue";
import { assignSenderForPerson } from "@/lib/linkedin/sender";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const workspaces = await getAllWorkspaces();
  const activeWs = workspaces.filter((w) => w.hasApiToken);

  // Fetch replies from all workspaces concurrently (1 page each for speed)
  const wsReplies = await Promise.all(
    activeWs.map(async (ws) => {
      try {
        const config = await getWorkspaceBySlug(ws.slug);
        if (!config) return { ws, replies: [] as Reply[] };
        const client = new EmailBisonClient(config.apiToken);
        const replies = await client.getRecentReplies(1);
        return { ws, replies };
      } catch (err) {
        console.error(`[poll-replies] Failed to fetch replies for ${ws.slug}:`, err);
        return { ws, replies: [] as Reply[], fetchError: true };
      }
    }),
  );

  const results: { workspace: string; processed: number; skipped: number; errors: number }[] = [];

  for (const { ws, replies, fetchError } of wsReplies) {
    const wsResult = { workspace: ws.slug, processed: 0, skipped: 0, errors: fetchError ? 1 : 0 };
    results.push(wsResult);

    const recent = replies.filter((r) => new Date(r.date_received) >= cutoff);

    for (const reply of recent) {
      try {
        // Filter out automated / non-real replies
        const fromEmail = reply.from_email_address.toLowerCase();
        const subj = (reply.subject ?? "").toLowerCase();
        const isNonReal =
          reply.automated_reply ||
          fromEmail.includes("mailer-daemon") ||
          fromEmail.includes("postmaster") ||
          fromEmail.includes("noreply") ||
          fromEmail.includes("no-reply") ||
          fromEmail.includes("@microsoft.com") ||
          (fromEmail.includes("@google.com") && (fromEmail.includes("noreply") || fromEmail.includes("no-reply"))) ||
          subj.includes("delivery status notification") ||
          /out of office|automatic reply|auto-reply|autoreply/i.test(reply.subject ?? "") ||
          subj.includes("connection test") ||
          subj.includes("test email") ||
          subj.includes("weekly digest") ||
          subj.includes("service update") ||
          subj.includes("retention settings");

        if (isNonReal) {
          wsResult.skipped++;
          continue;
        }

        // Dedup: check if we already processed this reply via webhook or a previous poll
        const replyDate = new Date(reply.date_received);
        const windowStart = new Date(replyDate.getTime() - 5 * 60 * 1000);
        const windowEnd = new Date(replyDate.getTime() + 5 * 60 * 1000);

        const existing = await prisma.webhookEvent.findFirst({
          where: {
            leadEmail: reply.from_email_address,
            eventType: {
              in: ["LEAD_REPLIED", "LEAD_INTERESTED", "UNTRACKED_REPLY_RECEIVED", "POLLED_REPLY"],
            },
            receivedAt: { gte: windowStart, lte: windowEnd },
          },
        });

        if (existing) {
          wsResult.skipped++;
          continue;
        }

        // -- Process new reply --

        // 1. Record webhook event
        await prisma.webhookEvent.create({
          data: {
            workspace: ws.slug,
            eventType: "POLLED_REPLY",
            campaignId: reply.campaign_id?.toString() ?? null,
            leadEmail: reply.from_email_address,
            senderEmail: reply.primary_to_email_address,
            payload: JSON.stringify({ source: "poll", reply }),
            isAutomated: false,
          },
        });

        // 2. Update person + workspace status
        const newStatus = reply.interested ? "interested" : "replied";
        await prisma.$transaction(async (tx) => {
          await tx.person.updateMany({
            where: { email: reply.from_email_address },
            data: { status: newStatus },
          });
          await tx.personWorkspace.updateMany({
            where: {
              workspace: ws.slug,
              person: { email: reply.from_email_address },
            },
            data: { status: newStatus },
          });
        });

        // 3. Send notification
        await notifyReply({
          workspaceSlug: ws.slug,
          leadName: reply.from_name,
          leadEmail: reply.from_email_address,
          senderEmail: reply.primary_to_email_address,
          subject: reply.subject,
          bodyPreview: reply.text_body,
          interested: reply.interested,
          suggestedResponse: null,
        });

        // 4. LinkedIn fast-track for replied/interested
        try {
          const person = await prisma.person.findUnique({
            where: { email: reply.from_email_address },
          });

          if (person?.linkedinUrl) {
            const bumped = await bumpPriority(person.id, ws.slug);

            if (!bumped) {
              const existingConn = await prisma.linkedInConnection.findFirst({
                where: { personId: person.id, sender: { workspaceSlug: ws.slug } },
              });

              if (!existingConn || existingConn.status === "none") {
                const sender = await assignSenderForPerson(ws.slug, {
                  emailSenderAddress: reply.primary_to_email_address,
                  mode: "email_linkedin",
                });

                if (sender) {
                  await enqueueAction({
                    senderId: sender.id,
                    personId: person.id,
                    workspaceSlug: ws.slug,
                    actionType: "connect",
                    priority: 1,
                    scheduledFor: new Date(),
                    campaignName: undefined,
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error("[poll-replies] LinkedIn fast-track error:", err);
        }

        wsResult.processed++;
      } catch (err) {
        console.error("[poll-replies] Error processing reply:", err);
        wsResult.errors++;
      }
    }
  }

  const totalProcessed = results.reduce((sum, r) => sum + r.processed, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

  console.log(
    `[poll-replies] Done: ${totalProcessed} processed, ${totalSkipped} skipped, ${totalErrors} errors across ${results.length} workspaces`,
  );

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    results,
  });
}
