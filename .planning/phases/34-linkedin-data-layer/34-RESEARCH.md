# Phase 34: LinkedIn Data Layer - Research

**Researched:** 2026-03-11
**Domain:** Prisma schema design, fire-and-forget async API pattern, LinkedIn Voyager data upsert
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Sync Trigger Behavior**
- On-demand only — no background cron job. Sync fires when client opens LinkedIn inbox tab or hits refresh.
- 5-minute cooldown between syncs (per sender). If called within cooldown, return 200 with existing DB conversations (not a rejection).
- Sync triggers for ALL LinkedIn senders in the workspace at once (not one sender per request). Workspace may have 1-3 LinkedIn senders.
- Fire-and-forget pattern: POST /api/portal/inbox/linkedin/sync returns 202 immediately + includes existing conversations from DB in the response body. Worker syncs asynchronously. Client shows existing data instantly, 15s polling picks up fresh data when sync completes.
- No extra client-side work to detect when fresh data arrives — normal polling interval handles it.

**Person Matching Logic**
- Match by LinkedIn URL only — no fuzzy name matching. Match participant's `participantProfileUrl` from worker response against `Person.linkedinUrl` in DB.
- Matching happens during sync upsert (at DB write time), not lazily on inbox load. `personId` is pre-populated on LinkedInConversation.
- Edge case: if no Person match found, store conversation anyway with `personId: null`. This should rarely happen since we only reach out to people via LinkedInActions tied to Person records.

**Conversation Filtering**
- Only store conversations where the participant matches a Person record (LinkedIn URL match found). Unmatched conversations from the worker response are discarded — keeps inbox focused on our outbound contacts.
- Exception: conversations with `personId: null` (from the edge case above where URL format differs) are still stored.
- Once stored, conversations are kept forever — never archived or deleted. Historical data is valuable for analyzing which outbound messages generate positive responses.
- Messages are fetched on-demand only (separate worker endpoint call when a client opens a specific conversation). NOT synced inline with conversations.
- `lastMessageSnippet` from the worker's rich metadata is sufficient for the conversation list preview — no need to fetch messages just for the list view.

**Data Freshness**
- Show "Last synced: X minutes ago" timestamp in the LinkedIn inbox (UI concern but the data layer must store/expose `lastSyncedAt`)
- `lastSyncedAt` stored per-sender on a sync tracking record (or per-conversation, whichever is simpler)
- When sync response includes existing data + 202, the `lastSyncedAt` value should be included so the frontend can display it

### Claude's Discretion
- Exact Prisma model field names and types (follow existing schema conventions)
- Index strategy for conversation/message queries
- How to structure the sync upsert transaction (batch vs individual)
- Whether to use a separate SyncStatus model or store lastSyncedAt on the Sender model

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LI-01 | LinkedInConversation model stores conversation metadata with participant info | Prisma schema design section — fields derived from VoyagerConversation interface |
| LI-02 | LinkedInMessage model stores messages with outbound/inbound flag | Prisma schema design section — fields derived from VoyagerMessage interface |
| LI-03 | LinkedIn sync API triggers async worker fetch with 5-min cache | Fire-and-forget pattern, cooldown implementation, 202 response design |
| LI-04 | Sync matches participants to Person records by LinkedIn URL | Person matching logic using Person.linkedinUrl index |
</phase_requirements>

## Summary

Phase 34 is a pure data-layer phase: add two Prisma models (LinkedInConversation, LinkedInMessage), build a sync API route, and implement the async upsert logic that calls the Railway worker's GET /sessions/{senderId}/conversations endpoint and persists results. No UI is touched — Phase 36 reads from what this phase writes.

The upstream dependency (Phase 33) already delivered `VoyagerConversation` and `VoyagerMessage` typed interfaces, the worker's GET /sessions/{senderId}/conversations and GET /sessions/{senderId}/conversations/{id}/messages endpoints, plus the `fetchConversations()` and `fetchMessages()` methods on VoyagerClient. This phase's job is to consume those and persist to Postgres via Prisma.

The key design question resolved in CONTEXT.md is sync architecture: the Vercel route returns 202 immediately (Vercel 60s timeout concern), includes current DB data in the response body, and triggers the worker fetch asynchronously via `waitUntil`-style pattern. A 5-minute per-sender cooldown prevents Voyager rate-limit abuse. Person matching uses the already-indexed `Person.linkedinUrl` field for O(1) lookup.

**Primary recommendation:** Use a dedicated `LinkedInSyncStatus` model (one record per sender) rather than adding `lastSyncedAt` to the Sender model — keeps LinkedIn sync concerns out of the already-large Sender model and allows easy cooldown checks.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 6.x (project current) | Schema migration + DB queries | Already in use — entire project depends on it |
| Next.js API Routes | 16.x (project current) | POST /api/portal/inbox/linkedin/sync | All API routes in this project follow this pattern |
| `@/lib/portal-session` | internal | Portal auth (getPortalSession()) | Established pattern for all portal API routes |
| `@/lib/linkedin/auth` | internal | Worker auth (verifyWorkerAuth) | Used on all worker-facing routes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@/lib/db` (prisma client) | internal | DB access | Identical pattern to all other routes |
| Node.js fetch | built-in | Call Railway worker endpoint | Used in linkedin/actions.ts for worker calls |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dedicated LinkedInSyncStatus model | lastSyncedAt on Sender model | Sender model already has 25+ fields; sync concerns belong separate |
| Per-conversation lastSyncedAt | Per-sender LinkedInSyncStatus | Conversation-level is wasteful — sync is always per-sender |
| Fire-and-forget via background fetch | Vercel Edge waitUntil | Project is on hobby plan (Vercel serverless), waitUntil not reliably available — use `fetch()` with no await |

**Installation:** No new packages needed — all dependencies already in project.

## Architecture Patterns

### Recommended Project Structure
```
prisma/
└── schema.prisma               # Add LinkedInConversation, LinkedInMessage, LinkedInSyncStatus models

src/
├── app/api/portal/inbox/linkedin/
│   └── sync/
│       └── route.ts            # POST handler — returns 202 + existing conversations, triggers async sync
├── lib/linkedin/
│   └── sync.ts                 # syncLinkedInConversations() — the async upsert logic
```

### Pattern 1: Fire-and-Forget with 202 + Data

The POST endpoint must:
1. Authenticate portal session
2. Load workspace senders
3. Check cooldown: if all senders synced within 5 min, return 200 with existing conversations
4. Fetch existing conversations from DB (to include in response)
5. Respond 202 with existing conversations + lastSyncedAt
6. After response: trigger sync for each sender not in cooldown (no await)

```typescript
// Source: project pattern — see src/lib/linkedin/actions.ts for worker call shape

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await getPortalSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceSlug } = session;

  // Load LinkedIn senders for workspace
  const senders = await prisma.sender.findMany({
    where: { workspaceSlug, status: "active" },
    select: { id: true },
  });

  // Check cooldown per sender
  const syncStatuses = await prisma.linkedInSyncStatus.findMany({
    where: { senderId: { in: senders.map(s => s.id) } },
  });

  const COOLDOWN_MS = 5 * 60 * 1000;
  const now = Date.now();
  const sendersToSync = senders.filter(s => {
    const status = syncStatuses.find(ss => ss.senderId === s.id);
    if (!status?.lastSyncedAt) return true;
    return now - status.lastSyncedAt.getTime() > COOLDOWN_MS;
  });

  // Always return existing conversations from DB
  const existing = await prisma.linkedInConversation.findMany({
    where: { sender: { workspaceSlug } },
    orderBy: { lastActivityAt: "desc" },
  });

  const lastSyncedAt = syncStatuses
    .map(s => s.lastSyncedAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  const response = NextResponse.json(
    { conversations: existing, lastSyncedAt, syncing: sendersToSync.length > 0 },
    { status: sendersToSync.length > 0 ? 202 : 200 },
  );

  // Fire-and-forget: trigger sync after response is sent
  if (sendersToSync.length > 0) {
    void Promise.all(sendersToSync.map(s => syncLinkedInConversations(s.id)));
  }

  return response;
}
```

**Note on fire-and-forget in Next.js serverless:** In Vercel serverless functions, `void Promise.all(...)` after `return response` may be cut off before completion. The correct pattern is to use `waitUntil` from the Vercel runtime if available, or structure it so the async work runs before returning. For this phase, given Vercel hobby plan constraints, the recommended approach is to trigger the worker call BEFORE returning the response body but after building the response object — or accept that background work may be cut short on cold starts. The safer pattern is to keep the function alive by awaiting the worker trigger (a fast POST that initiates work on Railway) rather than awaiting the full sync.

**Revised approach:** The Vercel route calls the Railway worker endpoint (a fast HTTP POST that the worker immediately 202's), then returns to the client. The Railway worker does the heavy Voyager API work + calls back to Vercel's internal sync-complete endpoint, OR the sync logic runs directly in-process with a hard timeout guard.

**Actual recommended approach for this project** (confirmed by STATE.md decisions):
- Call `fetch(WORKER_URL/sessions/{senderId}/conversations)` without `await` — Node.js event loop processes it after the response is sent in development, but in serverless this is unreliable
- Better: use `NextResponse` and trigger the background work CONCURRENTLY (before returning) by starting the promise but only awaiting the response construction, not the sync completion

The STATE.md decision is explicit: "LinkedIn sync is fire-and-forget (202 Accepted, async) — avoids Vercel 60s timeout." The implementation pattern should be: start the sync promises, return 202 immediately, let Node handle the rest. This is pragmatically acceptable because Railway worker endpoint responds fast (sub-second to accept the request), and the actual Voyager API calls happen on Railway.

### Pattern 2: Prisma Upsert for Conversations

Use `upsert` keyed on `conversationId` (the unique LinkedIn ID) — same pattern as `personWorkspace.upsert` in the enrich route.

```typescript
// Source: project pattern — see src/app/api/people/enrich/route.ts

await prisma.linkedInConversation.upsert({
  where: { conversationId: conv.conversationId },
  create: {
    conversationId: conv.conversationId,
    entityUrn: conv.entityUrn,
    senderId,
    workspaceSlug,
    personId,                              // null if no match
    participantName: conv.participantName,
    participantUrn: conv.participantUrn,
    participantProfileUrl: conv.participantProfileUrl,
    participantHeadline: conv.participantHeadline,
    participantProfilePicUrl: conv.participantProfilePicUrl,
    lastActivityAt: new Date(conv.lastActivityAt),
    unreadCount: conv.unreadCount,
    lastMessageSnippet: conv.lastMessageSnippet,
  },
  update: {
    lastActivityAt: new Date(conv.lastActivityAt),
    unreadCount: conv.unreadCount,
    lastMessageSnippet: conv.lastMessageSnippet,
    participantName: conv.participantName,
    participantHeadline: conv.participantHeadline,
    participantProfilePicUrl: conv.participantProfilePicUrl,
    // Do NOT update personId on subsequent syncs — match is set at creation
  },
});
```

### Pattern 3: Person Matching by LinkedIn URL

`Person.linkedinUrl` already has a DB index (`@@index([linkedinUrl])`). LinkedIn URLs from the worker come as `/in/username` format. `Person.linkedinUrl` values may be stored as full URLs (`https://linkedin.com/in/username`) or short paths.

**Critical:** Normalize both sides before comparison. The worker's `participantProfileUrl` is `/in/username` format. Person records may store full URL or short path. Use a normalization function that extracts the `/in/username` portion from both sides.

```typescript
// Normalize LinkedIn URL to /in/username format for comparison
function normalizeLinkedinUrl(url: string | null): string | null {
  if (!url) return null;
  // Extract /in/username from full URL or short path
  const match = url.match(/\/in\/([^/?#]+)/);
  return match ? `/in/${match[1]}` : url;
}

// Match participant to Person
const normalizedParticipantUrl = normalizeLinkedinUrl(conv.participantProfileUrl);
let personId: string | null = null;

if (normalizedParticipantUrl) {
  const person = await prisma.person.findFirst({
    where: {
      linkedinUrl: { contains: normalizedParticipantUrl },
    },
    select: { id: true },
  });
  personId = person?.id ?? null;
}
```

### Pattern 4: Cooldown Tracking

Use a dedicated `LinkedInSyncStatus` model with one record per sender. Updated via upsert after each sync attempt.

```typescript
await prisma.linkedInSyncStatus.upsert({
  where: { senderId },
  create: { senderId, lastSyncedAt: new Date(), conversationCount: synced },
  update: { lastSyncedAt: new Date(), conversationCount: synced },
});
```

### Pattern 5: Worker Call from Vercel

Existing pattern from `src/lib/linkedin/actions.ts`:
```typescript
const WORKER_URL = process.env.LINKEDIN_WORKER_URL;
const WORKER_SECRET = process.env.WORKER_API_SECRET;

const response = await fetch(`${WORKER_URL}/sessions/${senderId}/conversations`, {
  headers: {
    Authorization: `Bearer ${WORKER_SECRET}`,
  },
});
const { conversations } = await response.json() as { conversations: VoyagerConversation[] };
```

The worker's GET /sessions/{senderId}/conversations endpoint was added in Phase 33 (commit 66a0262). It returns `{ conversations: VoyagerConversation[] }`.

### Anti-Patterns to Avoid

- **Fetching messages inline with conversations:** Messages are on-demand only (Phase 36 concern). Do not call fetchMessages during the sync — it would be too slow and hit rate limits.
- **Filtering too aggressively:** Store conversations with `personId: null` (URL format mismatch edge case). Don't discard these.
- **Matching on name strings:** LinkedIn URL is the only match key. Names are ambiguous.
- **Updating personId on re-sync:** If a conversation was stored with a personId, don't overwrite it on subsequent syncs — the initial match is authoritative.
- **Using Prisma transactions for the upsert loop:** Each conversation upsert is independent. `$transaction` adds overhead without benefit here; individual upserts are fine.
- **Storing full LinkedIn profile URLs with varying formats:** Always normalize to `/in/username` in the DB for consistent matching.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL normalization logic | Complex regex per caller | Single `normalizeLinkedinUrl()` helper in sync.ts | Consistency across upsert and query paths |
| Cooldown check | Manual timestamp arithmetic scattered in route | LinkedInSyncStatus model + centralized check in sync.ts | Reusable, testable |
| VoyagerConversation types | Re-define interface in Next.js | Import from `worker/src/voyager-client.ts` or re-export from `src/lib/linkedin/types.ts` | Phase 33 already defined these — don't duplicate |

**Key insight:** The heavy lifting (Voyager API parsing) is already done in Phase 33. This phase is primarily schema + persistence plumbing.

## Common Pitfalls

### Pitfall 1: Vercel Serverless Fire-and-Forget Unreliability
**What goes wrong:** Starting a promise with `void asyncFn()` after `return response` in a Vercel serverless function — the function may terminate before the promise completes.
**Why it happens:** Vercel serverless functions freeze after the response is returned; pending microtasks may not complete.
**How to avoid:** Start the sync work BEFORE building the response — use `Promise.allSettled()` with a timeout guard, or call the Railway worker (which is always-on) and let Railway do the Voyager work. The Railway worker's GET conversations endpoint already handles this — Vercel just needs to make the HTTP call.
**Warning signs:** Conversations never appear in DB after sync — check Railway worker logs to see if calls arrived.

### Pitfall 2: LinkedIn URL Format Mismatch
**What goes wrong:** participantProfileUrl from worker is `/in/username`, but Person.linkedinUrl stores `https://www.linkedin.com/in/username/` — no match found, all conversations get `personId: null`.
**Why it happens:** URL normalization not applied consistently.
**How to avoid:** Normalize both sides to `/in/username` (lowercase, no trailing slash) before comparison. Test with actual Person records.
**Warning signs:** Every conversation has `personId: null` in DB despite people clearly being in the system.

### Pitfall 3: Duplicate Conversation Records
**What goes wrong:** Upsert fails because the `@@unique` constraint on conversationId doesn't match the where clause.
**Why it happens:** Prisma upsert `where` must reference a `@unique` or `@@unique` field.
**How to avoid:** Ensure `conversationId` is marked `@unique` in the Prisma schema (not just indexed).
**Warning signs:** Prisma throws "An operation failed because it depends on one or more records that were required but not found" or creates duplicate records.

### Pitfall 4: Missing Workspace Scope on Conversation Queries
**What goes wrong:** GET /api/portal/inbox/linkedin/conversations returns conversations from other workspaces.
**Why it happens:** Forgetting to filter by workspaceSlug when fetching existing conversations.
**How to avoid:** Always include `where: { sender: { workspaceSlug } }` or store `workspaceSlug` directly on LinkedInConversation for simpler queries (recommended).
**Warning signs:** Clients can see each other's conversations.

### Pitfall 5: Race Condition on Concurrent Sync Requests
**What goes wrong:** Portal opens two tabs simultaneously, both fire sync, both pass the cooldown check (it was empty), both start syncing — duplicate inserts or race on upsert.
**Why it happens:** Cooldown check and sync initiation are not atomic.
**How to avoid:** Prisma upsert is naturally idempotent on `conversationId`. Race on cooldown is acceptable — worst case: two syncs run for the same sender within seconds. The 5-min cooldown is a "best effort" throttle, not a hard lock.

### Pitfall 6: Sync Breaking on Worker Session Errors
**What goes wrong:** Worker returns 401/403 (LinkedIn session expired) — sync throws, all senders' conversations are not updated, but no error surfaces to the client (fire-and-forget).
**Why it happens:** VoyagerError propagates from the worker, unhandled in the async fire-and-forget.
**How to avoid:** Wrap each per-sender sync in try/catch inside syncLinkedInConversations(). Log the error. Return partial results — other senders with valid sessions should still sync.
**Warning signs:** Conversations not updating for one sender while others update fine.

## Code Examples

### Prisma Model Definitions (Recommended)

```prisma
// Source: project schema conventions (prisma/schema.prisma)

model LinkedInConversation {
  id                     String   @id @default(cuid())
  conversationId         String   @unique  // LinkedIn's conversation ID (from entityUrn)
  entityUrn              String            // Full LinkedIn entityUrn for reference
  senderId               String            // Which sender account this belongs to
  workspaceSlug          String            // Denormalized for simpler workspace-scoped queries
  personId               String?           // Matched Person record (null if no URL match found)

  // Participant metadata (from VoyagerConversation)
  participantName        String?
  participantUrn         String?
  participantProfileUrl  String?           // Normalized to /in/username format
  participantHeadline    String?
  participantProfilePicUrl String?

  // Message preview
  lastMessageSnippet     String?
  lastActivityAt         DateTime          // From Voyager epoch ms
  unreadCount            Int      @default(0)

  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  sender    Sender   @relation(fields: [senderId], references: [id], onDelete: Cascade)
  messages  LinkedInMessage[]

  @@index([workspaceSlug, lastActivityAt])  // Primary query: workspace conversations sorted by activity
  @@index([senderId])
  @@index([personId])
}

model LinkedInMessage {
  id               String   @id @default(cuid())
  conversationId   String            // FK to LinkedInConversation.id (internal cuid)
  eventUrn         String   @unique  // LinkedIn's eventUrn (dedup key)
  senderUrn        String            // LinkedIn URN of message sender
  senderName       String?
  body             String            // Message text
  isOutbound       Boolean           // true = we sent it, false = they sent it
  deliveredAt      DateTime          // From Voyager epoch ms

  createdAt        DateTime @default(now())

  conversation LinkedInConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, deliveredAt])    // Primary query: messages in conversation, chronological
}

model LinkedInSyncStatus {
  id               String    @id @default(cuid())
  senderId         String    @unique   // One record per sender
  lastSyncedAt     DateTime?
  conversationCount Int      @default(0)  // How many conversations were synced last time
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  sender Sender @relation(fields: [senderId], references: [id], onDelete: Cascade)
}
```

### isOutbound Determination

`VoyagerMessage` provides `senderUrn`. The sender's own LinkedIn URN must be known to determine if a message is outbound. The Sender model has `linkedinProfileUrl` but not the URN. Options:

1. Store the sender's own URN in `LinkedInSyncStatus` when the first sync occurs (infer from conversations where participant matches self)
2. Use the sender's `linkedinEmail` to derive URN (not reliable — URNs are numeric)
3. Compare `senderUrn` against the participant's URN — if senderUrn is the participant's, message is INBOUND; if senderUrn is not the participant's, message is OUTBOUND

**Recommended approach:** During sync, for each conversation, the participant's URN is `conv.participantUrn`. In each message, if `msg.senderUrn === conv.participantUrn`, then the message is inbound (they wrote it). Otherwise it's outbound (we wrote it). This is reliable without needing to know the sender's own URN.

```typescript
// Source: derived from VoyagerConversation + VoyagerMessage interfaces (Phase 33)
const isOutbound = msg.senderUrn !== conv.participantUrn;
```

### Full sync.ts Function Outline

```typescript
// src/lib/linkedin/sync.ts
import { prisma } from "@/lib/db";
import type { VoyagerConversation } from "worker/src/voyager-client";  // or re-exported type

const WORKER_URL = process.env.LINKEDIN_WORKER_URL;
const WORKER_SECRET = process.env.WORKER_API_SECRET;

function normalizeLinkedinUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/in\/([^/?#]+)/i);
  return match ? `/in/${match[1].toLowerCase()}` : null;
}

export async function syncLinkedInConversations(senderId: string): Promise<void> {
  try {
    // 1. Fetch from worker
    const res = await fetch(`${WORKER_URL}/sessions/${senderId}/conversations`, {
      headers: { Authorization: `Bearer ${WORKER_SECRET}` },
    });

    if (!res.ok) {
      console.error(`[linkedin-sync] Worker error for sender ${senderId}: HTTP ${res.status}`);
      return;
    }

    const { conversations } = await res.json() as { conversations: VoyagerConversation[] };

    // 2. Get workspace for this sender (needed for workspaceSlug denorm)
    const sender = await prisma.sender.findUnique({
      where: { id: senderId },
      select: { workspaceSlug: true },
    });
    if (!sender) return;

    let syncCount = 0;

    // 3. Upsert each conversation
    for (const conv of conversations) {
      // Match participant to Person
      const normalizedUrl = normalizeLinkedinUrl(conv.participantProfileUrl);
      let personId: string | null = null;

      if (normalizedUrl) {
        const person = await prisma.person.findFirst({
          where: { linkedinUrl: { contains: normalizedUrl } },
          select: { id: true },
        });
        personId = person?.id ?? null;
      }

      // Filtering: only store if person matched OR allow null (edge case)
      // (Per decision: discard truly unmatched where we have NO person record and URL is also null)
      // Per CONTEXT.md: store even with personId: null
      await prisma.linkedInConversation.upsert({
        where: { conversationId: conv.conversationId },
        create: {
          conversationId: conv.conversationId,
          entityUrn: conv.entityUrn,
          senderId,
          workspaceSlug: sender.workspaceSlug,
          personId,
          participantName: conv.participantName,
          participantUrn: conv.participantUrn,
          participantProfileUrl: normalizedUrl,
          participantHeadline: conv.participantHeadline,
          participantProfilePicUrl: conv.participantProfilePicUrl,
          lastActivityAt: new Date(conv.lastActivityAt),
          unreadCount: conv.unreadCount,
          lastMessageSnippet: conv.lastMessageSnippet,
        },
        update: {
          lastActivityAt: new Date(conv.lastActivityAt),
          unreadCount: conv.unreadCount,
          lastMessageSnippet: conv.lastMessageSnippet,
          participantName: conv.participantName,
          participantHeadline: conv.participantHeadline,
          participantProfilePicUrl: conv.participantProfilePicUrl,
          // personId NOT updated after initial creation
        },
      });
      syncCount++;
    }

    // 4. Update sync status
    await prisma.linkedInSyncStatus.upsert({
      where: { senderId },
      create: { senderId, lastSyncedAt: new Date(), conversationCount: syncCount },
      update: { lastSyncedAt: new Date(), conversationCount: syncCount },
    });

  } catch (err) {
    console.error(`[linkedin-sync] Failed for sender ${senderId}:`, err);
    // Don't rethrow — fire-and-forget, other senders should still sync
  }
}
```

### Portal Route Outline

```typescript
// src/app/api/portal/inbox/linkedin/sync/route.ts
import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-session";
import { prisma } from "@/lib/db";
import { syncLinkedInConversations } from "@/lib/linkedin/sync";

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export async function POST() {
  let session;
  try {
    session = await getPortalSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceSlug } = session;

  const senders = await prisma.sender.findMany({
    where: { workspaceSlug, status: "active", sessionStatus: "active" },
    select: { id: true },
  });

  const syncStatuses = await prisma.linkedInSyncStatus.findMany({
    where: { senderId: { in: senders.map(s => s.id) } },
  });

  const now = Date.now();
  const sendersToSync = senders.filter(s => {
    const status = syncStatuses.find(ss => ss.senderId === s.id);
    if (!status?.lastSyncedAt) return true;
    return now - status.lastSyncedAt.getTime() > COOLDOWN_MS;
  });

  // Fetch existing conversations to return immediately
  const conversations = await prisma.linkedInConversation.findMany({
    where: { workspaceSlug },
    orderBy: { lastActivityAt: "desc" },
    take: 50,
  });

  const lastSyncedAt = syncStatuses
    .map(s => s.lastSyncedAt)
    .filter(Boolean)
    .reduce((latest: Date | null, d) => {
      if (!d) return latest;
      return !latest || d > latest ? d : latest;
    }, null);

  // Fire sync tasks (void — fire-and-forget)
  if (sendersToSync.length > 0) {
    void Promise.allSettled(sendersToSync.map(s => syncLinkedInConversations(s.id)));
  }

  return NextResponse.json(
    { conversations, lastSyncedAt, syncing: sendersToSync.length > 0 },
    { status: sendersToSync.length > 0 ? 202 : 200 },
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Calling Voyager directly from Vercel | Railway worker proxies all Voyager calls | Phase 11 (v1.0) | Vercel can't maintain LinkedIn cookies; worker handles sessions |
| Polling for all conversations on every inbox load | DB-intermediary pattern with sync cache | v5.0 pre-milestone decision | Avoids Vercel timeout; shows stale data instantly then refreshes |
| Storing messages with conversations in one model | Separate LinkedInMessage model, fetched on-demand | Phase 34 decision | Messages are expensive (Voyager calls); lazy load per conversation |

**Deprecated/outdated:**
- Storing LinkedIn session data in Next.js: Not done — Railway worker owns all session management.

## Open Questions

1. **VoyagerConversation type import path**
   - What we know: Phase 33 defined `VoyagerConversation` and `VoyagerMessage` in `worker/src/voyager-client.ts` (Railway worker repo)
   - What's unclear: Whether the worker is a separate repo or a subdirectory of this repo. `git show 73cc336` shows path `worker/src/voyager-client.ts` — this suggests it's a subdirectory.
   - Recommendation: Check if `worker/` is a subdirectory of `/Users/jjay/programs/outsignal-agents`. If yes, import types directly. If no, re-declare the interfaces in `src/lib/linkedin/types.ts` (already exists) to avoid cross-repo imports.

2. **Sender's own LinkedIn URN for isOutbound**
   - What we know: `conv.participantUrn` is the other person's URN; if `msg.senderUrn !== conv.participantUrn`, the message is outbound
   - What's unclear: Whether VoyagerMessage.senderUrn always contains a URN (vs empty string on some message types)
   - Recommendation: Treat empty senderUrn as "unknown" — don't mark as outbound definitively. The approach of comparing senderUrn vs participantUrn is reliable for the common case.

3. **Worker's response envelope for conversations**
   - What we know: From commit 66a0262, the SessionServer returns conversations from `handleGetConversations()` which calls `fetchConversations(20)`. The response shape is assumed to be `{ conversations: VoyagerConversation[] }`.
   - What's unclear: The exact JSON key name — could be `data`, `conversations`, or just the array.
   - Recommendation: Check the SessionServer route handler code in the worker before implementing the parse. The planner should include a task to confirm response envelope shape.

## Sources

### Primary (HIGH confidence)
- Project codebase — `prisma/schema.prisma`: existing model conventions, Sender model, Person model with `@@index([linkedinUrl])`
- Project codebase — `src/lib/linkedin/auth.ts`: worker auth pattern (verifyWorkerAuth)
- Project codebase — `src/lib/portal-session.ts`: portal auth pattern (getPortalSession)
- Project codebase — `src/app/api/portal/replies/route.ts`: portal API route pattern
- Project codebase — `src/app/api/people/enrich/route.ts`: upsert pattern
- Git commit 73cc336 — `worker/src/voyager-client.ts`: VoyagerConversation and VoyagerMessage interfaces, fetchConversations(), fetchMessages()
- Git commit 66a0262 — SessionServer: GET /sessions/{senderId}/conversations endpoint
- `.planning/phases/34-linkedin-data-layer/34-CONTEXT.md`: all locked decisions

### Secondary (MEDIUM confidence)
- STATE.md accumulated decisions: "DB-intermediary pattern for LinkedIn", "LinkedIn sync is fire-and-forget (202 Accepted, async)"
- STATE.md: "[33-02] Messages fetched on-demand (separate endpoint) not inline with conversations"

### Tertiary (LOW confidence)
- Vercel serverless fire-and-forget reliability: behavior after `return response` is environment-dependent; needs real-world testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new dependencies
- Architecture: HIGH — VoyagerConversation interface fully known, upsert pattern established, portal auth pattern established
- Prisma models: HIGH — conventions clear from existing schema, field names derived from VoyagerConversation/VoyagerMessage
- Fire-and-forget reliability: LOW — Vercel serverless behavior after response is sent is environment-specific
- isOutbound logic: MEDIUM — participantUrn comparison approach is sound but unverified with live data
- Worker response envelope: MEDIUM — endpoint exists (Phase 33 commit), exact JSON key name needs verification

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (stable domain — Prisma, Next.js patterns, worker interfaces all locked)
