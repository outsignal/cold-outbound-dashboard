---
phase: 22-client-financials-invoicing
plan: "01"
subsystem: invoices
tags: [schema, prisma, invoicing, typescript, crud]
dependency_graph:
  requires: []
  provides:
    - Invoice model in DB
    - InvoiceLineItem model in DB
    - InvoiceSequence model in DB
    - InvoiceSenderSettings model in DB
    - Workspace billing fields
    - src/lib/invoices/types.ts
    - src/lib/invoices/format.ts
    - src/lib/invoices/numbering.ts
    - src/lib/invoices/operations.ts
  affects:
    - prisma/schema.prisma
    - Workspace model (13 new fields)
tech_stack:
  added: []
  patterns:
    - Integer pence storage for all monetary amounts
    - Snapshotting sender/client details at invoice creation time
    - Atomic DB transaction for sequential invoice number generation
    - Status machine with VALID_TRANSITIONS guard
key_files:
  created:
    - prisma/schema.prisma (Invoice, InvoiceLineItem, InvoiceSequence, InvoiceSenderSettings models)
    - src/lib/invoices/types.ts
    - src/lib/invoices/format.ts
    - src/lib/invoices/numbering.ts
    - src/lib/invoices/operations.ts
  modified:
    - prisma/schema.prisma (Workspace model billing fields)
decisions:
  - All monetary amounts stored as integer pence (never Float for currency)
  - InvoiceSenderSettings is a single global record (not per-workspace) — one sender for all invoices
  - Snapshotting sender + client details at creation time ensures invoice immutability
  - viewToken uses crypto.randomUUID() for secure portal access without auth
  - advanceRenewalDate handles month-end edge cases (Jan 31 -> Feb 28/29)
  - taxRate stored as Float on Invoice (e.g. 20 for 20%) but all computed amounts are integer pence
metrics:
  duration_seconds: 125
  completed_date: "2026-03-04"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 1
---

# Phase 22 Plan 01: Schema Foundation + Core Business Logic Summary

**One-liner:** Prisma invoice schema (4 models, 13 Workspace billing fields) with TypeScript types, GBP formatting, atomic numbering, and CRUD operations including status-machine transitions.

## What Was Built

### Task 1: Prisma Schema

Added 4 new models to `prisma/schema.prisma`:

- **InvoiceSenderSettings** — global sender details (name, address, email, bank account/sort code). Single record, updated via admin settings.
- **Invoice** — core invoice model with snapshotted bill-from/bill-to fields, all financial amounts as integer pence, status lifecycle (draft/sent/paid/overdue), delivery tracking (sentAt/paidAt), portal access (viewToken), overdue reminder tracking (reminderSentAt).
- **InvoiceLineItem** — line items with cascade delete on parent invoice. Stores description, quantity, unitPricePence, amountPence.
- **InvoiceSequence** — one row per workspace, atomically incremented for sequential invoice numbering (PS01, PS02...).

Added 13 billing fields to the **Workspace** model:
`billingCompanyName`, `billingAddressLine1`, `billingAddressLine2`, `billingCity`, `billingPostcode`, `invoicePrefix`, `invoiceTaxRate`, `billingRenewalDate`, `billingRetainerPence`, `billingPlatformFeePence`, `billingPaymentTermsDays`, `billingDaysBeforeRenewal`, `billingClientEmail`.

Applied via `prisma db push` — confirmed synced to Neon PostgreSQL.

### Task 2: TypeScript Library Files

**`src/lib/invoices/types.ts`**
- `InvoiceStatus` union type
- `InvoiceWithLineItems` — full Prisma Invoice shape with nested lineItems array
- `CreateInvoiceInput` — input shape for invoice creation
- `InvoiceSenderSettingsData` — settings shape
- `VALID_TRANSITIONS` map — state machine guard

**`src/lib/invoices/format.ts`**
- `formatGBP(pence)` — uses `Intl.NumberFormat("en-GB", { currency: "GBP" })` to produce £X.XX strings
- `penceToPounds(pence)` — returns decimal string to 2 decimal places
- `formatInvoiceDate(date)` — DD/MM/YYYY format for invoice display

**`src/lib/invoices/numbering.ts`**
- `getNextInvoiceNumber(workspaceSlug, prefix)` — atomic upsert+increment in Prisma transaction; returns e.g. "PS03"

**`src/lib/invoices/operations.ts`**
- `createInvoice(input)` — fetches workspace + sender settings, validates prefix/billing config, calls `getNextInvoiceNumber`, computes pence totals (subtotal, tax, total), builds snapshots for sender + client address, sets dueDate = issueDate + paymentTermsDays, generates `viewToken`, creates invoice with nested lineItems
- `getInvoice(id)` — findUnique with lineItems
- `getInvoiceByToken(token)` — findUnique by viewToken
- `listInvoices(filters?)` — findMany with optional workspaceSlug/status filters, descending issueDate
- `updateInvoiceStatus(id, newStatus)` — validates against VALID_TRANSITIONS, sets sentAt/paidAt timestamps, advances workspace.billingRenewalDate by 1 month when marked paid
- `advanceRenewalDate(date)` — month-end-safe date arithmetic (Jan 31 -> Feb 28)

## Commits

| Task | Commit  | Description                                              |
|------|---------|----------------------------------------------------------|
| 1    | f4607a7 | feat(22-01): add Invoice models and Workspace billing fields to schema |
| 2    | 8a930c6 | feat(22-01): add invoice types, GBP utilities, numbering, and CRUD operations |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
