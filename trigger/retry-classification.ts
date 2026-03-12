import { schedules } from "@trigger.dev/sdk";
import { PrismaClient } from "@prisma/client";
import { classifyReply } from "@/lib/classification/classify-reply";
import { anthropicQueue } from "./queues";

// PrismaClient at module scope — not inside run()
const prisma = new PrismaClient();

export const retryClassification = schedules.task({
  id: "retry-classification",
  cron: "*/30 * * * *", // every 30 minutes
  queue: anthropicQueue,
  maxDuration: 300, // 5 min — enough for all unclassified replies
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 10_000,
  },

  run: async () => {
    // Fetch ALL unclassified replies — no batch size limit (unlike the Vercel route's take: 50)
    const unclassified = await prisma.reply.findMany({
      where: { classifiedAt: null },
      orderBy: { createdAt: "asc" },
    });

    console.log(
      `[retry-classification] Found ${unclassified.length} unclassified replies`,
    );

    let classified = 0;
    let failed = 0;

    for (const reply of unclassified) {
      try {
        const classification = await classifyReply({
          subject: reply.subject,
          bodyText: reply.bodyText,
          senderName: reply.senderName,
          outboundSubject: reply.outboundSubject,
          outboundBody: reply.outboundBody,
        });

        await prisma.reply.update({
          where: { id: reply.id },
          data: {
            intent: classification.intent,
            sentiment: classification.sentiment,
            objectionSubtype: classification.objectionSubtype,
            classificationSummary: classification.summary,
            classifiedAt: new Date(),
          },
        });

        classified++;
        console.log(
          `[retry-classification] Classified reply ${reply.id}: intent=${classification.intent}, sentiment=${classification.sentiment}`,
        );
      } catch (err) {
        failed++;
        console.error(
          `[retry-classification] Failed to classify reply ${reply.id}:`,
          err,
        );
      }
    }

    console.log(
      `[retry-classification] Done: ${classified} classified, ${failed} failed out of ${unclassified.length} total`,
    );

    return { total: unclassified.length, classified, failed };
  },
});
