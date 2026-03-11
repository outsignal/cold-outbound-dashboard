import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/require-admin-auth";
import { prisma } from "@/lib/db";
import { EmailBisonClient } from "@/lib/emailbison/client";
import { getTestAddress, fetchTestResults, pollForResults, classifyScore, getApiKey } from "@/lib/placement/mailtester";
import { sendTestEmail } from "@/lib/placement/send-test";
import { notifyPlacementResult } from "@/lib/placement/notifications";
import { isRecommendedForTesting } from "@/lib/placement/recommended";

export const maxDuration = 60;

const LOG_PREFIX = "[api/placement-tests]";

// ---------------------------------------------------------------------------
// POST /api/placement-tests
// Trigger a new inbox placement test for a given sender email + workspace.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const session = await requireAdminAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).senderEmail !== "string" ||
    typeof (body as Record<string, unknown>).workspaceSlug !== "string"
  ) {
    return NextResponse.json(
      { error: "senderEmail and workspaceSlug are required" },
      { status: 400 }
    );
  }

  const { senderEmail, workspaceSlug } = body as {
    senderEmail: string;
    workspaceSlug: string;
  };

  // Check MAILTESTER_API_KEY is configured
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Placement testing not configured — MAILTESTER_API_KEY not set",
      },
      { status: 503 }
    );
  }

  try {
    // 1. Get workspace and its EmailBison token
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      select: { apiToken: true },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: `Workspace not found: ${workspaceSlug}` },
        { status: 404 }
      );
    }

    if (!workspace.apiToken) {
      return NextResponse.json(
        {
          error: `Workspace ${workspaceSlug} has no EmailBison token configured`,
        },
        { status: 422 }
      );
    }

    // 2. Look up sender_email_id from EmailBison
    const ebClient = new EmailBisonClient(workspace.apiToken);
    let senderEmailId: number | null = null;

    try {
      const senderEmails = await ebClient.getSenderEmails();
      const match = senderEmails.find(
        (s) => s.email.toLowerCase() === senderEmail.toLowerCase()
      );
      if (match) {
        senderEmailId = match.id;
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Failed to fetch sender emails from EmailBison:`, err);
      return NextResponse.json(
        { error: "Failed to fetch sender emails from EmailBison" },
        { status: 502 }
      );
    }

    if (senderEmailId === null) {
      return NextResponse.json(
        {
          error: `Sender email ${senderEmail} not found in workspace ${workspaceSlug}`,
        },
        { status: 404 }
      );
    }

    // 3. Get test address from mail-tester.com
    let testAddress: string;
    let testId: string;

    try {
      ({ testAddress, testId } = await getTestAddress(apiKey));
    } catch (err) {
      console.error(`${LOG_PREFIX} Failed to get test address from mail-tester.com:`, err);
      return NextResponse.json(
        { error: "Failed to get test address from mail-tester.com" },
        { status: 502 }
      );
    }

    // 4. Derive sender domain from email
    const senderDomain = senderEmail.split("@")[1] ?? senderEmail;

    // 5. Create PlacementTest record (status: pending)
    const placementTest = await prisma.placementTest.create({
      data: {
        senderEmail,
        senderDomain,
        workspaceSlug,
        testAddress,
        status: "pending",
      },
    });

    console.log(
      `${LOG_PREFIX} Created PlacementTest ${placementTest.id} for ${senderEmail} (testId=${testId})`
    );

    // 6. Send the test email via EmailBison dedi
    const sendResult = await sendTestEmail({
      senderEmailId,
      toAddress: testAddress,
      workspaceToken: workspace.apiToken,
    });

    if (!sendResult.success) {
      await prisma.placementTest.update({
        where: { id: placementTest.id },
        data: {
          status: "failed",
          errorMessage: sendResult.error ?? "Unknown send error",
        },
      });

      return NextResponse.json(
        {
          error: "Failed to send test email via EmailBison",
          details: sendResult.error,
        },
        { status: 500 }
      );
    }

    // 7. Poll mail-tester.com for results (up to 60s)
    console.log(`${LOG_PREFIX} Polling mail-tester.com for results (testId=${testId})`);
    const results = await pollForResults(testId, apiKey);

    if (!results) {
      // Results not ready — return 202 so caller can re-fetch via GET
      console.log(
        `${LOG_PREFIX} Results still pending after polling — returning 202 (testId=${testId})`
      );
      return NextResponse.json(
        {
          status: "pending",
          testId,
          placementTestId: placementTest.id,
          message:
            "Test email sent. Results not yet ready — re-fetch via GET /api/placement-tests?senderEmail=...&refetch=true",
        },
        { status: 202 }
      );
    }

    // 8. Results ready — update PlacementTest record
    const classification = classifyScore(results.score);
    const now = new Date();

    const updatedTest = await prisma.placementTest.update({
      where: { id: placementTest.id },
      data: {
        score: results.score,
        details: results.details as object,
        status: "completed",
        completedAt: now,
      },
    });

    console.log(
      `${LOG_PREFIX} PlacementTest ${placementTest.id} completed: score=${results.score} (${classification})`
    );

    // 9. Upsert EmailSenderHealth if warning or critical
    if (classification !== "good") {
      const healthStatus = classification === "critical" ? "critical" : "warning";

      await prisma.emailSenderHealth.upsert({
        where: { senderEmail },
        create: {
          senderEmail,
          senderDomain,
          workspaceSlug,
          emailHealthStatus: healthStatus,
          lastTestScore: results.score,
          lastTestAt: now,
          statusReason: `Placement score ${results.score.toFixed(1)}`,
        },
        update: {
          emailHealthStatus: healthStatus,
          lastTestScore: results.score,
          lastTestAt: now,
          statusReason: `Placement score ${results.score.toFixed(1)}`,
        },
      });

      console.log(
        `${LOG_PREFIX} Upserted EmailSenderHealth for ${senderEmail}: status=${healthStatus}`
      );

      // 10. Send admin notification
      await notifyPlacementResult({
        senderEmail,
        score: results.score,
        classification,
        workspaceSlug,
        testId,
      });
    }

    return NextResponse.json(updatedTest);
  } catch (err) {
    console.error(`${LOG_PREFIX} Unhandled error in POST:`, err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/placement-tests?senderEmail=...&limit=10&refetch=true
// Return test history for a sender. Optionally re-fetch pending results.
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const session = await requireAdminAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const senderEmail = params.get("senderEmail");
  const limitParam = params.get("limit");
  const refetch = params.get("refetch") === "true";

  if (!senderEmail) {
    return NextResponse.json(
      { error: "senderEmail query parameter is required" },
      { status: 400 }
    );
  }

  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 10, 100) : 10;

  try {
    const apiKey = getApiKey();

    // Re-fetch pending tests if requested and API key is available
    if (refetch && apiKey) {
      const pendingTests = await prisma.placementTest.findMany({
        where: { senderEmail, status: "pending" },
        orderBy: { createdAt: "desc" },
      });

      for (const pending of pendingTests) {
        // Extract testId from testAddress (format: test-xxx@srv1.mail-tester.com)
        const testIdFromAddress = pending.testAddress.split("@")[0] ?? "";

        if (!testIdFromAddress) {
          console.warn(
            `${LOG_PREFIX} Could not extract testId from testAddress ${pending.testAddress}`
          );
          continue;
        }

        try {
          const results = await fetchTestResults(testIdFromAddress, apiKey);

          if (results) {
            const classification = classifyScore(results.score);
            const now = new Date();

            await prisma.placementTest.update({
              where: { id: pending.id },
              data: {
                score: results.score,
                details: results.details as object,
                status: "completed",
                completedAt: now,
              },
            });

            if (classification !== "good") {
              const healthStatus =
                classification === "critical" ? "critical" : "warning";
              const senderDomain =
                pending.senderDomain || senderEmail.split("@")[1] || senderEmail;

              await prisma.emailSenderHealth.upsert({
                where: { senderEmail },
                create: {
                  senderEmail,
                  senderDomain,
                  workspaceSlug: pending.workspaceSlug,
                  emailHealthStatus: healthStatus,
                  lastTestScore: results.score,
                  lastTestAt: now,
                  statusReason: `Placement score ${results.score.toFixed(1)}`,
                },
                update: {
                  emailHealthStatus: healthStatus,
                  lastTestScore: results.score,
                  lastTestAt: now,
                  statusReason: `Placement score ${results.score.toFixed(1)}`,
                },
              });

              await notifyPlacementResult({
                senderEmail,
                score: results.score,
                classification,
                workspaceSlug: pending.workspaceSlug,
                testId: testIdFromAddress,
              });
            }

            console.log(
              `${LOG_PREFIX} Re-fetched pending test ${pending.id}: score=${results.score} (${classification})`
            );
          }
        } catch (err) {
          console.error(
            `${LOG_PREFIX} Failed to re-fetch results for pending test ${pending.id}:`,
            err
          );
          // Continue to next pending test
        }
      }
    }

    // Fetch final test history
    const tests = await prisma.placementTest.findMany({
      where: { senderEmail },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Check if sender is recommended for testing
    const recommended = await isRecommendedForTesting(senderEmail);

    return NextResponse.json({ tests, recommended });
  } catch (err) {
    console.error(`${LOG_PREFIX} Unhandled error in GET:`, err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
