# Phase 31: Auto-Rotation Engine - Research

**Researched:** 2026-03-11
**Domain:** Email sender health monitoring, state machine transitions, EmailBison API management
**Confidence:** HIGH (codebase analysis) / MEDIUM (EmailBison API capabilities for ROTATE-06)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Thresholds** (tighter than original spec):
- healthy: < 2%
- elevated: 2–3%
- warning: 3–5%
- critical: > 5% OR blacklisted domain

**Recovery logic:**
- Gradual step-down: critical → warning → elevated → healthy (one level per 24h sustained below threshold)
- 24h = 6 consecutive 4-hour checks below the target level's threshold before stepping down
- Critical to healthy takes minimum 3 days
- Manual override available — admin can force any status, recorded in audit trail with 'manual' reason
- Next cron check resumes automatic evaluation after manual override (no locking)
- Blacklist recovery automatic — once domain-health confirms delisting, senders re-enter normal threshold evaluation

**Notification behavior:**
- Notify on status transitions ONLY — no repeat alerts every 4h for sustained states
- Channels: Slack (ops channel) + admin email — never client-facing
- Elevated/warning = informational with recommended action text
- Critical = states what the system already did (auto-pause, campaign removal)
- Recovery notifications sent when sender steps down a level

**EmailBison actions (automated):**
- Elevated: notify only, no automated action
- Warning (3–5%): auto-reduce daily sending limit by 50%. Notification states what was done.
- Critical (>5% or blacklisted): auto-remove sender from all active campaigns + keep EmailBison warmup active
- Sender replacement: when critical sender removed, replace with healthiest available sender (lowest bounce rate) in same workspace. If no healthy senders, notify admin.
- Recovery: system auto-restores daily limit when stepping down from warning. Recovered senders return to pool — no re-add to specific campaigns.
- EmailBison warmup configurable per inbox via API — use this, don't build custom warmup
- All EmailBison API actions feature-flagged pending API investigation (ROTATE-06)

### Claude's Discretion
- Exact EmailBison API method for pausing (set daily limit to 0 vs deactivate endpoint — researcher determines)
- How to store the "original daily limit" for restoration after recovery
- Audit trail schema design (EmailHealthEvent model fields)
- Bounce monitor cron implementation details (batch processing, timeout handling)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ROTATE-01 | Bounce monitor cron runs every 4 hours, evaluates health status for all sender emails across all workspaces | 4-hour crons must be on cron-job.org (Vercel Hobby only supports daily). Pattern established by poll-replies and inbox-health crons. Route at `/api/cron/bounce-monitor/route.ts` using `validateCronSecret`. |
| ROTATE-02 | Graduated health status: healthy (<2%), elevated (2-3%), warning (3-5%), critical (>5% or blacklisted) | Note: REQUIREMENTS.md has different thresholds than CONTEXT.md — CONTEXT.md locked decisions take precedence. BounceSnapshot.bounceRate already computed. Need new `EmailHealthEvent` model + `emailBounceStatus` field on Sender. |
| ROTATE-03 | Auto-recovery: gradual step-down, one level per 6 consecutive checks (24h) below threshold | Requires tracking consecutive-checks-below-threshold. New field on Sender or embedded in EmailHealthEvent query. See Architecture Patterns section. |
| ROTATE-04 | EmailHealthEvent audit trail records all status transitions with reason and bounce percentage | New model needed — distinct from existing `SenderHealthEvent` (which tracks LinkedIn sender health). Schema design in Architecture Patterns. |
| ROTATE-05 | Admin notification (Slack ops channel + email) when sender reaches warning/critical — transitions only | Follow pattern from `src/lib/domain-health/notifications.ts` — `OPS_SLACK_CHANNEL_ID` + `ADMIN_EMAIL`, wrapped with `audited()`. |
| ROTATE-06 | EmailBison sender management methods: pause (daily limit), daily limit adjustment, warmup — feature-flagged | EmailBison `/sender-emails` endpoint exists (used in getSenderEmails). No PATCH exists yet in client. Investigate PATCH `/api/sender-emails/{id}` for daily_limit. Feature flag via env var `EMAILBISON_SENDER_MGMT_ENABLED`. |
</phase_requirements>

---

## Summary

Phase 31 builds a fully autonomous email sender health state machine. The core loop: a 4-hour cron reads the latest `BounceSnapshot.bounceRate` for every sender email, applies threshold logic to determine the current health status, transitions status when thresholds are crossed, executes EmailBison actions (daily limit reduction, campaign removal, sender replacement), records an `EmailHealthEvent` audit entry for every transition, and fires admin notifications on transitions only.

The codebase already provides almost everything needed as building blocks: `BounceSnapshot` with computed `bounceRate`, `DomainHealth.overallHealth` for blacklist status, the domain-health notification pattern (ops Slack + admin email wrapped in `audited()`), `SenderHealthEvent` as an audit trail precedent (for LinkedIn senders), and `EmailBisonClient` with `getSenderEmails()`. What's new: the `EmailHealthEvent` model, a new `emailBounceStatus` field on `Sender`, a field to track "consecutive checks below threshold" for the step-down logic, the `EmailBisonClient` PATCH methods (feature-flagged), and the new cron route at `/api/cron/bounce-monitor`.

The key complexity is the step-down recovery logic (6 consecutive 4-hour checks below threshold before stepping down one level) and the EmailBison sender management API (ROTATE-06 is feature-flagged precisely because the exact endpoint behavior is unconfirmed). The REQUIREMENTS.md has slightly different thresholds than CONTEXT.md — the locked decisions in CONTEXT.md are authoritative.

**Primary recommendation:** Build the state machine logic in `src/lib/domain-health/bounce-monitor.ts`, implement the cron route thin (delegates to the library), and feature-flag all EmailBison API calls. Use a `consecutiveChecksBelowThreshold` counter on the `Sender` model (or derived from recent `EmailHealthEvent` query) to drive step-down logic.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@prisma/client` | 6.x (existing) | New EmailHealthEvent model + Sender field additions | Already in project |
| Next.js Route Handler | 16.x (existing) | Cron endpoint at `/api/cron/bounce-monitor` | Established pattern |
| `node-fetch` / built-in `fetch` | Node 18+ (existing) | EmailBison PATCH calls | Already in EmailBisonClient |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@slack/web-api` | existing | Slack block-kit notifications | Already used in domain-health/notifications.ts |
| Resend | existing | Admin email notifications | Already used in notifications.ts |
| cron-job.org | external | 4-hour cron schedule | Vercel Hobby plan can't do sub-daily crons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cron-job.org external cron | Vercel crons | Vercel Hobby only supports daily — external required for 4-hour |
| `consecutiveChecksBelowThreshold` counter on Sender | Query last N EmailHealthEvents | Counter is O(1) read; query is O(N) — counter preferred |
| Feature-flagging EmailBison PATCH via env var | Always call API | Feature flag is locked decision — ROTATE-06 is explicitly flagged |

**Installation:** No new packages needed. Existing stack covers all requirements.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/domain-health/
│   ├── bounce-monitor.ts        # NEW — state machine logic, step-down, EmailBison actions
│   ├── bounce-notifications.ts  # NEW — sender health transition notifications
│   ├── snapshots.ts             # EXISTING — BounceSnapshot capture
│   ├── notifications.ts         # EXISTING — domain blacklist/DNS notifications
│   └── warmup.ts                # EXISTING — EmailBison warmup API
├── lib/emailbison/
│   ├── client.ts                # EXTEND — add patchSenderEmail(), getSenderEmailById()
│   └── types.ts                 # EXTEND — add PatchSenderEmailParams type
└── app/api/cron/
    └── bounce-monitor/
        └── route.ts             # NEW — 4-hour cron handler
```

### Pattern 1: Existing BounceSnapshot as input
**What:** The bounce monitor reads the most recent `BounceSnapshot` per sender email (already computed daily by the bounce-snapshots cron). For the 4-hour monitor, the most recent snapshot is the input — no re-fetching from EmailBison.
**When to use:** In bounce-monitor.ts when evaluating current health status.
**Example:**
```typescript
// Read latest bounce rate for a sender
const latestSnapshot = await prisma.bounceSnapshot.findFirst({
  where: { senderEmail },
  orderBy: { snapshotDate: 'desc' },
  select: { bounceRate: true, snapshotDate: true },
});
const bounceRate = latestSnapshot?.bounceRate ?? null;
```

### Pattern 2: Blacklist check via DomainHealth
**What:** Critical status can be triggered by blacklist. Use `DomainHealth.overallHealth === 'critical'` or `blacklistSeverity === 'critical'` on the sender's domain. Already computed by the domain-health cron.
**When to use:** In the threshold evaluation step after reading bounceRate.
```typescript
const senderDomain = senderEmail.split('@')[1];
const domainHealth = await prisma.domainHealth.findUnique({
  where: { domain: senderDomain },
  select: { overallHealth: true, blacklistSeverity: true },
});
const isBlacklisted = domainHealth?.overallHealth === 'critical';
```

### Pattern 3: Status transition (transition-only notifications)
**What:** Only act when status CHANGES. Compare current `Sender.emailBounceStatus` against newly computed status. Skip if same.
**Example:**
```typescript
const currentStatus = sender.emailBounceStatus; // 'healthy' | 'elevated' | 'warning' | 'critical'
const newStatus = computeStatus(bounceRate, isBlacklisted);

if (newStatus === currentStatus) {
  // Check step-down eligibility if in elevated/warning/critical
  // ...but do NOT send notification
  return;
}

// Status changed — write EmailHealthEvent, update Sender, send notification
await prisma.emailHealthEvent.create({ ... });
await prisma.sender.update({ where: { id: sender.id }, data: { emailBounceStatus: newStatus, ... } });
await notifySenderHealthTransition({ ... });
```

### Pattern 4: Step-down recovery using consecutive checks counter
**What:** Track how many consecutive 4-hour cron checks the sender has been below the target threshold. When count reaches 6 (24h), step down one level.
**Recommendation:** Add `consecutiveHealthyChecks Int @default(0)` field to `Sender` model. Reset to 0 on any escalation. Increment on each check where bounce rate is below threshold for step-down. Step down when count = 6.
**Example:**
```typescript
// In step-down evaluation (only runs when status is elevated/warning/critical):
if (isEligibleForStepDown(bounceRate, currentStatus)) {
  const newCount = sender.consecutiveHealthyChecks + 1;
  if (newCount >= 6) {
    // Step down one level
    const stepDownStatus = stepDown(currentStatus);
    await prisma.sender.update({
      where: { id: sender.id },
      data: { emailBounceStatus: stepDownStatus, consecutiveHealthyChecks: 0 },
    });
    await prisma.emailHealthEvent.create({ /* reason: 'step_down' */ });
    await notifySenderHealthTransition({ ... }); // recovery notification
  } else {
    await prisma.sender.update({
      where: { id: sender.id },
      data: { consecutiveHealthyChecks: newCount },
    });
  }
} else {
  // Not eligible — reset counter
  await prisma.sender.update({
    where: { id: sender.id },
    data: { consecutiveHealthyChecks: 0 },
  });
}
```

**Step-down threshold map** (what bounce rate must be sustained below to step down):
- critical → warning: must be below 5% for 6 checks
- warning → elevated: must be below 3% for 6 checks
- elevated → healthy: must be below 2% for 6 checks

### Pattern 5: EmailBison daily limit management (feature-flagged)
**What:** For warning status, reduce daily limit by 50%. Store original limit for restoration. For critical, remove sender from all active campaigns.
**Feature flag:** `process.env.EMAILBISON_SENDER_MGMT_ENABLED === 'true'`
**Storing original limit:** Add `originalDailyLimit Int?` field on `Sender` model. Set when first reducing limit; null when restored.
**API pattern to investigate:** EmailBison white-label is at `https://app.outsignal.ai/api`. Existing `/sender-emails` is GET. The PATCH endpoint likely is `PATCH /api/sender-emails/{id}` with body `{ daily_limit: N }`. Needs live testing. The `SenderEmail.daily_limit` field from types.ts confirms the field exists.

```typescript
// Feature-flagged EmailBison sender management
async function applyWarningAction(sender: Sender, apiToken: string, currentDailyLimit: number): Promise<void> {
  if (process.env.EMAILBISON_SENDER_MGMT_ENABLED !== 'true') {
    console.log(`[bounce-monitor] EMAILBISON_SENDER_MGMT_ENABLED=false — skipping daily limit reduction`);
    return;
  }
  const newLimit = Math.max(1, Math.floor(currentDailyLimit / 2));
  await ebClient.patchSenderEmail(emailBisonSenderId, { daily_limit: newLimit });
  // Store original in DB for restoration
  await prisma.sender.update({ where: { id }, data: { originalDailyLimit: currentDailyLimit } });
}
```

### Pattern 6: Notification — ops Slack + admin email (established pattern)
**What:** All sender health transition notifications go to `OPS_SLACK_CHANNEL_ID` and `ADMIN_EMAIL`. Never to client-facing channels. Follow exactly the pattern in `src/lib/domain-health/notifications.ts`.
**Example:**
```typescript
// From domain-health/notifications.ts — replicate this pattern exactly
const opsChannelId = process.env.OPS_SLACK_CHANNEL_ID ?? null;
const adminEmail = process.env.ADMIN_EMAIL ?? null;

await audited(
  { notificationType: 'sender_health_warning', channel: 'slack', recipient: opsChannelId, metadata: { ... } },
  () => postMessage(opsChannelId, headerText, blocks),
);
```

### Pattern 7: Cron route structure (established pattern)
**What:** New cron at `/api/cron/bounce-monitor/route.ts`. Validates cron secret. Delegates to `runBounceMonitor()` from `src/lib/domain-health/bounce-monitor.ts`. Returns JSON summary.
**Register:** Add to cron-job.org every 4 hours (0:00, 4:00, 8:00, 12:00, 16:00, 20:00 UTC). Use same `Authorization: Bearer <CRON_SECRET>` header pattern.
**Note:** NOT added to `vercel.json` (Hobby plan limitation — use cron-job.org only).

```typescript
// /api/cron/bounce-monitor/route.ts
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runBounceMonitor();
  return NextResponse.json({ status: 'ok', ...result });
}
```

### Anti-Patterns to Avoid
- **Querying latest bounce rate from EmailBison in the monitor cron:** The bounce-snapshots cron already captures this daily. The monitor should read from `BounceSnapshot`, not re-fetch from EmailBison. Avoids API rate limits and keeps the cron fast.
- **Using `SenderHealthEvent` for email bounce events:** That model is for LinkedIn sender health. Create a separate `EmailHealthEvent` model to avoid confusion.
- **Re-notifying on sustained status:** Check `emailBounceStatus` before computing new status; only transition and notify when status actually changes.
- **Losing original daily limit on recovery:** Always read `sender.originalDailyLimit` before restoring. If null, don't attempt restore (limit was never modified by the system).
- **Trying to add 4-hour cron to vercel.json:** Vercel Hobby only allows daily crons. The cron-job.org external cron must be used.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audit trail wrapping | Custom audit logger | `audited()` from `src/lib/notification-audit.ts` | Already wraps all notification sends with DB audit log |
| Notification delivery | Custom Slack/email sender | `postMessage` + `sendNotificationEmail` (existing) | Rate limiting, retry, error handling already in place |
| Cron secret validation | Custom token check | `validateCronSecret()` from `src/lib/cron-auth.ts` | Timing-safe comparison, consistent pattern |
| EmailBison API client | New fetch wrapper | Extend `EmailBisonClient` in `src/lib/emailbison/client.ts` | Retry logic, rate limit handling already there |
| Slack block builder | Custom string assembly | `KnownBlock[]` type from `@slack/web-api` | Already used everywhere, typed |

**Key insight:** This codebase has strong conventions — deviate from them and you create inconsistency. The notification pattern, audit trail, cron auth, and EmailBison client are all established. Extend don't replace.

---

## Common Pitfalls

### Pitfall 1: Threshold mismatch between REQUIREMENTS.md and CONTEXT.md
**What goes wrong:** REQUIREMENTS.md says `elevated (3-5%), warning (5-8%), critical (>8%)`. CONTEXT.md locked decisions say `healthy <2%, elevated 2-3%, warning 3-5%, critical >5%`. These are different.
**Why it happens:** REQUIREMENTS.md was written before the discuss-phase session that locked tighter thresholds.
**How to avoid:** CONTEXT.md decisions are authoritative. Use: healthy <2%, elevated 2-3%, warning 3-5%, critical >5%.
**Warning signs:** If someone references REQUIREMENTS.md thresholds in plan tasks — flag immediately.

### Pitfall 2: Overloading `SenderHealthEvent` for email bounce events
**What goes wrong:** There's already a `SenderHealthEvent` model on the `Sender` record for LinkedIn health. Phase 31 creates `EmailHealthEvent` — a distinct model tracking email bounce status transitions.
**Why it happens:** The LinkedIn and email health monitoring are different systems on the same `Sender` entity.
**How to avoid:** Create a new `EmailHealthEvent` model. Do not add email-bounce events to `SenderHealthEvent`. Both will coexist on the Sender.

### Pitfall 3: Sender not found in EmailBison by email address
**What goes wrong:** The `BounceSnapshot` and `Sender` models use `senderEmail` (string). The EmailBison API identifies sender emails by `id` (integer). To call PATCH on a sender email, you need the EmailBison numeric ID, not the email address.
**Why it happens:** EmailBison API is ID-based. The `SenderEmail` type has `id: number` and `email: string`.
**How to avoid:** When applying EmailBison actions, first call `getSenderEmails()` to get the `id` for the matching email address. Cache this in the bounce monitor run. Store EmailBison sender ID on `Sender` model (add `emailBisonSenderId Int?` field) to avoid repeated lookups.

### Pitfall 4: Race between bounce-snapshots cron and bounce-monitor cron
**What goes wrong:** The bounce-snapshots cron runs daily (per cron-job.org or Vercel cron). The bounce-monitor runs every 4 hours. If the monitor runs before the daily snapshot, it reads yesterday's bounce rate.
**Why it happens:** Crons are independent jobs.
**How to avoid:** This is acceptable behavior — the bounce monitor uses the latest available snapshot. Document this: if a spike happens today and today's snapshot hasn't been captured yet, the monitor will act on yesterday's rate. The 4-hour cadence means by the next check, today's snapshot will likely be available. No fix needed — just document it.

### Pitfall 5: Missing bounce rate = no action
**What goes wrong:** `BounceSnapshot.bounceRate` is null when `deltaSent === 0` (no sends that day) or on first snapshot or counter reset. If null, the monitor has no basis to transition status.
**Why it happens:** By design in snapshots.ts — `bounceRate stays null` when deltaSent is 0.
**How to avoid:** In the bounce monitor, `null bounceRate` = skip threshold evaluation for that sender. Do not treat null as 0% (healthy). Log a skip.

### Pitfall 6: Vercel 60s timeout with many senders
**What goes wrong:** If there are 50+ sender emails across workspaces, processing each one sequentially (with potential EmailBison API calls) could exceed the 60s Vercel timeout.
**Why it happens:** Vercel serverless functions cap at 60s (maxDuration).
**How to avoid:** Process all threshold evaluations from DB first (fast batch query), then apply EmailBison actions only for senders that need transitions. Domain-health cron uses `MAX_DOMAINS_PER_RUN = 4` as a pattern. For bounce monitor, since it's database-only for most senders (EmailBison calls only on transitions), 60s should be sufficient with current volume (~10-15 senders). Add logging to monitor duration.

---

## Code Examples

### EmailHealthEvent model (recommended schema)
```prisma
model EmailHealthEvent {
  id          String   @id @default(cuid())
  senderEmail String   // e.g. "john@outsignal.ai"
  senderDomain String  // e.g. "outsignal.ai"
  workspaceSlug String

  // State transition
  fromStatus  String   // 'healthy' | 'elevated' | 'warning' | 'critical'
  toStatus    String   // 'healthy' | 'elevated' | 'warning' | 'critical'
  reason      String   // 'bounce_rate' | 'blacklist' | 'step_down' | 'manual'
  bouncePct   Float?   // Snapshot at time of transition (null for manual overrides)
  detail      String?  // Human-readable: "Bounce rate 6.2% (31/500 sends)"

  createdAt   DateTime @default(now())

  @@index([senderEmail, createdAt])
  @@index([workspaceSlug, createdAt])
  @@index([toStatus, createdAt])
}
```

### Sender model additions (recommended)
```prisma
// Add to existing Sender model:
emailBounceStatus        String    @default("healthy") // 'healthy' | 'elevated' | 'warning' | 'critical'
emailBounceStatusAt      DateTime? // When current emailBounceStatus was set
consecutiveHealthyChecks Int       @default(0) // For step-down: how many consecutive checks below threshold
emailBisonSenderId       Int?      // EmailBison numeric ID for API management calls
originalDailyLimit       Int?      // Stored before 50% reduction, restored on step-down
```

### Compute threshold status
```typescript
// Source: CONTEXT.md locked decisions
export function computeEmailBounceStatus(
  bounceRate: number | null,
  isBlacklisted: boolean,
): 'healthy' | 'elevated' | 'warning' | 'critical' | null {
  if (isBlacklisted) return 'critical';
  if (bounceRate === null) return null; // No data — skip
  if (bounceRate >= 0.05) return 'critical';
  if (bounceRate >= 0.03) return 'warning';
  if (bounceRate >= 0.02) return 'elevated';
  return 'healthy';
}
```

### Step-down eligibility
```typescript
// What bounce rate must be sustained to step down from a given status
function stepDownThreshold(currentStatus: string): number {
  switch (currentStatus) {
    case 'critical': return 0.05; // Must be below 5% for 6 checks
    case 'warning':  return 0.03; // Must be below 3% for 6 checks
    case 'elevated': return 0.02; // Must be below 2% for 6 checks
    default: return 0;
  }
}

function stepDown(status: string): string {
  switch (status) {
    case 'critical': return 'warning';
    case 'warning':  return 'elevated';
    case 'elevated': return 'healthy';
    default: return 'healthy';
  }
}
```

### Manual override API endpoint (admin-facing)
```typescript
// POST /api/senders/[id]/email-health-override
// Body: { status: 'healthy' | 'elevated' | 'warning' | 'critical', reason?: string }
// Records EmailHealthEvent with reason: 'manual'
// Resets consecutiveHealthyChecks to 0
// Next cron run resumes automatic evaluation normally
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| LinkedIn health only (`SenderHealthEvent`) | Phase 29–31 adds email bounce health as separate tracked dimension | Phase 29 (BounceSnapshot) | Email and LinkedIn health coexist independently on Sender |
| Manual monitoring via EmailBison dashboard | Automated bounce monitor cron with audit trail | Phase 31 | Zero-touch escalation and recovery |
| Domain-level blacklist notification only | Per-sender blacklist escalation to critical | Phase 31 | Blacklist triggers sender management actions, not just notification |

**Deprecated/outdated:**
- None. This is entirely new functionality.

---

## Open Questions

1. **EmailBison PATCH `/api/sender-emails/{id}` endpoint behavior**
   - What we know: `SenderEmail` type has `daily_limit?: number`, `status?: string`. EmailBison is a white-labeled PlusVibe instance at `https://app.outsignal.ai/api`.
   - What's unclear: Does a PATCH endpoint exist? What fields are writable? Does setting `daily_limit: 0` effectively pause, or is there a separate `status` field that should be set to `paused`?
   - Recommendation: Add a spike test in Plan 1 before implementing the EmailBison management methods. Call `GET /api/sender-emails` to confirm field names, then try `PATCH /api/sender-emails/{id}` with `{ daily_limit: 1 }` on a test sender. If no PATCH exists, the fallback for ROTATE-06 is to set `daily_limit` to 0 via the warmup API endpoint pattern (dededi.emailbison.com). Feature flag means this doesn't block other plans.

2. **EmailBison campaign sender removal**
   - What we know: Campaigns have a `sender_email_id` association (implied by Reply.sender_email_id). There's no existing client method for removing a sender from a campaign.
   - What's unclear: Is there an API endpoint to remove/reassign a sender from a campaign? Or is this only possible via dashboard?
   - Recommendation: Investigate `PATCH /api/campaigns/{id}` or a sender-campaigns endpoint. If not available, the "removal" may only be possible by pausing the campaign entirely (which is a heavier action). Feature flag covers this — log what would happen if the flag is disabled.

3. **Bounce rate window for the 4-hour monitor**
   - What we know: `BounceSnapshot` has `bounceRate` computed as delta-based daily rate. This is one data point per day per sender.
   - What's unclear: The 4-hour monitor evaluating status 6 times a day, but bounce data updates once daily. Should the monitor use rolling 7-day average instead of single-day rate for smoother decisions?
   - Recommendation: Use the most recent `BounceSnapshot.bounceRate` (daily delta). Don't over-engineer. The graduated thresholds and step-down logic already smooth over noise. A single-day spike at critical (>5%) should trigger action. Document that bounce rate reflects yesterday's delta until today's snapshot is captured.

---

## Validation Architecture

> `workflow.nyquist_validation` not present in config.json (only `workflow.research`, `workflow.plan_check`, `workflow.verifier`). Skip this section.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `prisma/schema.prisma` — existing models (Sender, BounceSnapshot, DomainHealth, SenderHealthEvent, EmailSenderHealth, PlacementTest)
- Codebase: `src/lib/domain-health/snapshots.ts` — BounceSnapshot capture pattern, bounceRate computation
- Codebase: `src/lib/domain-health/notifications.ts` — ops notification pattern (Slack + email, `audited()` wrapper)
- Codebase: `src/lib/domain-health/warmup.ts` — EmailBison warmup API pattern (`https://dedi.emailbison.com/api`)
- Codebase: `src/lib/emailbison/client.ts` + `types.ts` — existing EmailBison client, `SenderEmail` type with `daily_limit`
- Codebase: `src/lib/linkedin/health-check.ts` — health state machine precedent (auto-recovery, SenderHealthEvent audit trail)
- Codebase: `src/app/api/cron/domain-health/route.ts` — cron route structure pattern
- Codebase: `vercel.json` — confirms only daily crons in Vercel config; 4-hour must use cron-job.org
- Context: `31-CONTEXT.md` — locked thresholds, locked decisions on recovery/notifications/EmailBison actions

### Secondary (MEDIUM confidence)
- Pattern inference: EmailBison PATCH endpoint likely exists at `/api/sender-emails/{id}` based on REST conventions and the `daily_limit` field in the GET response type. Needs live validation.

### Tertiary (LOW confidence)
- EmailBison campaign sender removal endpoint: unknown. Not in existing client or types. Needs investigation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, established patterns
- Architecture: HIGH — state machine logic is clear, step-down pattern is well-defined
- Pitfalls: HIGH — codebase analysis reveals all real risks
- EmailBison PATCH API: LOW — not yet validated, feature-flagged by design

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (stable domain — codebase patterns won't change; EmailBison API validity depends on upstream changes)
