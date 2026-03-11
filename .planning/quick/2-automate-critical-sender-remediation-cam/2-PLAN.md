---
phase: quick
plan: 2
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - src/lib/emailbison/types.ts
  - src/lib/emailbison/client.ts
  - src/lib/domain-health/bounce-monitor.ts
autonomous: true
requirements: [QUICK-2]

must_haves:
  truths:
    - "When a sender escalates to critical, all active campaigns containing that sender are paused, sender removed, campaigns resumed"
    - "Critical sender gets daily_limit set to 1 and warmup disabled (if blacklisted)"
    - "Removed campaign IDs and original warmup state are stored on Sender for recovery"
    - "When stepping down FROM critical, daily_limit is restored, warmup re-enabled, and admin notified of campaigns that need manual re-add"
  artifacts:
    - path: "src/lib/emailbison/client.ts"
      provides: "pauseCampaign, resumeCampaign, removeSenderFromCampaign methods"
    - path: "src/lib/domain-health/bounce-monitor.ts"
      provides: "Critical remediation flow and recovery flow"
    - path: "prisma/schema.prisma"
      provides: "originalWarmupEnabled and removedFromCampaignIds fields on Sender"
  key_links:
    - from: "bounce-monitor.ts evaluateSender (critical escalation)"
      to: "client.ts pauseCampaign/removeSenderFromCampaign/resumeCampaign"
      via: "Sequential API calls per campaign"
      pattern: "pauseCampaign.*removeSenderFromCampaign.*resumeCampaign"
    - from: "bounce-monitor.ts evaluateSender (step-down from critical)"
      to: "client.ts patchSenderEmail"
      via: "Restore daily_limit + warmup_enabled"
      pattern: "patchSenderEmail.*originalDailyLimit.*warmup_enabled"
---

<objective>
Automate critical sender remediation in bounce-monitor: when a sender hits critical, pause each active campaign containing that sender, remove the sender, resume the campaign, set daily_limit to 1, disable warmup if blacklisted. Store original state for recovery. On step-down from critical, restore daily_limit, re-enable warmup, and include removed campaign IDs in the transition so notifications can inform admin.

Purpose: Eliminates manual intervention for critical senders — the system automatically quarantines them from campaigns to protect domain reputation.
Output: Updated bounce-monitor with full critical remediation and recovery automation.
</objective>

<execution_context>
@/Users/jjay/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jjay/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@prisma/schema.prisma (Sender model lines 804-873, EmailHealthEvent model lines 892-911)
@src/lib/emailbison/client.ts (full file — add new campaign management methods)
@src/lib/emailbison/types.ts (SenderEmail interface — add campaigns field)
@src/lib/domain-health/bounce-monitor.ts (full file — modify critical escalation + recovery)

<interfaces>
From src/lib/emailbison/client.ts:
```typescript
export class EmailBisonClient {
  async patchSenderEmail(senderEmailId: number, params: PatchSenderEmailParams): Promise<SenderEmail>;
  async getSenderEmails(): Promise<SenderEmail[]>;
  // ... private request<T>(endpoint, options) handles retries
}
```

From src/lib/emailbison/types.ts:
```typescript
export interface SenderEmail {
  id: number;
  email: string;
  daily_limit?: number;
  warmup_enabled?: boolean;
  // campaigns field exists in API response but not yet typed
}

export interface PatchSenderEmailParams {
  daily_limit?: number;
  warmup_enabled?: boolean;
  status?: string;
}
```

From src/lib/domain-health/bounce-monitor.ts:
```typescript
export async function evaluateSender(params: {
  sender: SenderSnapshot;
  bounceRate: number | null;
  isBlacklisted: boolean;
}): Promise<{ transitioned: boolean; from?: string; to?: string; reason?: string; action?: string }>;
```

Sender model key fields:
```prisma
emailBisonSenderId  Int?     // EmailBison numeric ID
originalDailyLimit  Int?     // stored before reduction
// NEED TO ADD: originalWarmupEnabled Boolean?, removedFromCampaignIds String?
```
</interfaces>

**CRITICAL API BEHAVIORS (verified live):**
1. `PATCH /campaigns/{id}/pause` -> 200, status becomes "paused"
2. `PATCH /campaigns/{id}/resume` -> 200, status becomes "queued"
3. `DELETE /campaigns/{id}/remove-sender-emails` with body `{ sender_email_ids: [id] }` -> works, campaign MUST be paused first (422 if active)
4. `PATCH /sender-emails/{id}` with `{ daily_limit: N }` -> min value is 1 (0 returns 422)
5. `PATCH /sender-emails/{id}` with `{ warmup_enabled: false, daily_limit: N }` -> daily_limit is REQUIRED with every patch
6. Status field on sender patch is silently ignored — can't pause sender directly
7. No API to ADD sender back to campaign — admin must manually re-add
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add schema fields + EmailBison campaign management methods</name>
  <files>
    prisma/schema.prisma
    src/lib/emailbison/types.ts
    src/lib/emailbison/client.ts
  </files>
  <action>
1. **prisma/schema.prisma** — Add two fields to the Sender model (after `originalDailyLimit`):
   ```
   originalWarmupEnabled     Boolean? // stored before disabling warmup at critical, restored on step-down
   removedFromCampaignIds    String?  // JSON array of campaign IDs sender was removed from at critical (e.g. "[123,456]")
   ```
   Run `npx prisma db push` to apply (no migration file needed).

2. **src/lib/emailbison/types.ts** — Add `campaigns` field to `SenderEmail` interface:
   ```typescript
   campaigns?: Array<{ id: number; name: string; status: string }>;
   ```
   This field is returned by the GET /sender-emails API but was not previously typed.

3. **src/lib/emailbison/client.ts** — Add three new methods to `EmailBisonClient`:

   a. `pauseCampaign(campaignId: number): Promise<Campaign>` — `PATCH /campaigns/${campaignId}/pause` with empty body, method PATCH, revalidate 0. Returns `res.data`.

   b. `resumeCampaign(campaignId: number): Promise<Campaign>` — `PATCH /campaigns/${campaignId}/resume` with empty body, method PATCH, revalidate 0. Returns `res.data`.

   c. `removeSenderFromCampaign(campaignId: number, senderEmailId: number): Promise<void>` — `DELETE /campaigns/${campaignId}/remove-sender-emails` with body `JSON.stringify({ sender_email_ids: [senderEmailId] })`, method DELETE, revalidate 0. No return value needed (API returns 200 with empty-ish response).

   Import the `Campaign` type at the top (already imported in types).
  </action>
  <verify>
    npx prisma validate && npx tsc --noEmit --pretty 2>&1 | head -30
  </verify>
  <done>
    - Sender model has originalWarmupEnabled and removedFromCampaignIds fields
    - SenderEmail type includes campaigns array
    - EmailBisonClient has pauseCampaign, resumeCampaign, removeSenderFromCampaign methods
    - TypeScript compiles clean
  </done>
</task>

<task type="auto">
  <name>Task 2: Implement critical remediation and recovery in bounce-monitor</name>
  <files>
    src/lib/domain-health/bounce-monitor.ts
  </files>
  <action>
**Part A: Update SenderSnapshot interface** to include the two new fields:
```typescript
originalWarmupEnabled: boolean | null;
removedFromCampaignIds: string | null; // JSON string
```
Update the `runBounceMonitor` select query to include these two fields.

**Part B: Replace the critical escalation block** (the `else if (newStatus === "critical")` block, currently lines ~150-157).

The new critical remediation flow (all wrapped in try/catch, failures log but don't block the status transition):

```typescript
// Critical remediation: remove sender from all active campaigns
try {
  const ebClient = new EmailBisonClient(process.env.EMAILBISON_API_TOKEN ?? "");
  const senderEmails = await ebClient.getSenderEmails();
  const senderEmail = senderEmails.find(s => s.id === sender.emailBisonSenderId);

  if (senderEmail) {
    // Store original state before modifying
    const currentLimit = senderEmail.daily_limit ?? 100;
    const currentWarmup = senderEmail.warmup_enabled ?? true;
    const limitToStore = sender.originalDailyLimit ?? currentLimit;

    // Find active campaigns this sender is in
    const activeCampaigns = (senderEmail.campaigns ?? []).filter(
      c => c.status === "active"
    );
    const removedCampaignIds: number[] = [];

    // For each active campaign: pause -> remove sender -> resume
    for (const campaign of activeCampaigns) {
      try {
        await ebClient.pauseCampaign(campaign.id);
        await ebClient.removeSenderFromCampaign(campaign.id, sender.emailBisonSenderId!);
        await ebClient.resumeCampaign(campaign.id);
        removedCampaignIds.push(campaign.id);
        console.log(`${LOG_PREFIX} ${sender.emailAddress}: removed from campaign "${campaign.name}" (${campaign.id})`);
      } catch (campaignErr) {
        console.error(`${LOG_PREFIX} Failed to remove ${sender.emailAddress} from campaign ${campaign.id}:`, campaignErr);
        // Try to resume campaign if we paused it but removal failed
        try { await ebClient.resumeCampaign(campaign.id); } catch { /* best effort */ }
      }
    }

    // Set daily_limit to 1
    await ebClient.patchSenderEmail(sender.emailBisonSenderId!, {
      daily_limit: 1,
      warmup_enabled: isBlacklisted ? false : currentWarmup,
    });

    // Store original state on Sender for recovery
    await prisma.sender.update({
      where: { id: sender.id },
      data: {
        originalDailyLimit: limitToStore,
        originalWarmupEnabled: currentWarmup,
        removedFromCampaignIds: removedCampaignIds.length > 0 ? JSON.stringify(removedCampaignIds) : null,
      },
    });

    action = removedCampaignIds.length > 0
      ? "critical_remediation_complete"
      : "critical_daily_limit_reduced";
    console.log(
      `${LOG_PREFIX} ${sender.emailAddress}: CRITICAL remediation — ` +
      `daily_limit=1, removed from ${removedCampaignIds.length} campaigns` +
      (isBlacklisted ? ", warmup disabled (blacklisted)" : "")
    );
  }
} catch (err) {
  console.error(`${LOG_PREFIX} Critical remediation failed for ${sender.emailAddress}:`, err);
  action = "critical_remediation_failed";
}
```

**Part C: Update the step-down recovery block** (currently handles `currentStatus === "warning"` around lines 208-218). Expand it to ALSO handle `currentStatus === "critical"` (stepping down from critical to warning):

When `currentStatus === "critical"`:
```typescript
if (currentStatus === "critical" && EMAILBISON_MGMT_ENABLED && sender.emailBisonSenderId !== null) {
  try {
    const ebClient = new EmailBisonClient(process.env.EMAILBISON_API_TOKEN ?? "");
    // Restore daily_limit
    const restoreLimit = sender.originalDailyLimit ?? 100;
    // Restore warmup
    const restoreWarmup = sender.originalWarmupEnabled ?? true;
    await ebClient.patchSenderEmail(sender.emailBisonSenderId, {
      daily_limit: restoreLimit,
      warmup_enabled: restoreWarmup,
    });

    // Parse removed campaign IDs for notification
    let removedCampaigns: number[] = [];
    try {
      removedCampaigns = sender.removedFromCampaignIds ? JSON.parse(sender.removedFromCampaignIds) : [];
    } catch { /* ignore parse errors */ }

    action = "critical_recovery_complete";
    console.log(
      `${LOG_PREFIX} ${sender.emailAddress}: recovery from critical — ` +
      `daily_limit=${restoreLimit}, warmup=${restoreWarmup}` +
      (removedCampaigns.length > 0 ? `, NOTE: was removed from campaigns ${removedCampaigns.join(",")} — manual re-add required` : "")
    );
  } catch (err) {
    console.error(`${LOG_PREFIX} Failed to restore settings for ${sender.emailAddress}:`, err);
  }
}
```

Also update the Sender update in the step-down transaction to clear recovery fields when stepping down from critical:
```typescript
...(currentStatus === "critical" ? {
  originalDailyLimit: null,
  originalWarmupEnabled: null,
  removedFromCampaignIds: null,
} : {}),
...(currentStatus === "warning" ? { originalDailyLimit: null } : {}),
```

**Part D: Update the step-down from warning block** — keep existing logic (restore daily_limit only), no changes needed other than the transaction data update above which now handles both cases.
  </action>
  <verify>
    npx tsc --noEmit --pretty 2>&1 | head -30
  </verify>
  <done>
    - Critical escalation: fetches sender's campaigns, pauses each, removes sender, resumes, sets daily_limit=1, disables warmup if blacklisted
    - Original state (daily_limit, warmup, removed campaign IDs) stored on Sender model
    - Step-down from critical: restores daily_limit and warmup_enabled, clears stored recovery fields, logs removed campaign IDs for admin notification
    - All EmailBison calls wrapped in try/catch — failures logged but don't block status transitions
    - Entire flow gated behind EMAILBISON_SENDER_MGMT_ENABLED feature flag
    - TypeScript compiles clean
  </done>
</task>

</tasks>

<verification>
1. `npx prisma validate` passes
2. `npx tsc --noEmit` passes with no errors
3. Manual review: bounce-monitor.ts critical block calls pauseCampaign -> removeSenderFromCampaign -> resumeCampaign in sequence
4. Manual review: step-down from critical restores daily_limit + warmup_enabled and clears removedFromCampaignIds
</verification>

<success_criteria>
- TypeScript compiles with zero errors
- Prisma schema valid and pushed to database
- Critical escalation automates the full pause-remove-resume campaign flow
- Recovery from critical restores sender settings and surfaces removed campaign IDs
- All API calls are feature-flagged behind EMAILBISON_SENDER_MGMT_ENABLED
- Failure in any individual campaign removal does not block other campaigns or status transition
</success_criteria>

<output>
After completion, create `.planning/quick/2-automate-critical-sender-remediation-cam/2-SUMMARY.md`
</output>
