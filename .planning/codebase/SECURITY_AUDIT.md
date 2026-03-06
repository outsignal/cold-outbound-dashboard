# Security Audit -- outsignal-agents

**Analysis Date:** 2026-03-05

## Executive Summary

The outsignal-agents codebase has **strong security in some areas** (webhook signature verification, timing-safe comparisons, encrypted credential storage, extension CORS) but suffers from a **CRITICAL systemic issue: the vast majority of admin API routes have NO authentication whatsoever**. There is no Next.js `middleware.ts` file enforcing auth on `/api/*` routes, meaning every route that does not explicitly check auth is publicly accessible. This includes routes that create/delete/modify clients, campaigns, invoices, proposals, senders, and workspace configurations.

**Overall Risk: CRITICAL** -- the application's entire admin surface is unprotected.

---

## CRITICAL: Finding #1 -- Admin API Routes Missing Authentication

**There is NO `middleware.ts` file in the project.** Auth is only enforced in routes that explicitly call auth functions. I audited all 90+ route files and found **50+ routes that have ZERO authentication**.

### Data Read Endpoints (PII/Business Data Exposure) -- NO AUTH:

- `GET /api/campaigns` -- `src/app/api/campaigns/route.ts`
- `GET /api/clients` -- `src/app/api/clients/route.ts`
- `GET /api/dashboard/stats` -- `src/app/api/dashboard/stats/route.ts` (KPIs, sender health, alerts)
- `GET /api/people/search` -- `src/app/api/people/search/route.ts` (14k+ people: emails, companies, job titles)
- `GET /api/companies/search` -- `src/app/api/companies/search/route.ts` (16k+ companies)
- `GET /api/senders` -- `src/app/api/senders/route.ts` (sender names, emails, health)
- `GET /api/senders/[id]` -- `src/app/api/senders/[id]/route.ts`
- `GET /api/workspaces` -- `src/app/api/workspaces/route.ts` (billing info)
- `GET /api/proposals` -- `src/app/api/proposals/route.ts` (client names, emails, pricing)
- `GET /api/invoices` -- `src/app/api/invoices/route.ts`
- `GET /api/revenue` -- `src/app/api/revenue/route.ts` (total revenue, MRR, client breakdown)
- `GET /api/agent-runs` -- `src/app/api/agent-runs/route.ts`
- `GET /api/webhook-log` -- `src/app/api/webhook-log/route.ts` (webhook payloads with reply content)
- `GET /api/notifications` -- `src/app/api/notifications/route.ts`
- `GET /api/lists` -- `src/app/api/lists/route.ts`
- `GET /api/lists/[id]/export` -- downloads CSV of contacts
- `GET /api/signals` -- `src/app/api/signals/route.ts`
- `GET /api/enrichment/costs` -- `src/app/api/enrichment/costs/route.ts`
- `GET /api/linkedin-queue` -- `src/app/api/linkedin-queue/route.ts`
- `GET /api/onboarding-invites` -- `src/app/api/onboarding-invites/route.ts`
- `GET /api/invoice-settings` -- `src/app/api/invoice-settings/route.ts`
- `GET /api/people/[id]/timeline` -- `src/app/api/people/[id]/timeline/route.ts`
- `GET /api/workspace/[slug]/configure` -- `src/app/api/workspace/[slug]/configure/route.ts`
- `GET /api/workspaces/[slug]/package` -- `src/app/api/workspaces/[slug]/package/route.ts`
- `GET /api/workspaces/[slug]/signals` -- `src/app/api/workspaces/[slug]/signals/route.ts`
- `GET /api/invoices/[id]/pdf` -- downloads invoice PDF
- Plus many more sub-routes

### Data Write Endpoints (Create/Modify/Delete) -- NO AUTH:

- `POST /api/campaigns` -- create campaigns
- `POST /api/clients` -- create clients
- `POST /api/senders` -- create senders
- `PATCH /api/senders/[id]` -- update senders
- `DELETE /api/senders/[id]` -- delete senders
- `POST /api/invoices` -- create invoices
- `POST /api/invoices/[id]/send` -- send invoice emails to clients
- `POST /api/proposals` -- create proposals and email clients
- `PATCH /api/proposals/[id]` -- modify proposals, change status, mark as paid
- `DELETE /api/proposals/[id]` -- delete proposals
- `POST /api/proposals/[id]/accept` -- accept proposals with arbitrary signature
- `POST /api/onboarding-invites` -- create and email onboarding invites
- `POST /api/lists` -- create target lists
- `PATCH /api/workspace/[slug]/configure` -- modify workspace config (including apiToken!)
- `PATCH /api/workspaces/[slug]/package` -- modify workspace package config
- `POST /api/workspace/[slug]/provision-emailbison` -- provision EmailBison workspace
- `POST /api/campaigns/[id]/deploy` -- deploy live campaigns
- `PUT /api/invoice-settings` -- update invoice sender settings
- `POST /api/people/import` -- inject contacts into database
- `POST /api/people/sync` -- trigger full EmailBison sync for all workspaces
- `POST /api/chat` -- invoke AI agent with full database tool access
- `POST /api/documents/upload` -- upload and parse PDF files
- `POST /api/domains/suggest` -- check domains (uses Porkbun API credits)
- `POST /api/stripe/checkout` -- create Stripe checkout sessions

**Impact:** Complete unauthorized access to all admin functionality. An attacker can export all contacts, view/modify financial data, deploy campaigns that send emails, invoke the AI chat agent, and delete data.

**Fix:** Add a `middleware.ts` at the project root that requires admin session cookie for all `/api/*` routes, with explicit exemptions for routes that use their own auth (webhooks, extension, portal, cron, worker, public proposals).

---

## CRITICAL: Finding #9 -- AI Chat Endpoint Unprotected

`POST /api/chat` (`src/app/api/chat/route.ts`) has NO auth and gives access to the AI orchestrator with full tool access. Anyone can interact with it and instruct it to perform any admin action through natural language.

---

## HIGH: Finding #5 -- Webhook Auth Falls Back to "Accept All"

Both Clay enrichment endpoints and the EmailBison webhook endpoint **skip authentication** when their secrets are not configured. These secrets are in `OPTIONAL_VARS` in `src/lib/env.ts`.

- `src/app/api/people/enrich/route.ts` lines 227-232
- `src/app/api/companies/enrich/route.ts` lines 204-210
- `src/app/api/webhooks/emailbison/route.ts` lines 22-32

**Fix:** Change fallback from "accept all" to "reject all" (consistent with `CRON_SECRET` and `PIPELINE_INTERNAL_SECRET` behavior). Or move to `REQUIRED_VARS`.

---

## HIGH: Finding #8 -- Proposals Accessible by ID

`GET /api/proposals/[id]` and `POST /api/proposals/[id]/accept` require only knowing the UUID. Anyone who guesses UUIDs can view pricing/client details and accept proposals with arbitrary signatures.

---

## MEDIUM: Finding #2 -- Session Signature Not Timing-Safe

`src/lib/admin-auth.ts` line 68 and `src/lib/portal-auth.ts` line 48 use `===` for HMAC signature comparison instead of `timingSafeEqual`. The extension auth (`src/lib/extension-auth.ts`) correctly uses timing-safe comparison.

---

## MEDIUM: Finding #3 -- Edge Auth Not Timing-Safe

`src/lib/admin-auth-edge.ts` line 54 uses `===` for signature comparison. If middleware is added (critical fix), this becomes the primary auth gate.

---

## MEDIUM: Finding #6 -- In-Memory Rate Limiting Ineffective on Serverless

`src/lib/rate-limit.ts` uses an in-memory `Map` that resets on cold start. Each Vercel function instance has its own Map, making rate limits easily bypassable.

---

## MEDIUM: Finding #7 -- Missing Security Headers

`next.config.ts` is missing: `Content-Security-Policy`, `Strict-Transport-Security`, `Permissions-Policy`.

---

## MEDIUM: Finding #17 -- Webhook Log Exposes Email Content

`GET /api/webhook-log` returns full webhook payloads including email reply body content. Accessible without auth (Finding #1).

---

## MEDIUM: Finding #18 -- No CSRF Protection

Admin session uses `SameSite=Lax` (partially protects POST). No explicit CSRF tokens.

---

## MEDIUM: Finding #19 -- LinkedIn Credentials in Database

Encrypted with AES-256-GCM (good implementation in `src/lib/crypto.ts`), but single key, no rotation mechanism. Worker endpoints that return decrypted creds are properly auth-gated.

---

## LOW: Finding #4 -- Deprecated Cron Route Non-Timing-Safe

`src/app/api/cron/session-refresh/route.ts` line 14 uses `===` instead of `validateCronSecret()`.

---

## LOW: Finding #14 -- No Batch Size Limits on Enrichment

Array body in enrichment endpoints has no size limit.

---

## LOW: Finding #15 -- Handlebars noEscape

`src/lib/linkedin/sequencing.ts` uses `noEscape: true` (intentional for plain text LinkedIn messages). Risk only if attacker gains DB write access.

---

## What's Working Well

| Area | Status |
|------|--------|
| Admin login (`/api/admin/login`) | Rate-limited, timing-safe password comparison |
| Extension auth | HMAC-signed tokens, timing-safe, CORS restricted to `chrome-extension://` |
| Portal auth | Magic link with 30min expiry, rate-limited, single-use tokens |
| Worker auth (LinkedIn API) | Timing-safe bearer token, properly enforced on all `/api/linkedin/*` routes |
| Cron auth | `validateCronSecret()` with timing-safe comparison |
| EmailBison webhook | HMAC-SHA256 signature verification (when secret configured) |
| Stripe webhook | `stripe.webhooks.constructEvent()` signature verification |
| Pipeline auth | `PIPELINE_INTERNAL_SECRET` with timing-safe comparison |
| Credential encryption | AES-256-GCM with random IV and auth tag |
| Sensitive field stripping | `sessionData`, `linkedinPassword`, `totpSecret`, `inviteToken` stripped from sender responses |
| SQL injection prevention | Prisma ORM parameterizes all queries |
| XSS prevention | DOMPurify used for HTML rendering |
| .env handling | Properly gitignored |
| No hardcoded secrets | All API keys read from environment variables |

---

## Priority Fix Order

1. **IMMEDIATE:** Add `middleware.ts` with admin session verification for all `/api/*` routes (fixes 50+ routes at once)
2. **HIGH:** Change webhook auth fallback from "accept all" to "reject all"
3. **MEDIUM:** Add timing-safe comparison to `admin-auth.ts` and `admin-auth-edge.ts`
4. **MEDIUM:** Add security headers (CSP, HSTS, Permissions-Policy)
5. **MEDIUM:** Consider external rate limiting for login
6. **LOW:** Fix deprecated cron route, add batch limits, fix JSDoc
