# Phase 38: Trigger.dev Foundation + Smoke Test - Research

**Researched:** 2026-03-12
**Domain:** Trigger.dev v4 SDK installation, Prisma 6 integration, queue definition, Vercel integration, smoke test task
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Account & Project Setup**
- Start on Free tier — upgrade to Hobby ($20/mo) only when hitting the 10-schedule cap (expected at Phase 41 when crons start)
- Trigger.dev project name: `outsignal-agents` (matches repo name)
- Account already exists at jonathan@outsignal.ai — no new signup needed
- User will create the project in Trigger.dev dashboard manually during execution; agents handle all code-side setup

**Env Var Sync Strategy**
- Use Vercel Integration (NOT `syncVercelEnvVars` extension) — documented conflict if both are used
- Neon DATABASE_URL: use the pooled connection string with `?connection_limit=1` appended — prevents connection exhaustion from concurrent Trigger.dev tasks
- Sync ALL secrets from Vercel (Anthropic, EmailBison, Slack, Resend, Neon, cron secrets, etc.) — Trigger.dev tasks need the same env vars as the Vercel functions they replace
- Check Neon IP allowlisting during setup — if enabled, add Trigger.dev IP ranges; if not enabled (likely), document and move on

**Queue Design**
- Two shared queues only: `anthropicQueue` (concurrencyLimit: 3) and `emailBisonQueue` (concurrencyLimit: 3)
- No per-workspace queue isolation — not needed at current scale (6 workspaces)
- No Slack queue — Slack rate limits are generous enough that concurrent sends won't be an issue
- Queues defined in `/trigger/queues.ts` as named exports, imported by all tasks that need rate limiting
- v4 requirement: queues must be pre-declared with `queue()` function — inline concurrency limits are silently ignored

**Smoke Test Scope**
- Full stack test: Prisma read (1 Person record) + Anthropic API call + Slack notification + EmailBison API ping + Resend API ping
- On-demand only — no schedule; triggered manually from Trigger.dev dashboard or via API
- Exit criteria: smoke test passes = Phase 38 complete; failure blocks all downstream phases
- Keep the smoke test task permanently as a diagnostic tool (not throwaway) — useful for debugging env var or connectivity issues after deploys

### Claude's Discretion
- Exact smoke test task structure and error reporting format
- Whether to test each service sequentially or in parallel within the task
- Prisma schema `binaryTargets` placement and any generator config adjustments
- `trigger.config.ts` exact structure beyond the documented requirements (Prisma extension, dirs, project ref)

### Deferred Ideas (OUT OF SCOPE)
- Per-workspace queue isolation — revisit if scale requires it (future milestone)
- Neon IP allowlisting documentation — note during setup, don't build automation around it
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Trigger.dev SDK installed and `trigger.config.ts` configured with Prisma 6 legacy mode extension | `@trigger.dev/sdk` + `@trigger.dev/build` packages; `prismaExtension({ mode: "legacy" })` in `build.extensions` |
| FOUND-02 | Vercel integration set up for bidirectional env var sync | Install via Trigger.dev dashboard Settings → Connect Vercel; requires GitHub integration connected; DO NOT use `syncVercelEnvVars` extension |
| FOUND-03 | Prisma schema updated with `debian-openssl-3.0.x` binary target | Add `binaryTargets = ["native", "debian-openssl-3.0.x"]` to `generator client` block in `prisma/schema.prisma` |
| FOUND-04 | Neon DATABASE_URL configured with `connection_limit=1` for Trigger.dev tasks | Append `?connection_limit=1` to the pooled Neon DATABASE_URL in Trigger.dev dashboard env vars |
| FOUND-05 | Smoke test task deployed and verified (Prisma read + Anthropic call) | `task()` from `@trigger.dev/sdk`; import `PrismaClient` from `@prisma/client`; import `anthropic` from `@ai-sdk/anthropic`; also ping Slack, EmailBison, Resend |
| FOUND-06 | Shared concurrency queues defined (Anthropic rate limit queue, EmailBison queue) | `queue()` from `@trigger.dev/sdk`; must be pre-declared in `/trigger/queues.ts`; v4 requires this — inline limits are silently ignored |
</phase_requirements>

---

## Summary

Trigger.dev v4 is the current GA version (released 2025, deprecating v3 on April 1, 2026). The SDK package is `@trigger.dev/sdk` (import path changed from `@trigger.dev/sdk/v3` in v3). Installation uses `npx trigger.dev@latest init` which scaffolds `trigger.config.ts` and a `/trigger` directory. For this project, the `/trigger` directory goes at the root (not `src/trigger`) since the CLI defaults to that and tsconfig currently excludes `scripts/` and `worker/` but not `/trigger`.

Prisma 6 integration uses `prismaExtension({ mode: "legacy" })` from `@trigger.dev/build/extensions/prisma`. The extension auto-generates the Prisma client during deployment and marks `@prisma/client` as external. The `binaryTargets` addition to `schema.prisma` is required because Trigger.dev Cloud runs on `debian-openssl-3.0.x` — without it, the generated client will not have the right binary and database calls will fail silently or throw at runtime. The current `schema.prisma` has no `binaryTargets` defined, so this is a required change.

The Vercel integration is a dashboard-level connection (not a code extension) and requires GitHub to be connected first. It syncs env vars bidirectionally — Vercel → Trigger.dev on setup, and Trigger.dev → Vercel for `TRIGGER_SECRET_KEY`. The `TRIGGER_SECRET_KEY` is also needed in the project's `.env.local` for local `trigger.dev dev` to authenticate.

**Primary recommendation:** Run `npx trigger.dev@latest init` to scaffold, then immediately configure Prisma extension and queues before writing any tasks. The smoke test should be the first and only task in this phase — all other phases build on its passing.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@trigger.dev/sdk` | 4.x (latest) | Task definition, `task()`, `queue()`, triggering | Official SDK, required |
| `@trigger.dev/build` | 4.x (matches SDK) | Build extensions including `prismaExtension` | Required for Prisma bundling |
| `trigger.dev` (CLI) | latest via `npx trigger.dev@latest` | Dev server, deployment | Official CLI |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@prisma/client` | 6.x (already installed) | DB access inside tasks | All tasks needing DB |
| `@ai-sdk/anthropic` | 3.x (already installed) | Anthropic API inside tasks | Smoke test + all AI tasks |
| `resend` | 6.x (already installed) | Email sending from tasks | Smoke test |
| `@slack/web-api` | 7.x (already installed) | Slack notifications from tasks | Smoke test |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `prismaExtension` legacy | engine-only mode | Engine-only requires manual `prisma generate` — legacy simpler for standard setups |
| Vercel integration | `syncVercelEnvVars` extension | Extension deprecated and conflicts with Vercel integration — DO NOT use |
| `/trigger` at root | `src/trigger` | Both work; root placement matches CLI default and avoids tsconfig path issues |

**Installation:**
```bash
npx trigger.dev@latest init
# CLI will prompt for project ref and install @trigger.dev/sdk + @trigger.dev/build
```

Or manually:
```bash
npm install @trigger.dev/sdk @trigger.dev/build
```

---

## Architecture Patterns

### Recommended Project Structure
```
/trigger/                    # Root-level (CLI default)
├── queues.ts                # Pre-declared shared queues (FOUND-06)
├── smoke-test.ts            # Smoke test task (FOUND-05)
└── (future tasks go here)   # Phases 39-42 add tasks here
trigger.config.ts            # Root-level config (CLI creates this)
prisma/
└── schema.prisma            # Add binaryTargets here (FOUND-03)
```

The `/trigger` directory at the root is the CLI default. The `dirs` option in `trigger.config.ts` can explicitly confirm it.

### Pattern 1: trigger.config.ts with Prisma Extension

```typescript
// trigger.config.ts
// Source: https://trigger.dev/docs/config/extensions/prismaExtension
import { defineConfig } from "@trigger.dev/sdk";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF!,  // or hardcoded from dashboard
  dirs: ["./trigger"],
  build: {
    extensions: [
      prismaExtension({
        mode: "legacy",
        schema: "prisma/schema.prisma",
        // NOTE: Do NOT add migrate: true — use prisma db push (per STATE.md decision Phase 35-01)
        // NOTE: No directUrlEnvVarName needed unless running migrations
      }),
    ],
  },
});
```

**Important:** `migrate: true` would run `prisma migrate deploy` on Trigger.dev deployment. Per project decision (Phase 35-01), the project uses `prisma db push` not migrations. Do NOT set `migrate: true`.

### Pattern 2: Pre-declared Queues (v4 Requirement)

```typescript
// /trigger/queues.ts
// Source: https://trigger.dev/docs/queue-concurrency
import { queue } from "@trigger.dev/sdk";

export const anthropicQueue = queue({
  name: "anthropic-queue",
  concurrencyLimit: 3,
});

export const emailBisonQueue = queue({
  name: "emailbison-queue",
  concurrencyLimit: 3,
});
```

**Critical v4 rule:** In v4, queues MUST be pre-declared with `queue()` before deployment. Inline concurrency limits set at trigger time are silently ignored. Named queues in `/trigger/queues.ts` are the correct approach.

### Pattern 3: Task Definition

```typescript
// /trigger/smoke-test.ts
// Source: https://trigger.dev/docs/tasks/overview
import { task } from "@trigger.dev/sdk";
import { PrismaClient } from "@prisma/client";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const prisma = new PrismaClient();

export const smokeTest = task({
  id: "smoke-test",
  run: async (payload: {}) => {
    const results: Record<string, { ok: boolean; error?: string }> = {};

    // 1. Prisma read
    try {
      const person = await prisma.person.findFirst();
      results.prisma = { ok: !!person };
    } catch (e) {
      results.prisma = { ok: false, error: String(e) };
    }

    // 2. Anthropic call
    try {
      const { text } = await generateText({
        model: anthropic("claude-haiku-4-5"),
        prompt: "Reply with exactly: OK",
      });
      results.anthropic = { ok: text.includes("OK") };
    } catch (e) {
      results.anthropic = { ok: false, error: String(e) };
    }

    // ... Slack, EmailBison, Resend pings

    return results;
  },
});
```

**Note on Prisma client in tasks:** Unlike Next.js where a singleton pattern is used (to survive hot-reload), Trigger.dev tasks run in isolated Node processes. A simple `new PrismaClient()` per task file is fine. No globalForPrisma pattern needed.

### Pattern 4: schema.prisma binaryTargets

```prisma
// prisma/schema.prisma — current generator block + required addition
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
  binaryTargets   = ["native", "debian-openssl-3.0.x"]  // ADD THIS
}
```

`"native"` keeps local dev working. `"debian-openssl-3.0.x"` is the Trigger.dev Cloud target (confirmed in official docs).

### Anti-Patterns to Avoid
- **Using `syncVercelEnvVars` extension in trigger.config.ts:** Documented conflict with Vercel integration. If `npx trigger.dev@latest init` adds it, remove it before setting up Vercel integration.
- **Setting `migrate: true`:** Runs `prisma migrate deploy` on deploy — this project uses `db push`, not migrations.
- **Defining queues inline at trigger time:** In v4, inline concurrency limits are silently ignored. Always use pre-declared `queue()` objects.
- **Reusing Next.js Prisma singleton in tasks:** The `globalForPrisma` pattern is for Next.js dev hot-reload — not applicable in Trigger.dev's isolated task processes.
- **Import from `@trigger.dev/sdk/v3`:** This is the v3 import path. v4 uses `@trigger.dev/sdk` directly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Prisma binary bundling for Linux | Custom Docker/esbuild config | `prismaExtension({ mode: "legacy" })` | Extension handles generate + binary target + externalization automatically |
| Queue concurrency | Custom semaphore/mutex | `queue()` with `concurrencyLimit` | Built into Trigger.dev runtime, works across distributed workers |
| Env var sync to Trigger.dev | Manual copy-paste in dashboard | Vercel Integration | Automatic bidirectional sync per environment |
| Task retry logic | try/catch + re-trigger | Built-in `retry` config on task | Handles exponential backoff, max attempts, idempotency |

**Key insight:** The init CLI and extensions handle the 95% case — the only hand-coding needed is the task logic itself.

---

## Common Pitfalls

### Pitfall 1: Missing binaryTargets Causes Silent DB Failure
**What goes wrong:** Trigger.dev deploys successfully but database calls throw "binary not found" errors at runtime.
**Why it happens:** Prisma generates client for the local OS (macOS `native`); the Trigger.dev Cloud runner is `debian-openssl-3.0.x`. Without both targets, the wrong binary is packaged.
**How to avoid:** Add `binaryTargets = ["native", "debian-openssl-3.0.x"]` to `generator client` in `schema.prisma` before first deploy.
**Warning signs:** Tasks fail immediately with Prisma engine error, not a query error.

### Pitfall 2: syncVercelEnvVars Extension Conflicts with Vercel Integration
**What goes wrong:** Env vars are incorrectly populated or overwritten.
**Why it happens:** `syncVercelEnvVars` is a deprecated build extension that conflicts with the newer Vercel dashboard integration.
**How to avoid:** If `npx trigger.dev@latest init` adds `syncVercelEnvVars` to `trigger.config.ts`, remove it before enabling the Vercel integration.
**Warning signs:** Env vars are missing or wrong in Trigger.dev after enabling Vercel integration.

### Pitfall 3: Vercel Integration Requires GitHub Connection
**What goes wrong:** Vercel integration setup fails or atomic deployments don't work.
**Why it happens:** Trigger.dev builds tasks from GitHub repo; the integration requires GitHub to be connected first.
**How to avoid:** Verify GitHub integration is connected in Trigger.dev project settings before attempting Vercel integration.
**Warning signs:** "Connect GitHub" prompt appears mid-Vercel-integration setup.

### Pitfall 4: Inline Queue Concurrency Silently Ignored in v4
**What goes wrong:** Tasks run unconstrained despite concurrencyLimit appearing in code.
**Why it happens:** v4 requires queues to be pre-declared with `queue()` — concurrency set dynamically at trigger time is a v3 pattern that's silently dropped.
**How to avoid:** Always define queues in `/trigger/queues.ts` using `queue()` and reference them in task definitions.
**Warning signs:** More than `concurrencyLimit` tasks run simultaneously.

### Pitfall 5: TRIGGER_SECRET_KEY Missing in .env for Local Dev
**What goes wrong:** `npx trigger.dev dev` fails to authenticate or shows no tasks.
**Why it happens:** Local dev requires `TRIGGER_SECRET_KEY=tr_dev_...` in `.env` or `.env.local` to connect to Trigger.dev cloud.
**How to avoid:** After creating the Trigger.dev project, copy the DEV secret key from dashboard API Keys page into `.env.local`.
**Warning signs:** CLI errors "unauthorized" or dashboard shows no tasks discovered.

### Pitfall 6: connection_limit=1 Must Be in Trigger.dev Env, Not Just Vercel
**What goes wrong:** Connection exhaustion when multiple tasks run concurrently against Neon.
**Why it happens:** The Vercel DATABASE_URL uses default pool size; Trigger.dev tasks need `?connection_limit=1` specifically because multiple task processes can run simultaneously.
**How to avoid:** When reviewing env vars during Vercel integration setup, override DATABASE_URL in Trigger.dev to add `?connection_limit=1`. Or set it manually in Trigger.dev dashboard after integration is configured.
**Warning signs:** Neon connection errors under load, `P1001` or connection timeout errors in tasks.

---

## Code Examples

Verified patterns from official sources:

### Full trigger.config.ts for this project
```typescript
// trigger.config.ts
// Source: https://trigger.dev/docs/config/extensions/prismaExtension + https://trigger.dev/docs/trigger-config
import { defineConfig } from "@trigger.dev/sdk";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";

export default defineConfig({
  project: "<your-project-ref>",  // from Trigger.dev dashboard
  dirs: ["./trigger"],
  build: {
    extensions: [
      prismaExtension({
        mode: "legacy",
        schema: "prisma/schema.prisma",
        // migrate: false (omit — project uses db push, not migrations)
      }),
    ],
  },
});
```

### /trigger/queues.ts
```typescript
// Source: https://trigger.dev/docs/queue-concurrency
import { queue } from "@trigger.dev/sdk";

export const anthropicQueue = queue({
  name: "anthropic-queue",
  concurrencyLimit: 3,
});

export const emailBisonQueue = queue({
  name: "emailbison-queue",
  concurrencyLimit: 3,
});
```

### Using a queue in a task
```typescript
// Source: https://trigger.dev/docs/queue-concurrency
import { task } from "@trigger.dev/sdk";
import { anthropicQueue } from "./queues";

export const myAITask = task({
  id: "my-ai-task",
  queue: anthropicQueue,
  run: async (payload) => {
    // ... task logic
  },
});
```

### schema.prisma generator block (modified)
```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
  binaryTargets   = ["native", "debian-openssl-3.0.x"]
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import { task } from "@trigger.dev/sdk/v3"` | `import { task } from "@trigger.dev/sdk"` | v4 GA (2025) | Breaking change — old imports fail |
| Dynamic queue concurrency at trigger time | Pre-declared `queue()` in code | v4 GA (2025) | Must declare queues before deploy |
| `syncVercelEnvVars` build extension | Vercel dashboard integration | ~2024 | Extension deprecated, conflicts with integration |
| `prismaExtension` without `mode` | `prismaExtension({ mode: "legacy" })` | v4.1.1+ | `mode` now required, deploy fails without it |
| Lifecycle `init` function | `middleware` with `locals` API | v4 | `init` still works but middleware is preferred |

**Deprecated/outdated:**
- `@trigger.dev/sdk/v3` import path: replaced by `@trigger.dev/sdk` in v4
- `syncVercelEnvVars` extension: deprecated, conflicts with Vercel dashboard integration
- Dynamic queue creation at trigger time: v4 requires pre-declared queues

---

## Open Questions

1. **Does `npx trigger.dev@latest init` add `syncVercelEnvVars` automatically?**
   - What we know: It's deprecated and conflicts with Vercel integration
   - What's unclear: Whether the CLI still adds it in v4 or has been removed from scaffolding
   - Recommendation: After running init, inspect generated `trigger.config.ts` and remove `syncVercelEnvVars` if present before setting up Vercel integration

2. **Does the Vercel integration allow overriding individual env vars (e.g., DATABASE_URL with connection_limit=1)?**
   - What we know: Integration syncs vars from Vercel; some vars can be deselected during sync review
   - What's unclear: Whether DATABASE_URL can be modified post-sync in Trigger.dev dashboard
   - Recommendation: After Vercel integration syncs, manually verify/override DATABASE_URL in Trigger.dev dashboard to add `?connection_limit=1`

3. **Free tier smoke test: is 1 task run limit a concern?**
   - What we know: Free tier has limited concurrent runs but smoke test is on-demand only
   - What's unclear: Exact free tier limits for on-demand tasks vs scheduled tasks
   - Recommendation: Free tier is sufficient for Phase 38 (smoke test only); upgrade to Hobby at Phase 41 for cron schedules (10 schedule cap is the binding constraint)

---

## Vercel Integration Setup Steps (Manual — User Does This)

The Vercel integration is a dashboard operation, not a code change. Documented here for the execution plan:

1. In Trigger.dev dashboard → project Settings → Connect Vercel
2. Authorize Trigger.dev app on Vercel
3. Select Vercel project: `cold-outbound-dashboard` (or `outsignal-agents`)
4. Connect GitHub repository (required prerequisite)
5. Review env vars to sync — select ALL, then manually verify DATABASE_URL afterward
6. Enable atomic deployments (default on for production)

After sync, in Trigger.dev dashboard env vars, update DATABASE_URL to append `?connection_limit=1`.

---

## Sources

### Primary (HIGH confidence)
- https://trigger.dev/docs/config/extensions/prismaExtension — prismaExtension modes, legacy mode config, binaryTargets
- https://trigger.dev/docs/queue-concurrency — queue() function, concurrencyLimit, v4 pre-declaration requirement
- https://trigger.dev/docs/vercel-integration — Vercel integration steps, GitHub requirement, syncVercelEnvVars conflict warning
- https://trigger.dev/docs/trigger-config — trigger.config.ts full API reference
- https://trigger.dev/docs/upgrade-to-v4 — v4 breaking changes (import paths, queue declaration, batch changes)
- https://trigger.dev/changelog/prisma-7-integration — Prisma 6/7 mode redesign, legacy mode details

### Secondary (MEDIUM confidence)
- https://trigger.dev/docs/guides/frameworks/nextjs — Next.js init steps, TRIGGER_SECRET_KEY in .env.local
- https://trigger.dev/docs/guides/frameworks/prisma — task example with Prisma, PrismaClient instantiation in tasks
- WebSearch: `@trigger.dev/sdk` current version 4.3.3 (npm, 16 days ago as of research)

### Tertiary (LOW confidence)
- WebSearch: connection_limit=1 pattern for serverless Neon — broadly documented practice, not Trigger.dev-specific

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified via official docs and changelog
- Architecture patterns: HIGH — code examples from official docs
- Pitfalls: HIGH for most; MEDIUM for connection_limit pattern (broad community practice, not Trigger.dev-specific doc)

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (Trigger.dev moves fast — recheck if issues arise, v3 deprecation April 1 is a known date)
