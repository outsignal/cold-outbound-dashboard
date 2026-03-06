# Links & Routing Audit -- outsignal-agents

**Analysis Date:** 2026-03-05

---

## Critical Findings

### BUG-3 (CRITICAL -- Security): 13 admin pages have NO middleware auth protection

**File:** `src/proxy.ts` (lines 46-55, 173-189)

The `ADMIN_PAGE_PREFIXES` and `config.matcher` only cover 8 routes (`/people`, `/companies`, `/settings`, `/enrichment-costs`, `/lists`, `/onboard`, `/onboarding`, `/workspace`), but the sidebar has **21 routes**. These 13 pages are accessible without authentication:

`/campaigns`, `/signals`, `/notifications`, `/pipeline`, `/clients`, `/email`, `/webhook-log`, `/senders`, `/linkedin-queue`, `/financials`, `/revenue`, `/agent-runs`, `/packages`

Unauthenticated users can view real client data, financials, sender configurations, and campaign details by navigating directly.

### BUG-1 (MEDIUM): `/clients/${clientId}/edit` -- 404

**File:** `src/app/(admin)/clients/[id]/page.tsx` (line 228)

The "Edit" button links to a route that doesn't exist.

### BUG-2 (MEDIUM): `/workspace/${slug}/senders` -- 404

**File:** `src/app/api/dashboard/stats/route.ts` (line 229)

Dashboard flagged-sender alerts link to a non-existent workspace-scoped senders page.

### ENV-1 (MEDIUM): `NEXT_PUBLIC_BASE_URL` vs `NEXT_PUBLIC_APP_URL`

**File:** `src/lib/invoices/email.ts` (line 9) -- uses a different env var name than every other file.

### SETTINGS-1 (MEDIUM): Placeholder webhook URL

**File:** `src/app/(admin)/settings/page.tsx` (line 186) -- shows `https://your-domain.vercel.app/...` instead of the actual URL.
