# Phase 22: Client Financials & Invoicing - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Invoice management for Outsignal's client workspaces — replacing the current Google Docs manual invoicing process. Covers invoice creation, PDF generation, client portal billing view, revenue dashboard, and auto-generation tied to client billing cycles. Proposals/quotes are already handled by the existing onboarding flow — this phase is invoices only.

</domain>

<decisions>
## Implementation Decisions

### Document type & structure
- **Invoices only** — no quotes needed (existing Proposal/onboarding handles quoting)
- Billing model: package tiers that are monthly retainers
- Two standard line items per invoice: "Cold Outbound Retainer" + "Cold Outbound Platform Fee" (amounts vary by client package)
- Line item descriptions include billing period dates (e.g. "26/01/2026 - 23/02/2026")
- Invoice numbering: client prefix + sequential number (e.g. PS03 = Paytier Solutions, 3rd invoice)
- Currency: GBP only
- Tax: configurable per client (default 0%, can set 20% VAT or other rates)
- Subtotal, tax rate, tax amount, and total shown on invoice

### Sender details (from)
- Not a company — invoices come from Jonathan personally
- Sender details (name, address, email) stored in admin settings and auto-filled on invoices
- Bank details (account number + sort code) stored in settings, auto-added to PDF notes section
- Must be configurable/editable (not hardcoded)

### Bill-to details (client)
- Full company name + registered address
- Stored per workspace/client — auto-filled when creating invoice for a workspace
- Need fields: company name, address line 1, address line 2, city, postcode

### Auto-generation & billing cycle
- System automatically generates invoices on a monthly cycle per client
- Billing cycle starts from when the client first paid (not fixed 1st of month)
- Each workspace needs a `billingStartDate` or `renewalDate` field
- Invoice generated 7 days before renewal date
- 5-day payment terms from invoice date
- If unpaid 48 hours before renewal: Slack alert to admin (NOT automatic inbox cancellation — manual decision)

### Client portal visibility
- Clients see a "Billing" tab in their portal at portal.outsignal.ai
- Shows invoice history with status and PDF download
- No accept/reject needed (invoices, not quotes)

### Invoice delivery
- Admin clicks "Send" button to email invoice
- Branded email via Resend with PDF attached
- Not automatic on creation — admin reviews first, then sends

### Overdue handling
- Auto-detect overdue invoices (past due date)
- Send reminder email to client when overdue
- Slack notification to admin

### Payment tracking
- Manual status change — admin marks as "Paid" when bank transfer received
- No Stripe integration (future phase if needed)
- Status workflow: DRAFT → SENT → PAID (with OVERDUE as auto-detected state)

### Revenue dashboard
- New "Financials" sidebar group with sub-items: Invoices, Revenue
- 4 KPI cards: Total Revenue (paid), Outstanding (unpaid), Monthly Recurring Revenue, Overdue amount
- Line chart showing revenue over time (matching existing admin dashboard style)
- Per-client breakdown table

### Navigation
- New top-level "Financials" group in admin sidebar
- Sub-items: Invoices (list + create), Revenue (dashboard)

### Claude's Discretion
- Exact PDF layout and styling (should match the Google Doc format closely — clean, professional)
- Revenue chart implementation (Recharts, matching existing dashboard patterns)
- Filter/sort options on invoice list page
- Date range filtering approach on revenue page

</decisions>

<specifics>
## Specific Ideas

- Current invoice format from Google Docs: header "INVOICE", sender details top-left, bill-to top-right, invoice # / date / due date / amount due in a row, line items table (Items, Description, Quantity, Price, Amount), notes section with bank details, subtotal/tax/total at bottom
- Invoice number format: 2-letter client prefix + sequential (PS03, LR01, etc.) — derive prefix from workspace slug or let admin set it
- Line item descriptions typically include date ranges for the billing period
- Bank details shown in "NOTES" section at bottom-left of PDF: Account Number + Sort Code
- Due date is typically invoice date + 5 days (configurable per client if needed)
- "I am using Google Docs and struggling to maintain it" — this is a pain point, needs to be significantly easier than the manual process

</specifics>

<deferred>
## Deferred Ideas

- Stripe payment integration — collect payments online, auto-mark as paid (future phase)
- Automatic inbox cancellation for non-payment — keep as manual admin decision for now
- Multi-currency support (USD, EUR) — GBP only for now
- Recurring invoice templates — the auto-generation covers this use case
- Credit notes / refunds — not needed yet
- Xero/QuickBooks export — future accounting integration

</deferred>

---

*Phase: 22-client-financials-invoicing*
*Context gathered: 2026-03-04*
