---
phase: 22-client-financials-invoicing
plan: "04"
subsystem: admin-ui
tags: [invoices, revenue, sidebar, react, recharts, ui]

dependency_graph:
  requires:
    - phase: 22-client-financials-invoicing/22-01
      provides: InvoiceWithLineItems types, listInvoices, createInvoice operations, format helpers
    - phase: 22-client-financials-invoicing/22-02
      provides: /api/invoices CRUD, /api/invoices/[id]/pdf, /api/invoices/[id]/send
  provides:
    - Financials nav group in sidebar (Invoices + Revenue links)
    - /financials page — invoice list with filters, actions, and New Invoice form
    - /revenue page — KPI cards, monthly chart, per-client breakdown
    - GET /api/revenue — revenue aggregates, time series, client breakdown
    - GET /api/workspaces — workspace list with billing fields for form dropdown
    - src/components/financials/invoice-status-badge.tsx
    - src/components/financials/invoice-table.tsx
    - src/components/financials/invoice-form.tsx
    - src/components/financials/revenue-chart.tsx
  affects:
    - 22-05 (portal billing tab — can link to /financials for admin invoice management)

tech-stack:
  added: []
  patterns:
    - "Client component pages fetching from API (consistent with clients/page.tsx pattern)"
    - "RevenueChart follows exact ActivityChart Recharts AreaChart pattern"
    - "InvoiceForm dialog pre-populates line items from workspace billing config"
    - "WorkspaceSelector auto-fills default line items on workspace change via useEffect"
    - "GET /api/revenue uses Prisma groupBy + aggregate for per-client breakdown"

key-files:
  created:
    - src/components/financials/invoice-status-badge.tsx
    - src/components/financials/invoice-table.tsx
    - src/components/financials/invoice-form.tsx
    - src/components/financials/revenue-chart.tsx
    - src/app/(admin)/financials/page.tsx
    - src/app/(admin)/revenue/page.tsx
    - src/app/api/revenue/route.ts
    - src/app/api/workspaces/route.ts
  modified:
    - src/components/layout/sidebar.tsx (added FileText/TrendingUp icons + Financials group)

decisions:
  - "InvoiceForm pre-populates Cold Outbound Retainer + Platform Fee from workspace billing config when workspace is selected"
  - "InvoiceForm accepts workspace billing fields directly (not re-fetching from DB) — passed as props from page"
  - "GET /api/workspaces created as new endpoint to serve billing fields for form dropdown — did not exist before"
  - "MRR computed as 3-month average of paid invoice totals (not sum of workspace retainer fields) — more accurate for invoices with variable amounts"
  - "Revenue page is client component (not server) — consistent with rest of codebase pattern"
  - "InvoiceTable shows empty state with icon when no invoices match filter"

metrics:
  duration_seconds: 301
  completed_date: "2026-03-04"
  tasks_completed: 2
  tasks_total: 2
  files_created: 8
  files_modified: 1
---

# Phase 22 Plan 04: Admin UI — Invoices Page + Revenue Dashboard + Sidebar Summary

**One-liner:** Sidebar Financials group (Invoices + Revenue links), full invoice management page with create form and action buttons, and revenue dashboard with 4 KPI cards, Recharts area chart, and per-client breakdown table.

## What Was Built

### Task 1: Sidebar update + Invoice list page + Create form

**`src/components/layout/sidebar.tsx`** — Added `FileText` and `TrendingUp` to lucide-react imports. Added "Financials" `NavGroup` with Invoices (/financials) and Revenue (/revenue) items, inserted before the dynamic Workspaces group (which in turn is before System).

**`src/components/financials/invoice-status-badge.tsx`** — Client component rendering a `Badge` with color-coded variants: draft (outline/gray), sent (blue custom), paid (emerald custom), overdue (destructive). Uses `Badge` from `@/components/ui/badge`.

**`src/components/financials/invoice-table.tsx`** — Client component with `InvoiceWithLineItems[]` prop. Columns: Invoice #, Client, Issue Date, Due Date, Total (GBP), Status, Actions. Action buttons per row: PDF (always visible, opens new tab), Send (draft/overdue only, POST to send route), Mark Paid (sent/overdue only, PATCH status). Uses `formatGBP` and `formatInvoiceDate`. Empty state with FileText icon when no invoices.

**`src/components/financials/invoice-form.tsx`** — Client Dialog component with workspace selector dropdown, issue date, billing period start/end, and dynamic line items (description/quantity/unit price in pounds). Real-time subtotal + tax + total preview. On workspace selection, auto-populates "Cold Outbound Retainer" and "Cold Outbound Platform Fee" line items from workspace billing config. Converts pounds to pence on submit via POST to /api/invoices.

**`src/app/(admin)/financials/page.tsx`** — Client page (`force-dynamic`). Fetches invoices from `/api/invoices` with workspace + status filter params. Fetches workspaces from `/api/workspaces` for form dropdown. Header with "New Invoice" InvoiceForm trigger. Filter bar with workspace and status dropdowns. InvoiceTable with refresh callback.

**`src/app/api/workspaces/route.ts`** — New `GET` endpoint (auto-fix Rule 2). Returns DB workspaces with billing fields (`billingRetainerPence`, `billingPlatformFeePence`, `invoiceTaxRate`, etc.) for the InvoiceForm dropdown. Previously no workspace list endpoint existed.

### Task 2: Revenue dashboard + Revenue API

**`src/app/api/revenue/route.ts`** — `GET /api/revenue?months=12`. Computes: total revenue (sum paid), outstanding (sum sent+overdue), overdue (sum overdue), MRR (3-month average of paid totals). Builds last N months time series by fetching paid invoices in window and grouping by month (YYYY-MM). Per-client breakdown via `prisma.invoice.groupBy` + workspace name join. Returns `RevenueResponse` typed interface exported for page import.

**`src/components/financials/revenue-chart.tsx`** — Client Recharts `AreaChart` following exact `ActivityChart` pattern. Props: `data: { month: string; revenuePence: number }[]`. Brand color `oklch(0.75 0.18 110)` with gradient fill. X-axis: month labels (Jan, Feb...). Y-axis: GBP formatted (`£X,XXX`). Custom tooltip using `formatGBP`.

**`src/app/(admin)/revenue/page.tsx`** — Client page (`force-dynamic`). Fetches from `/api/revenue`. 4 `MetricCard` KPIs in 2×2/4-col grid: Total Revenue (up trend), Outstanding (warning if >0), MRR (up trend), Overdue (down/red if >0). Monthly revenue `RevenueChart`. Per-client breakdown `Table` with client name/slug, total paid, invoice count, avg invoice.

## Task Commits

| Task | Commit  | Description                                                          |
|------|---------|----------------------------------------------------------------------|
| 1    | 771acf9 | feat(22-04): sidebar Financials group, invoice list page, invoice form, and status badge |
| 2    | 5886f36 | feat(22-04): revenue API, revenue chart, and revenue dashboard page  |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Endpoint] Added GET /api/workspaces**
- **Found during:** Task 1 (InvoiceForm workspace dropdown)
- **Issue:** InvoiceForm needs to list all workspaces with billing fields (billingRetainerPence, billingPlatformFeePence, invoiceTaxRate) to pre-populate line items. No GET /api/workspaces list endpoint existed — only per-slug routes under /api/workspaces/[slug]/.
- **Fix:** Created `src/app/api/workspaces/route.ts` with `GET` handler that returns all DB workspaces with relevant billing fields. Used `prisma.workspace.findMany` with `select` to return only needed fields. Ordered by name alphabetically.
- **Files created:** `src/app/api/workspaces/route.ts`
- **Commit:** 771acf9 (Task 1 commit)

## Self-Check: PASSED
