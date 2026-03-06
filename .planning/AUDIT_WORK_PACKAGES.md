# Outsignal Agents — Audit Fix Work Packages

**Created:** 2026-03-05
**Source:** 7 parallel audits (Security, API, Database, Links/Routing, UI/UX, Build/Config, Agent Framework)
**Total issues:** 45+ across all dimensions

---

## How to Use This Document

Each work package (WP) is **self-contained** and can be handed to a sub-agent independently. Packages within the same wave have NO dependencies on each other and can run in parallel. Packages in later waves may depend on earlier ones (noted where applicable).

**For each WP, the agent should:**
1. Read the listed files to understand current state
2. Make the described changes
3. Verify with the acceptance criteria
4. Commit with a descriptive message

**Project root:** `/Users/jjay/programs/outsignal-agents`

---

# WAVE 1 — Security Hardening (CRITICAL)

> These must be done first. The app's entire admin surface is currently unprotected.

---

## WP-1: API Route Authentication Middleware

**Priority:** CRITICAL
**Estimated scope:** 1 new file, 1 modified file

### Problem
There is no `middleware.ts` at the project root. 50+ API routes have ZERO authentication. Anyone can hit `/api/campaigns`, `/api/clients`, `/api/invoices`, `/api/chat`, etc. and read/write all data.

### Files to Read First
- `src/proxy.ts` — existing middleware (handles admin page auth + portal subdomain rewrite)
- `src/lib/admin-auth.ts` — `verifyAdminSession()` function
- `src/lib/admin-auth-edge.ts` — edge-compatible admin auth (for middleware)
- `src/lib/cron-auth.ts` — cron auth pattern (for exemption reference)
- `src/lib/extension-auth.ts` — extension auth pattern (for exemption reference)

### What to Do
The project already has `src/proxy.ts` which acts as `middleware.ts` (Next.js exports it as default). Modify `src/proxy.ts` to ALSO protect `/api/*` routes:

1. **Add API route protection** to the existing middleware in `src/proxy.ts`:
   - For all `/api/*` routes, check for valid admin session cookie
   - Use the edge-compatible auth from `src/lib/admin-auth-edge.ts`

2. **Exempt these route prefixes** (they have their own auth):
   - `/api/admin/login` — public login endpoint
   - `/api/admin/logout` — needs session to exist but is logout
   - `/api/webhooks/` — EmailBison webhook (HMAC auth)
   - `/api/extension/` — Chrome extension (JWT auth)
   - `/api/portal/` — Client portal (magic link session)
   - `/api/cron/` — Vercel cron (CRON_SECRET)
   - `/api/inbox-health/` — Cron job (CRON_SECRET)
   - `/api/linkedin/maintenance` — Cron job (CRON_SECRET)
   - `/api/enrichment/jobs/process` — Cron job (CRON_SECRET)
   - `/api/linkedin/` — Worker API (WORKER_API_SECRET)
   - `/api/pipeline/` — Railway worker (PIPELINE_INTERNAL_SECRET)
   - `/api/people/enrich` — Clay webhook (x-api-key)
   - `/api/companies/enrich` — Clay webhook (x-api-key)
   - `/api/stripe/webhook` — Stripe (signature verification)
   - `/api/proposals/[id]/accept` — Public proposal acceptance
   - `/api/onboard` — Public onboarding form submission (has its own x-api-key check)

3. **Fix `ADMIN_PAGE_PREFIXES`** — add the 13 missing page routes:
   `/campaigns`, `/signals`, `/notifications`, `/pipeline`, `/clients`, `/email`, `/webhook-log`, `/senders`, `/linkedin-queue`, `/financials`, `/revenue`, `/agent-runs`, `/packages`

4. **Update `config.matcher`** to include all admin pages AND `/api/:path*`

### Acceptance Criteria
- All 50+ admin API routes return 401 without valid admin session cookie
- All exempt routes (webhooks, cron, extension, portal, worker) still work without admin cookie
- Admin dashboard still loads normally when logged in
- Portal still works via subdomain
- `config.matcher` covers all admin pages

---

## WP-2: Timing-Safe Auth Comparisons

**Priority:** MEDIUM
**Estimated scope:** 3 files modified

### Problem
`admin-auth.ts`, `admin-auth-edge.ts`, and `portal-auth.ts` use `===` for HMAC signature comparison instead of `crypto.timingSafeEqual`. This is a timing attack vector.

### Files to Modify
- `src/lib/admin-auth.ts` — line 68: change `===` to `timingSafeEqual`
- `src/lib/admin-auth-edge.ts` — line 54: change `===` to `timingSafeEqual`
- `src/lib/portal-auth.ts` — line 48: change `===` to `timingSafeEqual`

### What to Do
Replace string `===` comparison with `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))`. Handle the edge case where buffer lengths differ (timingSafeEqual requires equal lengths — return false early if lengths differ). See `src/lib/extension-auth.ts` for the correct pattern already in the codebase.

### Acceptance Criteria
- All three files use `timingSafeEqual` for signature comparison
- Auth still works (login, portal magic links, admin session)

---

## WP-3: Webhook Auth Reject-by-Default

**Priority:** HIGH
**Estimated scope:** 3 files modified

### Problem
Clay enrichment endpoints and EmailBison webhook skip auth when secrets aren't configured, accepting ALL requests.

### Files to Modify
- `src/app/api/people/enrich/route.ts` — lines 227-232
- `src/app/api/companies/enrich/route.ts` — lines 204-210
- `src/app/api/webhooks/emailbison/route.ts` — lines 22-32

### What to Do
Change the fallback behavior from "accept all when secret not set" to "reject all when secret not set". Follow the pattern used in `src/app/api/pipeline/signal-campaigns/process/route.ts` which already does this correctly:

```typescript
if (!secret) {
  console.warn("[Webhook] Secret not configured — rejecting all requests");
  return false;
}
```

Also move `CLAY_WEBHOOK_SECRET` and `EMAILBISON_WEBHOOK_SECRET` from `OPTIONAL_VARS` to `REQUIRED_VARS` in `src/lib/env.ts` (or add explicit checks).

### Acceptance Criteria
- All three endpoints return 401 when their secret env var is not set
- All three endpoints still work correctly when secrets ARE set

---

## WP-4: Security Headers

**Priority:** MEDIUM
**Estimated scope:** 1 file modified

### Files to Modify
- `next.config.ts`

### What to Do
Add security headers to the Next.js config:

```typescript
headers: async () => [
  {
    source: "/(.*)",
    headers: [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ],
  },
],
```

Do NOT add CSP yet (too many inline scripts to audit). Focus on the easy wins.

### Acceptance Criteria
- All listed headers present in HTTP responses
- App still loads and functions normally

---

## WP-5: Deprecated Cron Route Cleanup + Batch Limits

**Priority:** LOW
**Estimated scope:** 3 files modified, 1 file deleted

### What to Do
1. **Delete** `src/app/api/cron/session-refresh/route.ts` — confirmed not in vercel.json, deprecated
2. **Add batch size limit** to `src/app/api/people/enrich/route.ts` — limit array body to 500 items max
3. **Add batch size limit** to `src/app/api/companies/enrich/route.ts` — same

### Acceptance Criteria
- Deprecated route file deleted
- Batch endpoints reject payloads > 500 items with 400 status

---

# WAVE 2 — Database & Data Fixes (HIGH)

> Can run in parallel with Wave 1 since they touch different files.

---

## WP-6: Missing Database Indexes

**Priority:** CRITICAL (performance)
**Estimated scope:** 1 file modified (`prisma/schema.prisma`)

### What to Do
Add these indexes to `prisma/schema.prisma`:

1. On the `Person` model (mapped to "Lead" table):
   - `@@index([companyDomain])` — used in dedup, enrichment matching, vertical backfill
   - `@@index([linkedinUrl])` — used in dedup, webhook fast-track

2. On the `WebhookEvent` model:
   - `@@index([receivedAt])` — used in dashboard time-series, health check calculations

3. **Remove redundant indexes:**
   - `MagicLinkToken`: remove `@@index([token])` (redundant with `@unique`)
   - `InboxStatusSnapshot`: remove `@@index([workspaceSlug])` (redundant with `@unique`)
   - `SignalDailyCost`: remove `@@index([workspaceSlug, date])` (redundant with `@@unique`)

After editing, run `npx prisma db push` to apply (this is the project's current workflow — no migrations).

### Acceptance Criteria
- New indexes exist in database
- Redundant indexes removed
- `npx prisma db push` succeeds without data loss

---

## WP-7: Cascade Rules + Transaction Safety

**Priority:** HIGH
**Estimated scope:** 1 schema file + 5 source files

### Part A: Fix Sender Deletion Orphans
In `prisma/schema.prisma`, add `onDelete: Cascade` to:
- `LinkedInAction.sender` relation
- `LinkedInDailyUsage.sender` relation
- `LinkedInConnection.sender` relation

### Part B: Add Missing Transactions
Wrap these operations in `prisma.$transaction()`:

1. **Campaign dual-approval** — `src/lib/campaigns/operations.ts` around lines 589-614
   - Read campaign + conditional status update must be atomic

2. **Person + PersonWorkspace status sync** — `src/lib/leads/operations.ts` around lines 820-839
   - Both updates must succeed or neither

3. **Invoice payment + renewal advance** — `src/lib/invoices/operations.ts` around lines 245-263
   - Payment status + renewal date must be atomic

4. **Webhook handler status updates** — `src/app/api/webhooks/emailbison/route.ts` around lines 148-160
   - Person.status and PersonWorkspace.status updates must be atomic

### Acceptance Criteria
- `npx prisma db push` succeeds
- Deleting a sender also deletes its LinkedInAction, DailyUsage, Connection records
- Campaign approval, invoice payment, and webhook status updates are transactional

---

## WP-8: BOUNCE vs BOUNCED Data Mismatch

**Priority:** HIGH (dashboard shows 0 bounces)
**Estimated scope:** 1 file modified

### Problem
Webhook handler stores events as `"BOUNCE"` (what EmailBison sends). Dashboard filters for `"BOUNCED"`. Bounce counts always show 0.

### Files to Modify
- `src/app/api/dashboard/stats/route.ts` — lines 179 and 276

### What to Do
Change `"BOUNCED"` to `"BOUNCE"` in:
1. The `eventType.in` filter array (line 179)
2. The `emailBounced` KPI mapping (line 276)

### Acceptance Criteria
- Dashboard bounce counts reflect actual bounce data
- Time-series chart shows bounce line when bounce events exist

---

# WAVE 3 — Links, Routing & Build Fixes

---

## WP-9: Dead Links Fix

**Priority:** MEDIUM
**Estimated scope:** 3 files modified

### Fix 1: `/clients/${id}/edit` → 404
**File:** `src/app/(admin)/clients/[id]/page.tsx` (line 228)
Change the Edit button to either:
- Open an inline edit form/dialog on the same page, OR
- Link to the client detail page with a `?edit=true` query param that triggers edit mode

### Fix 2: `/workspace/${slug}/senders` → 404
**File:** `src/app/api/dashboard/stats/route.ts` (line 229)
Change the flagged-sender alert link to point to `/senders` (the global senders page) instead of the non-existent workspace-scoped senders page.

### Fix 3: Placeholder webhook URL in settings
**File:** `src/app/(admin)/settings/page.tsx` (line 186)
Replace `https://your-domain.vercel.app/api/webhooks/emailbison?workspace={slug}` with the actual production URL using the `NEXT_PUBLIC_APP_URL` env var:
```typescript
`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/emailbison?workspace=${slug}`
```

### Acceptance Criteria
- Edit button on client detail page works (no 404)
- Dashboard sender alerts link to a valid page
- Settings page shows actual webhook URL

---

## WP-10: Env Var Cleanup

**Priority:** HIGH
**Estimated scope:** 2 files modified

### Fix 1: NEXT_PUBLIC_BASE_URL → NEXT_PUBLIC_APP_URL
**File:** `src/lib/invoices/email.ts` (line 9)
Change `NEXT_PUBLIC_BASE_URL` to `NEXT_PUBLIC_APP_URL` to match all 12 other usages.

### Fix 2: Update .env.example
**File:** `.env.example`
Add all 35+ env vars used across the codebase. Group them by category:

```
# Core
DATABASE_URL=
NEXT_PUBLIC_APP_URL=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=

# Portal
PORTAL_SESSION_SECRET=

# Cron & Workers
CRON_SECRET=
WORKER_API_SECRET=
PIPELINE_INTERNAL_SECRET=

# EmailBison
EMAILBISON_WEBHOOK_SECRET=

# Clay Enrichment
CLAY_WEBHOOK_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# AI
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Notifications
RESEND_API_KEY=
SLACK_BOT_TOKEN=
OPS_SLACK_CHANNEL_ID=
ADMIN_EMAIL=

# Enrichment Providers
PROSPEO_API_KEY=
AIARK_API_KEY=
LEADMAGIC_API_KEY=
FINDYMAIL_API_KEY=
FIRECRAWL_API_KEY=

# Signal Workers
PREDICTLEADS_API_KEY=
SERPER_API_KEY=

# Extension
EXTENSION_JWT_SECRET=

# Encryption
ENCRYPTION_KEY=

# LinkedIn
LINKEDIN_WORKER_SECRET=

# Onboarding
ONBOARD_API_KEY=
```

Scan `src/lib/env.ts` for the definitive list.

### Acceptance Criteria
- Invoice emails use correct URL
- `.env.example` documents all env vars

---

## WP-11: Dead Code Cleanup

**Priority:** LOW
**Estimated scope:** 2 files deleted/modified

### What to Do
1. **Delete** `src/lib/porkbun.ts` — dead Porkbun integration (registrar is now Dynadot)
2. **Remove** any imports of porkbun.ts from other files (check `src/app/api/domains/suggest/route.ts`)
3. **Move** `@types/dompurify` and `prisma` from `dependencies` to `devDependencies` in `package.json`

### Acceptance Criteria
- Porkbun file removed, no broken imports
- `npm run build` still succeeds

---

# WAVE 4 — Agent Framework Fixes

> For testing in CLI. Can run in parallel with Wave 3.

---

## WP-12: Agent Output Validation

**Priority:** HIGH
**Estimated scope:** 2 files modified

### Problem
`runner.ts` parses agent JSON output with no schema validation. Malformed output silently becomes `TOutput` via unsafe cast.

### Files to Modify
- `src/lib/agents/runner.ts` — lines 68-81
- `src/lib/agents/types.ts` — add Zod schemas

### What to Do
1. In `types.ts`, add Zod schemas for each agent output type:
   - `researchOutputSchema`
   - `writerOutputSchema`
   - `leadsOutputSchema`
   - `campaignOutputSchema`

2. In `runner.ts`, add an optional `outputSchema` field to `AgentConfig`. When provided, validate parsed JSON against it:
   ```typescript
   if (config.outputSchema) {
     const parsed = config.outputSchema.safeParse(rawOutput);
     if (!parsed.success) {
       console.error(`[Agent ${config.name}] Output validation failed:`, parsed.error);
       // Still use the raw output but log the validation failure
       // This prevents breaking existing behavior while adding observability
     } else {
       output = parsed.data;
     }
   }
   ```

3. Wire up schemas in each agent config (orchestrator.ts, research.ts, writer.ts, leads.ts, campaign.ts)

### Acceptance Criteria
- Agent output is validated against Zod schema
- Validation failures are logged but don't crash (graceful degradation)
- All existing agent functionality still works

---

## WP-13: Token Usage Logging

**Priority:** HIGH
**Estimated scope:** 2 files modified

### Problem
Claude API costs are completely unmonitored. `result.usage` from AI SDK is never captured.

### Files to Modify
- `prisma/schema.prisma` — add fields to AgentRun model
- `src/lib/agents/runner.ts` — capture usage data

### What to Do
1. Add to AgentRun model in schema:
   ```prisma
   inputTokens   Int?
   outputTokens   Int?
   modelId        String?
   parentRunId    String?
   ```

2. In `runner.ts`, after `generateText()` returns, capture:
   ```typescript
   const usage = result.usage;
   // In the DB update:
   inputTokens: usage?.promptTokens,
   outputTokens: usage?.completionTokens,
   modelId: config.model,
   ```

3. Run `npx prisma db push` to apply schema change.

### Acceptance Criteria
- AgentRun records include token counts and model ID
- Token data visible in agent-runs admin page (if columns displayed)

---

## WP-14: Context Window Management

**Priority:** HIGH
**Estimated scope:** 1 file modified

### Problem
CLI chat (`scripts/chat.ts`) and dashboard chat pass full message history with no truncation. Long sessions will crash on token limits.

### Files to Modify
- `scripts/chat.ts`
- `src/app/api/chat/route.ts`

### What to Do
Add a simple sliding window that keeps the last N messages:

```typescript
const MAX_MESSAGES = 40; // ~20 back-and-forth turns
function trimMessages(messages: ModelMessage[]): ModelMessage[] {
  if (messages.length <= MAX_MESSAGES) return messages;
  // Always keep the system message (first) + last MAX_MESSAGES
  const system = messages.filter(m => m.role === 'system');
  const rest = messages.filter(m => m.role !== 'system');
  return [...system, ...rest.slice(-MAX_MESSAGES)];
}
```

Apply before passing to `generateText()` / `streamText()`.

### Acceptance Criteria
- Long CLI sessions don't crash
- Recent context preserved for continuity

---

## WP-15: Stale Standalone Scripts

**Priority:** MEDIUM
**Estimated scope:** 2 files modified or deleted

### Problem
`scripts/generate-copy.ts` and `scripts/analyze-website.ts` have diverged from the main agent system (different prompts, different KB search, different variable format).

### What to Do
**Option A (Preferred): Deprecate**
Add a deprecation notice at the top of each file pointing to the main agent system:
```typescript
// DEPRECATED: Use `npm run chat` and delegate to the Writer/Research agent instead.
// This standalone script uses outdated prompts and KB search.
```

**Option B: Update**
If keeping, update `generate-copy.ts`:
- Change "under 100 words" to "under 70 words" (matching writer.ts)
- Change `{{firstName}}` to `{FIRSTNAME}` (matching writer.ts convention)
- Replace keyword KB search with vector search from `src/lib/knowledge/store.ts`

### Acceptance Criteria
- Scripts are either deprecated with clear notices OR updated to match current agent conventions

---

# WAVE 5 — UI/UX Polish

---

## WP-16: Install Toast System

**Priority:** HIGH (UX)
**Estimated scope:** ~10 files modified

### Problem
No toast/notification library. Users get zero feedback on success/failure of actions.

### What to Do
1. Install `sonner`: `npm install sonner`
2. Add `<Toaster />` to root layout (`src/app/layout.tsx`)
3. Add success toasts to these high-traffic mutations:
   - Create client dialog → `toast.success("Client created")`
   - Create/update campaign → `toast.success("Campaign saved")`
   - Send invoice → `toast.success("Invoice sent")`
   - Create proposal → `toast.success("Proposal created")`
   - Mark notification read → no toast needed (visual change is enough)
   - Deploy campaign → `toast.success("Campaign deployed")`
   - Add people to list → `toast.success("Added to list")`
4. Add error toasts where `catch` blocks currently swallow errors silently

### Acceptance Criteria
- Sonner installed and visible
- Major CRUD operations show success/error toasts
- No console-only error swallowing on user-facing actions

---

## WP-17: Responsive Design Fixes

**Priority:** MEDIUM
**Estimated scope:** 3-4 files modified

### What to Do

1. **LinkedIn Queue metric cards** — `src/app/(admin)/linkedin-queue/page.tsx`
   Change `grid-cols-4` to `grid-cols-2 md:grid-cols-4`

2. **People filter sidebar mobile** — `src/components/search/filter-sidebar.tsx` (or wherever FilterSidebar is defined)
   On mobile (`md:` breakpoint), render as a slide-out Sheet/Drawer instead of inline sidebar. Use the existing Sheet component from shadcn/ui.

3. **Admin loading skeleton** — `src/app/(admin)/loading.tsx`
   Change `grid-cols-4` to `grid-cols-2 md:grid-cols-4`

4. **Mobile hamburger padding** — `src/components/layout/app-shell.tsx`
   Add `pl-14 md:pl-0` to the main content area when on mobile to prevent hamburger overlap.

### Acceptance Criteria
- LinkedIn queue and loading skeleton look correct on mobile
- Filter sidebar collapses to drawer on mobile
- No content overlap with hamburger button

---

## WP-18: Error Banner & Badge Consistency

**Priority:** MEDIUM
**Estimated scope:** Create 1 component, update ~10 files

### What to Do

1. **Create** `src/components/ui/error-banner.tsx`:
   ```tsx
   interface ErrorBannerProps {
     message: string;
     onRetry?: () => void;
   }
   ```
   Standardize on: `bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800` with optional retry button.

2. **Replace** all 4 error banner patterns across the codebase with `<ErrorBanner>`.

3. **Badge status colors** — Create badge variant mappings for campaign status, pipeline status:
   ```tsx
   const campaignStatusVariant: Record<string, BadgeProps["variant"]> = {
     draft: "secondary",
     active: "success",
     paused: "warning",
     // ...
   };
   ```

### Acceptance Criteria
- One reusable ErrorBanner component used everywhere
- Campaign/pipeline status badges use consistent Badge variants

---

## WP-19: Duplicate Onboard/Onboarding Route Consolidation

**Priority:** MEDIUM
**Estimated scope:** Multiple files

### Problem
`/onboard` and `/onboarding` are separate route groups with overlapping purposes. `/onboarding` is not in the sidebar (orphaned).

### What to Do
1. Consolidate into `/onboard` (the one linked in sidebar)
2. Move onboarding invite functionality into `/onboard` route tree:
   - `/onboard` — lists both proposals AND onboarding invites (already does this)
   - `/onboard/new` — create proposal
   - `/onboard/invite/new` — create onboarding invite (moved from `/onboarding/new`)
   - `/onboard/invite/[id]` — invite detail (moved from `/onboarding/[id]`)
3. Delete `src/app/(admin)/onboarding/` directory
4. Update any internal links pointing to `/onboarding/*`

### Acceptance Criteria
- No orphaned `/onboarding` routes
- All onboarding functionality accessible from sidebar → Onboard
- No broken links

---

## WP-20: Accessibility Quick Wins

**Priority:** LOW
**Estimated scope:** 5-6 files modified

### What to Do
1. **Skip-to-content link** — Add to `src/components/layout/app-shell.tsx` and `src/components/portal/portal-app-shell.tsx`:
   ```tsx
   <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute ...">
     Skip to main content
   </a>
   ```
   Add `id="main-content"` to the main content wrapper.

2. **Nav landmarks** — Add `aria-label="Main navigation"` to sidebar `<nav>` in `src/components/layout/sidebar.tsx` and portal sidebar.

3. **Notification keyboard access** — In `src/app/(admin)/notifications/page.tsx`, add `tabIndex={0}`, `role="button"`, and `onKeyDown` (Enter/Space) to the notification TableRow click handler.

4. **Icon-only button labels** — Audit and add `aria-label` to icon-only buttons that are missing them.

### Acceptance Criteria
- Skip link works with keyboard (Tab → Enter)
- Screen readers announce navigation landmarks
- Notifications can be marked read via keyboard

---

# WAVE 6 — Testing & Verification

> Run after all fixes are applied.

---

## WP-21: Build & Type Check

**Estimated scope:** 0 files (verification only)

### What to Do
```bash
cd /Users/jjay/programs/outsignal-agents
npm run build
npx tsc --noEmit
```

Fix any type errors or build failures introduced by the fixes.

### Acceptance Criteria
- `npm run build` succeeds
- `npx tsc --noEmit` passes

---

## WP-22: Security Verification

**Estimated scope:** 0 files (testing only)

### What to Do
Test that auth is enforced:

```bash
# Should return 401 (no session cookie):
curl -s -o /dev/null -w "%{http_code}" https://admin.outsignal.ai/api/campaigns
curl -s -o /dev/null -w "%{http_code}" https://admin.outsignal.ai/api/clients
curl -s -o /dev/null -w "%{http_code}" https://admin.outsignal.ai/api/chat -X POST -H "Content-Type: application/json" -d '{}'
curl -s -o /dev/null -w "%{http_code}" https://admin.outsignal.ai/api/invoices
curl -s -o /dev/null -w "%{http_code}" https://admin.outsignal.ai/api/revenue
curl -s -o /dev/null -w "%{http_code}" https://admin.outsignal.ai/api/people/search

# Should still work (own auth):
curl -s -o /dev/null -w "%{http_code}" https://admin.outsignal.ai/api/admin/login -X POST -H "Content-Type: application/json" -d '{"password":"wrong"}'
# Should return 401 (wrong password), not 500 or blocked by middleware
```

### Acceptance Criteria
- All admin API routes return 401 without cookie
- Login endpoint still accessible
- Webhook/cron/extension/portal routes unaffected

---

## WP-23: Agent CLI Testing

**Estimated scope:** Manual testing in CLI

### What to Do
Run `npm run chat` from the project directory and test each agent:

1. **Orchestrator:** "List all workspaces" → should return workspace list
2. **Research:** "Analyze the website example.com for Rise" → should use Research agent
3. **Writer:** "Write email copy for Rise using creative-ideas strategy" → should use Writer agent
4. **Leads:** "Search for marketing directors in London" → should use Leads agent
5. **Campaign:** "List campaigns for Rise" → should use Campaign agent
6. **Knowledge Base:** "What are best practices for cold email subject lines?" → should search KB

Verify:
- Token usage logged in AgentRun records (if WP-13 applied)
- Output validation warnings in console (if WP-12 applied)
- Long session doesn't crash (if WP-14 applied)

### Acceptance Criteria
- All 5 agents respond correctly
- Tool calls execute without errors
- DB records created with token usage

---

# Summary: Wave Parallelization

```
Wave 1 (Security):     WP-1, WP-2, WP-3, WP-4, WP-5     — all parallel
Wave 2 (Database):     WP-6, WP-7, WP-8                    — all parallel, parallel with Wave 1
Wave 3 (Links/Build):  WP-9, WP-10, WP-11                  — all parallel
Wave 4 (Agents):       WP-12, WP-13, WP-14, WP-15          — all parallel, parallel with Wave 3
Wave 5 (UI/UX):        WP-16, WP-17, WP-18, WP-19, WP-20  — all parallel
Wave 6 (Testing):      WP-21, WP-22, WP-23                 — sequential, after all waves complete
```

**Total: 23 work packages across 6 waves.**
**Maximum parallelism: 5 agents per wave.**
**Critical path: Wave 1 (WP-1) → Wave 6 (WP-22) for security verification.**
