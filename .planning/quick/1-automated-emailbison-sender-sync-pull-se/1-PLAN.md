---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/emailbison/sync-senders.ts
  - src/app/api/cron/sync-senders/route.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "Sender.emailAddress and Sender.emailBisonSenderId are populated for all email senders across all workspaces"
    - "A daily cron endpoint exists that keeps sender records in sync with EmailBison"
    - "LinkedIn-only senders (no email in EmailBison) are skipped gracefully"
  artifacts:
    - path: "src/lib/emailbison/sync-senders.ts"
      provides: "Core sync logic — fetches EmailBison senders per workspace, matches to Sender records"
    - path: "src/app/api/cron/sync-senders/route.ts"
      provides: "Cron-triggered GET endpoint with Bearer auth"
  key_links:
    - from: "src/app/api/cron/sync-senders/route.ts"
      to: "src/lib/emailbison/sync-senders.ts"
      via: "imports syncSendersForAllWorkspaces()"
    - from: "src/lib/emailbison/sync-senders.ts"
      to: "src/lib/emailbison/client.ts"
      via: "EmailBisonClient.getSenderEmails()"
---

<objective>
Pull sender emails from EmailBison API into the Sender table (emailAddress + emailBisonSenderId) for all workspaces, and expose a daily cron endpoint so new inboxes/domains are picked up automatically.

Purpose: The bounce-monitor, domain-health, and bounce-snapshots crons all depend on Sender.emailAddress being populated. Currently these fields are set manually. Automating this removes a manual step and ensures new sender emails are synced within 24 hours.

Output: Sync library function + cron API route. User registers cron on cron-job.org after deployment.
</objective>

<execution_context>
@/Users/jjay/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jjay/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/emailbison/client.ts
@src/lib/emailbison/types.ts
@src/lib/cron-auth.ts
@src/app/api/cron/bounce-snapshots/route.ts
@prisma/schema.prisma

<interfaces>
<!-- EmailBison SenderEmail type (from src/lib/emailbison/types.ts) -->
```typescript
export interface SenderEmail {
  id: number;
  email: string;
  name?: string;
  daily_limit?: number;
  type?: string;
  status?: string;
  warmup_enabled?: boolean;
  emails_sent_count: number;
  total_replied_count: number;
  total_opened_count: number;
  // ... more stats
}
```

<!-- EmailBisonClient (from src/lib/emailbison/client.ts) -->
```typescript
export class EmailBisonClient {
  constructor(token: string);
  async getSenderEmails(): Promise<SenderEmail[]>;
}
```

<!-- Sender model key fields (from prisma/schema.prisma) -->
```prisma
model Sender {
  id                 String  @id @default(cuid())
  workspaceSlug      String
  name               String
  emailAddress       String?
  emailSenderName    String?
  emailBisonSenderId Int?
  status             String  @default("setup")
  // ... more fields
  workspace          Workspace @relation(fields: [workspaceSlug], references: [slug])
}
```

<!-- Workspace model key fields -->
```prisma
model Workspace {
  slug     String  @unique
  name     String
  apiToken String?
  senders  Sender[]
}
```

<!-- Cron auth pattern (from src/lib/cron-auth.ts) -->
```typescript
export function validateCronSecret(req: Request): boolean;
// Uses Authorization: Bearer <CRON_SECRET> header
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create sender sync library function</name>
  <files>src/lib/emailbison/sync-senders.ts</files>
  <action>
Create `syncSendersForAllWorkspaces()` that:

1. Fetches all workspaces that have a non-null `apiToken` via Prisma (`prisma.workspace.findMany({ where: { apiToken: { not: null } }, select: { slug: true, apiToken: true } })`).

2. For each workspace, instantiates `new EmailBisonClient(workspace.apiToken)` and calls `getSenderEmails()`. Wrap in try/catch per workspace so one failure does not block others.

3. For each `SenderEmail` returned from EmailBison:
   - Try to find an existing Sender in DB matching by `emailAddress === senderEmail.email` AND `workspaceSlug === workspace.slug`.
   - If found: update `emailBisonSenderId` to `senderEmail.id` (and `emailSenderName` to `senderEmail.name` if present). Only update if the value changed to avoid unnecessary writes.
   - If NOT found by email: try matching by `name` field (`sender.name === senderEmail.name` AND `workspaceSlug`). This handles senders created in the dashboard without email yet.
   - If matched by name: set both `emailAddress = senderEmail.email` AND `emailBisonSenderId = senderEmail.id` AND `emailSenderName = senderEmail.name`.
   - If no match at all: create a new Sender record with `workspaceSlug`, `name: senderEmail.name || senderEmail.email`, `emailAddress: senderEmail.email`, `emailBisonSenderId: senderEmail.id`, `emailSenderName: senderEmail.name`, `status: "active"`.

4. Return a summary object: `{ workspaces: number, synced: number, created: number, skipped: number, errors: string[] }`.

5. Log progress with `[sync-senders]` prefix for each workspace processed.

Use `import { prisma } from "@/lib/prisma"` for DB access (existing pattern in the codebase).
  </action>
  <verify>npx tsc --noEmit src/lib/emailbison/sync-senders.ts</verify>
  <done>sync-senders.ts exists, exports syncSendersForAllWorkspaces, compiles without type errors</done>
</task>

<task type="auto">
  <name>Task 2: Create cron API route for daily sender sync</name>
  <files>src/app/api/cron/sync-senders/route.ts</files>
  <action>
Create GET handler following the exact pattern from `src/app/api/cron/bounce-snapshots/route.ts`:

1. `export const maxDuration = 60;`

2. Validate cron secret using `validateCronSecret(request)` from `@/lib/cron-auth`. Return 401 if invalid.

3. Log start timestamp with `[sync-senders]` prefix.

4. Call `syncSendersForAllWorkspaces()` from `@/lib/emailbison/sync-senders`.

5. Log completion with counts.

6. Return JSON response: `{ status: "ok", workspaces, synced, created, skipped, errors, timestamp }`.

7. Wrap in try/catch, return 500 on fatal error with error message and timestamp.

This follows the identical structure as bounce-snapshots/route.ts — same auth, same response shape, same error handling.

After deployment, user registers on cron-job.org:
- URL: `https://admin.outsignal.ai/api/cron/sync-senders`
- Schedule: daily at 5am UTC (before bounce-snapshots at 6am)
- Auth: `Authorization: Bearer <CRON_SECRET>`
  </action>
  <verify>npx tsc --noEmit src/app/api/cron/sync-senders/route.ts</verify>
  <done>Cron route exists at /api/cron/sync-senders, validates Bearer auth, calls sync function, returns JSON summary</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- Both files exist and follow existing cron patterns
- No Prisma schema changes needed (emailAddress and emailBisonSenderId already exist on Sender)
</verification>

<success_criteria>
- syncSendersForAllWorkspaces() fetches from EmailBison API per workspace and upserts Sender records
- GET /api/cron/sync-senders is protected by CRON_SECRET Bearer auth
- LinkedIn-only senders without EmailBison presence are unaffected
- New EmailBison senders are auto-created as Sender records
- Existing senders get emailAddress and emailBisonSenderId populated
</success_criteria>

<output>
After completion, create `.planning/quick/1-automated-emailbison-sender-sync-pull-se/1-SUMMARY.md`
</output>
