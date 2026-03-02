/**
 * One-time ClickUp import script.
 * Imports active clients (with tasks/subtasks) and CRM pipeline prospects
 * from ClickUp into the Outsignal database.
 *
 * Usage: cd /Users/jjay/programs/outsignal-agents && npx tsx scripts/import-clickup.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CLICKUP_TOKEN = "pk_242499395_XBVWSMIQSPRJYZU8W69Y4TOBX9DZI10Y";
const BASE_URL = "https://api.clickup.com/api/v2";

// Melhuish Sprague Clients space
const MS_CLIENTS_SPACE = "90158461071";

// CRM pipeline lists
const OUTSIGNAL_PIPELINE_LIST = "901516657100";
const MS_PIPELINE_LIST = "901518150041";

const WORKSPACE_MAP: Record<string, string | null> = {
  Rise: "rise",
  "Lime Recruitment": "lime-recruitment",
  YoopKnows: "yoopknows",
  Outsignal: "outsignal",
  MyAcq: "myacq",
  "1210 Solutions": "1210-solutions",
  Covenco: null,
  "REO Digital": null,
  BlankTag: null,
  "Freedom Consultants": null,
};

// Map list names to our stage values
const STAGE_MAP: Record<string, string> = {
  Onboarding: "onboarding",
  "Campaign Setup": "campaign_setup",
  "Campaign Launch": "campaign_launch",
  "Customer Success": "customer_success",
};

// Map ClickUp pipeline statuses to our pipeline statuses
const PIPELINE_STATUS_MAP: Record<string, string> = {
  "new lead": "new_lead",
  contacted: "contacted",
  "qualified prospect": "qualified",
  demo: "demo",
  proposal: "proposal",
  negotiation: "negotiation",
  "closed [won]": "closed_won",
  "closed [lost]": "closed_lost",
  "unqualified prospect": "unqualified",
};

// ---------------------------------------------------------------------------
// ClickUp API helpers
// ---------------------------------------------------------------------------

async function clickupGet<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: CLICKUP_TOKEN },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ClickUp API error ${res.status} for ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// ClickUp types (minimal)
// ---------------------------------------------------------------------------

interface ClickUpFolder {
  id: string;
  name: string;
  lists: ClickUpList[];
}

interface ClickUpList {
  id: string;
  name: string;
}

interface ClickUpTask {
  id: string;
  name: string;
  status: { status: string };
  parent: string | null;
  orderindex: string;
  due_date: string | null;
}

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

function mapTaskStatus(clickupStatus: string): string {
  const s = clickupStatus.toLowerCase();
  if (s === "complete" || s === "closed" || s === "done") return "complete";
  if (s === "in progress" || s === "in review" || s === "active")
    return "in_progress";
  return "todo";
}

function mapPipelineStatus(clickupStatus: string): string {
  const s = clickupStatus.toLowerCase();
  return PIPELINE_STATUS_MAP[s] ?? "new_lead";
}

function cleanClientName(name: string): string {
  // Strip prefixes like "[LAUNCH] "
  return name.replace(/^\[.*?\]\s*/, "").trim();
}

// ---------------------------------------------------------------------------
// Step 1: Import active clients from Melhuish Sprague Clients space
// ---------------------------------------------------------------------------

async function importActiveClients(): Promise<{
  clientCount: number;
  taskCount: number;
  subtaskCount: number;
}> {
  console.log("\n========================================");
  console.log("STEP 1: Import Active Clients");
  console.log("========================================\n");

  let clientCount = 0;
  let taskCount = 0;
  let subtaskCount = 0;

  // Fetch all folders in the Clients space
  console.log(`Fetching folders from space ${MS_CLIENTS_SPACE}...`);
  const foldersRes = await clickupGet<{ folders: ClickUpFolder[] }>(
    `/space/${MS_CLIENTS_SPACE}/folder`
  );
  const folders = foldersRes.folders;
  console.log(`Found ${folders.length} folders (clients)\n`);

  for (const folder of folders) {
    const clientName = cleanClientName(folder.name);
    const workspaceSlug = WORKSPACE_MAP[clientName] ?? null;

    console.log(`--- ${clientName} ---`);
    console.log(`  Workspace slug: ${workspaceSlug ?? "(none)"}`);

    // Check if client already exists
    const existing = await prisma.client.findFirst({
      where: { name: clientName },
    });
    if (existing) {
      console.log(`  Client already exists (id: ${existing.id}), skipping.`);
      continue;
    }

    // Create client record
    const client = await prisma.client.create({
      data: {
        name: clientName,
        pipelineStatus: "closed_won",
        campaignType: "email_linkedin",
        workspaceSlug,
        startedAt: new Date(),
      },
    });
    clientCount++;
    console.log(`  Created client (id: ${client.id})`);

    // Process each list in the folder
    for (const list of folder.lists) {
      const stage = STAGE_MAP[list.name];
      if (!stage) {
        console.log(`  Skipping unknown list: "${list.name}"`);
        continue;
      }

      console.log(`  List: ${list.name} -> stage: ${stage}`);

      // Fetch tasks with subtasks
      await sleep(200); // Rate limiting
      const tasksRes = await clickupGet<{ tasks: ClickUpTask[] }>(
        `/list/${list.id}/task?include_closed=true&subtasks=true`
      );
      const tasks = tasksRes.tasks;

      // Separate parent tasks and subtasks
      const parentTasks = tasks.filter((t) => !t.parent);
      const subtasks = tasks.filter((t) => t.parent);

      console.log(
        `    ${parentTasks.length} tasks, ${subtasks.length} subtasks`
      );

      for (const task of parentTasks) {
        const dueDate = task.due_date
          ? new Date(parseInt(task.due_date, 10))
          : null;

        const clientTask = await prisma.clientTask.create({
          data: {
            clientId: client.id,
            stage,
            title: task.name,
            status: mapTaskStatus(task.status.status),
            order: parseInt(task.orderindex, 10) || 0,
            dueDate,
          },
        });
        taskCount++;

        // Find subtasks belonging to this parent task
        const childSubtasks = subtasks.filter((s) => s.parent === task.id);
        for (const sub of childSubtasks) {
          await prisma.clientSubtask.create({
            data: {
              taskId: clientTask.id,
              title: sub.name,
              status: mapTaskStatus(sub.status.status),
              order: parseInt(sub.orderindex, 10) || 0,
            },
          });
          subtaskCount++;
        }
      }
    }

    console.log(`  Done.\n`);
  }

  return { clientCount, taskCount, subtaskCount };
}

// ---------------------------------------------------------------------------
// Step 2: Import CRM pipeline prospects
// ---------------------------------------------------------------------------

async function importPipelineProspects(): Promise<number> {
  console.log("\n========================================");
  console.log("STEP 2: Import CRM Pipeline Prospects");
  console.log("========================================\n");

  let prospectCount = 0;

  const pipelineLists = [
    { id: OUTSIGNAL_PIPELINE_LIST, label: "Outsignal Pipeline" },
    { id: MS_PIPELINE_LIST, label: "Melhuish Sprague Pipeline" },
  ];

  for (const pipeline of pipelineLists) {
    console.log(`Fetching ${pipeline.label} (list ${pipeline.id})...`);
    await sleep(200); // Rate limiting

    const tasksRes = await clickupGet<{ tasks: ClickUpTask[] }>(
      `/list/${pipeline.id}/task?include_closed=true`
    );
    const tasks = tasksRes.tasks;
    console.log(`  Found ${tasks.length} tasks\n`);

    for (const task of tasks) {
      const name = cleanClientName(task.name);

      // Check if client already exists (from step 1 or previous import)
      const existing = await prisma.client.findFirst({
        where: { name },
      });
      if (existing) {
        console.log(`  "${name}" already exists, skipping.`);
        continue;
      }

      const pipelineStatus = mapPipelineStatus(task.status.status);
      const workspaceSlug = WORKSPACE_MAP[name] ?? null;

      const client = await prisma.client.create({
        data: {
          name,
          pipelineStatus,
          campaignType: "email_linkedin",
          workspaceSlug,
        },
      });
      prospectCount++;
      console.log(
        `  Created "${name}" (status: ${pipelineStatus}, id: ${client.id})`
      );
    }

    console.log();
  }

  return prospectCount;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("ClickUp Import Script");
  console.log("=====================\n");

  try {
    // Step 1: Active clients
    const { clientCount, taskCount, subtaskCount } =
      await importActiveClients();

    // Step 2: CRM pipeline
    const prospectCount = await importPipelineProspects();

    // Step 3: Summary
    console.log("\n========================================");
    console.log("SUMMARY");
    console.log("========================================");
    console.log(`  Clients imported:          ${clientCount}`);
    console.log(`  Pipeline prospects imported: ${prospectCount}`);
    console.log(`  Tasks imported:            ${taskCount}`);
    console.log(`  Subtasks imported:         ${subtaskCount}`);
    console.log("========================================\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
