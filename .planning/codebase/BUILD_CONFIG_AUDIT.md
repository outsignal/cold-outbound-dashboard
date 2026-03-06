# Build, Config & Deployment Audit -- outsignal-agents

**Analysis Date:** 2026-03-05

---

## Critical Issues

### 1. CRITICAL -- Middleware Route Protection Gap (`src/proxy.ts`)

The `config.matcher` and `ADMIN_PAGE_PREFIXES` only protect 8 of 21 admin routes. These admin pages are accessible WITHOUT authentication:

- `/campaigns`, `/clients`, `/financials`, `/linkedin-queue`, `/notifications`, `/packages`, `/pipeline`, `/revenue`, `/senders`, `/signals`, `/webhook-log`, `/agent-runs`, `/email`

The `config.matcher` array needs all of these added, along with `ADMIN_PAGE_PREFIXES`. Server components on these routes query Prisma directly and could render sensitive data to unauthenticated visitors.

---

## High Issues

### 2. `.env.example` severely incomplete

Only 8 of 35+ env vars are documented. Missing 27 vars including `PORTAL_SESSION_SECRET`, `CRON_SECRET`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, all enrichment API keys, and operational vars like `OPS_SLACK_CHANNEL_ID` and `ADMIN_EMAIL`.

### 3. `NEXT_PUBLIC_BASE_URL` vs `NEXT_PUBLIC_APP_URL` inconsistency

`src/lib/invoices/email.ts:9` uses `NEXT_PUBLIC_BASE_URL` while every other file (12 occurrences) uses `NEXT_PUBLIC_APP_URL`. Invoice emails will use the wrong URL if only one is set.

---

## Medium Issues

### 4. Untyped HTTP Error Pattern

10+ provider files use `(err as any).status = 429` to attach status codes to plain Errors. Should create a typed `HttpError` class in `src/lib/errors.ts`.

### 5. Missing HSTS header in `next.config.ts`

No `Strict-Transport-Security` header configured for production.

### 6. Dead Porkbun integration

`src/lib/porkbun.ts` references `PORKBUN_API_KEY`/`PORKBUN_SECRET_KEY` but registrar is now Dynadot.

---

## Low Issues

### 7. Session refresh cron exists in code but not in `vercel.json`

`src/app/api/cron/session-refresh/route.ts` has auth but is never invoked.

### 8. Zod version conflict

Main project `zod@^4.3.6` vs worker-signals `zod@^3.24.0`.

### 9. Dependency placement

`@types/dompurify` and `prisma` in dependencies instead of devDependencies.
