---
phase: 36-linkedin-inbox
verified: 2026-03-11T18:30:00Z
status: human_needed
score: 10/10 must-haves verified
human_verification:
  - test: "Navigate to the portal inbox page and click the LinkedIn tab"
    expected: "LinkedIn conversation list renders (or empty state if no data synced). Email tab still works identically."
    why_human: "Visual layout, tab toggle interaction, and channel switching cannot be verified programmatically."
  - test: "If LinkedIn conversations exist: click a conversation and observe the message view"
    expected: "Chat bubbles appear — inbound messages left-aligned with muted background, outbound right-aligned with brand color #F0FF7A"
    why_human: "Chat bubble layout and visual styling require human inspection."
  - test: "Type a reply and click 'Queue Message'"
    expected: "Optimistic bubble appears immediately with 'Queued' (amber) badge. After worker processes the action, badge updates to 'Sent' (green) or 'Failed' (red)."
    why_human: "Optimistic UI behavior and badge transitions are runtime behaviors."
  - test: "Click the Refresh button in the conversation header"
    expected: "Spinner animates on the button, messages re-fetch from worker, new messages (if any) briefly highlight with a yellow ring, 'Last synced Xm ago' label appears."
    why_human: "Animation, sync spinner, and new message highlight are visual/runtime behaviors."
---

# Phase 36: LinkedIn Inbox Verification Report

**Phase Goal:** Clients can read full LinkedIn conversation histories and queue replies from the portal, with a manual refresh to pull the latest messages
**Verified:** 2026-03-11T18:30:00Z
**Status:** human_needed (all automated checks passed; human visual verification remains)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | GET /api/portal/inbox/linkedin/conversations returns workspace-scoped conversations with participant name, subtitle (jobTitle @ company), last message snippet, relative timestamp, and unread count | VERIFIED | `conversations/route.ts` — two-query pattern confirmed, returns full response shape including `jobTitle` (with `participantHeadline` fallback), `company`, `lastMessageSnippet`, `lastActivityAt`, `unreadCount` |
| 2  | GET /api/portal/inbox/linkedin/conversations/[id]/messages returns chronological messages from DB — on first access (no DB messages), fetches from Railway worker, upserts into LinkedInMessage, and returns | VERIFIED | `conversations/[conversationId]/messages/route.ts` — DB check → worker fetch → upsert with `update:{}` → re-query confirmed. Defensive envelope parsing (`raw?.messages ?? raw?.data ?? []`) present. `?refresh=true` param handled. |
| 3  | POST /api/portal/inbox/linkedin/reply creates a LinkedInAction with actionType=message, priority=1 and returns the actionId | VERIFIED | `reply/route.ts` — calls `enqueueAction()` with `actionType: "message"`, `priority: 1`, `scheduledFor: new Date()`. Returns `{ actionId }` with 201. 400/404/422 error paths all implemented. |
| 4  | GET /api/portal/inbox/linkedin/actions/[actionId]/status returns the current status of a LinkedInAction for polling | VERIFIED | `actions/[actionId]/status/route.ts` — workspace-scoped `findFirst`, returns `{ status, completedAt }`. |
| 5  | LinkedIn tab shows a list of recent conversations with participant name, "Title @ Company" subtitle, last message snippet, relative timestamp, and status dot | VERIFIED | `linkedin-conversation-list.tsx` (142 lines, exceeds 80-line min) — `buildSubtitle()` helper, `timeAgo()`, status dot (blue for unread, amber for awaiting), all data fields rendered. |
| 6  | Opening a conversation shows full message history with chat bubbles — inbound left-aligned (muted bg), outbound right-aligned (brand color #F0FF7A) | VERIFIED | `linkedin-conversation-view.tsx` (534 lines, exceeds 150-line min) — inbound: `justify-start` + `bg-muted text-foreground rounded-2xl rounded-bl-sm`; outbound: `justify-end` + `bg-[#F0FF7A] text-black rounded-2xl rounded-br-sm`. `max-w-[70%]` confirmed. |
| 7  | Outbound messages show delivery status badge: Queued (amber), Sent (green), Failed (red) from LinkedInAction status | VERIFIED | `QUEUE_STATUS_BADGE` map in `linkedin-conversation-view.tsx` — amber/emerald/red badge classes applied to optimistic messages. |
| 8  | Client can type a reply, click "Queue Message", and see it appear immediately as an optimistic bubble with "Queued" badge | VERIFIED | `handleQueueMessage()` — creates optimistic bubble synchronously before POST, sets `queueStatus: "Queued"`. Button label is "Queue Message" (not "Send"). |
| 9  | Refresh button triggers Voyager sync and shows new messages with highlight animation after sync completes | VERIFIED | `handleRefresh()` — POSTs to `/api/portal/inbox/linkedin/sync`, waits 5s if `syncing: true`, re-fetches with `?refresh=true`, diffs IDs, sets `newMessageIds` with 1.1s `setTimeout` clear. `ring-2 ring-[#F0FF7A]/50` applied. |
| 10 | Inbox page has a simple Email/LinkedIn toggle to switch between channels | VERIFIED | `page.tsx` (265 lines) — `activeChannel` state, two toggle buttons, conditional render of email vs LinkedIn panels. Both channels poll simultaneously (15s/60s). `onMessageSent` wired to `fetchLinkedinConversations`. |

**Score:** 10/10 truths verified (automated)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/portal/inbox/linkedin/conversations/route.ts` | Conversation list API with Person join for subtitle | VERIFIED | 60 lines, exports `GET`, two-query pattern confirmed |
| `src/app/api/portal/inbox/linkedin/conversations/[conversationId]/messages/route.ts` | On-demand message fetch from worker + DB upsert | VERIFIED | 137 lines, exports `GET`, worker fetch + upsert + graceful degradation |
| `src/app/api/portal/inbox/linkedin/reply/route.ts` | Reply queue via enqueueAction priority 1 | VERIFIED | 74 lines, exports `POST`, `enqueueAction` with priority 1 confirmed |
| `src/app/api/portal/inbox/linkedin/actions/[actionId]/status/route.ts` | Action status polling endpoint | VERIFIED | 43 lines, exports `GET`, workspace-scoped query |
| `src/components/portal/linkedin-conversation-list.tsx` | Left panel: conversation rows with status dots and subtitle | VERIFIED | 142 lines (min 80), exports `LinkedInConversationList` and `LinkedInConversationSummary` interface |
| `src/components/portal/linkedin-conversation-view.tsx` | Right panel: chat bubbles, refresh, composer, optimistic reply | VERIFIED | 534 lines (min 150), all features implemented |
| `src/app/(portal)/portal/inbox/page.tsx` | Inbox page with Email/LinkedIn tab toggle | VERIFIED | 265 lines, imports both LinkedIn components, contains "linkedin" channel state |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `conversations/route.ts` | `prisma.linkedInConversation` + `prisma.person` | two-query pattern | WIRED | Lines 22-38: `findMany` for conversations, then `findMany` for persons with `id: { in: personIds }`, Map lookup |
| `messages/route.ts` | Railway worker `GET /sessions/{senderId}/conversations/{conversationId}/messages` | `fetch` with Bearer auth | WIRED | Lines 77-82: `fetch(${WORKER_URL}/sessions/${conv.senderId}/conversations/${conv.conversationId}/messages, { headers: { Authorization: 'Bearer ${WORKER_SECRET}' } })` |
| `reply/route.ts` | `enqueueAction` from `src/lib/linkedin/queue` | import | WIRED | Line 4: `import { enqueueAction } from "@/lib/linkedin/queue"`. Called at line 62 with all required params. |
| `linkedin-conversation-list.tsx` | `/api/portal/inbox/linkedin/conversations` | parent page fetch passes data as props | WIRED | `LinkedInConversationSummary` interface exported from list component, imported and used in `page.tsx` lines 14-15 |
| `linkedin-conversation-view.tsx` | `/api/portal/inbox/linkedin/conversations/[id]/messages` | `fetch` in `fetchMessages` useCallback | WIRED | Line 102: `fetch(\`/api/portal/inbox/linkedin/conversations/${conversationId}/messages...\`)` |
| `linkedin-conversation-view.tsx` | `/api/portal/inbox/linkedin/reply` | POST in `handleQueueMessage` | WIRED | Line 229: `fetch("/api/portal/inbox/linkedin/reply", { method: "POST", ... })` |
| `linkedin-conversation-view.tsx` | `/api/portal/inbox/linkedin/actions/${actionId}/status` | polling interval in `startPolling` | WIRED | Line 165: `fetch(\`/api/portal/inbox/linkedin/actions/${actionId}/status\`)` in 5s setInterval |
| `linkedin-conversation-view.tsx` | `/api/portal/inbox/linkedin/sync` | POST in `handleRefresh` | WIRED | Line 270: `fetch("/api/portal/inbox/linkedin/sync", { method: "POST" })` |
| `page.tsx` | `linkedin-conversation-list.tsx` + `linkedin-conversation-view.tsx` | conditional render based on `activeChannel` | WIRED | Lines 169, 232, 243: `activeChannel === "email"` / `activeChannel === "linkedin"` conditional render. `onMessageSent={fetchLinkedinConversations}` prop wired. |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| LIIN-01 | 36-01, 36-02 | LinkedIn conversation list shows recent conversations from DB | SATISFIED | `conversations/route.ts` queries DB + `linkedin-conversation-list.tsx` renders rows |
| LIIN-02 | 36-01, 36-02 | LinkedIn conversation detail shows full message history | SATISFIED | `messages/route.ts` fetches from worker on demand + `linkedin-conversation-view.tsx` renders chat bubbles |
| LIIN-03 | 36-01, 36-02 | Client can queue LinkedIn reply from portal (priority 1 LinkedInAction) | SATISFIED | `reply/route.ts` calls `enqueueAction` with `priority: 1` + `linkedin-conversation-view.tsx` Queue Message composer with optimistic UI |
| LIIN-04 | 36-01, 36-02 | Manual refresh triggers re-sync from Voyager API | SATISFIED | `handleRefresh()` in view component POSTs to `/api/portal/inbox/linkedin/sync` (existing Phase 34 endpoint), re-fetches with `?refresh=true` |

No orphaned requirements. REQUIREMENTS.md marks all four LIIN IDs as Complete at Phase 36.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `linkedin-conversation-view.tsx` | 499 | `placeholder="Type your message..."` | Info | HTML input placeholder attribute — expected and correct, not a code stub |

No blockers or warnings found. The single "placeholder" match is an HTML textarea `placeholder` attribute, not a code stub.

---

## Human Verification Required

### 1. Email/LinkedIn tab toggle

**Test:** Navigate to `https://admin.outsignal.ai/portal/inbox`, confirm Email/LinkedIn toggle buttons appear at the top of the Inbox page.
**Expected:** Two buttons ("Email" and "LinkedIn") visible. Active channel has inverted (foreground bg / background text) styling.
**Why human:** Visual rendering of the toggle cannot be confirmed programmatically.

### 2. LinkedIn conversation list or empty state

**Test:** Click the "LinkedIn" tab.
**Expected:** Either a list of conversations (if Phase 34 sync has run) or the empty state: LinkedIn icon + "No LinkedIn conversations yet" + explanation text.
**Why human:** Requires live browser session to observe; depends on whether real Voyager sync data exists.

### 3. Chat bubble layout

**Test:** If a LinkedIn conversation exists, click it to open the conversation view.
**Expected:** Messages appear as chat bubbles — their messages left-aligned with muted/grey background, your messages right-aligned with `#F0FF7A` yellow-green background.
**Why human:** Visual layout and color rendering require human inspection.

### 4. Queue Message optimistic UI

**Test:** Type a reply in the composer and click "Queue Message".
**Expected:** Optimistic bubble appears immediately with amber "Queued" badge. After the LinkedIn worker processes the action (~5s poll), badge updates to green "Sent" or red "Failed".
**Why human:** Runtime UI behavior and badge state transition require live interaction to verify.

### 5. Refresh button behavior

**Test:** Click the RefreshCw icon button in the conversation header.
**Expected:** Button icon spins while syncing. After sync completes, "Last synced just now" label appears below participant name. Any new messages flash briefly with a yellow ring highlight.
**Why human:** Animation, spinner, and message highlight are visual runtime effects.

### 6. Email tab unchanged

**Test:** Switch back to the "Email" tab.
**Expected:** Email inbox renders identically to before Phase 36 — thread list on left, thread view on right, reply composer functional.
**Why human:** Regression check on existing email functionality requires visual confirmation.

---

## Gaps Summary

None. All 10 automated must-haves verified. All 4 requirement IDs satisfied. All key links wired. No blocker anti-patterns found. Phase is waiting only on human visual verification.

---

_Verified: 2026-03-11T18:30:00Z_
_Verifier: Claude (gsd-verifier)_
