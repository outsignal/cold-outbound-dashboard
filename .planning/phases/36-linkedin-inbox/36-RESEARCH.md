# Phase 36: LinkedIn Inbox - Research

**Researched:** 2026-03-11
**Domain:** LinkedIn conversation UI — chat bubbles layout, on-demand message fetching, reply queuing via LinkedInAction, manual Voyager refresh
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Conversation List**
- Mirror email thread list style — same layout structure for consistency across channels
- Same status dots as email: blue (new/unread), amber (they messaged last, awaiting our reply), green (we sent last)
- No subject line (LinkedIn doesn't have them) — use "Job Title @ Company" as subtitle instead (from Person/Company model)
- Each row: participant name, "Title @ Company" subtitle, last message snippet, relative timestamp, status dot
- Sort by most recent activity first (same as email)

**Message View**
- Chat bubbles layout (NOT stacked cards like email) — left-aligned (them) / right-aligned (us)
- Different from email's stacked cards — each channel gets its natural layout
- Plain text only (LinkedIn messages have no HTML)
- Show delivery status on outbound messages: Queued / Sent / Failed (from LinkedInAction status)
- Timestamps on each message

**Reply Queuing**
- Button says "Queue Message" (not "Send") — sets correct expectation for async delivery
- Optimistic UI: message appears immediately as a bubble with "Queued" badge after clicking
- Badge auto-updates to "Sent" via polling (15s active / 60s background, same as thread list)
- Always allow queuing even if worker is offline — message sits in pending state, delivered when worker reconnects
- No warning or blocking when worker is down

**Refresh & Sync**
- Refresh button in conversation header (next to participant name), not on the list panel
- Triggers the Phase 34 sync endpoint (POST /api/portal/inbox/linkedin/sync)
- Within 5-minute cooldown: returns cached DB data, shows "Last synced Xm ago" label — no error
- Outside cooldown: spinner on Refresh button while Voyager sync runs, existing messages stay visible
- New messages after sync get a brief highlight/fade-in animation (~1 second) to draw attention

### Claude's Discretion
- Exact bubble styling (colors, border radius, padding)
- Empty state design (no LinkedIn conversations yet)
- Loading skeleton for initial conversation load
- Error state handling
- How to match Person records to LinkedIn conversations (normalize URL matching from Phase 34)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LIIN-01 | LinkedIn conversation list shows recent conversations from DB | GET /api/portal/inbox/linkedin/conversations API + LinkedInConversationList component; data already in LinkedInConversation table from Phase 34 |
| LIIN-02 | LinkedIn conversation detail shows full message history | GET /api/portal/inbox/linkedin/conversations/[id]/messages API + on-demand message fetch from worker; LinkedInMessage model exists but Phase 34 deferred message fetch to Phase 36 |
| LIIN-03 | Client can queue LinkedIn reply from portal (priority 1 LinkedInAction) | POST /api/portal/inbox/linkedin/reply + enqueueAction() from src/lib/linkedin/queue.ts; optimistic UI shows queued bubble immediately |
| LIIN-04 | Manual refresh triggers re-sync from Voyager API | Calls existing POST /api/portal/inbox/linkedin/sync; responds with {syncing: true/false, lastSyncedAt}; spinner in conversation header |
</phase_requirements>

## Summary

Phase 36 is the LinkedIn counterpart to the already-shipped Phase 35 email inbox. The data layer is fully built (Phase 34): `LinkedInConversation`, `LinkedInMessage`, and `LinkedInSyncStatus` models exist, `syncLinkedInConversations()` is implemented, and `POST /api/portal/inbox/linkedin/sync` is live. Phase 36's job is to surface that data in the client portal UI with three new API routes and a set of chat-bubble UI components that mirror the email inbox panel structure.

The biggest architecture point: **messages are NOT stored in Phase 34** — conversations are synced (with `lastMessageSnippet` for preview), but the full `LinkedInMessage` records are populated on-demand when a client opens a specific conversation. Phase 36 must add the on-demand message fetch logic: call the Railway worker's `GET /sessions/{senderId}/conversations/{conversationId}/messages` endpoint, upsert into `LinkedInMessage`, and return from a portal API route. The `LinkedInMessage` model (`eventUrn @unique`, `isOutbound`, `body`, `deliveredAt`) is schema-ready and waiting.

Reply queuing uses the existing `enqueueAction()` from `src/lib/linkedin/queue.ts` with `priority: 1`, `actionType: "message"`. Optimistic UI adds a local bubble immediately. Status polling checks the `LinkedInAction.status` via a new GET endpoint. The Refresh button calls the existing Phase 34 sync endpoint and reads the `syncing` flag to drive the spinner.

**Primary recommendation:** Build in three plans: (1) API routes for conversation list, message fetch, and reply queueing; (2) LinkedIn conversation list and conversation view components; (3) integrate LinkedIn panel into the existing portal inbox page alongside email. No new dependencies needed.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16 (project) | API routes + portal pages | Project standard |
| Prisma | 6 (project) | LinkedInConversation, LinkedInMessage, LinkedInAction queries | Already in use; models exist |
| React | 18 (project) | Client components with state | Project standard |
| Tailwind CSS | project version | Styling chat bubbles | Project standard |
| `@/lib/linkedin/queue.ts` | internal | `enqueueAction()` for reply queueing | Phase 34/35 established this |
| `@/lib/linkedin/sync.ts` | internal | `syncLinkedInConversations()` (called by existing sync route) | Phase 34 built this |
| `@/lib/portal-session.ts` | internal | `getPortalSession()` for workspace auth | All portal API routes use this |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | project version | Icons (RefreshCw, Linkedin, etc.) | Already used in email thread view |
| `@/components/ui/skeleton` | internal | Loading skeletons | Already used in email inbox page |
| `@/components/ui/badge` | internal | "Queued" / "Sent" / "Failed" status badges on outbound bubbles | Already used in email thread view |
| `@/components/ui/button` | internal | Queue Message button, Refresh button | Project standard |
| `@/components/ui/textarea` | internal | Message composer | Already used in EmailReplyComposer |

### No New Installations Required
```bash
# No npm install needed — all dependencies already present
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/api/portal/inbox/linkedin/
│   ├── sync/
│   │   └── route.ts                    # ALREADY EXISTS (Phase 34) — POST sync
│   ├── conversations/
│   │   └── route.ts                    # NEW — GET conversation list
│   ├── conversations/[conversationId]/
│   │   └── messages/
│   │       └── route.ts                # NEW — GET messages (on-demand from worker)
│   └── reply/
│       └── route.ts                    # NEW — POST queue reply as LinkedInAction
├── components/portal/
│   ├── linkedin-conversation-list.tsx  # NEW — left panel: conversation rows
│   └── linkedin-conversation-view.tsx  # NEW — right panel: bubbles + refresh + composer
└── src/app/(portal)/portal/inbox/
    └── page.tsx                        # MODIFY — add LinkedIn tab/panel (Phase 37 does channel tabs, Phase 36 adds LinkedIn panel behind email)
```

**Note on inbox page scope:** The Phase 37 channel tabs (UI-02) are deferred. Phase 36 adds LinkedIn as a second panel. The simplest approach that works before Phase 37: the inbox page switches between Email and LinkedIn panels based on a local state toggle (simple two-button tab bar, not the full Phase 37 treatment). Phase 37 can replace this with the proper channel tabs.

### Pattern 1: Conversation List API

**What:** `GET /api/portal/inbox/linkedin/conversations` — returns LinkedInConversation rows for the workspace, enriched with Person's `jobTitle` and `company` for the "Title @ Company" subtitle.

```typescript
// Source: project pattern — mirrors /api/portal/inbox/email/threads/route.ts

export async function GET() {
  const { workspaceSlug } = await getPortalSession();

  const conversations = await prisma.linkedInConversation.findMany({
    where: { workspaceSlug },
    orderBy: { lastActivityAt: "desc" },
    take: 50,
    // Include Person for jobTitle + company subtitle
    include: {
      // Note: LinkedInConversation has no direct Prisma relation to Person
      // personId is stored but no FK relation defined in Phase 34 schema
      // Must do a separate Person lookup OR use a raw join
    },
  });

  // Person data requires a separate query (no Prisma relation defined on LinkedInConversation)
  const personIds = conversations.map(c => c.personId).filter(Boolean) as string[];
  const persons = personIds.length > 0
    ? await prisma.person.findMany({
        where: { id: { in: personIds } },
        select: { id: true, jobTitle: true, company: true },
      })
    : [];
  const personMap = new Map(persons.map(p => [p.id, p]));

  const result = conversations.map(conv => {
    const person = conv.personId ? personMap.get(conv.personId) : null;
    return {
      id: conv.id,
      conversationId: conv.conversationId,
      participantName: conv.participantName,
      participantHeadline: conv.participantHeadline,
      participantProfilePicUrl: conv.participantProfilePicUrl,
      lastMessageSnippet: conv.lastMessageSnippet,
      lastActivityAt: conv.lastActivityAt.toISOString(),
      unreadCount: conv.unreadCount,
      // Person fields for subtitle
      jobTitle: person?.jobTitle ?? conv.participantHeadline ?? null,  // fallback to LinkedIn headline
      company: person?.company ?? null,
    };
  });

  return NextResponse.json({ conversations: result });
}
```

**Critical:** `LinkedInConversation` schema (Phase 34) has no Prisma `@relation` to `Person` — `personId` is a plain String?, not a FK with `@relation`. This means `include: { person: true }` will NOT work. Must do a two-query approach.

### Pattern 2: On-Demand Message Fetch

**What:** `GET /api/portal/inbox/linkedin/conversations/[conversationId]/messages` — fetches messages from DB if present; if not (or if refresh is requested), calls Railway worker to fetch and upsert.

Phase 34 SUMMARY.md explicitly states: "Messages endpoint (per-conversation on-demand fetch) is deferred to Phase 36." The `LinkedInMessage` model exists and is schema-ready. The worker endpoint is `GET /sessions/{senderId}/conversations/{conversationId}/messages` (added in Phase 33, commit 73cc336).

```typescript
// Flow:
// 1. Load existing LinkedInMessage records for this conversation from DB
// 2. If messages exist AND no ?refresh param: return DB messages
// 3. If no messages OR ?refresh: call worker, upsert, return updated messages

// Worker call pattern (mirrors syncLinkedInConversations in sync.ts):
const workerRes = await fetch(
  `${WORKER_URL}/sessions/${senderId}/conversations/${conversationId}/messages`,
  { headers: { Authorization: `Bearer ${WORKER_SECRET}` } }
);
const { messages } = await workerRes.json() as { messages: VoyagerMessage[] };

// Upsert each message (eventUrn is @unique — safe for re-fetching):
for (const msg of messages) {
  await prisma.linkedInMessage.upsert({
    where: { eventUrn: msg.eventUrn },
    create: {
      conversationId: conv.id,   // internal cuid, NOT LinkedIn conversationId
      eventUrn: msg.eventUrn,
      senderUrn: msg.senderUrn,
      senderName: msg.senderName,
      body: msg.body,
      isOutbound: msg.senderUrn !== conv.participantUrn,  // Phase 34 research pattern
      deliveredAt: new Date(msg.deliveredAt),
    },
    update: {
      // Nothing to update — messages are immutable once delivered
    },
  });
}
```

**Key lookup:** To call the worker, need `senderId` from the `LinkedInConversation`. The `conversationId` URL param is the internal cuid (`conv.id`), NOT the LinkedIn `conversationId`. The API route must resolve: `conv = await prisma.linkedInConversation.findUnique({ where: { id: conversationId } })` then use `conv.senderId` and `conv.conversationId` (LinkedIn's ID) for the worker call.

### Pattern 3: Reply Queuing API

**What:** `POST /api/portal/inbox/linkedin/reply` — creates a `LinkedInAction` of type `"message"` with `priority: 1` for warm lead fast-tracking.

```typescript
// Source: src/lib/linkedin/queue.ts enqueueAction() — battle-tested

export async function POST(request: Request) {
  const { workspaceSlug } = await getPortalSession();
  const { conversationId, message } = await request.json() as {
    conversationId: string;  // internal cuid of LinkedInConversation
    message: string;
  };

  // Resolve conversation to get senderId + personId
  const conv = await prisma.linkedInConversation.findFirst({
    where: { id: conversationId, workspaceSlug },
    select: { senderId: true, personId: true },
  });

  if (!conv || !conv.personId) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Enqueue as priority 1 message action
  const actionId = await enqueueAction({
    senderId: conv.senderId,
    personId: conv.personId,
    workspaceSlug,
    actionType: "message",
    messageBody: message,
    priority: 1,           // P1 = warm lead / portal reply
    scheduledFor: new Date(), // immediate
  });

  return NextResponse.json({ actionId });
}
```

**Worker delivery timing:** Per success criteria, "the worker delivers it within 2 minutes." The Railway worker polls `GET /api/linkedin/actions/next` for pending P1 actions. The existing polling cadence handles this automatically — no changes needed to the worker.

### Pattern 4: Optimistic UI for Reply Queuing

**What:** After clicking "Queue Message", the message bubble appears immediately with a "Queued" badge. Status polling checks `LinkedInAction.status`.

```typescript
// Optimistic state: local message with synthetic id and status
type LocalMessage = {
  id: string;          // local only — "optimistic-{Date.now()}"
  body: string;
  isOutbound: true;
  deliveredAt: string;
  queueStatus: "Queued" | "Sent" | "Failed";  // local delivery tracking
  actionId: string | null;                     // filled after API returns
};

// After POST /api/portal/inbox/linkedin/reply succeeds:
// 1. Add optimistic bubble with actionId
// 2. Start polling GET /api/portal/inbox/linkedin/actions/[actionId]/status
// 3. When status = "complete" → update bubble to "Sent"
// 4. When status = "failed" → update bubble to "Failed"
```

**Status polling endpoint:** A lightweight `GET /api/portal/inbox/linkedin/actions/[actionId]/status` that returns `{ status: string }` from `LinkedInAction`. Alternatively, the message poll loop (15s) can check DB for the `LinkedInMessage` matching the queued action (once the worker delivers, the next sync would pick it up). Given optimistic design, a simple action status check is cleaner.

### Pattern 5: Refresh Button Pattern

**What:** Refresh button in conversation header calls `POST /api/portal/inbox/linkedin/sync`, reads `syncing` flag for spinner state, shows "Last synced Xm ago" from `lastSyncedAt`.

```typescript
// Conversation header component
const [refreshing, setRefreshing] = useState(false);
const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

const handleRefresh = async () => {
  setRefreshing(true);
  try {
    const res = await fetch("/api/portal/inbox/linkedin/sync", { method: "POST" });
    const data = await res.json() as { syncing: boolean; lastSyncedAt: string | null };
    setLastSyncedAt(data.lastSyncedAt);
    if (data.syncing) {
      // Reload messages after a delay for async sync to complete
      setTimeout(() => {
        loadMessages();
        setRefreshing(false);
      }, 5000); // 5s gives sync time to complete; 15s polling catches the rest
    } else {
      setRefreshing(false);
    }
  } catch {
    setRefreshing(false);
  }
};
```

**Cooldown handling:** If within the 5-minute cooldown, `syncing: false` is returned (status 200). The button spinner stops immediately. The "Last synced Xm ago" label shows from `lastSyncedAt`. No error shown per locked decision.

### Pattern 6: Status Dots — Conversation List

LinkedIn conversations don't have the same "replied" semantics as email, but the status dot mapping per locked decisions:

```typescript
function getConversationStatus(conv: LinkedInConversationSummary): "new" | "awaiting_reply" | "replied" {
  if (conv.unreadCount > 0) return "new";           // blue — unread messages from them
  // Determine last sender from messages (if loaded)
  // Fallback: use unreadCount=0 as "replied" (we've seen it)
  return "awaiting_reply"; // amber — default when no messages loaded yet
}
```

**Note:** Accurate status requires knowing whether we or they sent the last message. This comes from `LinkedInMessage.isOutbound`. If messages are not yet fetched for a conversation (conversation list loads without messages), a reasonable default is `unreadCount > 0 → new`, `unreadCount === 0 → awaiting_reply`. After messages are fetched, the conversation view knows the exact last direction. The list can be updated by checking the last fetched message state.

### Pattern 7: New Message Highlight Animation

Per locked decision, new messages after refresh get a ~1 second highlight/fade-in.

```tsx
// CSS animation via Tailwind animate-pulse or custom keyframe
// Simple approach: track message IDs that were added after the refresh
// and apply a highlight class that fades out after 1s

const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());

// After messages reload post-refresh, compare old IDs vs new IDs:
const added = newMessages.filter(m => !previousIds.has(m.id));
setNewMessageIds(new Set(added.map(m => m.id)));
setTimeout(() => setNewMessageIds(new Set()), 1100); // clear after animation

// In bubble render:
<div className={cn("bubble", newMessageIds.has(msg.id) && "animate-highlight")}>
```

Tailwind custom animation can be defined in `tailwind.config.ts` if not already present, or use `animate-pulse` as a lightweight approximation.

### Anti-Patterns to Avoid

- **Fetching messages inline with conversation list:** The conversation list uses `lastMessageSnippet` from `LinkedInConversation` — do NOT call the worker for each conversation in the list. Messages are on-demand only.
- **Using LinkedIn's `conversationId` as the URL param:** The portal URL param should be the internal cuid (`LinkedInConversation.id`). LinkedIn's `conversationId` is the external ID for worker calls only.
- **Trying to `include: { person: true }` on LinkedInConversation:** Phase 34 did not define a Prisma `@relation` to Person — `personId` is just a String?. Two-query approach required.
- **Blocking the Queue button when worker is offline:** Per locked decision, always allow queuing — action stays pending until worker reconnects.
- **Re-syncing all messages on conversation view load:** Only fetch from worker if no messages exist in DB for this conversation. If messages exist, load from DB (fast) unless `?refresh` is passed.
- **Calling the sync endpoint on conversation open:** The Refresh button is manual-only. Opening a conversation does NOT auto-trigger Voyager sync.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Action queueing | Custom DB insert | `enqueueAction()` from `src/lib/linkedin/queue.ts` | Already handles priority, scheduling, maxAttempts, all fields |
| Message upsert dedup | Custom insert-if-not-exists | `prisma.linkedInMessage.upsert({ where: { eventUrn } })` | `eventUrn @unique` makes this trivial |
| Worker auth | Re-implement bearer check | `WORKER_URL` + `WORKER_API_SECRET` pattern from `src/lib/linkedin/sync.ts` | Established pattern, auth already correct |
| Relative timestamps | Custom date formatter | Inline `timeAgo()` from `email-thread-list.tsx` | Already written; copy or extract to shared util |
| Chat bubble layout | Custom flexbox invention | Standard `flex justify-end` (outbound) / `flex justify-start` (inbound) | Universal chat pattern, works with Tailwind |
| Portal session auth | Re-implement cookie check | `getPortalSession()` from `@/lib/portal-session.ts` | Every portal API route uses this |

**Key insight:** This phase is 90% UI wiring. The data models, sync function, and action queue are all battle-tested from previous phases. The "new" work is: (a) messages fetch API route, (b) reply queue API route, (c) chat bubble UI, and (d) wiring the inbox page to show LinkedIn panel.

## Common Pitfalls

### Pitfall 1: No Prisma Relation to Person on LinkedInConversation
**What goes wrong:** Developer attempts `prisma.linkedInConversation.findMany({ include: { person: true } })` for the "Title @ Company" subtitle — TypeScript error, Prisma has no Person relation defined.
**Why it happens:** Phase 34 deliberately stored `personId` as a plain String? (no `@relation`) to avoid adding a FK to a table that could get ahead of Person data.
**How to avoid:** Two-query pattern — fetch conversations first, collect personIds, then `prisma.person.findMany({ where: { id: { in: personIds } } })`. Build a Map for O(1) lookup. Fallback to `participantHeadline` (LinkedIn's own headline) when Person record not found.
**Warning signs:** TypeScript compilation error mentioning `person` not in `LinkedInConversation` select.

### Pitfall 2: Wrong ID in URL Params
**What goes wrong:** Using LinkedIn's `conversationId` (e.g., `2-abc123uuid`) as the URL segment, then trying `prisma.linkedInConversation.findUnique({ where: { id: urlParam } })` — not found.
**Why it happens:** Two different IDs: `LinkedInConversation.id` (internal cuid) vs `LinkedInConversation.conversationId` (LinkedIn's ID).
**How to avoid:** URL param = internal cuid (`conv.id`). Worker call uses `conv.conversationId` (LinkedIn's ID). Route handler resolves: `prisma.linkedInConversation.findUnique({ where: { id: params.conversationId } })` then uses `conv.conversationId` for worker URL.
**Warning signs:** Messages endpoint returns 404 for valid conversations.

### Pitfall 3: personId Null for Reply Queuing
**What goes wrong:** `enqueueAction()` requires `personId`. If `conv.personId` is null (URL format mismatch at sync time), the reply can't be queued.
**Why it happens:** Phase 34 decision: conversations stored even with `personId: null`. The action queue requires a personId.
**How to avoid:** Check `conv.personId` before enqueuing. Return a 422 with `{ error: "Cannot queue reply: lead not matched to a Person record" }`. This is a data quality issue — rare in practice since LinkedIn outreach only goes to people via LinkedInActions tied to Person records.
**Warning signs:** Reply queue API returns 404 but conversation exists.

### Pitfall 4: Messages Worker Response Envelope Mismatch
**What goes wrong:** Worker returns `{ data: VoyagerMessage[] }` or `{ items: [...] }` instead of `{ messages: [...] }` — parse fails silently, no messages upserted.
**Why it happens:** Phase 33 defined the conversations endpoint (confirmed `{ conversations: [...] }`) but the messages endpoint schema was documented as "to be confirmed" (STATE.md open question [33-02]).
**How to avoid:** Add defensive parsing with logging: `const raw = await res.json(); const messages = raw?.messages ?? raw?.data ?? [];`. Log the raw response shape on first call. The planner should include a task to confirm the worker messages endpoint response envelope.
**Warning signs:** Conversation view shows no messages even after worker fetch succeeds (HTTP 200).

### Pitfall 5: Optimistic Bubble Duplication
**What goes wrong:** Optimistic bubble appears, then when messages reload (after sync or polling), the delivered message from DB appears as a second bubble.
**Why it happens:** Optimistic bubble has a local synthetic id; the DB message has a real `eventUrn`. Both render.
**How to avoid:** Track optimistic bubbles by `actionId`. When messages reload, check if any new DB message has a `senderUrn` matching our sender and was delivered ~now. If yes, remove the optimistic bubble. Simplest approach: clear all optimistic bubbles on any successful message reload.
**Warning signs:** Duplicate messages appear after the worker delivers.

### Pitfall 6: Refresh Spinner Never Stops on Cooldown
**What goes wrong:** User clicks Refresh within 5-minute cooldown. Sync endpoint returns `{ syncing: false }` (status 200). If the UI only checks for `syncing: true` to stop the spinner, the spinner runs indefinitely.
**Why it happens:** Cooldown path returns 200 (not 202) + `syncing: false` — this case needs to stop the spinner immediately.
**How to avoid:** Stop spinner on both `syncing: true` (after timeout) AND `syncing: false` (immediately). Also update the "Last synced Xm ago" label from `lastSyncedAt` in both cases.
**Warning signs:** Refresh button stuck spinning after clicking within 5 minutes of last sync.

### Pitfall 7: isOutbound Determination on Message Fetch
**What goes wrong:** All messages appear as inbound (left-aligned bubbles) even when we sent them.
**Why it happens:** `msg.senderUrn !== conv.participantUrn` is the formula, but `conv.participantUrn` must be loaded alongside the messages. If the conversation is loaded separately from messages, `participantUrn` must be passed to the upsert logic.
**How to avoid:** When fetching messages from worker, load the `LinkedInConversation` record (which has `participantUrn`) first. Pass `conv.participantUrn` to the isOutbound formula: `isOutbound = msg.senderUrn !== conv.participantUrn`.
**Warning signs:** Every message renders on the left side (inbound), including ones we clearly sent.

## Code Examples

### Conversation List Row Component

```tsx
// Source: mirrors email-thread-list.tsx — same layout, different subtitle field
interface LinkedInConversationSummary {
  id: string;
  participantName: string | null;
  jobTitle: string | null;      // from Person or participantHeadline
  company: string | null;       // from Person
  lastMessageSnippet: string | null;
  lastActivityAt: string;
  unreadCount: number;
  replyStatus: "new" | "awaiting_reply" | "replied";
}

// Subtitle: "Title @ Company" — neither, one, or both may be present
function buildSubtitle(jobTitle: string | null, company: string | null): string | null {
  if (jobTitle && company) return `${jobTitle} @ ${company}`;
  if (jobTitle) return jobTitle;
  if (company) return company;
  return null;
}
```

### Chat Bubble Component

```tsx
// Source: standard chat pattern, project Tailwind conventions
interface LinkedInBubbleProps {
  body: string;
  isOutbound: boolean;
  deliveredAt: string;
  queueStatus?: "Queued" | "Sent" | "Failed";  // only for optimistic bubbles
  isNew?: boolean;  // for highlight animation
}

function LinkedInBubble({ body, isOutbound, deliveredAt, queueStatus, isNew }: LinkedInBubbleProps) {
  return (
    <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
          isOutbound
            ? "bg-[#F0FF7A] text-black rounded-br-sm"   // brand color for outbound
            : "bg-muted text-foreground rounded-bl-sm",   // muted for inbound
          isNew && "ring-2 ring-brand/50 animate-pulse"
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{body}</p>
        <div className="flex items-center gap-1.5 mt-1 justify-end">
          <span className="text-[10px] opacity-60">{timeAgo(deliveredAt)}</span>
          {queueStatus && (
            <Badge
              className={cn(
                "text-[10px] px-1.5 py-0",
                queueStatus === "Queued" && "bg-amber-100 text-amber-800",
                queueStatus === "Sent" && "bg-emerald-100 text-emerald-800",
                queueStatus === "Failed" && "bg-red-100 text-red-800",
              )}
            >
              {queueStatus}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Queue Message Composer

```tsx
// Source: mirrors email-reply-composer.tsx — same structure, different button + endpoint
function LinkedInReplyComposer({
  conversationId,
  onQueued,
}: {
  conversationId: string;
  onQueued: (optimisticMsg: OptimisticMessage) => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQueue = async () => {
    const message = text.trim();
    if (!message || sending) return;

    setSending(true);
    setError(null);

    // Optimistic: add bubble before API call resolves
    const optimistic: OptimisticMessage = {
      id: `optimistic-${Date.now()}`,
      body: message,
      isOutbound: true,
      deliveredAt: new Date().toISOString(),
      queueStatus: "Queued",
      actionId: null,
    };
    onQueued(optimistic);
    setText("");

    try {
      const res = await fetch("/api/portal/inbox/linkedin/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message }),
      });
      const data = await res.json() as { actionId: string };
      // Update optimistic bubble with real actionId for status polling
      optimistic.actionId = data.actionId;
    } catch {
      setError("Failed to queue message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-border bg-background p-4 space-y-2">
      <Textarea
        placeholder="Type your LinkedIn reply..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="resize-none"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button onClick={handleQueue} disabled={!text.trim() || sending} size="sm">
          {sending ? (
            <><Loader2 className="animate-spin" /> Queuing...</>
          ) : (
            <> Queue Message</>
          )}
        </Button>
      </div>
    </div>
  );
}
```

### Conversation Header with Refresh

```tsx
// Conversation header: participant name + Refresh button + "Last synced" label
function LinkedInConversationHeader({
  participantName,
  lastSyncedAt,
  onRefresh,
  refreshing,
}: {
  participantName: string | null;
  lastSyncedAt: string | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="px-5 py-3 border-b border-border flex items-center justify-between">
      <div>
        <h2 className="text-sm font-semibold">{participantName ?? "LinkedIn Conversation"}</h2>
        {lastSyncedAt && (
          <p className="text-xs text-muted-foreground">
            Last synced {timeAgo(lastSyncedAt)}
          </p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
        className="gap-1.5"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
        Refresh
      </Button>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No LinkedIn inbox | Phase 34 data layer complete | 2026-03-11 | All sync and storage is ready; Phase 36 is pure UI |
| Stacked email card layout for all channels | Chat bubbles for LinkedIn, stacked cards for email | Phase 36 decision | Each channel gets natural layout |
| Messages fetched at sync time | On-demand message fetch per conversation | Phase 34 decision | Avoids Voyager rate limits on list load |
| LinkedInAction queue for campaign automation | Reused for portal reply queuing (priority 1) | Phase 36 (same queue) | No new mechanism — battle-tested delivery pipeline |

**Architecture context:** The email inbox (Phase 35) established the full two-panel component pattern. LinkedIn inbox follows the identical panel structure but with different components inside — conversation list (chat-oriented) instead of thread list (email-oriented), and chat bubbles instead of stacked email cards.

## Open Questions

1. **Worker messages endpoint response envelope**
   - What we know: Phase 33 added `GET /sessions/{senderId}/conversations/{conversationId}/messages` to the worker. The conversations endpoint returns `{ conversations: [...] }`.
   - What's unclear: Messages endpoint uses `{ messages: [...] }` or another key? STATE.md [33-02] says "Messages fetched on-demand (separate endpoint) not inline with conversations" but doesn't confirm the response envelope key name.
   - Recommendation: Defensive parse as described in Pitfall 4. First task in Plan 01 should confirm the actual response shape by checking the Railway worker codebase (or adding a log on first call).

2. **Worker messages URL format — LinkedIn conversationId vs entityUrn**
   - What we know: Worker endpoint is `GET /sessions/{senderId}/conversations/{conversationId}/messages` per Phase 33. Phase 34 stores both `conversationId` and `entityUrn` on the conversation.
   - What's unclear: Does the worker URL use LinkedIn's `conversationId` (e.g. `2-abc123`) or the `entityUrn` (e.g. `urn:li:msg_conversation:(...)`)? Phase 33 commit 73cc336 should be checked.
   - Recommendation: Use `conv.conversationId` in the worker URL path (matches what conversations endpoint uses). Check worker code if 404s occur.

3. **Inbox page LinkedIn panel integration strategy**
   - What we know: `src/app/(portal)/portal/inbox/page.tsx` currently renders email-only two-panel layout. Phase 37 adds proper channel tabs. Phase 36 needs to add LinkedIn somehow.
   - What's unclear: Best pattern for Phase 36 — add a simple toggle before Phase 37's channel tabs, or structure components so Phase 37 can cleanly replace the toggle with tabs?
   - Recommendation: Add a minimal two-tab toggle (Email | LinkedIn) as local state in `page.tsx`. Phase 37 replaces this with the proper `UI-02` channel tabs. This is Claude's discretion per CONTEXT.md.

4. **Action status polling endpoint — new route or query param on existing?**
   - What we know: Need to check `LinkedInAction.status` after queuing a reply to update the "Queued → Sent" badge.
   - What's unclear: Whether a dedicated GET `/api/portal/inbox/linkedin/actions/[actionId]/status` is needed, or if the existing `/api/linkedin/actions/[id]/complete` webhook-style endpoint covers this.
   - Recommendation: Add a lightweight `GET /api/portal/inbox/linkedin/actions/[actionId]/status` that returns `{ status, completedAt }` scoped to the workspace. Simpler than reusing the internal worker-facing endpoints.

## Sources

### Primary (HIGH confidence)
- `/Users/jjay/programs/outsignal-agents/prisma/schema.prisma` — LinkedInConversation (lines 1391-1420), LinkedInMessage (lines 1422-1437), LinkedInAction (lines 915-955), Person model (lines 122-151) — all verified
- `/Users/jjay/programs/outsignal-agents/src/lib/linkedin/sync.ts` — syncLinkedInConversations() implementation, Worker URL pattern, Person URL matching logic — verified
- `/Users/jjay/programs/outsignal-agents/src/app/api/portal/inbox/linkedin/sync/route.ts` — Phase 34 sync endpoint, response shape `{ conversations, lastSyncedAt, syncing }` — verified
- `/Users/jjay/programs/outsignal-agents/src/lib/linkedin/queue.ts` — enqueueAction() with EnqueueActionParams — verified; `priority: 1` confirmed as warm lead fast-track
- `/Users/jjay/programs/outsignal-agents/src/lib/linkedin/types.ts` — VoyagerConversation and VoyagerMessage interfaces — verified
- `/Users/jjay/programs/outsignal-agents/src/app/(portal)/portal/inbox/page.tsx` — Two-panel layout pattern, polling logic (15s/60s), auto-select — verified
- `/Users/jjay/programs/outsignal-agents/src/components/portal/email-thread-list.tsx` — ThreadSummary interface, status dot pattern, timeAgo helper — verified
- `/Users/jjay/programs/outsignal-agents/src/components/portal/email-thread-view.tsx` — conversation header pattern, message rendering, composer integration — verified
- `/Users/jjay/programs/outsignal-agents/src/components/portal/email-reply-composer.tsx` — composer UI pattern with error handling — verified
- `/Users/jjay/programs/outsignal-agents/src/components/portal/ai-suggestion-card.tsx` — Badge, Button, collapsible patterns — verified
- `/Users/jjay/programs/outsignal-agents/.planning/phases/34-linkedin-data-layer/34-01-SUMMARY.md` — Phase 34 decisions: personId immutable, messages deferred to Phase 36, sync response shape
- `/Users/jjay/programs/outsignal-agents/.planning/phases/35-email-inbox/35-03-SUMMARY.md` — Phase 35 files created, inbox page polling pattern, sidebar nav item

### Secondary (MEDIUM confidence)
- STATE.md `[33-02]` decisions: "Messages fetched on-demand (separate endpoint) not inline" — confirms on-demand pattern but response envelope unverified
- STATE.md `[v5.0 Pre-Milestone]`: "LinkedInAction queue (priority 1) reused for LinkedIn reply delivery — battle-tested" — confirms queue reuse pattern

### Tertiary (LOW confidence)
- Worker messages endpoint response envelope (`{ messages: [...] }`) — inferred from conversations endpoint shape; not verified from worker codebase
- Exact LinkedIn `conversationId` format used in worker URL path — not verified from worker source

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified in project, no new packages
- Architecture: HIGH — data models exist, sync function verified, queue.ts verified, UI patterns from Phase 35 directly applicable
- Conversation list API: HIGH — two-query pattern required (no Person @relation), both queries straightforward
- Message fetch API: MEDIUM — endpoint exists, isOutbound formula verified, but response envelope unconfirmed
- Reply queuing: HIGH — enqueueAction() API verified, optimistic UI is standard React pattern
- Refresh button: HIGH — sync endpoint response shape verified, spinner logic straightforward
- Worker messages response: LOW — inferred from conversations endpoint; needs confirmation on first call

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (stable — data models locked, queue pattern battle-tested, UI patterns established in Phase 35)
