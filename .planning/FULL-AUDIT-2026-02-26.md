# Outsignal Dashboard — Full Audit Report
**Date:** 2026-02-26
**Scope:** Links, Functionality, Security, UI/UX
**Method:** 4 parallel audit agents scanning all pages, API routes, components, and lib files

---

## CRITICAL (fix now)

### 1. No Admin Authentication — entire dashboard is public
The middleware only protects `/portal/*`. Every admin page and API route is accessible to anyone with the URL. An attacker can:
- View all workspaces, leads, campaigns, API tokens
- Create proposals / send emails to arbitrary addresses
- Trigger syncs, imports, AI chat (burning Anthropic credits)
- Create workspaces + Slack channels via `/api/onboard`

**Files:** `src/middleware.ts:42-44`, all `src/app/api/` routes, all `src/app/(admin)/` pages

### 2. Stored XSS via email HTML body
`src/components/inbox/reply-detail.tsx:137` uses `dangerouslySetInnerHTML` with unsanitized `reply.html_body`. A crafted email reply executes JS in the admin's browser.

**Fix:** Install `dompurify` and sanitize before rendering.

### 3. Workspace API tokens exposed via unauthenticated endpoint
`GET /api/workspace/[slug]/configure` returns the full workspace object including `apiToken` to anyone. Slugs are guessable (`rise`, `lime-recruitment`, etc.).

**File:** `src/app/api/workspace/[slug]/configure/route.ts:48-49`

### 4. Secrets in MEMORY.md (loaded into AI context)
The Clay webhook secret and database URL with credentials are in plaintext in MEMORY.md, which gets loaded into every Claude conversation.

---

## HIGH

| # | Issue | File(s) |
|---|-------|---------|
| 5 | **Clay webhook auth fails open** — if `CLAY_WEBHOOK_SECRET` not set on Vercel, enrichment endpoints are wide open | `src/app/api/people/enrich/route.ts:210`, `src/app/api/companies/enrich/route.ts:187` |
| 6 | **EmailBison webhook has zero auth** — no signature verification, no shared secret | `src/app/api/webhooks/emailbison/route.ts:7` |
| 7 | **Webhook URL in Settings is a placeholder** — shows `https://your-domain.vercel.app` instead of the real URL | `src/app/(admin)/settings/page.tsx:186` |
| 8 | **`NEXT_PUBLIC_APP_URL` fallback to localhost** — 11 locations fall back to `http://localhost:3000`. Customer-facing emails (Stripe, proposals, invites, magic links) will contain broken localhost URLs if not set on Vercel | 11 files |
| 9 | **LinkedIn worker auth uses `===`** (timing attack vulnerable) — cron-auth correctly uses `timingSafeEqual` but worker auth doesn't | `src/lib/linkedin/auth.ts:18` |
| 10 | **Portal session signature uses `!==`** (timing attack) | `src/lib/portal-auth.ts:48`, `src/lib/portal-auth-edge.ts:51` |

---

## TEXT WITHOUT LINKS — 15 findings

| # | What | File | Line |
|---|------|------|------|
| 11 | **People table: all emails are plain text** (14,500+ rows) | `src/app/(admin)/people/page.tsx` | 159 |
| 12 | **Inbox reply detail: From, To, CC emails all plain text** | `src/components/inbox/reply-detail.tsx` | 48, 62, 96, 100, 105 |
| 13 | **Inbox Health: sender emails plain text** | `src/app/(admin)/workspace/[slug]/inbox-health/page.tsx` | 197 |
| 14 | **Inbox Health: critical sender emails in warning banner** | `src/app/(admin)/workspace/[slug]/inbox-health/page.tsx` | 164 |
| 15 | **Proposal detail: clientEmail plain text** | `src/app/(admin)/onboard/[id]/page.tsx` | 103 |
| 16 | **Onboarding invite detail: clientEmail plain text** | `src/app/(admin)/onboarding/[id]/page.tsx` | 94 |
| 17 | **Onboarding list: clientEmail in table plain text** | `src/app/(admin)/onboarding/page.tsx` | 69 |
| 18 | **Workspace page: Website field is plain text** (should be `<a>`) | `src/app/(admin)/workspace/[slug]/page.tsx` | 358 |
| 19 | **"Use the Onboard Client page"** — text mentions page but no link | `src/app/(admin)/settings/page.tsx` | 164 |
| 20 | **"Add workspace tokens in Settings"** — no link to Settings | `src/components/dashboard/overview-table.tsx` | 108 |
| 21 | **"Sync from Email Bison or import from Clay"** — no links/actions | `src/app/(admin)/people/page.tsx` | 205 |
| 22 | **People table: workspace badges not linked** to workspace pages | `src/app/(admin)/people/page.tsx` | 177 |
| 23 | **Portal: campaign names not clickable** (admin side links them) | `src/app/(portal)/portal/page.tsx` | 148 |
| 24 | **Webhook URL not copy-enabled** | `src/app/(admin)/settings/page.tsx` | 186 |
| 25 | **People rows have no drill-down** — no detail view exists | `src/app/(admin)/people/page.tsx` | 152-198 |

---

## MEDIUM — Functionality & UX

| # | Issue | File |
|---|-------|------|
| 26 | **Enrichment Costs page missing from sidebar** — only accessible by typing URL | `src/components/layout/sidebar.tsx:33-39` |
| 27 | **Portal login page shows nav/logout to unauthenticated users** | `src/app/(portal)/portal/login/page.tsx` |
| 28 | **Sidebar active state uses exact match** — sub-pages don't highlight parent | `src/components/layout/sidebar.tsx:53` |
| 29 | **Portal nav has no active state highlighting** | `src/app/(portal)/layout.tsx:19-30` |
| 30 | **Campaign detail: Click Rate always 0%** (hardcoded) | `src/app/(admin)/workspace/[slug]/campaigns/[id]/page.tsx:40` |
| 31 | **No try-catch on several API routes** (proposals PATCH, invites PATCH, chat POST) | Multiple |
| 32 | **N+1 queries in LinkedIn action batch** — 20 sequential queries for batch of 10 | `src/app/api/linkedin/actions/next/route.ts:28-42` |
| 33 | **Dashboard makes N*3 external API calls per render** with no caching | `src/app/(admin)/page.tsx:14-83` |
| 34 | **SendInviteButton / MarkPaidButton: no error feedback** on failure | `src/components/onboarding/send-invite-button.tsx`, `src/components/proposals/mark-paid-button.tsx` |
| 35 | **`.env.example` only lists 5 of ~20 required env vars** | `.env.example` |
| 36 | **Fire-and-forget email in Stripe webhook** may not complete before function exits | `src/app/api/stripe/webhook/route.ts:46-50` |
| 37 | **No rate limiting on any endpoint** — portal login (email bombing), chat (cost), onboard (spam) | All API routes |
| 38 | **No CORS/CSRF protection** configured | `next.config.ts` |
| 39 | **No security headers** (CSP, X-Frame-Options, etc.) | `next.config.ts` |

---

## LOW

| # | Issue |
|---|-------|
| 40 | Dead code: 6+ unused exports in linkedin/queue.ts and sender.ts |
| 41 | Native checkboxes instead of UI component (onboarding/new, e-signature) |
| 42 | Search input missing accessible label (people page) |
| 43 | Date labels not associated with inputs via htmlFor (enrichment costs) |
| 44 | AddAccountButton uses `alert()` for errors |
| 45 | "Coming soon" on Chrome extension connect option |
| 46 | Enrichment job schema comment missing "paused" status |
| 47 | Portal session cookie 30-day expiry with no rotation |
| 48 | No batch size limit on enrichment endpoints |

---

## Positive Findings (things done well)

- No raw SQL queries — all Prisma parameterized queries (no SQL injection)
- No command injection vectors (no exec/spawn/eval)
- Stripe webhook properly verified with signature
- Cron auth uses timing-safe comparison
- Portal session cookies are HttpOnly with SameSite=Lax, Secure in production
- LinkedIn session data encrypted at rest (AES-256-GCM)
- Cryptographically random tokens (randomBytes(24))
- Portal login does not leak email existence
- `.env*` files are in `.gitignore`

---

## Recommended Priority Order

1. **Today**: Remove secrets from MEMORY.md, set `CLAY_WEBHOOK_SECRET` on Vercel, set `NEXT_PUBLIC_APP_URL` on Vercel
2. **This week**: Add admin auth (even basic HTTP auth as stopgap), sanitize HTML in reply-detail (DOMPurify), fix webhook URL placeholder
3. **This week**: Fix all 15 "text without links" issues (emails → `mailto:`, references → `<Link>`, websites → `<a>`)
4. **Next sprint**: Timing-safe comparisons, rate limiting, CORS/CSRF, security headers
5. **Backlog**: N+1 queries, dead code cleanup, accessibility fixes
