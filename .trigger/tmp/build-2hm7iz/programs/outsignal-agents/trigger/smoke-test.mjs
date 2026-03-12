import {
  anthropic,
  generateText
} from "../../../chunk-I345TI6W.mjs";
import "../../../chunk-W7HBEXJ4.mjs";
import {
  Resend
} from "../../../chunk-OCSVRKXM.mjs";
import {
  require_dist
} from "../../../chunk-ABIDEUR4.mjs";
import "../../../chunk-HBS74KVJ.mjs";
import {
  require_default
} from "../../../chunk-6DNKPBNV.mjs";
import {
  task
} from "../../../chunk-ZD6M6VDX.mjs";
import "../../../chunk-4GNBCTMK.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "../../../chunk-QA7U3GQ6.mjs";

// trigger/smoke-test.ts
init_esm();
var import_client = __toESM(require_default());
var import_web_api = __toESM(require_dist());
var prisma = new import_client.PrismaClient();
var smokeTest = task({
  id: "smoke-test",
  // No queue — diagnostic tool, not a production workload
  // No schedule — on-demand only
  run: /* @__PURE__ */ __name(async (_payload) => {
    const results = {};
    {
      const t0 = Date.now();
      try {
        const person = await prisma.person.findFirst();
        results.prisma = {
          ok: person !== null,
          ms: Date.now() - t0,
          detail: person ? person.email.substring(0, 3) + "***" : "no records found"
        };
      } catch (err) {
        results.prisma = {
          ok: false,
          ms: Date.now() - t0,
          error: err instanceof Error ? err.message : String(err)
        };
      }
    }
    {
      const t0 = Date.now();
      try {
        const response = await generateText({
          model: anthropic("claude-haiku-4-5"),
          prompt: "Reply with exactly: OK"
        });
        results.anthropic = {
          ok: response.text.includes("OK"),
          ms: Date.now() - t0,
          detail: response.text.substring(0, 50)
        };
      } catch (err) {
        results.anthropic = {
          ok: false,
          ms: Date.now() - t0,
          error: err instanceof Error ? err.message : String(err)
        };
      }
    }
    {
      const t0 = Date.now();
      try {
        const slack = new import_web_api.WebClient(process.env.SLACK_BOT_TOKEN);
        const response = await slack.auth.test();
        results.slack = {
          ok: response.ok === true,
          ms: Date.now() - t0,
          detail: String(response.user_id ?? "")
        };
      } catch (err) {
        results.slack = {
          ok: false,
          ms: Date.now() - t0,
          error: err instanceof Error ? err.message : String(err)
        };
      }
    }
    {
      const t0 = Date.now();
      try {
        const workspace = await prisma.workspace.findFirst({
          where: { apiToken: { not: null } },
          select: { slug: true, apiToken: true }
        });
        if (!workspace?.apiToken) throw new Error("No workspace with apiToken found in DB");
        const res = await fetch("https://app.outsignal.ai/api/campaigns", {
          headers: { Authorization: `Bearer ${workspace.apiToken}` }
        });
        results.emailbison = {
          ok: res.status === 200,
          ms: Date.now() - t0,
          detail: `status=${res.status} (workspace=${workspace.slug})`
        };
      } catch (err) {
        results.emailbison = {
          ok: false,
          ms: Date.now() - t0,
          error: err instanceof Error ? err.message : String(err)
        };
      }
    }
    {
      const t0 = Date.now();
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { data, error } = await resend.domains.list();
        if (error) {
          const isRestricted = error.message?.toLowerCase().includes("restricted");
          results.resend = {
            ok: isRestricted,
            ms: Date.now() - t0,
            detail: isRestricted ? "key valid (send-only restricted)" : void 0,
            error: isRestricted ? void 0 : error.message
          };
        } else {
          results.resend = {
            ok: true,
            ms: Date.now() - t0,
            detail: `${data?.data?.length ?? 0} domains`
          };
        }
      } catch (err) {
        results.resend = {
          ok: false,
          ms: Date.now() - t0,
          error: err instanceof Error ? err.message : String(err)
        };
      }
    }
    const allPassed = Object.values(results).every((r) => r.ok);
    const summary = {
      allPassed,
      services: Object.keys(results).length,
      passed: Object.values(results).filter((r) => r.ok).length
    };
    return { summary, results };
  }, "run")
});
export {
  smokeTest
};
//# sourceMappingURL=smoke-test.mjs.map
