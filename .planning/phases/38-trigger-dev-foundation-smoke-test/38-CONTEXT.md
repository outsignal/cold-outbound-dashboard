# Phase 38: Trigger.dev Foundation + Smoke Test - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Install Trigger.dev SDK, configure `trigger.config.ts` with Prisma 6 legacy mode, set up Vercel integration for env var sync, configure Neon connection pooling, define shared concurrency queues, and deploy a smoke test task that proves end-to-end connectivity. Every downstream phase (39-43) is blocked until this passes.

</domain>

<decisions>
## Implementation Decisions

### Account & Project Setup
- Start on Free tier — upgrade to Hobby ($20/mo) only when hitting the 10-schedule cap (expected at Phase 41 when crons start)
- Trigger.dev project name: `outsignal-agents` (matches repo name)
- Account already exists at jonathan@outsignal.ai — no new signup needed
- User will create the project in Trigger.dev dashboard manually during execution; agents handle all code-side setup

### Env Var Sync Strategy
- Use Vercel Integration (NOT `syncVercelEnvVars` extension) — documented conflict if both are used
- Neon DATABASE_URL: use the pooled connection string with `?connection_limit=1` appended — prevents connection exhaustion from concurrent Trigger.dev tasks
- Sync ALL secrets from Vercel (Anthropic, EmailBison, Slack, Resend, Neon, cron secrets, etc.) — Trigger.dev tasks need the same env vars as the Vercel functions they replace
- Check Neon IP allowlisting during setup — if enabled, add Trigger.dev IP ranges; if not enabled (likely), document and move on

### Queue Design
- Two shared queues only: `anthropicQueue` (concurrencyLimit: 3) and `emailBisonQueue` (concurrencyLimit: 3)
- No per-workspace queue isolation — not needed at current scale (6 workspaces)
- No Slack queue — Slack rate limits are generous enough that concurrent sends won't be an issue
- Queues defined in `/trigger/queues.ts` as named exports, imported by all tasks that need rate limiting
- v4 requirement: queues must be pre-declared with `queue()` function — inline concurrency limits are silently ignored

### Smoke Test Scope
- Full stack test: Prisma read (1 Person record) + Anthropic API call + Slack notification + EmailBison API ping + Resend API ping
- On-demand only — no schedule; triggered manually from Trigger.dev dashboard or via API
- Exit criteria: smoke test passes = Phase 38 complete; failure blocks all downstream phases
- Keep the smoke test task permanently as a diagnostic tool (not throwaway) — useful for debugging env var or connectivity issues after deploys

### Claude's Discretion
- Exact smoke test task structure and error reporting format
- Whether to test each service sequentially or in parallel within the task
- Prisma schema `binaryTargets` placement and any generator config adjustments
- `trigger.config.ts` exact structure beyond the documented requirements (Prisma extension, dirs, project ref)

</decisions>

<specifics>
## Specific Ideas

- Smoke test should report per-service pass/fail so it's clear which integration broke if something fails after a deploy
- The task should be a useful diagnostic — not just a one-time gate check

</specifics>

<deferred>
## Deferred Ideas

- Per-workspace queue isolation — revisit if scale requires it (future milestone)
- Neon IP allowlisting documentation — note during setup, don't build automation around it

</deferred>

---

*Phase: 38-trigger-dev-foundation-smoke-test*
*Context gathered: 2026-03-12*
