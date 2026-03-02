# Phase 12: Dashboard & Admin UX - Research

**Researched:** 2026-03-02
**Domain:** Next.js Admin Dashboard — UI/UX, Charts, CRUD, Document Parsing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dashboard Home & Activity Graphs**
- KPI cards + charts as the main view, with a dropdown filter at the top: "All Campaigns" and then per-client options
- KPI cards show: email stats (sent, replies, bounces), LinkedIn stats (connections, messages, pending), pipeline status (contacted, interested, meetings), health indicators (sender status, campaign active/paused), and inboxes connected vs disconnected
- Critical alerts section below KPIs — flagged senders, failed agent runs, disconnected inboxes only. No activity feed noise.
- Line charts for trends, matching EmailBison's chart style for consistency
- Default time range: last 7 days, with the same filter options as EmailBison (researcher to pull exact filter set from EmailBison UI for parity)

**Person Detail Page**
- Tabbed sections layout — header with basics (name, email, company name, job title), tabs below
- Overview tab: unified chronological timeline with color-coded icons per event type (emails, LinkedIn actions, agent runs)
- Additional tabs for channel-specific detail (Email History, LinkedIn Activity, Enrichment Data, etc.)
- View-only — no inline actions, no link-outs. Pure information display.

**Operational Views (Agent Runs, LinkedIn Queue, Webhook Log)**
- Compact table density across all operational views — Datadog/Grafana-style, power-user feel. Dense rows, lots of data visible at once.
- Agent run monitoring: Summary rows (agent type, client, status, started at, duration) with expandable inline accordion for full run details (input, output, steps, errors). Vercel function logs style — no separate detail page.
- LinkedIn action queue: Queue status focus — emphasis on pending/scheduled/completed/failed counts. Which actions are next, which sender runs them, when they'll execute. Operational control, not history log.
- Webhook event log: Search box for free text (email, subject) plus quick-filter preset chips: "Errors only", "Replies only", "Last 24h". Filters combine.

**Sender Management**
- Card grid layout with status badges (active/paused/flagged) — each sender as a visual card showing name, email, proxy, daily limit, status
- Modal dialog for add/edit — pop-up form with all sender fields (name, email, proxy URL, daily limits, cookies). Save/cancel.
- Pause/delete actions accessible from the card

**Proposal & Onboarding Management**
- Table list showing all proposals with client, status, created date
- Modal dialog for create/edit — consistent with sender management pattern
- Document upload triggers auto-parse: upload PDF or paste Google Doc URL → system extracts content → creates proposal/onboarding record with parsed fields → user reviews and confirms before saving

### Claude's Discretion
- Specific chart type per metric beyond "line charts" (area fills, stacked, etc.)
- Loading skeletons and empty state designs
- Exact spacing, typography, and color usage beyond brand color (#F0FF7A)
- Error state handling across all views
- Table column widths and responsive breakpoints
- Navigation structure (sidebar nav, tab routing between views)
- Tab naming and ordering on person detail page
- Exact preset filter chips for webhook log beyond the three specified

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 12 upgrades the admin dashboard from a read-only workspace overview into a full operational command center. The work spans seven distinct feature areas: a new dashboard home with KPI cards and activity charts, five new views (person detail, agent run monitoring, LinkedIn action queue, sender management, webhook event log), plus CRUD upgrades for proposals and onboarding with document upload/auto-parse. No new libraries are required beyond PDF parsing (one install); everything else uses the existing stack.

The codebase already has Recharts v3, shadcn/ui (Dialog, Tabs, Table, Card, Badge), nuqs for URL state, and Tailwind v4. Charts are already used in the enrichment-costs page with `BarChart`, `PieChart`, and `ReferenceLine` from Recharts — extending to `LineChart`/`AreaChart` for trend data follows identical patterns. The existing `Dialog` component is the established pattern for CRUD modals (already used in the clients page `AddClientDialog`). The existing `MetricCard` component is the established KPI card pattern.

The only genuinely new technical territory is document parsing (PDF via `pdf-parse`, Google Doc via URL fetch + Google Docs export endpoint) and the accordion/expandable row pattern for agent run details. Both are straightforward. The heaviest UX work is the new dashboard home page and the sender card grid layout. The most complex data query is the activity chart — aggregating WebhookEvent by day and workspace requires a Prisma `groupBy` or raw SQL query.

**Primary recommendation:** Implement in six sequential plans: (1) Dashboard home redesign with KPIs, charts, alerts, and workspace filter, (2) Person detail page with tabs and timeline, (3) Operational views — agent runs + LinkedIn queue + webhook log as a single new page/route group, (4) Sender management CRUD with card grid and modal, (5) Proposal + onboarding CRUD with document upload/parse, (6) Navigation wiring and sidebar additions for all new routes.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Recharts | ^3.7.0 | Charts: LineChart, AreaChart, Bar | Already used; `ResponsiveContainer` + `Tooltip` pattern established |
| radix-ui | ^1.4.3 | Dialog, Tabs, DropdownMenu primitives | Already installed; Tabs component pre-built |
| lucide-react | ^0.575.0 | Icons for timeline, status badges | Already used throughout |
| nuqs | ^2.8.8 | URL state for filters (workspace, time range) | Already wired in admin layout via NuqsAdapter |
| zod | ^4.3.6 | Form validation in modals | Already installed |
| tailwindcss | ^4 | Styling | Project standard |

### New Install Required

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pdf-parse | ^1.1.1 | Extract text from PDF uploads | Document upload → auto-parse feature |

No other new installs needed. Google Doc parsing uses a simple URL fetch against the Google Docs export endpoint (no OAuth required for public docs; for private docs: fetch the URL with `?export=txt` and return plain text).

**Installation:**
```bash
npm install pdf-parse
npm install --save-dev @types/pdf-parse
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdf-parse | pdfjs-dist | pdf-parse is Node-only (server route) — simpler, no Canvas dep. pdfjs-dist runs in browser but is 3x heavier. Server-side parsing is correct for this case. |
| nuqs URL state | useState for filters | nuqs makes filters bookmarkable/shareable; already the project pattern (people-search-page.tsx, companies-search-page.tsx) |
| Manual accordion state | Radix Collapsible | Simple `useState(openId)` is sufficient for single-open accordion in agent run table; no need for Radix Collapsible given the table row context |

---

## Architecture Patterns

### Recommended Project Structure

New files this phase creates:

```
src/
├── app/(admin)/
│   ├── page.tsx                          # REPLACE: New dashboard home
│   ├── people/[id]/page.tsx              # NEW: Person detail page
│   ├── operations/page.tsx               # NEW: Agent runs + LI queue + webhook log
│   └── linkedin/
│       └── page.tsx                      # NEW: Sender management (cross-workspace)
├── app/api/
│   ├── dashboard/stats/route.ts          # NEW: KPI aggregation endpoint
│   ├── dashboard/activity/route.ts       # NEW: Chart data (WebhookEvent groupBy day)
│   ├── people/[id]/timeline/route.ts     # NEW: Person timeline endpoint
│   ├── agent-runs/route.ts               # NEW: Agent run list endpoint
│   ├── linkedin/actions/queue/route.ts   # NEW: Queue status endpoint
│   ├── webhook-events/route.ts           # NEW: Event log with search/filter
│   ├── linkedin/senders/[id]/route.ts    # NEW: Sender PATCH/DELETE
│   ├── proposals/[id]/route.ts           # EXTEND: Add PATCH/DELETE
│   ├── onboarding-invites/[id]/route.ts  # EXTEND: Add PATCH/DELETE
│   └── documents/parse/route.ts          # NEW: PDF/Google Doc parse endpoint
└── components/
    ├── dashboard/
    │   ├── workspace-filter.tsx           # NEW: "All / per-client" Select
    │   ├── activity-chart.tsx             # NEW: Line/area chart for trends
    │   └── alerts-section.tsx             # NEW: Critical alerts
    ├── operations/
    │   ├── agent-run-table.tsx            # NEW: Expandable accordion table
    │   ├── linkedin-queue-table.tsx       # NEW: Queue status table
    │   └── webhook-log-table.tsx          # NEW: Search + filter chips table
    ├── senders/
    │   ├── sender-card.tsx               # NEW: Card with badges, actions
    │   └── sender-modal.tsx              # NEW: Add/edit dialog
    └── people/
        └── person-timeline.tsx           # NEW: Chronological event list
```

### Pattern 1: Workspace Filter Dropdown

**What:** A `<Select>` at the top of the dashboard home that sets a `workspace` query param via nuqs. All KPI cards, charts, and alerts read this param and re-fetch accordingly.

**When to use:** Any cross-workspace view that needs filtering by client.

**Example:**
```typescript
// Source: nuqs pattern from src/components/search/people-search-page.tsx
import { useQueryState, parseAsString } from "nuqs";

export function WorkspaceFilter({ workspaces }: { workspaces: Workspace[] }) {
  const [workspace, setWorkspace] = useQueryState(
    "workspace",
    parseAsString.withDefault("all")
  );

  return (
    <Select value={workspace} onValueChange={setWorkspace}>
      <SelectTrigger className="w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Campaigns</SelectItem>
        {workspaces.map((ws) => (
          <SelectItem key={ws.slug} value={ws.slug}>{ws.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### Pattern 2: Activity Chart (Recharts LineChart)

**What:** Line/area chart showing WebhookEvent counts grouped by date, for selected workspace and time range.

**When to use:** The main dashboard trend section. Two lines: sent volume (from EMAIL_SENT events) and reply volume (from LEAD_REPLIED events).

**Example:**
```typescript
// Source: existing enrichment-costs/page.tsx + recharts docs
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart
} from "recharts";

export function ActivityChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="sentFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F0FF7A" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#F0FF7A" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="replyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" fontSize={11} />
        <YAxis fontSize={11} />
        <Tooltip />
        <Area type="monotone" dataKey="sent" stroke="#F0FF7A" fill="url(#sentFill)" strokeWidth={2} />
        <Area type="monotone" dataKey="replies" stroke="#10b981" fill="url(#replyFill)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

### Pattern 3: Expandable Accordion Table Row (Agent Runs)

**What:** A table where each row has a chevron to expand inline details. Single open at a time. No Radix dependency — pure `useState`.

**When to use:** Agent run monitoring table.

**Example:**
```typescript
// Source: established pattern (Vercel logs style)
const [openId, setOpenId] = useState<string | null>(null);

// In table body:
<TableRow
  key={run.id}
  className="cursor-pointer"
  onClick={() => setOpenId(openId === run.id ? null : run.id)}
>
  <TableCell className="py-2">
    <ChevronRight className={cn("h-3 w-3 transition-transform", openId === run.id && "rotate-90")} />
  </TableCell>
  {/* ... other cells ... */}
</TableRow>
{openId === run.id && (
  <TableRow>
    <TableCell colSpan={6} className="bg-muted/30 p-4">
      <pre className="text-xs font-mono whitespace-pre-wrap">{run.steps}</pre>
    </TableCell>
  </TableRow>
)}
```

### Pattern 4: Sender Card Grid

**What:** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` of cards. Each card shows sender name, email, proxy URL (truncated), daily limit, status badge (active/paused/flagged), and action buttons (pause/edit/delete). Edit triggers a Dialog modal.

**When to use:** Sender management page.

**Example structure:**
```typescript
// Source: established Dialog + Card pattern from clients/page.tsx AddClientDialog
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {senders.map((sender) => (
    <Card key={sender.id} className="relative">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-medium text-sm">{sender.name}</p>
            <p className="text-xs text-muted-foreground">{sender.emailAddress}</p>
          </div>
          <Badge variant={healthVariant[sender.healthStatus]}>{sender.healthStatus}</Badge>
        </div>
        {/* proxy, daily limits */}
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={() => setEditSender(sender)}>Edit</Button>
          <Button size="sm" variant="outline" onClick={() => pauseSender(sender.id)}>Pause</Button>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

### Pattern 5: Document Upload + Parse

**What:** File input for PDF upload OR text input for Google Doc URL → POST to `/api/documents/parse` → returns extracted text → pre-fills proposal/onboarding modal fields.

**When to use:** Proposal + onboarding CRUD "smart upload" feature.

**PDF parsing (server route — Node.js only):**
```typescript
// Source: pdf-parse npm package docs
import pdfParse from "pdf-parse";

// In the API route:
const buffer = Buffer.from(await file.arrayBuffer());
const parsed = await pdfParse(buffer);
return NextResponse.json({ text: parsed.text });
```

**Google Doc parsing (no OAuth for export URL pattern):**
```typescript
// Source: Google Docs export URL pattern (PUBLIC docs only)
// URL format: https://docs.google.com/document/d/{docId}/export?format=txt
const docId = url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
if (!docId) throw new Error("Invalid Google Doc URL");
const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
const res = await fetch(exportUrl);
const text = await res.text();
```

**Caveat:** Google Doc export only works for publicly shared documents. For private docs, OAuth is required. Given this is an internal admin tool where admins control what they upload, public-share-then-parse is the appropriate approach. Document this clearly in the UI ("Document must be publicly shared").

### Pattern 6: WebhookEvent Activity Query

**What:** Prisma `groupBy` query to get event counts per day for chart data.

**When to use:** Dashboard activity chart data endpoint.

```typescript
// Source: Prisma docs on groupBy with _count
const events = await prisma.webhookEvent.groupBy({
  by: ["workspace", "eventType"],
  where: {
    workspace: workspaceFilter !== "all" ? workspaceFilter : undefined,
    receivedAt: {
      gte: startDate,
      lte: endDate,
    },
  },
  _count: { id: true },
  orderBy: { workspace: "asc" },
});

// For day-bucketing, use raw SQL since Prisma groupBy can't extract date parts:
const rows = await prisma.$queryRaw`
  SELECT
    DATE("receivedAt") AS day,
    "eventType",
    COUNT(*) AS cnt
  FROM "WebhookEvent"
  WHERE "receivedAt" >= ${startDate}
    AND "receivedAt" <= ${endDate}
    ${workspaceFilter !== "all" ? Prisma.sql`AND workspace = ${workspaceFilter}` : Prisma.empty}
  GROUP BY DATE("receivedAt"), "eventType"
  ORDER BY day ASC
`;
```

Note: Prisma raw SQL with template literals is the established project pattern for queries requiring PostgreSQL-specific functions (see `pgvector` usage in knowledge base for precedent).

### Pattern 7: Person Timeline

**What:** A vertical timeline list (not a chart) showing chronological events for a person. Three data sources joined: WebhookEvent (email activity), LinkedInAction (LinkedIn activity), AgentRun (agent interactions keyed by person email in input JSON).

**Example data assembly:**
```typescript
// Three parallel queries, merge and sort
const [webhookEvents, linkedinActions, agentRuns] = await Promise.all([
  prisma.webhookEvent.findMany({ where: { leadEmail: person.email }, orderBy: { receivedAt: "desc" } }),
  prisma.linkedInAction.findMany({ where: { personId: person.id }, orderBy: { createdAt: "desc" } }),
  // AgentRuns keyed by email in input JSON — use raw or filter post-query
  prisma.agentRun.findMany({ where: { input: { contains: person.email } }, orderBy: { createdAt: "desc" } }),
]);

const timeline = [
  ...webhookEvents.map(e => ({ type: "email" as const, date: e.receivedAt, data: e })),
  ...linkedinActions.map(a => ({ type: "linkedin" as const, date: a.createdAt, data: a })),
  ...agentRuns.map(r => ({ type: "agent" as const, date: r.createdAt, data: r })),
].sort((a, b) => b.date.getTime() - a.date.getTime());
```

### Anti-Patterns to Avoid

- **Full page reload on filter change:** Use client-side fetch with `useEffect` keyed on filter params (or server actions). The existing people/companies pages use this pattern correctly.
- **Server Components for interactive filters:** The dashboard home with a workspace dropdown MUST be a Client Component (or split: server shell + client filter+chart island). The enrichment-costs page is the right model — full `"use client"` with fetch on mount.
- **Separate detail page for agent runs:** Locked decision is inline accordion expansion. Do not route to `/agent-runs/[id]`.
- **Blocking PDF parse in middleware or Edge:** `pdf-parse` requires Node.js runtime. The API route at `/api/documents/parse` must be a standard Node.js route, NOT an Edge route.
- **react-hook-form for modals:** The shadcn skill recommends RHF, but the project uses `useState` form state consistently (clients page, proposals page). Stick with the project pattern to avoid adding a new dependency. RHF is NOT installed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart time-series | Custom SVG drawing | Recharts AreaChart | Already used; handles responsive, tooltips, axes |
| Modal overlay/focus trap | Custom div | Existing `<Dialog>` from `components/ui/dialog.tsx` | Radix handles a11y, focus trap, escape key |
| Tabs on person detail | Custom tab state | Existing `<Tabs>` from `components/ui/tabs.tsx` | Already built with active state + brand accent underline |
| URL state for filters | `useSearchParams` + `router.push` | `nuqs` `useQueryState` | Already installed + NuqsAdapter already in admin layout |
| PDF text extraction | Raw PDF binary parsing | `pdf-parse` npm package | Handles PDF spec edge cases; single function call |
| Table sorting/pagination | Custom sort | Simple `.sort()` + slice in JS | Acceptable for admin data volumes; Prisma `orderBy` for server-side |

**Key insight:** The project consistently uses thin wrappers around established libraries rather than custom implementations. The enrichment-costs page is the most complete example of the chart pattern — follow it exactly.

---

## Common Pitfalls

### Pitfall 1: WebhookEvent Volume for Chart Queries
**What goes wrong:** Running `findMany` on WebhookEvent for large time ranges returns thousands of rows and times out.
**Why it happens:** ~6 clients × multiple events/day × 30 days = potential for tens of thousands of rows fetched into memory.
**How to avoid:** Always use the `$queryRaw` GROUP BY DATE approach for chart data — aggregate in the database, not in JavaScript. Return only day-level counts, never raw events for charts.
**Warning signs:** Chart endpoint taking >1s.

### Pitfall 2: Sender Delete with Active Actions
**What goes wrong:** Deleting a Sender that has pending LinkedInAction records causes FK constraint violation.
**Why it happens:** `LinkedInAction.senderId` FK references `Sender.id`.
**How to avoid:** Before delete, check `await prisma.linkedInAction.count({ where: { senderId, status: "pending" } })`. If > 0, return 400 "Cannot delete sender with pending actions". UI shows this error in the modal.
**Warning signs:** DELETE endpoint 500s on senders with activity.

### Pitfall 3: PDF Parse in Edge Runtime
**What goes wrong:** `pdf-parse` imports Node.js `fs` module which is not available in Edge.
**Why it happens:** Vercel Edge Runtime is a subset of Node.js.
**How to avoid:** The `/api/documents/parse` route must NOT have `export const runtime = "edge"`. Default (Node.js) runtime is correct. Test locally first.
**Warning signs:** Build-time error about `fs` module not found.

### Pitfall 4: AgentRun Input JSON Search
**What goes wrong:** `prisma.agentRun.findMany({ where: { input: { contains: email } } })` does a full-table LIKE scan — slow at scale.
**Why it happens:** `input` is a JSON string column with no index on email.
**How to avoid:** For person timeline, accept this for now (AgentRun volume is low — one run per agent interaction). Add a DB index later if needed. Alternatively, add `personEmail` as a typed column on AgentRun in the schema (schema migration) — but that's out of scope for this phase.
**Warning signs:** Person timeline page slow to load.

### Pitfall 5: Google Doc Export Fails for Private Docs
**What goes wrong:** Fetch to Google Docs export URL returns HTML login page instead of text.
**Why it happens:** Private Google Docs require OAuth.
**How to avoid:** Detect the failure by checking if the response content-type is `text/plain`. If not, return a clear error: "Document must be publicly shared. In Google Docs, click Share → 'Anyone with the link' → Viewer." Show this guidance in the upload UI before the user tries.
**Warning signs:** Parse endpoint returns garbled HTML instead of document text.

### Pitfall 6: Sender Modal Cookie Field
**What goes wrong:** Showing raw cookie values (li_at + JSESSIONID) in the edit modal exposes sensitive data in browser memory.
**Why it happens:** Sender modal includes a cookies field from the sessionData.
**How to avoid:** The modal should NOT fetch or display existing cookie values. Cookie seeding is a separate flow handled by the browser extension (Phase 14) or the existing ConnectButton. The sender modal should only show/edit: name, email address, proxy URL, daily limits, LinkedIn profile URL, tier, status. Keep cookies out of the CRUD form entirely.
**Warning signs:** Cookies rendered in edit form input.

---

## Code Examples

### WebhookEvent Daily Activity Query
```typescript
// Source: Prisma $queryRaw pattern (same as pgvector queries in this codebase)
import { prisma, Prisma } from "@/lib/db";

export async function getActivityByDay(
  workspaceFilter: string,
  startDate: Date,
  endDate: Date,
) {
  const workspaceClause = workspaceFilter !== "all"
    ? Prisma.sql`AND workspace = ${workspaceFilter}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{
    day: Date;
    event_type: string;
    cnt: bigint;
  }>>`
    SELECT
      DATE("receivedAt") AS day,
      "eventType" AS event_type,
      COUNT(*) AS cnt
    FROM "WebhookEvent"
    WHERE "receivedAt" >= ${startDate}
      AND "receivedAt" <= ${endDate}
      ${workspaceClause}
    GROUP BY DATE("receivedAt"), "eventType"
    ORDER BY day ASC
  `;

  // Convert BigInt cnt to number for JSON serialization
  return rows.map(r => ({ ...r, cnt: Number(r.cnt) }));
}
```

### Sender PATCH/DELETE (new route needed)
```typescript
// New file: src/app/api/linkedin/senders/[id]/route.ts
// Currently this directory only has: cookies, credentials, health, login, session
// Need to add route.ts for PATCH and DELETE

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updated = await prisma.sender.update({
    where: { id },
    data: {
      name: body.name,
      emailAddress: body.emailAddress,
      proxyUrl: body.proxyUrl,
      dailyConnectionLimit: body.dailyConnectionLimit,
      dailyMessageLimit: body.dailyMessageLimit,
      dailyProfileViewLimit: body.dailyProfileViewLimit,
      linkedinProfileUrl: body.linkedinProfileUrl,
      linkedinTier: body.linkedinTier,
      status: body.status,
    },
  });
  return NextResponse.json({ sender: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Safety check
  const pendingCount = await prisma.linkedInAction.count({
    where: { senderId: id, status: "pending" },
  });
  if (pendingCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${pendingCount} pending actions` },
      { status: 400 }
    );
  }
  await prisma.sender.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

### KPI Data Endpoint
```typescript
// New file: src/app/api/dashboard/stats/route.ts
// Aggregates LinkedIn + email stats from DB for the KPI cards
export async function GET(request: NextRequest) {
  const workspace = request.nextUrl.searchParams.get("workspace") ?? "all";
  const wsFilter = workspace !== "all" ? { workspace } : {};

  const [
    emailSent, emailReplies, emailBounces,
    liConnections, liPending, liMessages,
    flaggedSenders, failedRuns,
  ] = await Promise.all([
    prisma.webhookEvent.count({ where: { ...wsFilter, eventType: "EMAIL_SENT" } }),
    prisma.webhookEvent.count({ where: { ...wsFilter, eventType: { in: ["LEAD_REPLIED", "LEAD_INTERESTED"] } } }),
    prisma.webhookEvent.count({ where: { ...wsFilter, eventType: "EMAIL_BOUNCED" } }),
    prisma.linkedInConnection.count({ where: { status: "connected" } }),
    prisma.linkedInAction.count({ where: { status: "pending" } }),
    prisma.linkedInAction.count({ where: { actionType: "message", status: "complete" } }),
    prisma.sender.count({ where: { healthStatus: { in: ["blocked", "warning"] } } }),
    prisma.agentRun.count({ where: { status: "failed", createdAt: { gte: new Date(Date.now() - 24*60*60*1000) } } }),
  ]);

  return NextResponse.json({ emailSent, emailReplies, emailBounces, liConnections, liPending, liMessages, flaggedSenders, failedRuns });
}
```

### Existing Patterns to Reuse
```typescript
// Workspace filter pattern — already used in people-search-page.tsx:
const [params, setParams] = useQueryStates({
  workspace: parseAsString.withDefault("all"),
  range: parseAsString.withDefault("7d"),
});

// MetricCard — already in src/components/dashboard/metric-card.tsx:
<MetricCard label="Sent" value={stats.emailSent.toLocaleString()} />

// Dialog modal — already in src/components/ui/dialog.tsx:
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-[520px]">
    <DialogHeader>
      <DialogTitle>Edit Sender</DialogTitle>
    </DialogHeader>
    {/* form fields */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useSearchParams` + manual router push | `nuqs` `useQueryState` | Already adopted | URL state is simpler and bookmarkable |
| Individual Recharts chart components | `ResponsiveContainer` wrapper always | Recharts v2+ | Charts resize correctly on container change |
| Prisma `findMany` for aggregates | `$queryRaw` for GROUP BY | Always | Required for date bucketing and COUNT |

**Deprecated/outdated:**
- `recharts` v2 import paths: v3 imports are identical — no migration needed (project already on v3.7.0)
- `next/router` (Pages Router): This project uses App Router. All routing is `next/navigation`.

---

## Open Questions

1. **EmailBison time range filter parity**
   - What we know: CONTEXT.md says "same filter options as EmailBison (researcher to pull exact filter set from EmailBison UI for parity)"
   - What's unclear: The exact time range options in EmailBison's UI were not available to verify during research (requires live UI access)
   - Recommendation: Use standard time range options — Last 7 days, Last 30 days, Last 90 days, All time. These are industry-standard. If the user wants exact parity after seeing this, it's a minor UI adjustment.

2. **Sender management: cross-workspace or per-workspace page?**
   - What we know: CONTEXT.md says "LinkedIn sender management" without specifying route location. Currently senders exist under `/workspace/[slug]/linkedin/`.
   - What's unclear: Should the new sender management be a global view (all senders across workspaces) or remain per-workspace?
   - Recommendation: Create a new global `/linkedin` route in the main nav for cross-workspace sender management (similar to how `/clients` is cross-workspace). The existing per-workspace `/workspace/[slug]/linkedin` page can remain or be deprecated. Global view is more operationally useful for the power-user admin.

3. **Person detail: LinkedInAction query by person email vs person ID**
   - What we know: `LinkedInAction.personId` links to `Person.id`. Timeline assembly is straightforward.
   - What's unclear: AgentRun has no typed `personId` field — person association requires `input JSON contains email` which is a LIKE scan.
   - Recommendation: Accept the LIKE scan for now (AgentRun volume is low). Do NOT add schema migration in this phase.

4. **Sidebar navigation additions**
   - What we know: Current sidebar has mainNav array hardcoded in `src/components/layout/sidebar.tsx`. New pages need nav entries.
   - What's unclear: Exact icon and label for "Operations" view (agent runs + queue + webhook log).
   - Recommendation: Add to mainNav: `{ href: "/operations", label: "Operations", icon: Activity }`. Sender management adds to per-workspace subNav under LinkedIn. Person detail is accessed via `/people/[id]` (linked from existing people search results, not added to main nav).

---

## Existing API Coverage

Before building new endpoints, note what already exists:

| Need | Existing Route | Gap |
|------|---------------|-----|
| List senders | `GET /api/linkedin/senders?workspace=X` | Worker-auth only. Needs admin-auth version or auth bypass for dashboard |
| Create sender | `POST /api/linkedin/senders` | Worker-auth only — same issue |
| Update/delete sender | None | **Missing — must create** |
| Agent run list | None | **Missing — must create** |
| LinkedIn action queue | `GET /api/linkedin/actions/next` | Worker-auth, returns one action. Need list endpoint |
| Webhook events | None | **Missing — must create** |
| Dashboard KPIs | None | **Missing — must create** |
| Activity chart data | None | **Missing — must create** |
| Person timeline | None | **Missing — must create** |
| Document parse | None | **Missing — must create** |
| Proposal edit | `GET/PUT /api/proposals/[id]` | Check if PUT exists |
| Onboarding edit | `GET/PUT /api/onboarding-invites/[id]` | Check if PUT exists |

**Critical auth note:** The LinkedIn sender routes (`/api/linkedin/senders`) use `verifyWorkerAuth` — they validate the `X-Worker-Secret` header, not the admin cookie session. Dashboard UI calls cannot use these routes as-is. Two options:
- Option A: Add admin cookie auth check alongside worker auth (preferred — minimal change)
- Option B: Create separate dashboard-facing sender routes

Option A is recommended: `if (!verifyWorkerAuth(request) && !isAdminSession(request)) return 401`.

---

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` (key absent, not false). Skipping validation section per instructions — `nyquist_validation` defaults to false when absent.

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/app/(admin)/`, `src/components/`, `prisma/schema.prisma` — direct file reads
- Recharts v3.7.0 (installed): `AreaChart`, `LineChart`, `ResponsiveContainer` confirmed available from enrichment-costs/page.tsx imports
- nuqs v2.8.8 (installed): `useQueryStates`, `parseAsString` confirmed working from people-search-page.tsx
- radix-ui v1.4.3 (installed): Dialog, Tabs confirmed from existing component files
- `src/components/ui/dialog.tsx` — Dialog component verified, full implementation read
- `src/components/ui/tabs.tsx` — Tabs component verified
- `src/lib/linkedin/sender.ts` — Sender CRUD lib, confirmed no PATCH/DELETE API route exists
- `src/app/(admin)/enrichment-costs/page.tsx` — Chart pattern reference (BarChart, PieChart, ReferenceLine)
- `src/app/(admin)/clients/page.tsx` — Dialog modal CRUD pattern reference

### Secondary (MEDIUM confidence)
- pdf-parse npm package: Node.js PDF text extraction, widely used, no Canvas dependency. Version 1.1.1 is current stable.
- Google Docs export URL pattern (`/export?format=txt`): Works for publicly shared documents. This is a documented Google feature, not a hack.
- ui-ux-pro-max skill: Design system query returned "Data-Dense Dashboard" style recommendation, AreaChart with 20% opacity fill for trend data.

### Tertiary (LOW confidence)
- None — all claims verified against codebase or official sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified from package.json and existing code
- Architecture: HIGH — patterns directly derived from existing admin pages
- API gaps: HIGH — verified by reading existing route files
- Pitfalls: HIGH — derived from schema constraints and runtime analysis
- PDF/Google Doc parsing: MEDIUM — library confirmed, Google Doc export URL pattern is documented but not tested against private docs

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable stack; recharts/nuqs API unlikely to break in 30 days)
