import { task } from "@trigger.dev/sdk";
import { PrismaClient } from "@prisma/client";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { WebClient } from "@slack/web-api";
import { Resend } from "resend";

const prisma = new PrismaClient();

type ServiceResult = {
  ok: boolean;
  ms: number;
  detail?: string;
  error?: string;
};

export const smokeTest = task({
  id: "smoke-test",
  // No queue — diagnostic tool, not a production workload
  // No schedule — on-demand only
  run: async (_payload: Record<string, never>) => {
    const results: Record<string, ServiceResult> = {};

    // 1. Prisma / Neon — proves DB connectivity and correct binary target
    {
      const t0 = Date.now();
      try {
        const person = await prisma.person.findFirst();
        results.prisma = {
          ok: person !== null,
          ms: Date.now() - t0,
          detail: person ? person.email.substring(0, 3) + "***" : "no records found",
        };
      } catch (err) {
        results.prisma = {
          ok: false,
          ms: Date.now() - t0,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    // 2. Anthropic — proves env var presence and API access
    {
      const t0 = Date.now();
      try {
        const response = await generateText({
          model: anthropic("claude-haiku-4-5"),
          prompt: "Reply with exactly: OK",
        });
        results.anthropic = {
          ok: response.text.includes("OK"),
          ms: Date.now() - t0,
          detail: response.text.substring(0, 50),
        };
      } catch (err) {
        results.anthropic = {
          ok: false,
          ms: Date.now() - t0,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    // 3. Slack — proves SLACK_BOT_TOKEN is present and valid
    {
      const t0 = Date.now();
      try {
        const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
        const response = await slack.auth.test();
        results.slack = {
          ok: response.ok === true,
          ms: Date.now() - t0,
          detail: String(response.user_id ?? ""),
        };
      } catch (err) {
        results.slack = {
          ok: false,
          ms: Date.now() - t0,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    // 4. EmailBison — proves EMAILBISON_API_KEY is present and valid
    {
      const t0 = Date.now();
      try {
        const res = await fetch("https://app.outsignal.ai/api/workspaces", {
          headers: {
            Authorization: "Bearer " + process.env.EMAILBISON_API_KEY,
          },
        });
        results.emailbison = {
          ok: res.status === 200,
          ms: Date.now() - t0,
          detail: String(res.status),
        };
      } catch (err) {
        results.emailbison = {
          ok: false,
          ms: Date.now() - t0,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    // 5. Resend — proves RESEND_API_KEY is present and valid
    {
      const t0 = Date.now();
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { data, error } = await resend.apiKeys.list();
        if (error) throw new Error(error.message);
        results.resend = {
          ok: true,
          ms: Date.now() - t0,
          detail: `${data?.data?.length ?? 0} keys`,
        };
      } catch (err) {
        results.resend = {
          ok: false,
          ms: Date.now() - t0,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    const allPassed = Object.values(results).every((r) => r.ok);
    const summary = {
      allPassed,
      services: Object.keys(results).length,
      passed: Object.values(results).filter((r) => r.ok).length,
    };

    return { summary, results };
  },
});
