# UI/UX Audit

**Analysis Date:** 2026-03-05

---

## 1. Page Inventory

### Admin Routes (`(admin)/` group)
All admin routes share `src/app/(admin)/layout.tsx` which wraps content in `AppShell` (sidebar + chat panel).

| Route | Page File | Type | Purpose |
|-------|-----------|------|---------|
| `/` | `src/app/(admin)/page.tsx` | Client-side | Dashboard with KPIs, charts, workspace overview |
| `/campaigns` | `src/app/(admin)/campaigns/page.tsx` | Server | Campaign list table across all workspaces |
| `/campaigns/[id]` | `src/app/(admin)/campaigns/[id]/page.tsx` | Server | Campaign detail with deploy/signal controls |
| `/signals` | `src/app/(admin)/signals/page.tsx` | Client-side | Signal intelligence dashboard |
| `/notifications` | `src/app/(admin)/notifications/page.tsx` | Client-side | System notifications table with filters |
| `/pipeline` | `src/app/(admin)/pipeline/page.tsx` | Client-side | Kanban board for sales prospects |
| `/onboard` | `src/app/(admin)/onboard/page.tsx` | Server | Proposals & onboarding invites list |
| `/onboard/new` | `src/app/(admin)/onboard/new/page.tsx` | Client-side | Create new proposal form |
| `/onboard/[id]` | `src/app/(admin)/onboard/[id]/page.tsx` | Server | Proposal detail |
| `/onboarding` | `src/app/(admin)/onboarding/page.tsx` | Server | Onboarding invites list (separate from /onboard) |
| `/onboarding/new` | `src/app/(admin)/onboarding/new/page.tsx` | Client-side | Create onboarding invite form |
| `/onboarding/[id]` | `src/app/(admin)/onboarding/[id]/page.tsx` | Server | Onboarding invite detail |
| `/clients` | `src/app/(admin)/clients/page.tsx` | Client-side | Active clients table |
| `/clients/[id]` | `src/app/(admin)/clients/[id]/page.tsx` | Server/Client | Client detail with task board |
| `/people` | `src/app/(admin)/people/page.tsx` | Client-side | People search with filters, bulk actions |
| `/people/[id]` | `src/app/(admin)/people/[id]/page.tsx` | Server | Person detail with timeline, tabs |
| `/companies` | `src/app/(admin)/companies/page.tsx` | Client-side | Company search page |
| `/lists` | `src/app/(admin)/lists/page.tsx` | Client-side | Lead lists index |
| `/lists/[id]` | `src/app/(admin)/lists/[id]/page.tsx` | Client-side | List detail with people table |
| `/email` | `src/app/(admin)/email/page.tsx` | Server | Email sender health across workspaces |
| `/webhook-log` | `src/app/(admin)/webhook-log/page.tsx` | Client-side | Webhook event log with search/filters |
| `/senders` | `src/app/(admin)/senders/page.tsx` | Client-side | LinkedIn sender accounts grid |
| `/linkedin-queue` | `src/app/(admin)/linkedin-queue/page.tsx` | Client-side | LinkedIn action execution queue |
| `/financials` | `src/app/(admin)/financials/page.tsx` | Client-side | Invoice management with create form |
| `/revenue` | `src/app/(admin)/revenue/page.tsx` | Client-side | Revenue dashboard with charts |
| `/agent-runs` | `src/app/(admin)/agent-runs/page.tsx` | Client-side | Agent execution monitor |
| `/enrichment-costs` | `src/app/(admin)/enrichment-costs/page.tsx` | Client-side | API spend tracking with charts |
| `/packages` | `src/app/(admin)/packages/page.tsx` | Server | Workspace package/quota overview |
| `/settings` | `src/app/(admin)/settings/page.tsx` | Server | Workspace connections & webhook config |
| `/workspace/[slug]` | `src/app/(admin)/workspace/[slug]/page.tsx` | Server | Workspace detail with campaigns/replies |
| `/workspace/[slug]/campaigns/[id]` | `src/app/(admin)/workspace/[slug]/campaigns/[id]/page.tsx` | Server | Workspace-scoped campaign detail |
| `/workspace/[slug]/inbox` | `src/app/(admin)/workspace/[slug]/inbox/page.tsx` | Server | Workspace inbox view |
| `/workspace/[slug]/inbox-health` | `src/app/(admin)/workspace/[slug]/inbox-health/page.tsx` | Server | Inbox health dashboard |
| `/workspace/[slug]/linkedin` | `src/app/(admin)/workspace/[slug]/linkedin/page.tsx` | Server | Workspace LinkedIn management |
| `/workspace/[slug]/settings` | `src/app/(admin)/workspace/[slug]/settings/page.tsx` | Server | Workspace settings form |

### Portal Routes (`(portal)/` group)
All portal routes share `src/app/(portal)/layout.tsx` with `PortalAppShell` (portal sidebar).

| Route | Page File | Type | Purpose |
|-------|-----------|------|---------|
| `/portal` | `src/app/(portal)/portal/page.tsx` | Server | Client dashboard with KPIs and campaigns |
| `/portal/campaigns` | `src/app/(portal)/portal/campaigns/page.tsx` | Server | Campaign list with approval cards |
| `/portal/campaigns/[id]` | `src/app/(portal)/portal/campaigns/[id]/page.tsx` | Server | Campaign detail with approval controls |
| `/portal/linkedin` | `src/app/(portal)/portal/linkedin/page.tsx` | Server | LinkedIn senders and activity |
| `/portal/billing` | `src/app/(portal)/portal/billing/page.tsx` | Server | Invoice history with PDF downloads |
| `/portal/login` | `src/app/(portal)/portal/login/page.tsx` | Client-side | Magic link login form |

### Customer Routes (`(customer)/` group)
Public-facing, no shell layout.

| Route | Page File | Purpose |
|-------|-----------|---------|
| `/o/[token]` | `src/app/(customer)/o/[token]/page.tsx` | Onboarding form (customer-facing) |
| `/p/[token]` | `src/app/(customer)/p/[token]/page.tsx` | Proposal view (customer-facing) |
| `/p/[token]/onboard` | `src/app/(customer)/p/[token]/onboard/page.tsx` | Post-acceptance onboarding |

### Other Routes
| Route | Page File | Purpose |
|-------|-----------|---------|
| `/login` | `src/app/login/page.tsx` | Admin password login |

---

## 2. Navigation & Routing

### Admin Sidebar Navigation
Defined in `src/components/layout/sidebar.tsx` with grouped, collapsible sections:

**Overview (always visible):** Dashboard `/`, Campaigns `/campaigns`, Signals `/signals`, Notifications `/notifications`

**Sales:** Pipeline `/pipeline`, Onboard `/onboard`, Clients `/clients`

**Data:** People `/people`, Companies `/companies`, Lists `/lists`

**Email:** Email Health `/email`, Webhook Log `/webhook-log`

**LinkedIn:** Senders `/senders`, LinkedIn Queue `/linkedin-queue`

**Financials:** Invoices `/financials`, Revenue `/revenue`

**Workspaces (dynamic):** One item per workspace `/workspace/[slug]`

**System (collapsed by default):** Agent Runs `/agent-runs`, Enrichment Costs `/enrichment-costs`, Packages `/packages`, Settings `/settings`

### Issues Found

**CRITICAL: Duplicate onboard/onboarding routes**
- `/onboard` and `/onboarding` are separate route groups that serve overlapping purposes
- `/onboard` = Proposals & Onboarding combined view (linked from sidebar as "Onboard")
- `/onboarding` = Standalone onboarding invites list (NOT in sidebar)
- The sidebar links to `/onboard`, but `/onboarding` exists as a separate, orphaned route tree
- `/onboarding/new` and `/onboard/new` are different pages (one creates onboarding invites, the other creates proposals)
- Files: `src/app/(admin)/onboard/page.tsx`, `src/app/(admin)/onboarding/page.tsx`

**Missing nav items for accessible routes:**
- `/workspace/[slug]/inbox` -- accessible but no direct sidebar link (must navigate via workspace detail)
- `/workspace/[slug]/inbox-health` -- accessible but no direct sidebar link
- `/workspace/[slug]/linkedin` -- accessible but no direct sidebar link
- `/workspace/[slug]/settings` -- accessible via workspace detail page Settings button
- `/workspace/[slug]/campaigns/[id]` -- accessible via workspace campaign table links

**Mobile navigation:**
- Admin: `src/components/layout/mobile-menu-button.tsx` -- hamburger button opens full sidebar overlay. Works correctly.
- Portal: `src/components/portal/portal-mobile-menu.tsx` -- same pattern, works correctly.
- Both close on backdrop click and have aria labels on open/close buttons.

### Portal Sidebar Navigation
Defined in `src/components/portal/portal-sidebar.tsx`:
- Dashboard `/portal`, Campaigns `/portal/campaigns`, LinkedIn `/portal/linkedin`, Billing `/portal/billing`
- Sign Out button, Collapse toggle
- Shows workspace name in header

**No dead links detected in portal navigation.**

---

## 3. Loading States

### Pages WITH loading.tsx files (25 total):
- `src/app/(admin)/loading.tsx` -- root admin skeleton (catches all admin routes as fallback)
- `src/app/(admin)/campaigns/loading.tsx`
- `src/app/(admin)/campaigns/[id]/loading.tsx`
- `src/app/(admin)/clients/loading.tsx`
- `src/app/(admin)/clients/[id]/loading.tsx`
- `src/app/(admin)/people/loading.tsx`
- `src/app/(admin)/people/[id]/loading.tsx`
- `src/app/(admin)/lists/loading.tsx`
- `src/app/(admin)/lists/[id]/loading.tsx`
- `src/app/(admin)/senders/loading.tsx`
- `src/app/(admin)/notifications/loading.tsx`
- `src/app/(admin)/agent-runs/loading.tsx`
- `src/app/(admin)/email/loading.tsx`
- `src/app/(admin)/onboard/[id]/loading.tsx`
- `src/app/(admin)/onboarding/[id]/loading.tsx`
- `src/app/(admin)/workspace/[slug]/loading.tsx`
- `src/app/(admin)/workspace/[slug]/campaigns/[id]/loading.tsx`
- `src/app/(admin)/workspace/[slug]/inbox/loading.tsx`
- `src/app/(admin)/workspace/[slug]/inbox-health/loading.tsx`
- `src/app/(admin)/workspace/[slug]/linkedin/loading.tsx`
- `src/app/(admin)/workspace/[slug]/settings/loading.tsx`
- `src/app/(portal)/portal/loading.tsx`
- `src/app/(portal)/portal/campaigns/loading.tsx`
- `src/app/(portal)/portal/campaigns/[id]/loading.tsx`
- `src/app/(portal)/portal/linkedin/loading.tsx`

### Pages MISSING dedicated loading.tsx (fall back to admin root skeleton):
- `src/app/(admin)/companies/page.tsx` -- client-side, has inline skeleton
- `src/app/(admin)/financials/page.tsx` -- client-side, has inline loading state
- `src/app/(admin)/revenue/page.tsx` -- client-side, has inline skeleton
- `src/app/(admin)/enrichment-costs/page.tsx` -- client-side, has inline skeleton
- `src/app/(admin)/pipeline/page.tsx` -- client-side, has inline skeleton
- `src/app/(admin)/webhook-log/page.tsx` -- client-side, has inline skeleton
- `src/app/(admin)/linkedin-queue/page.tsx` -- client-side, has inline skeleton
- `src/app/(admin)/settings/page.tsx` -- server component, no loading
- `src/app/(admin)/packages/page.tsx` -- server component, no loading
- `src/app/(admin)/signals/page.tsx` -- client-side, has inline skeleton
- `src/app/(admin)/onboard/page.tsx` -- server component, no loading
- `src/app/(admin)/onboard/new/page.tsx` -- client-side form, no loading needed
- `src/app/(admin)/onboarding/page.tsx` -- server component, no loading
- `src/app/(admin)/onboarding/new/page.tsx` -- client-side form, no loading needed
- `src/app/(portal)/portal/billing/page.tsx` -- server component, no loading

**Assessment:** Client-side pages handle their own loading states inline with skeleton components. Server-rendered pages (`settings`, `packages`, `onboard`, `onboarding`, `billing`) lack dedicated loading.tsx files and rely on the root admin skeleton, which is adequate but generic. The root admin skeleton at `src/app/(admin)/loading.tsx` renders a 4-column grid skeleton that does not match the layout of pages like Settings or Packages.

---

## 4. Error States

### Pages WITH error.tsx files (18 total):
- `src/app/(admin)/error.tsx` -- root admin error boundary (catches all)
- `src/app/(admin)/campaigns/[id]/error.tsx`
- `src/app/(admin)/clients/[id]/error.tsx`
- `src/app/(admin)/people/[id]/error.tsx`
- `src/app/(admin)/lists/[id]/error.tsx`
- `src/app/(admin)/onboard/[id]/error.tsx`
- `src/app/(admin)/onboarding/[id]/error.tsx`
- `src/app/(admin)/email/error.tsx`
- `src/app/(admin)/workspace/[slug]/error.tsx`
- `src/app/(admin)/workspace/[slug]/campaigns/[id]/error.tsx`
- `src/app/(admin)/workspace/[slug]/inbox/error.tsx`
- `src/app/(admin)/workspace/[slug]/inbox-health/error.tsx`
- `src/app/(admin)/workspace/[slug]/linkedin/error.tsx`
- `src/app/(admin)/workspace/[slug]/settings/error.tsx`
- `src/app/(portal)/portal/error.tsx`
- `src/app/(portal)/portal/campaigns/error.tsx`
- `src/app/(portal)/portal/campaigns/[id]/error.tsx`
- `src/app/(portal)/portal/linkedin/error.tsx`

### Pages MISSING error.tsx (rely on root error boundary):
- All top-level list pages (`/campaigns`, `/clients`, `/people`, `/companies`, `/lists`, etc.)
- All system pages (`/agent-runs`, `/enrichment-costs`, `/packages`, `/settings`)
- `/pipeline`, `/notifications`, `/financials`, `/revenue`
- `/onboard`, `/onboard/new`, `/onboarding`, `/onboarding/new`
- `/portal/billing`

**Assessment:** The root admin error boundary at `src/app/(admin)/error.tsx` provides a decent fallback with branded logo, error message, and "Try again" button. Detail pages (`[id]` routes) consistently have their own error boundaries. List pages rely on the root boundary, which is acceptable. Client-side pages handle fetch errors inline with retry buttons.

### Inline error handling patterns:
- **People search:** Red banner with retry button (`src/components/search/people-search-page.tsx:374`)
- **Enrichment costs:** Red banner with retry button (`src/app/(admin)/enrichment-costs/page.tsx:175`)
- **Webhook log:** Red banner with retry button (`src/app/(admin)/webhook-log/page.tsx:274`)
- **Senders:** Red destructive text banner (`src/app/(admin)/senders/page.tsx:138`)
- **Dashboard:** Inline error text in chart area (`src/app/(admin)/page.tsx:276`)
- **Workspace detail:** Red banner for API errors (`src/app/(admin)/workspace/[slug]/page.tsx:105`)

**Inconsistency:** Error banners use two different patterns:
1. `bg-red-50 border border-red-200 ... text-red-800` (most pages)
2. `bg-destructive/10 text-destructive` (document upload)

These should be unified into a reusable error banner component.

---

## 5. Empty States

### Pages WITH proper empty states:
- **Campaigns:** Icon + "No campaigns yet" message + guidance (`src/app/(admin)/campaigns/page.tsx:187`)
- **People search:** Large icon + "No people found" + contextual message (`src/components/search/people-search-page.tsx:458`)
- **Clients:** Icon + "No active clients yet" + guidance (`src/app/(admin)/clients/page.tsx:507`)
- **Pipeline:** Full empty state with icon, title, description, CTA button (`src/app/(admin)/pipeline/page.tsx:702`)
- **Pipeline (search):** Contextual "No prospects match" message (`src/app/(admin)/pipeline/page.tsx:741`)
- **Senders:** Uses `EmptyState` component with CTA (`src/app/(admin)/senders/page.tsx:154`)
- **Settings:** "No workspaces configured" row in table (`src/app/(admin)/settings/page.tsx:158`)
- **Notifications:** Icon + "No notifications yet" (`src/app/(admin)/notifications/page.tsx:405`)
- **Workspace campaigns:** "No campaigns found" row (`src/app/(admin)/workspace/[slug]/page.tsx:211`)
- **Workspace replies:** "No replies yet" row (`src/app/(admin)/workspace/[slug]/page.tsx:260`)
- **Portal campaigns:** Uses `EmptyState` component (`src/app/(portal)/portal/campaigns/page.tsx:56`)
- **Portal dashboard campaigns:** Custom empty state with icon (`src/app/(portal)/portal/page.tsx:244`)
- **Portal billing:** Custom empty state with Receipt icon (`src/app/(portal)/portal/billing/page.tsx:50`)
- **Portal LinkedIn:** Uses `EmptyState` component (`src/app/(portal)/portal/linkedin/page.tsx:124`)
- **Webhook log:** Custom `EmptyState` with contextual messages based on filters (`src/app/(admin)/webhook-log/page.tsx:65`)
- **Signals charts:** "No signal data" inline messages (`src/app/(admin)/signals/page.tsx:341`)
- **Revenue chart:** Icon + "No paid invoices yet" (`src/app/(admin)/revenue/page.tsx:124`)
- **Person detail tabs:** "No email history", "No LinkedIn activity", "No enrichment data" messages

### Reusable EmptyState component:
`src/components/ui/empty-state.tsx` -- Well-designed with icon, title, description, optional action button. Used in senders, portal campaigns, portal linkedin.

**Issue:** Many pages implement ad-hoc empty states instead of using the `EmptyState` component. The ad-hoc implementations are inconsistent:
- Some use table row `colSpan` with centered text
- Some use full-page centered layouts with icons
- Some include CTA buttons, others do not

---

## 6. Form Validation

### Forms analyzed:

**Add Client Dialog** (`src/app/(admin)/clients/page.tsx:212`):
- Client Name: `required` attribute + disabled submit when empty
- Contact Email: `type="email"` for browser validation
- Other fields: optional, no validation
- Missing: No inline validation messages, no field-level error display

**Add Prospect Dialog** (`src/app/(admin)/pipeline/page.tsx:576`):
- Company Name: `required` attribute
- Contact Email: `type="email"`
- Missing: No inline validation, no error feedback on submit failure

**Edit Prospect Dialog** (`src/app/(admin)/pipeline/page.tsx:865`):
- Company Name: `required`
- Missing: Same issues as Add Prospect

**Admin Login** (`src/app/login/page.tsx`):
- Password: `required` attribute
- Error display: Red banner above form
- Good: Shows "Signing in..." during submission

**Portal Login** (`src/app/(portal)/portal/login/page.tsx`):
- Email: `required`, `type="email"`
- Error display: Red banner, success state shows "Check your email"
- Good: Shows "Sending..." during submission, handles expired link error from URL params

**Create Proposal** (`src/app/(admin)/onboard/new/page.tsx`):
- Client Name, Contact Email: `required`
- Missing: No field-level errors

**Create Onboarding Invite** (`src/app/(admin)/onboarding/new/page.tsx`):
- Client Name: `required`
- Missing: No field-level errors

**Invoice Form** (`src/components/financials/invoice-form.tsx`):
- Not fully audited but uses `required` attributes

### Issues:
1. **No field-level validation messages** -- All forms rely on HTML5 `required` and `type` attributes. No custom error messages shown next to fields.
2. **No required field indicators** -- No asterisk (*) or visual indicator on required fields in most forms. Exception: some `Label` elements include "* " in text.
3. **Silent submit failures** -- Several forms catch errors but don't display them (e.g., `AddClientDialog` has no error state display).
4. **Missing error toast** -- Comment in `src/components/clients/client-task-board.tsx:63`: "Could show an error toast here" -- confirms pattern is absent.

---

## 7. Responsive Design

### Layouts:

**Admin Shell** (`src/components/layout/app-shell.tsx`):
- Sidebar: `hidden md:flex` -- hidden on mobile, visible from `md` breakpoint
- Mobile menu: Floating hamburger button visible below `md`
- Main content: `flex-1 overflow-auto`

**Portal Shell** (`src/components/portal/portal-app-shell.tsx`):
- Same pattern as admin: `hidden md:flex` for sidebar, mobile menu below `md`

### Page-level responsive patterns:

**Dashboard** (`src/app/(admin)/page.tsx`):
- KPI grid: `grid-cols-2 md:grid-cols-3` -- good
- Secondary KPIs: `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` -- good

**Pipeline** (`src/app/(admin)/pipeline/page.tsx`):
- Desktop: Horizontal scrollable columns `hidden lg:flex`
- Mobile: Tabs layout `lg:hidden` -- excellent responsive pattern

**People Search** (`src/components/search/people-search-page.tsx`):
- Filter sidebar shown alongside table -- **Issue: no responsive handling**. On mobile, the sidebar and table stack vertically via `flex gap-6`, but the `FilterSidebar` has no mobile-specific handling (no collapse/drawer behavior).

**Senders** (`src/app/(admin)/senders/page.tsx`):
- Card grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` -- good

**Signals** (`src/app/(admin)/signals/page.tsx`):
- Summary cards: `grid-cols-1 md:grid-cols-3` -- good
- Tables use horizontal scrolling from Card wrapper

**Header** (`src/components/layout/header.tsx`):
- `flex-col gap-3 sm:flex-row sm:items-center` -- stacks on mobile, row on desktop. Good.
- Title and description truncate.

### Issues:
1. **People/Companies filter sidebar not responsive** -- `FilterSidebar` component renders as a fixed side panel. On small screens it compresses the main content rather than collapsing to a drawer/modal.
2. **LinkedIn Queue metric cards** -- `grid-cols-4 gap-4` without responsive breakpoints. On mobile, 4 columns will be very cramped.
3. **Admin loading skeleton** -- `grid-cols-4 gap-3` without responsive breakpoints.
4. **Mobile header padding overlap** -- Mobile hamburger button is `fixed top-3 left-3` while the Header has `px-4 py-4` on mobile. The hamburger overlaps with page content since there's no `pl-14` offset on mobile.

---

## 8. Accessibility

### Positive findings:
- Mobile menu buttons have `aria-label="Open navigation menu"` / `aria-label="Close navigation menu"`
- Search icons use `aria-hidden="true"`
- Empty state icons use `aria-hidden="true"`
- Checkboxes have `aria-label` in people search (e.g., `aria-label="Select all on page"`, `aria-label="Select {email}"`)
- Filter chip remove buttons have `aria-label={`Remove ${label} filter`}`
- Select triggers have `aria-label` attributes
- Severity icons in notifications have `role="img"` and `aria-label`
- Filter chip remove buttons have descriptive aria-labels
- Focus-visible styles defined in Button and Badge components

### Issues:
1. **No skip-to-content link** -- Neither admin nor portal shells include a "skip to main content" link for keyboard users.
2. **Sidebar navigation has no `<nav>` landmark with `aria-label`** -- The sidebar renders a `<nav>` element but without `aria-label` (e.g., "Main navigation").
3. **Portal sidebar lacks landmark** -- Same issue.
4. **Tables lack `aria-label` or `caption`** -- Data tables across the app have no descriptive labels for screen readers.
5. **Notification click-to-mark-read has no keyboard equivalent** -- `TableRow onClick` for marking notifications as read is not keyboard-accessible (no `onKeyDown`, no `role="button"`, no `tabIndex`).
6. **Pipeline prospect card click** -- `div onClick` without keyboard handling or role. The pipeline eslint disable comment at line 269 confirms awareness of this.
7. **Color contrast on muted text** -- `text-muted-foreground/50` and `text-muted-foreground/40` classes used extensively may have insufficient contrast ratios against dark backgrounds.
8. **Sidebar collapse state** -- When collapsed, items rely on tooltips but icon-only navigation may be confusing for screen readers. Each link still has text in the DOM (conditionally rendered based on `isCollapsed`), so screen readers won't read the label when collapsed.
9. **Limited `aria-label` on icon-only buttons** -- Some icon-only buttons (e.g., dropdown triggers, edit actions) lack `aria-label`.

---

## 9. Component Consistency

### Button usage:
Variants defined in `src/components/ui/button.tsx`:
- `default` (primary dark), `destructive`, `outline`, `secondary`, `ghost`, `link`, `brand` (dark bg -> brand on hover)

**Consistency issue:** The "brand" variant behavior (`bg-foreground -> hover:bg-brand`) is unusual. Most primary actions use `default` variant, but CTA buttons use `brand`. This creates visual inconsistency where primary actions look different depending on which variant was chosen.

### Badge usage:
Variants defined in `src/components/ui/badge.tsx`:
- `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`, `brand`, `success`, `warning`

**Consistency issue:** Status badges across pages use different color approaches:
- Campaign status: Inline `className` with hardcoded colors (`bg-zinc-700 text-zinc-300`, `bg-purple-900/60 text-purple-300`)
- Pipeline status: Inline Tailwind classes (`bg-slate-100 text-slate-600`)
- Portal status badges: Inline classes (`bg-emerald-100 text-emerald-800`)
- These bypass the Badge variant system entirely.

### Error banner inconsistency:
Three different patterns observed across the codebase:
1. `bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800` (most common)
2. `bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between` + retry button (enrichment costs, webhook log, people search)
3. `bg-destructive/10 text-destructive` (document upload)
4. `rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm` (senders)

**Recommendation:** Create a reusable `ErrorBanner` component.

### Card density:
Some cards use `density="compact"` prop (signals, enrichment costs) while others do not. This creates subtle spacing differences.

### Heading styles:
- Some pages use `font-heading` class on card titles, others do not
- Admin pages use `Header` component consistently
- Portal pages use inline `h1` elements with `font-heading font-bold`

---

## 10. Portal vs Admin

### Branding consistency:
- Both use the same `OutsignalLogo` component
- Both use the same sidebar visual treatment (dark background, same border styles)
- Portal shows "Client Portal" label + workspace name in sidebar header -- good differentiation
- Both use the same `MetricCard`, `Badge`, `Table`, `Card` components

### Access control:
- Portal: `getPortalSession()` call in layout.tsx, redirects to login if not authenticated
- Portal login: Magic link via email, no password
- Admin: Cookie-based authentication via `src/app/api/admin/login/route.ts`
- Portal API routes: Under `/api/portal/` with session validation
- Admin API routes: Under `/api/` with admin session/auth checks

**Issue: Portal has no not-found page at route level** -- There is `src/app/(portal)/portal/not-found.tsx` but it's only triggered by explicit `notFound()` calls. If a user navigates to `/portal/nonexistent`, Next.js will show the root `not-found.tsx` which links to Dashboard (`/`) -- not the portal dashboard.

### Visual differentiation:
- Admin sidebar: Active item has `border-l-3 border-brand` (3px left border)
- Portal sidebar: Active item has `border-l-2 border-brand` (2px left border)
- Minor inconsistency that clients likely won't notice

### Feature parity:
Portal clients can:
- View campaign performance
- Approve/request changes on leads and content
- View LinkedIn sender activity and health
- Download invoice PDFs
- Add LinkedIn accounts

Portal clients cannot:
- View individual people/leads
- See webhook logs
- Access system/operational pages

This is appropriate for the client-facing nature of the portal.

---

## 11. Missing UI for Backend Features

### APIs with no corresponding admin UI:

1. **`/api/people/import`** -- Bulk people import API exists but no UI to upload CSVs or trigger imports
2. **`/api/enrichment/run`** -- Enrichment run API exists but no UI to trigger enrichment runs (only viewable costs)
3. **`/api/enrichment/jobs/process`** -- Enrichment job processing with no UI
4. **`/api/chat`** -- Chat API exists; `ChatPanel` component renders in `AppShell` but was not visible in audit (may be collapsed/hidden)
5. **`/api/domains/suggest`** -- Domain suggestion API with no visible admin UI
6. **`/api/companies/search`** -- Company search API used by `CompaniesSearchPage` (OK -- this has UI)
7. **`/api/workspace/[slug]/provision-emailbison`** -- EmailBison provisioning with no dedicated UI button
8. **`/api/workspace/[slug]/configure`** -- Workspace configuration API, used by workspace settings form
9. **`/api/stripe/checkout`** and `/api/stripe/webhook` -- Stripe integration with no visible checkout flow in portal UI
10. **`/api/extension/*`** -- Browser extension API endpoints (auth, login, senders, cookies) with no admin UI to manage extension sessions
11. **`/api/invoice-settings`** -- Invoice settings API with no visible UI page
12. **`/api/cron/session-refresh`** -- Cron endpoint, OK to have no UI
13. **`/api/pipeline/signal-campaigns/process`** -- Signal campaign processing, OK as cron/background
14. **`/api/linkedin/maintenance`** -- LinkedIn maintenance endpoint, no admin UI to trigger/view
15. **`/api/linkedin/connections/check`** -- Connection check API, no direct UI

### Features with partial UI:
- **Enrichment:** Can view costs but cannot trigger enrichment from admin UI
- **Email sending:** Can manage senders but no UI to compose/send test emails
- **Signal campaigns:** Can view signals dashboard but cannot configure signal rules from UI (must use workspace settings)

---

## 12. Toast/Notification UX

### Current state: No toast system installed

The codebase has **no toast/notification library**. There is a single code comment acknowledging this gap:
- `src/components/clients/client-task-board.tsx:63`: `"// Could show an error toast here"`

### How success/error feedback is currently shown:

**Success patterns:**
- Form dialogs close on success (e.g., Add Client, Add Prospect) -- no confirmation message
- `InvoiceForm` closes on success -- no confirmation
- Optimistic UI updates (pipeline status changes, notification mark-as-read) with silent revert on failure
- Page refresh via `router.refresh()` or state re-fetch

**Error patterns:**
- Inline red banners above/within content area
- `setError()` state displayed in UI
- Some fetch errors are silently swallowed (e.g., `catch {}` in sidebar notification count, LinkedIn queue auto-refresh, agent runs auto-refresh)

### Issues:
1. **No success feedback** -- Users perform actions (create client, send invoice, add to list, mark notification read) with no visible confirmation. They must infer success from the dialog closing or data refreshing.
2. **No error feedback for many operations** -- Optimistic updates revert silently on failure. The user doesn't know something went wrong.
3. **Silent error swallowing** -- Many `catch {}` blocks with no user feedback at all.

**Recommendation:** Install `sonner` or similar toast library. Add to root layout. Show toasts for: create/update/delete success, API errors, copy-to-clipboard confirmation.

---

## 13. Table UX

### Pagination:

**Pages with pagination:**
- People search: Previous/Next buttons + "Page X of Y" + "Showing X-Y of Z" range
- Notifications: Previous/Next buttons + "Page X of Y"
- Webhook log: Previous/Next buttons + "Page X of Y . Z total"
- LinkedIn queue: Previous/Next buttons + "Page X of Y"
- Agent runs: Previous/Next buttons + "Page X of Y"

**Pages WITHOUT pagination (potential issue for large datasets):**
- Campaigns list -- fetches all campaigns
- Clients list -- fetches all clients
- Onboarding invites -- fetches all
- Packages -- fetches all workspaces
- Settings -- fetches all workspaces
- Portal billing -- fetches all invoices

**Pagination inconsistency:**
- People search uses custom `<button>` elements for Previous/Next
- Notifications uses `<Button variant="outline">` components
- Webhook log uses `<Button variant="outline">`
- LinkedIn queue uses `<Button variant="outline" className="h-7 text-xs">`

The button styling differs between pages. People search pagination buttons are custom-styled inline elements while other pages use the `Button` component.

### Sorting:
- **No client-side sorting** on any table. All tables display data in server-provided order (typically `createdAt desc` or `updatedAt desc`).
- No sortable column headers anywhere in the app.

### Filtering:

**Pages with filtering:**
- People search: FilterSidebar with verticals, enrichment status, workspace, company + search input + filter chips
- Companies search: Similar to people (uses `CompaniesSearchPage`)
- Notifications: Type, severity, workspace dropdown filters
- Webhook log: Search + workspace dropdown + toggle chips (Errors, Replies, 24h, 7d)
- Senders: Workspace dropdown filter
- LinkedIn queue: Status, action type, workspace, sender dropdowns
- Agent runs: Agent type, status, workspace dropdowns
- Financials: Workspace + status dropdowns
- Enrichment costs: Date range inputs
- Signals: Workspace dropdown
- Dashboard: Workspace + time period filters via `ClientFilter` component

**Pages WITHOUT filtering (potential need):**
- Campaigns list -- no filter for status, workspace, type
- Clients list -- no filter for campaign type, workspace
- Onboarding invites -- no filters
- Pipeline -- has search but no status filter (Kanban layout makes this less necessary)

### Search:

**Pages with search:**
- People search: Debounced text input (300ms) with URL state persistence
- Companies search: Same pattern
- Webhook log: Debounced search by email address
- Pipeline: Instant search filter

**URL state persistence:**
- People search, companies search, webhook log, LinkedIn queue, agent runs: Use `nuqs` for URL-persisted filter state (bookmarkable)
- Notifications, financials, senders: Use local component state (not URL-persisted)

### Bulk actions:
- People search: Checkbox selection with "Select all on page" / "Select all matching" + BulkActionBar with AddToListDropdown
- No other tables have bulk actions

### Table styling consistency:
Tables consistently use the shared `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` components from `src/components/ui/table.tsx`. However:

**Inconsistency in table wrapping:**
- Most tables are wrapped in `<Card><CardContent className="p-0">`
- Signals page uses raw `<table>` elements instead of the shared Table component
- Some tables have `<CardHeader>` with title, others don't

**Row count display:**
- Some pages show "X campaigns" / "X clients" text above the table
- Others show it in the filter bar area
- Format varies: "X campaign(s)" vs "X event(s)" vs "X total"

---

## Summary of Critical Issues

### High Priority (User-Facing Impact)

1. **No toast/notification system** -- Users get no confirmation of successful actions. Install `sonner` and add feedback for all mutations.

2. **Duplicate `/onboard` and `/onboarding` routes** -- Confusing and potentially causes issues. Consolidate into one route tree.

3. **People/Companies filter sidebar not mobile-responsive** -- On small screens the filter sidebar compresses content unusably. Convert to a slide-out drawer on mobile.

4. **LinkedIn Queue metric cards not responsive** -- `grid-cols-4` without breakpoints causes cramped layout on mobile.

5. **Mobile hamburger overlaps content** -- No padding offset for the fixed-position hamburger button on mobile views.

### Medium Priority (Polish)

6. **Error banner pattern inconsistency** -- 4+ different error banner implementations. Create a reusable `ErrorBanner` component.

7. **Badge/status color inconsistency** -- Campaign status, pipeline status, and portal status badges all use different hardcoded color schemes instead of Badge variants.

8. **No form field validation messages** -- All forms rely on HTML5 browser defaults. Add inline validation with error messages.

9. **Missing loading.tsx for server-rendered pages** -- `settings`, `packages`, `onboard`, `onboarding`, `billing` use generic fallback skeleton that doesn't match their layout.

10. **Table pagination button inconsistency** -- People search uses custom buttons while other pages use `Button` component with varying sizes.

### Low Priority (Accessibility/Quality)

11. **No skip-to-content link** -- Accessibility best practice for keyboard navigation.

12. **Notification row keyboard accessibility** -- Click-to-mark-read lacks keyboard handling.

13. **Pipeline card keyboard accessibility** -- Card click handler lacks keyboard event handling.

14. **Missing aria-labels** -- Tables, some icon buttons, and navigation landmarks need labels.

15. **No table sorting** -- All tables are unsortable. May be acceptable for current data volumes.

16. **Several APIs without UI** -- People import, enrichment triggers, Stripe checkout flow, extension management have no admin UI.

---

*UI/UX audit: 2026-03-05*
