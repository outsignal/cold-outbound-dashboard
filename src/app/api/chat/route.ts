import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  orchestratorTools,
  orchestratorConfig,
} from "@/lib/agents/orchestrator";
import { requireAdminAuth } from "@/lib/require-admin-auth";
import { prisma } from "@/lib/db";

export const maxDuration = 300; // 5 minutes — Leads Agent scoring can take 60-300s for large lists

interface ChatContext {
  pathname?: string;
  workspaceSlug?: string;
}

async function buildSystemPrompt(context: ChatContext): Promise<string> {
  const lines = [orchestratorConfig.systemPrompt];

  if (context.pathname) {
    lines.push("", `Current page: ${context.pathname}`);
  }
  if (context.workspaceSlug) {
    lines.push(`Current workspace: ${context.workspaceSlug}`);
  }

  // Inject persistent agent memory
  try {
    const now = new Date();
    const memories = await prisma.agentMemory.findMany({
      where: { active: true },
    });

    const dueReminders = memories.filter(
      (m) => m.type === "reminder" && m.dueAt && m.dueAt <= now
    );
    const notes = memories.filter((m) => m.type === "note");
    const preferences = memories.filter((m) => m.type === "preference");

    if (dueReminders.length > 0 || notes.length > 0 || preferences.length > 0) {
      lines.push("");
      lines.push("## Agent Memory");
      lines.push(
        "The following items are stored in your persistent memory. Proactively surface any due reminders to the user."
      );

      if (dueReminders.length > 0) {
        lines.push("");
        lines.push("### Due Reminders");
        for (const r of dueReminders) {
          const dueStr = r.dueAt!.toISOString().split("T")[0];
          const recurStr = r.recurring ? ` (recurring: ${r.recurring})` : "";
          lines.push(`- [${r.key}]: ${r.content} (due: ${dueStr})${recurStr}`);
        }
      }

      if (notes.length > 0) {
        lines.push("");
        lines.push("### Notes");
        for (const n of notes) {
          lines.push(`- [${n.key}]: ${n.content}`);
        }
      }

      if (preferences.length > 0) {
        lines.push("");
        lines.push("### Preferences");
        for (const p of preferences) {
          lines.push(`- [${p.key}]: ${p.content}`);
        }
      }
    }
  } catch {
    // Silently skip if AgentMemory table doesn't exist yet
  }

  return lines.join("\n");
}

const MAX_MESSAGES = 40; // ~20 back-and-forth turns

function trimMessages<T extends { role: string }>(msgs: T[]): T[] {
  if (msgs.length <= MAX_MESSAGES) return msgs;
  // Always keep system messages + last MAX_MESSAGES non-system messages
  const system = msgs.filter(m => m.role === 'system');
  const rest = msgs.filter(m => m.role !== 'system');
  return [...system, ...rest.slice(-MAX_MESSAGES)];
}

export async function POST(request: Request) {
  const session = await requireAdminAuth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, context } = await request.json();

  const modelMessages = await convertToModelMessages(messages, {
    tools: orchestratorTools,
  });

  const result = streamText({
    model: anthropic(orchestratorConfig.model),
    system: await buildSystemPrompt(context ?? {}),
    messages: trimMessages(modelMessages),
    tools: orchestratorTools,
    stopWhen: stepCountIs(12),
  });

  return result.toUIMessageStreamResponse();
}
