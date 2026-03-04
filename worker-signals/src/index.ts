// worker-signals entry point
// Called by Railway cron every 6 hours (see railway.toml: cronSchedule = "0 */6 * * *")
// Runs the full signal poll cycle then disconnects Prisma and exits cleanly.

import { runCycle } from "./cycle.js";
import { prisma } from "./db.js";

async function main() {
  console.log(`[SignalWorker] Starting cycle at ${new Date().toISOString()}`);
  try {
    await runCycle();
    console.log(`[SignalWorker] Cycle complete at ${new Date().toISOString()}`);
  } catch (error) {
    console.error("[SignalWorker] Fatal error:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    process.exit(process.exitCode ?? 0);
  }
}

main();
