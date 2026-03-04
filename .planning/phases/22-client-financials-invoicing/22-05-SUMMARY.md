---
phase: 22-client-financials-invoicing
plan: "05"
subsystem: portal-billing
tags: [portal, invoices, billing, pdf, next.js, server-component]
dependency_graph:
  requires:
    - phase: 22-client-financials-invoicing/22-02
      provides: /api/invoices/[id]/pdf?token= route for viewToken-based PDF access
  provides:
    - Portal sidebar Billing nav item
    - GET /api/portal/invoices (session-gated, non-draft invoices for workspace)
    - /portal/billing page (invoice table with PDF download links)
  affects:
    - Client portal UX (new tab in sidebar)
tech_stack:
  added: []
  patterns:
    - Server component queries Prisma directly (no API round-trip)
    - viewToken-based PDF links allow unauthenticated PDF access from portal
    - Mobile menu inherits nav items from PortalSidebar (no separate changes needed)
key_files:
  created:
    - src/app/api/portal/invoices/route.ts
    - src/app/(portal)/portal/billing/page.tsx
  modified:
    - src/components/portal/portal-sidebar.tsx (added Receipt icon + Billing nav item)
decisions:
  - Server component queries prisma directly rather than calling /api/portal/invoices — eliminates fetch round-trip and keeps sensitive session logic server-side only
  - Mobile menu wraps PortalSidebar component — no separate nav item changes needed; sidebar update propagates automatically
  - PDF download links use viewToken query param (/api/invoices/[id]/pdf?token=...) matching Plan 02 token-based portal access pattern
  - Empty state uses Receipt icon consistent with billing context
metrics:
  duration_seconds: 120
  completed_date: "2026-03-04"
  tasks_completed: 1
  tasks_total: 1
  files_created: 2
  files_modified: 1
---

# Phase 22 Plan 05: Portal Billing Tab Summary

**One-liner:** Portal sidebar Billing tab with session-gated invoice list, status badges, and viewToken PDF download links — clients can self-serve invoice access without admin.

## What Was Built

### Task 1: Portal sidebar + Billing page + Portal invoice API

**`src/components/portal/portal-sidebar.tsx`**
- Added `Receipt` to lucide-react import
- Added `{ href: "/portal/billing", label: "Billing", icon: Receipt }` to `navItems` array after LinkedIn item
- Mobile menu (`portal-mobile-menu.tsx`) renders `PortalSidebar` directly — nav item propagates automatically, no separate change needed

**`src/app/api/portal/invoices/route.ts`**
- `GET /api/portal/invoices` — session-gated via `getPortalSession()`
- Queries `prisma.invoice.findMany` with `workspaceSlug` from session, filtering out `status: "draft"`
- Includes `lineItems` in response, ordered by `issueDate` descending
- Returns 401 with `{ error: "Unauthorized" }` for missing/invalid session
- Returns 500 with error message for unexpected failures

**`src/app/(portal)/portal/billing/page.tsx`**
- Server component using `getPortalSession()` → `workspaceSlug`
- Queries `prisma.invoice.findMany` directly (no API fetch round-trip needed in server component)
- Filters `status: { not: "draft" }`, ordered by `issueDate` descending
- Layout: page header ("Billing", subtitle), Card with invoice Table
- Table columns: Invoice # | Date (DD/MM/YYYY) | Due Date (DD/MM/YYYY) | Amount (formatGBP) | Status (Badge with color) | Action (PDF download link)
- Empty state: Receipt icon + "No invoices yet" messaging consistent with other portal empty states
- PDF link: `href="/api/invoices/${invoice.id}/pdf?token=${invoice.viewToken}"` opens in new tab — uses viewToken, no admin auth required
- Status badge colors: sent=blue, paid=emerald, overdue=red

## Commits

| Task | Commit  | Description                                              |
|------|---------|----------------------------------------------------------|
| 1    | 832e073 | feat(22-05): add portal billing tab with invoice history and PDF download |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
