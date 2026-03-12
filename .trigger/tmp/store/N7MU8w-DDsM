import {
  classifyReply
} from "../../../chunk-UHMZHQCT.mjs";
import "../../../chunk-TEXX5UGW.mjs";
import "../../../chunk-W7HBEXJ4.mjs";
import {
  anthropicQueue
} from "../../../chunk-V5FCZ2QB.mjs";
import {
  require_default
} from "../../../chunk-6DNKPBNV.mjs";
import {
  schedules_exports
} from "../../../chunk-ZD6M6VDX.mjs";
import "../../../chunk-4GNBCTMK.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "../../../chunk-QA7U3GQ6.mjs";

// trigger/retry-classification.ts
init_esm();
var import_client = __toESM(require_default());
var prisma = new import_client.PrismaClient();
var retryClassification = schedules_exports.task({
  id: "retry-classification",
  cron: "*/30 * * * *",
  // every 30 minutes
  queue: anthropicQueue,
  maxDuration: 300,
  // 5 min — enough for all unclassified replies
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 1e3,
    maxTimeoutInMs: 1e4
  },
  run: /* @__PURE__ */ __name(async () => {
    const unclassified = await prisma.reply.findMany({
      where: { classifiedAt: null },
      orderBy: { createdAt: "asc" }
    });
    console.log(
      `[retry-classification] Found ${unclassified.length} unclassified replies`
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
          outboundBody: reply.outboundBody
        });
        await prisma.reply.update({
          where: { id: reply.id },
          data: {
            intent: classification.intent,
            sentiment: classification.sentiment,
            objectionSubtype: classification.objectionSubtype,
            classificationSummary: classification.summary,
            classifiedAt: /* @__PURE__ */ new Date()
          }
        });
        classified++;
        console.log(
          `[retry-classification] Classified reply ${reply.id}: intent=${classification.intent}, sentiment=${classification.sentiment}`
        );
      } catch (err) {
        failed++;
        console.error(
          `[retry-classification] Failed to classify reply ${reply.id}:`,
          err
        );
      }
    }
    console.log(
      `[retry-classification] Done: ${classified} classified, ${failed} failed out of ${unclassified.length} total`
    );
    return { total: unclassified.length, classified, failed };
  }, "run")
});
export {
  retryClassification
};
//# sourceMappingURL=retry-classification.mjs.map
