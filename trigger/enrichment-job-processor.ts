import { schedules } from "@trigger.dev/sdk";
import { PrismaClient } from "@prisma/client";
import { processNextChunk } from "@/lib/enrichment/queue";
import { enrichEmail, enrichCompany, createCircuitBreaker } from "@/lib/enrichment/waterfall";

// PrismaClient at module scope — not inside run()
const prisma = new PrismaClient();

export const enrichmentJobProcessorTask = schedules.task({
  id: "enrichment-job-processor",
  cron: "0 6 * * *", // daily at 6am UTC — matches previous vercel.json schedule
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 60_000,
  },

  run: async () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [enrichment-job-processor] Starting enrichment processing`);

    // Fresh circuit breaker per invocation — resets between batch runs
    const breaker = createCircuitBreaker();

    const enrichFn = async (entityId: string, job: { entityType: string; provider: string; workspaceSlug?: string | null }) => {
      if (job.entityType === "person") {
        const person = await prisma.person.findUniqueOrThrow({ where: { id: entityId } });
        await enrichEmail(
          entityId,
          {
            linkedinUrl: person.linkedinUrl ?? undefined,
            firstName: person.firstName ?? undefined,
            lastName: person.lastName ?? undefined,
            companyName: person.company ?? undefined,
            companyDomain: person.companyDomain ?? undefined,
          },
          breaker,
          job.workspaceSlug ?? undefined,
        );
      } else if (job.entityType === "company") {
        // entityId is the company DB id — look up domain for enrichCompany
        const company = await prisma.company.findUniqueOrThrow({ where: { id: entityId } });
        await enrichCompany(company.domain, breaker, job.workspaceSlug ?? undefined);
      }
    };

    // Loop until all pending chunks are processed — natural improvement over Vercel cron
    // (which processed only one chunk per daily invocation; now we process ALL pending chunks in one run)
    const results = [];
    let chunk = await processNextChunk(enrichFn);
    while (chunk) {
      results.push(chunk);
      if (chunk.done) break;
      chunk = await processNextChunk(enrichFn);
    }

    if (results.length === 0) {
      console.log(`[${timestamp}] [enrichment-job-processor] No pending jobs`);
      return { message: "no pending jobs" };
    }

    console.log(`[${timestamp}] [enrichment-job-processor] Complete: ${results.length} chunk(s) processed`);

    return { chunksProcessed: results.length, results };
  },
});
