# Phase 13: Smart Sender Health - Research

**Researched:** 2026-03-02
**Domain:** Sender health automation, DB schema design, notification pipelines, sparkline visualization
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Detection & Thresholds**
- All signals monitored: bounce rate >5%, CAPTCHA/challenge detected, LinkedIn restriction, session cookie expired, manual admin flag
- Immediate flagging: flag sender as soon as threshold is breached in any 24h window (no sustained-period requirement)
- Hybrid recovery: soft flags (bounce rate normalized) auto-recover after cooldown; hard flags (CAPTCHA, restriction, session expiry) require manual admin reactivation
- Check frequency: piggyback on existing daily cron (6am UTC) — no extra infra cost

**Rotation & Reassignment**
- Flagged sender removed from campaign rotation; campaign continues running with remaining healthy senders
- If workspace has only one sender and it's flagged: pause all campaigns in that workspace + fire urgent alert (Slack + email)
- Pending LinkedIn actions auto-reassign to another healthy sender in the same workspace
- Admin can inline-swap a sender on a specific campaign via quick swap button on sender cards

**Notifications & Alerts**
- Delivery channels: Slack + email
- Two-tier severity:
  - Warning (soft flags like bounce rate) → Slack notification only
  - Critical (CAPTCHA, restriction, last sender down, session expired) → Slack + email
- Timing: critical alerts fire immediately; warning-level alerts batched into daily health digest
- Slack destination: existing per-client reply channels (rise-replies, lime-recruitment-replies, etc.)

**Health Visibility & Trends**
- Enhance existing /senders page (built in Phase 12) with health status badges, sparkline trends, and expandable health history — not a separate page
- Core metrics per sender: current status (healthy/warning/critical), bounce rate, last flag reason, flag history count, days since last incident
- 30-day rolling window for health history visualization (sparkline charts)
- Add sender health KPI card to dashboard command center: total healthy/warning/critical count with link to /senders

### Claude's Discretion
- Exact bounce rate calculation method (per-send vs rolling average)
- Health event database schema design
- Sparkline chart implementation details
- Daily digest email template layout
- Cooldown duration for soft-flag auto-recovery
- LinkedIn action reassignment priority logic (round-robin vs least-loaded)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 13 is primarily a **data pipeline + UI enhancement phase** built entirely on top of existing infrastructure. There is no new framework to introduce. The detection engine, notification system, DB access layer, and UI component patterns are already established — this phase wires them together in a new configuration and adds one new DB table (`SenderHealthEvent`).

The core challenge is **bounce rate calculation**: the `WebhookEvent` table captures `BOUNCED` events per `senderEmail`, but there is no per-sender sent-count denominator. The most defensible approach is to compute bounce rate as `BOUNCED / EMAIL_SENT` for each senderEmail over a 24h window using `WebhookEvent`, grouped by `senderEmail`. This requires no schema change and is queryable with a single Prisma aggregation.

The second challenge is **sparkline rendering**: recharts v3.7.0 is already installed. A sparkline is just a minimal `LineChart` or `AreaChart` with no axes, no grid, and a tiny height — no new library needed. The pattern already exists in `activity-chart.tsx`.

**Primary recommendation:** Add one new `SenderHealthEvent` table for audit trail, add a `runSenderHealthCheck()` function to the existing cron, extend `SenderCard` with health history UI, and wire notifications through the existing `notify()` + `notifyReply()`-pattern functions in `src/lib/notifications.ts`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 6.19.2 | DB queries, new SenderHealthEvent model | Already the project ORM |
| recharts | 3.7.0 | Sparkline trend charts on sender cards | Already installed, used in activity-chart.tsx |
| Next.js API routes | 16.1.6 | Cron endpoint + admin action endpoints | Already the project framework |
| @slack/web-api | 7.14.1 | Slack block-kit notifications | Already installed, used in notifications.ts |
| resend | 6.9.2 | Email notifications | Already installed, used in notifications.ts |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nuqs | 2.8.8 | URL state for sender card expand/filter | Already used on dashboard page |
| lucide-react | 0.575.0 | Health status icons (ShieldAlert, ShieldCheck, etc.) | Already the project icon library |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| recharts LineChart for sparkline | tremor MiniChart, victory-native | recharts already installed, no new dep needed |
| SenderHealthEvent table | JSON column on Sender | Table gives queryability for 30-day history and trend rollups |

**Installation:**
```bash
# No new dependencies required — all libraries already present
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   └── linkedin/
│       ├── sender.ts              # EXTEND: add flagSender(), reassignActions(), getHealthySenders()
│       └── health-check.ts        # NEW: runSenderHealthCheck() — called by cron
├── app/
│   └── api/
│       ├── senders/
│       │   └── [id]/
│       │       ├── route.ts        # EXTEND: PATCH to support healthStatus + reactivate
│       │       └── reactivate/route.ts  # NEW: POST to manually reactivate hard-flagged sender
│       ├── senders/
│       │   └── health-digest/route.ts  # NEW: POST cron triggers daily digest
│       └── linkedin/
│           └── senders/[id]/health/route.ts  # EXISTS: already handles worker PATCH
├── components/
│   └── senders/
│       ├── sender-card.tsx         # EXTEND: add health badge, sparkline, expand accordion
│       ├── sender-health-history.tsx  # NEW: expandable panel with event log + sparkline
│       └── sender-swap-modal.tsx   # NEW: inline swap dialog for reassigning sender on campaign
└── prisma/
    └── schema.prisma               # ADD: SenderHealthEvent model
```

### Pattern 1: SenderHealthEvent Table (Audit Trail)

**What:** A new table that records every health state change with reason and timestamp. Powers the 30-day history visualization and "days since last incident" metric.

**When to use:** Every time `Sender.healthStatus` changes.

**Schema:**
```typescript
// Add to prisma/schema.prisma
model SenderHealthEvent {
  id         String   @id @default(cuid())
  senderId   String
  status     String   // "healthy" | "warning" | "blocked" | "session_expired"
  reason     String   // "bounce_rate" | "captcha" | "restriction" | "session_expired" | "manual" | "auto_recovered" | "admin_reactivated"
  detail     String?  // e.g. "bounce rate: 7.2% (24h window)"
  bouncePct  Float?   // snapshot of bounce % at time of flag (for bounce_rate events)
  createdAt  DateTime @default(now())

  sender Sender @relation(fields: [senderId], references: [id], onDelete: Cascade)

  @@index([senderId, createdAt])
  @@index([createdAt])
}

// Add relation to Sender model:
// healthEvents SenderHealthEvent[]
```

### Pattern 2: Bounce Rate Calculation

**What:** Compute per-sender bounce rate over a rolling 24h window from `WebhookEvent`.

**Key insight:** `WebhookEvent.senderEmail` maps to `Sender.emailAddress`. The Sender table has `emailAddress` as the join key. There is NO foreign key — it's a soft join by email string. The health check must GROUP BY senderEmail and then look up matching Sender by emailAddress.

**When to use:** In `runSenderHealthCheck()` called from cron.

```typescript
// Source: existing WebhookEvent schema + Prisma groupBy pattern from dashboard/stats/route.ts
const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

const bounceEvents = await prisma.webhookEvent.groupBy({
  by: ["senderEmail"],
  where: {
    senderEmail: { not: null },
    eventType: "BOUNCED",
    receivedAt: { gte: since24h },
  },
  _count: { senderEmail: true },
});

const sentEvents = await prisma.webhookEvent.groupBy({
  by: ["senderEmail"],
  where: {
    senderEmail: { not: null },
    eventType: "EMAIL_SENT",
    receivedAt: { gte: since24h },
  },
  _count: { senderEmail: true },
});

// Build map: senderEmail → bounceRate
const sentMap = Object.fromEntries(sentEvents.map(e => [e.senderEmail, e._count.senderEmail]));
const bounceMap = Object.fromEntries(bounceEvents.map(e => [e.senderEmail, e._count.senderEmail]));
// bounceRate = bounces / sent; flag if > 0.05 and sent >= MIN_SENDS (e.g. 10)
```

**Minimum send threshold:** Do not flag a sender with `sent < 10` in the window — too noisy at low volume. Claude's discretion; recommend 10 as minimum.

### Pattern 3: Health Check Cron Integration

**What:** Add a new cron endpoint `/api/sender-health/check` (following the exact pattern of `/api/inbox-health/check/route.ts`). Register it in `vercel.json` at the same 6am UTC schedule.

**When to use:** Daily cron at 6am UTC, same as inbox health.

```typescript
// Pattern from src/app/api/inbox-health/check/route.ts
export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results = await runSenderHealthCheck(); // lib/linkedin/health-check.ts
  for (const result of results) {
    if (result.severity === "critical") {
      await notifySenderHealth(result);   // Slack + email
    }
    // warning-level goes into daily digest batch, not fired here
  }
  // batch warning-level digest in same cron call
  await sendDailyHealthDigest(); // Slack-only for warning-level senders
  return NextResponse.json({ checked: results.length });
}
```

### Pattern 4: Action Reassignment

**What:** When a sender is flagged, reassign their pending `LinkedInAction` records to another healthy sender in the same workspace. Uses `updateMany` not row-by-row to be atomic.

**When to use:** Immediately after `flagSender()` is called.

```typescript
// Source: existing queue.ts pattern (updateMany for cancelActionsForPerson)
async function reassignActionsFromSender(flaggedSenderId: string, workspaceSlug: string): Promise<number> {
  // Find healthy replacement sender in same workspace (least-loaded)
  const healthySenders = await prisma.sender.findMany({
    where: {
      workspaceSlug,
      id: { not: flaggedSenderId },
      status: "active",
      healthStatus: "healthy",
    },
  });

  if (healthySenders.length === 0) {
    // No healthy sender available — actions stay pending but sender is flagged
    // Workspace-level pause handled separately
    return 0;
  }

  // Least-loaded: pick sender with fewest pending actions
  const [targetSender] = await Promise.all(
    healthySenders.map(async (s) => ({
      sender: s,
      pendingCount: await prisma.linkedInAction.count({
        where: { senderId: s.id, status: "pending" },
      }),
    }))
  ).then(results => results.sort((a, b) => a.pendingCount - b.pendingCount));

  const result = await prisma.linkedInAction.updateMany({
    where: { senderId: flaggedSenderId, status: "pending" },
    data: { senderId: targetSender.sender.id },
  });

  return result.count;
}
```

### Pattern 5: Sparkline on Sender Card

**What:** A tiny inline sparkline (no axes, no tooltip, ~48px tall) showing health status over the last 30 days, one point per day. Built with recharts `LineChart` — same library already used in `activity-chart.tsx`.

**When to use:** Inside expanded sender card health section.

```typescript
// Source: recharts v3.7.0 already in package.json; pattern from activity-chart.tsx
import { LineChart, Line, ResponsiveContainer } from "recharts";

// data: Array<{ date: string; status: 0|1|2 }> — 0=healthy, 1=warning, 2=critical
// 30 points (one per day) derived from SenderHealthEvent aggregated by day
<ResponsiveContainer width="100%" height={48}>
  <LineChart data={sparklineData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
    <Line
      type="stepAfter"
      dataKey="statusNum"
      stroke={latestColor}
      strokeWidth={2}
      dot={false}
    />
  </LineChart>
</ResponsiveContainer>
```

**Sparkline data derivation:** Aggregate `SenderHealthEvent` by day for last 30 days. Each day: take the worst status seen that day (healthy=0, warning=1, blocked/session_expired=2). Fill missing days with 0 (healthy). Result: 30 data points.

### Pattern 6: Notification Routing

**What:** Health notifications go to `workspace.slackChannelId` (existing per-client reply channel), consistent with the CONTEXT.md decision. Email goes to `workspace.notificationEmails` for critical alerts.

**When to use:** For critical (immediate) and daily digest (warning batch).

```typescript
// Extend notifications.ts — same pattern as notifyApproval() and notifyReply()
export async function notifySenderHealth(params: {
  workspaceSlug: string;
  senderName: string;
  reason: string;
  detail?: string;
  severity: "warning" | "critical";
  reassignedCount?: number;
  workspacePaused?: boolean;
}): Promise<void>
```

**Critical path:** `notify()` (DB + ops Slack) + `postMessage(workspace.slackChannelId)` + `sendNotificationEmail(workspace.notificationEmails)`.

**Warning/digest path:** Batch all warning-level events into a single daily Slack message to `workspace.slackChannelId` only.

### Pattern 7: Manual Admin Reactivation

**What:** Hard-flagged senders (CAPTCHA, restriction, session_expired) require admin manual reactivation. Add a "Reactivate" button to the sender card for hard-flagged senders. POST to `/api/senders/[id]/reactivate`.

**When to use:** When `sender.healthStatus` is `blocked` or `session_expired`.

```typescript
// POST /api/senders/[id]/reactivate
// Resets healthStatus → "healthy", records SenderHealthEvent(reason: "admin_reactivated")
// Does NOT change sender.status (stays paused if manually paused)
await prisma.sender.update({
  where: { id },
  data: { healthStatus: "healthy" },
});
await prisma.senderHealthEvent.create({
  data: { senderId: id, status: "healthy", reason: "admin_reactivated" },
});
```

### Anti-Patterns to Avoid

- **Polling sender health in real-time from the browser:** Use the cron for detection. The UI reads pre-computed health state from DB, not live signal detection.
- **Sending a Slack notification per-action-reassigned:** Fire one notification per sender flagging event, not one per action reassigned.
- **Storing sparkline data as a computed cache:** Derive it fresh from `SenderHealthEvent` on page load — 30 records max per sender, trivially fast.
- **Blocking cron on notification failure:** Wrap all notification calls in try/catch (already the pattern in inbox-health/check/route.ts).
- **Soft link mismatch for bounce rate:** `WebhookEvent.senderEmail` is a string field, not a FK. Must match against `Sender.emailAddress` case-insensitively in the health check query.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sparkline chart | Custom SVG path renderer | recharts LineChart (already installed) | Recharts handles responsive sizing, data binding, hover state |
| Slack block-kit formatting | Raw JSON | @slack/web-api KnownBlock types + existing postMessage() | Slack API quirks already handled; type safety in place |
| Email HTML | From scratch | Extend existing HTML template pattern in notifications.ts | Brand color, button style, inbox link already standardized |
| Cron authentication | Custom auth | validateCronSecret() from src/lib/cron-auth.ts | Already the project pattern |
| DB notification fan-out | Custom pub/sub | notify() from src/lib/notify.ts | DB write + ops Slack in one call |
| Action reassignment | Manual per-action loop | Prisma updateMany | Atomic, efficient, already used for cancelActionsForPerson |

**Key insight:** This phase has zero new external dependencies. Every problem maps to an existing library already installed or an existing utility already built.

---

## Common Pitfalls

### Pitfall 1: Bounce Rate at Low Send Volume

**What goes wrong:** A sender sends 2 emails, both bounce → 100% bounce rate → immediate flag. This is a false positive.
**Why it happens:** Threshold logic applied without minimum volume gate.
**How to avoid:** Enforce `sent >= 10` in the 24h window before applying the 5% threshold. (Claude's discretion: recommend 10.)
**Warning signs:** Senders flagged on their first day of activity.

### Pitfall 2: Soft Join senderEmail ↔ Sender.emailAddress

**What goes wrong:** Case mismatch between `WebhookEvent.senderEmail` (e.g. `"John@Domain.com"`) and `Sender.emailAddress` (e.g. `"john@domain.com"`) causes zero matches on bounce rate lookup.
**Why it happens:** EmailBison may send mixed-case sender emails.
**How to avoid:** Normalize both to lowercase in the health check query. Prisma does not support case-insensitive `where` on string fields without `mode: "insensitive"`.

```typescript
// Use Prisma insensitive mode:
await prisma.sender.findFirst({
  where: { emailAddress: { equals: senderEmail, mode: "insensitive" } },
});
```

### Pitfall 3: Only-Sender Workspace Race Condition

**What goes wrong:** The health check flags the only sender in a workspace and pauses all campaigns, but a concurrent webhook action re-activates the sender before the flag is written.
**Why it happens:** Non-atomic check-then-act in the health check function.
**How to avoid:** Use a DB transaction when checking sender count + flagging + pausing campaigns. Prisma `$transaction` handles this.

```typescript
await prisma.$transaction([
  prisma.sender.update({ where: { id }, data: { healthStatus: "blocked" } }),
  prisma.campaign.updateMany({ where: { workspaceSlug, status: "active" }, data: { status: "paused" } }),
]);
```

### Pitfall 4: Cooldown Bypass on Repeated Daily Crons

**What goes wrong:** A soft-flagged sender with a 24h cooldown gets checked on the next day's cron before 24h have elapsed, then auto-recovered prematurely.
**Why it happens:** Cron runs at 6am UTC; if a sender was flagged at 5:55am, it gets re-checked 24h later at 6am before cooldown expires.
**How to avoid:** Store `healthFlaggedAt` timestamp on the Sender (or derive from `SenderHealthEvent`). Auto-recovery check: `now() - flaggedAt >= cooldown duration`.

**Schema addition to Sender:**
```prisma
healthFlaggedAt DateTime? // When healthStatus last became non-healthy
```

### Pitfall 5: Reassignment to Already-At-Limit Sender

**What goes wrong:** Actions reassigned to a "healthy" sender that has already hit its daily connection limit. Actions sit in pending forever.
**Why it happens:** Least-loaded selection only counts pending actions, not consumed daily budget.
**How to avoid:** Combine pending action count + remaining daily budget in sender selection:
```typescript
// Check LinkedInDailyUsage for the target sender before reassigning
const usage = await prisma.linkedInDailyUsage.findUnique({
  where: { senderId_date: { senderId: targetId, date: today } }
});
const remainingBudget = sender.dailyConnectionLimit - (usage?.connectionsSent ?? 0);
// Only select senders with remainingBudget > 0
```

### Pitfall 6: vercel.json Cron Hobby Plan Limit

**What goes wrong:** Adding a second cron at the same time as the existing one may fail silently on Hobby plan — Vercel Hobby allows only 2 crons.
**Why it happens:** Hobby plan limit (currently 2 crons). The project already uses 2 crons.
**How to avoid:** Do NOT add a third vercel.json cron. Instead, add the sender health check as a step inside the existing inbox-health cron route, OR add a new step within the existing enrichment cron. This was the user's stated intent: "piggyback on existing daily cron."

**Resolution:** Create `/api/sender-health/check` as a standalone route but call it from inside `/api/inbox-health/check/route.ts` via internal HTTP or direct function import. The simplest approach: import `runSenderHealthCheck` into the inbox-health cron route and call it there.

---

## Code Examples

Verified patterns from existing codebase:

### Existing Cron Auth Pattern
```typescript
// Source: src/app/api/inbox-health/check/route.ts
import { validateCronSecret } from "@/lib/cron-auth";
export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ...
}
```

### Existing Slack Block Notification Pattern
```typescript
// Source: src/lib/notifications.ts — notifyApproval()
await postMessage(slackChannelId, headerText, [
  { type: "header", text: { type: "plain_text", text: headerText } },
  { type: "section", text: { type: "mrkdwn", text: `*Sender:* ${senderName}` } },
  { type: "section", text: { type: "mrkdwn", text: `*Reason:* ${reason}` } },
  {
    type: "actions",
    elements: [{ type: "button", text: { type: "plain_text", text: "View Senders" }, url: sendersUrl }],
  },
]);
```

### Existing Email Notification Pattern
```typescript
// Source: src/lib/notifications.ts — notifyReply()
await sendNotificationEmail({
  to: recipients,
  subject: `[${workspace.name}] Sender Flagged: ${senderName}`,
  html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
<h2 style="color:#dc2626;">Sender Health Alert</h2>
<p><strong>Sender:</strong> ${senderName}</p>
<p><strong>Reason:</strong> ${reason}</p>
<table role="presentation" ...>
  <tr><td style="background-color:#F0FF7A;border-radius:6px;padding:0;">
    <a href="${sendersUrl}" ...>View Senders</a>
  </td></tr>
</table>
</div>`,
});
```

### Existing recharts Sparkline Pattern
```typescript
// Source: src/components/dashboard/activity-chart.tsx — already uses AreaChart with no-axis style
// For sparkline: strip axes, reduce height, use LineChart stepAfter
import { LineChart, Line, ResponsiveContainer } from "recharts";

<ResponsiveContainer width="100%" height={40}>
  <LineChart data={sparklineData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
    <Line type="stepAfter" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
  </LineChart>
</ResponsiveContainer>
```

### Existing updateMany Reassignment Pattern
```typescript
// Source: src/lib/linkedin/queue.ts — cancelActionsForPerson()
const result = await prisma.linkedInAction.updateMany({
  where: { senderId: flaggedSenderId, status: "pending" },
  data: { senderId: newSenderId },
});
```

### Existing groupBy Aggregation Pattern
```typescript
// Source: src/app/api/dashboard/stats/route.ts
const senderHealthStats = await prisma.sender.groupBy({
  by: ["healthStatus"],
  where: wsFilterSlug,
  _count: { healthStatus: true },
});
```

---

## What Already Exists (Don't Rebuild)

These are done — Phase 13 extends them:

| Existing | Location | How Phase 13 Uses It |
|----------|----------|----------------------|
| `Sender.healthStatus` field | `prisma/schema.prisma` | Already has healthy/warning/blocked/session_expired values |
| `Sender.healthEvents` (not yet) | Schema MISSING — Phase 13 adds | `SenderHealthEvent` table needs to be created |
| `PATCH /api/linkedin/senders/[id]/health` | `src/app/api/linkedin/senders/[id]/health/route.ts` | Worker already updates healthStatus; extend to also create SenderHealthEvent |
| `pauseSender()` | `src/lib/linkedin/sender.ts` | Re-use in health check when flagging |
| `updateMany` reassignment | `src/lib/linkedin/queue.ts` | Already the pattern for bulk action updates |
| `checkAllWorkspaces()` inbox health | `src/lib/inbox-health/monitor.ts` | Direct structural model for `runSenderHealthCheck()` |
| `notify()` | `src/lib/notify.ts` | DB write + ops Slack for all health events |
| `notifyApproval()` pattern | `src/lib/notifications.ts` | Extend to add `notifySenderHealth()` |
| `MetricCard` | `src/components/dashboard/metric-card.tsx` | Use for health KPI card on dashboard |
| `ActivityChart` / recharts | `src/components/dashboard/activity-chart.tsx` | Use recharts LineChart for sparklines |
| `SenderCard` | `src/components/senders/sender-card.tsx` | Extend with health section, not replace |
| KPIs already include sender counts | `src/app/api/dashboard/stats/route.ts` | `sendersHealthy`, `sendersWarning`, `sendersBlocked` already computed |

**The dashboard KPIs are already computed.** `sendersHealthy`, `sendersWarning`, `sendersPaused`, `sendersBlocked`, `sendersSessionExpired` are already in `DashboardKPIs`. The Phase 13 dashboard card just needs to display them as a dedicated "Sender Health" KPI group — the data is already returned by `/api/dashboard/stats`.

---

## Schema Changes Required

### New Model: SenderHealthEvent

```prisma
model SenderHealthEvent {
  id        String   @id @default(cuid())
  senderId  String
  status    String   // "healthy" | "warning" | "blocked" | "session_expired"
  reason    String   // "bounce_rate" | "captcha" | "restriction" | "session_expired" | "manual" | "auto_recovered" | "admin_reactivated"
  detail    String?  // human-readable explanation, e.g. "Bounce rate 7.2% (14/193 sends)"
  bouncePct Float?   // snapshot at time of event (null for non-bounce reasons)
  createdAt DateTime @default(now())

  sender Sender @relation(fields: [senderId], references: [id], onDelete: Cascade)

  @@index([senderId, createdAt])
  @@index([createdAt])
}
```

### New Fields on Sender

```prisma
// Add to existing Sender model:
healthFlaggedAt DateTime?  // When healthStatus last became non-healthy (for cooldown math)
```

### Relation on Sender

```prisma
// Add to Sender model:
healthEvents SenderHealthEvent[]
```

**Migration command:** `npx prisma db push` (project uses push-based schema workflow, no migrations directory).

---

## Implementation Plan Summary (for Planner)

Phase 13 naturally decomposes into 5 plans:

1. **Schema** — Add `SenderHealthEvent` model + `Sender.healthFlaggedAt`. Run `prisma db push`.

2. **Health Check Engine** — Create `src/lib/linkedin/health-check.ts` with `runSenderHealthCheck()`. Logic: compute bounce rates from WebhookEvent, check LinkedInDailyUsage for CAPTCHA/restriction signals, check `Sender.sessionStatus === "expired"`, flag senders, record health events, reassign actions, handle last-sender workspace pause. Integrate into inbox-health cron (direct import, no new vercel.json cron).

3. **Notifications** — Add `notifySenderHealth()` to `src/lib/notifications.ts`. Wire critical alerts (Slack + email) and daily digest (Slack only). Follow exact pattern of `notifyApproval()` and `notifyInboxDisconnect()`.

4. **Sender Card UI** — Extend `SenderCard` with expandable health history panel. Add sparkline chart component. Add health event list. Add "Reactivate" button for hard-flagged senders. Add "Swap" button for campaign sender reassignment. New API endpoint: `POST /api/senders/[id]/reactivate`.

5. **Dashboard KPI Card** — Add "Sender Health" KPI section to dashboard home. Data already exists in `/api/dashboard/stats` response — just needs a dedicated card in the UI with a link to /senders.

---

## Open Questions

1. **Bounce rate source for email-only senders**
   - What we know: `WebhookEvent.senderEmail` links bounce events to a sender address
   - What's unclear: EmailBison may not always populate `senderEmail` on BOUNCED events
   - Recommendation: Verify in live data before assuming it's reliable. If empty, fall back to workspace-level bounce tracking.

2. **CAPTCHA/restriction detection source**
   - What we know: `LinkedInDailyUsage.captchaDetected` and `.restrictionNotice` Boolean fields exist on the table — these are set by the worker during action execution
   - What's unclear: Are these fields actively being written by the current worker implementation, or are they schema-only placeholders?
   - Recommendation: Check Railway worker code before assuming these fields are populated. If not populated, the cron health check will need to infer from action failure patterns instead.

3. **Soft flag cooldown duration**
   - What we know: Claude's discretion
   - Recommendation: 48 hours. Bounce rate issues typically normalize within 2 days after sender warms up or bad list segment exhausted. Short enough to not leave healthy senders benched; long enough to see improvement.

4. **Campaign sender assignment model**
   - What we know: Campaigns do not have a direct `senderId` FK — sender assignment is done at action enqueue time via `assignSenderForPerson()`
   - What's unclear: The "inline swap on campaign" UI in the CONTEXT.md implies swapping a sender on a specific campaign. But campaigns don't store a sender reference. This likely means "reassign all pending actions for this campaign from sender A to sender B."
   - Recommendation: The swap button on sender card should be scoped to: "reassign all pending actions by this sender in workspace X to another healthy sender." Campaign-level granularity may not be feasible without a `Campaign.senderId` FK — clarify scope before building the swap UI.

---

## Sources

### Primary (HIGH confidence)

- Prisma schema at `prisma/schema.prisma` — Sender model fields, existing indexes, DB patterns
- `src/lib/linkedin/queue.ts` — updateMany reassignment pattern, action status lifecycle
- `src/lib/linkedin/sender.ts` — pauseSender, getActiveSenders, assignSenderForPerson
- `src/lib/notifications.ts` — notifyApproval/notifyReply patterns (Slack blocks + email HTML)
- `src/lib/notify.ts` — DB + ops Slack fan-out pattern
- `src/app/api/inbox-health/check/route.ts` — cron pattern, validateCronSecret, notify() integration
- `src/app/api/dashboard/stats/route.ts` — groupBy aggregation patterns, existing KPI fields
- `src/components/dashboard/activity-chart.tsx` — recharts AreaChart pattern (basis for sparklines)
- `src/components/senders/sender-card.tsx` — existing card structure to extend
- `vercel.json` — 2 existing crons (at Hobby plan limit)
- `package.json` — recharts 3.7.0 confirmed installed

### Secondary (MEDIUM confidence)

- Recharts v3 API (sparkline via LineChart with height=40, no axes) — confirmed by installed version and activity-chart.tsx usage
- Prisma `mode: "insensitive"` for case-insensitive string matching — standard Prisma feature, confirmed in Prisma 6 docs

### Tertiary (LOW confidence)

- `LinkedInDailyUsage.captchaDetected` and `.restrictionNotice` field population — schema exists but worker write behavior unconfirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all confirmed installed
- Architecture: HIGH — all patterns verified against existing files
- Pitfalls: HIGH — all derived from reading actual codebase constraints (soft joins, cron limits, schema gaps)
- Open questions: 2 HIGH-risk items (captchaDetected write status, campaign sender swap scope) flagged for validation before plan 4

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable tech stack, no fast-moving dependencies)
