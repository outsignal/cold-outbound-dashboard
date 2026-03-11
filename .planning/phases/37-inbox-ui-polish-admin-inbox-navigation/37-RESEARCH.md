# Phase 37: Inbox UI Polish, Admin Inbox & Navigation - Research

**Researched:** 2026-03-11
**Domain:** React UI components, inbox polish, unread tracking, mobile layout, admin master inbox, nav updates
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Thread list design**
- Rich rows: avatar, name, subject/preview line, relative timestamp, channel icon (email/LinkedIn), unread dot
- Workspace tag badge shown in admin master inbox only (not in portal)
- Sorted by most recent activity (newest message bumps thread to top)
- Channel differentiation via small icon only — no colored accents or borders on rows

**Conversation view**
- LinkedIn threads: chat bubble layout (inbound left-aligned, outbound right-aligned)
- Email threads: stacked full-width email-style layout (from, subject, timestamp headers per message)
- Different visual treatment per channel — not a unified layout
- Intent/sentiment badges (Interested, Objection, OOO, etc.) shown in both places: on thread list row AND inline below message in conversation view

**Composer**
- Visually distinct composers per channel
- Email composer: includes subject line, CC/BCC fields, "Send" button
- LinkedIn composer: simpler chat-style input, "Queue Message" button
- Channel mode indicated clearly so user knows which channel they're replying on

**Admin master inbox**
- Workspace filter: dropdown above thread list, default "All Workspaces", select specific workspace to filter
- "Replying as [Workspace Name]" banner above composer with sender email shown, confirming context before sending
- Admin sees full audit trail per thread: who replied, when, delivery status, notification history
- Admin also sees AI-generated reply suggestion alongside the conversation
- Reuses same two-panel components from portal inbox

**Unread behavior**
- Thread marked as read after 2 seconds of viewing (prevents accidental read on quick taps)
- Unread dot on thread rows, total unread count on Inbox nav item
- Unread counts poll every 30 seconds (lightweight polling, no WebSocket)
- "Mark all as read" action available in thread list header

**Cross-channel indicator**
- Clickable link chip inside conversation view: "Also on LinkedIn →" or "Also on Email →"
- Click navigates to the other channel's thread for the same person
- Indicator appears only when the same person has active threads in both channels

**Navigation**
- Portal sidebar: "Replies" replaced with "Inbox"
- Admin sidebar: "Inbox" nav item added

### Claude's Discretion
- Exact spacing, typography, and color values
- Loading states and skeleton screens
- Mobile breakpoint and single-panel transition animation
- Error states for failed message sends
- Empty inbox state design
- Thread list pagination/virtualization approach

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-01 | Two-panel layout (thread list left, conversation right) | Already partially built in inbox/page.tsx — needs to be extracted into reusable components with proper props for admin reuse |
| UI-02 | Channel tabs (All / Email / LinkedIn) based on workspace package | Workspace.package field exists ("email" \| "linkedin" \| "email_linkedin" \| "consultancy") — portal app shell fetches workspace, can pass package down; need API to expose package to client |
| UI-03 | Unread indicators on threads with unread count in nav | No isRead field on Reply model — needs new DB field. LinkedInConversation.unreadCount exists already. Need schema migration + API for mark-read + polling endpoint for nav badge |
| UI-04 | Message bubbles (inbound left, outbound right) with intent/sentiment badges | Already built in linkedin-conversation-view.tsx (chat bubbles) and email-thread-view.tsx (stacked cards with badges). Phase 37 adds intent badges inline in conversation for email, and adds channel icon to thread list rows |
| UI-05 | Reply composer with email mode (Send) and LinkedIn mode (Queue Message) | EmailReplyComposer + inline LI composer in LinkedInConversationView already exist. Phase 37 adds subject/CC/BCC to email composer, and "channel mode" label |
| UI-06 | Mobile single-panel layout with back navigation | Current layout uses `flex` with fixed left panel — on mobile (`< md`) should collapse to single panel with back button. Tailwind responsive classes + React state `selectedThread` controls which panel shows |
| UI-07 | Cross-channel indicator when same person active on both email + LinkedIn | Requires lookup: given personId on Reply and on LinkedInConversation, check if both have records. New API endpoint or enriched thread detail response. personId is stored on both Reply and LinkedInConversation |
| ADMIN-01 | Master inbox page on admin dashboard showing all workspaces | New page at `/admin/inbox` — does not exist yet. Mirrors portal inbox but queries across all workspaces |
| ADMIN-02 | Workspace filter dropdown (default: All, can select specific workspace) | Simple Select component above thread list; filter drives workspaceSlug param on thread/conversation fetch API calls |
| ADMIN-03 | Same two-panel UI reused from portal inbox components | Requires extracting portal inbox components into shared location or making them workspace-agnostic via props |
| ADMIN-04 | Admin can reply on behalf of any workspace (email + LinkedIn) | Portal email reply API uses getPortalSession() — need admin-authed variants. Admin reply API at `/api/admin/inbox/email/reply` and `/api/admin/inbox/linkedin/reply` with workspaceSlug passed in body |
| NAV-01 | Portal sidebar replaces "Replies" with "Inbox" | portal-sidebar.tsx already has Inbox nav item AND Replies nav item — remove Replies, keep Inbox |
| NAV-02 | Admin sidebar adds "Inbox" nav item | layout/sidebar.tsx Email group has `/replies` — add `/inbox` item to admin sidebar |
</phase_requirements>

---

## Summary

Phases 35 and 36 built the functional email and LinkedIn inboxes. The portal inbox page (`src/app/(portal)/portal/inbox/page.tsx`) already implements a two-panel layout with channel toggle, but it is a monolithic page component. Phase 37 is a polish and integration phase that must: (1) enrich the existing UI with unread tracking, mobile layout, channel tabs, cross-channel indicators, and intent badges; (2) build the admin master inbox by extracting and reusing portal inbox components; and (3) update navigation in both portals.

The biggest structural challenge is **unread tracking**: the Reply model has no `isRead` field. A schema migration is required to add `isRead Boolean @default(false)` to Reply (email threads use the "new" status derived from replyStatus which is already derived from the reply workflow — but that's not user-read state). LinkedIn already has `unreadCount` on LinkedInConversation but needs a "mark read" mechanism. A lightweight polling endpoint (`GET /api/portal/inbox/unread-count`) will drive the nav badge every 30 seconds.

The second key structural challenge is **component extraction for admin reuse**: the existing inbox page is monolithic. The thread list, conversation view, and composer components are split (`EmailThreadList`, `EmailThreadView`, `LinkedInConversationList`, `LinkedInConversationView`) but are tightly coupled to portal session auth. The admin inbox needs workspace-agnostic variants or a `workspaceSlug` prop passed through. The cleanest approach is creating a thin admin wrapper that passes `workspaceSlug` from the workspace filter dropdown, and separate admin API endpoints.

**Primary recommendation:** Extract the two-panel layout into a shared `InboxShell` component. Add `isRead` to Reply via `prisma db push`. Build the admin inbox as a server+client page that reuses the four panel components with admin API endpoints.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (Next.js) | 16 (app router) | Component framework | Project stack |
| Tailwind CSS | Project version | Responsive layout, mobile breakpoints | Project standard |
| Prisma | 6 | DB schema migration (isRead field) | Project ORM |
| lucide-react | Project version | Channel icons (Mail, Linkedin, ArrowLeft) | Already used throughout |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui components | Project version | Badge, Button, Select, Skeleton, Tooltip | All UI primitives — do not hand-roll |
| `cn` utility | Project version | Conditional className merging | Every component |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `prisma db push` for isRead migration | `prisma migrate dev` | db push preferred per Phase 35 decision — DB schema ahead of migration history |
| Polling for unread count | WebSocket/SSE | Project decision: Vercel serverless incompatible with persistent connections |
| Virtualized thread list | Plain scrollable div | At ~50-200 threads, virtualization is overkill; plain `overflow-y-auto` is fine |

**Installation:** No new npm packages required for this phase.

---

## Architecture Patterns

### Recommended File Structure

```
src/
├── app/
│   ├── (admin)/
│   │   └── inbox/
│   │       └── page.tsx                        # NEW: Admin master inbox page
│   └── (portal)/portal/inbox/
│       └── page.tsx                            # MODIFY: Add unread, mobile, channel tabs
│
├── components/
│   └── portal/
│       ├── email-thread-list.tsx               # MODIFY: add unread dot, channel icon, workspace badge (admin)
│       ├── email-thread-view.tsx               # MODIFY: add intent badges inline, cross-channel indicator, audit trail slot
│       ├── email-reply-composer.tsx            # MODIFY: add subject, CC/BCC, channel label
│       ├── linkedin-conversation-list.tsx      # MODIFY: add channel icon, workspace badge (admin)
│       ├── linkedin-conversation-view.tsx      # MODIFY: add cross-channel indicator
│       └── inbox-shell.tsx                     # NEW: Shared two-panel wrapper component
│
├── app/api/
│   ├── portal/inbox/
│   │   ├── unread-count/route.ts               # NEW: GET — returns total unread count for nav badge
│   │   ├── email/threads/[threadId]/read/route.ts # NEW: POST — mark thread read
│   │   └── email/mark-all-read/route.ts        # NEW: POST — mark all threads read
│   └── admin/inbox/
│       ├── email/
│       │   ├── threads/route.ts                # NEW: Admin variant — accepts ?workspace= filter
│       │   ├── threads/[threadId]/route.ts     # NEW: Admin thread detail
│       │   └── reply/route.ts                  # NEW: Admin reply (uses admin auth, not portal session)
│       └── linkedin/
│           ├── conversations/route.ts          # NEW: Admin variant — accepts ?workspace= filter
│           ├── conversations/[id]/messages/route.ts  # NEW: Admin messages
│           └── reply/route.ts                  # NEW: Admin LinkedIn queue
```

### Pattern 1: Unread Tracking via isRead on Reply

**What:** Add `isRead Boolean @default(false)` to the Reply model. Mark read via a POST API called after 2-second timer. Compute unread count from `Reply.count({ where: { workspaceSlug, isRead: false, direction: "inbound" } })`.

**When to use:** For email threads. LinkedIn already uses `LinkedInConversation.unreadCount`.

**Schema change:**
```prisma
// In Reply model
isRead   Boolean @default(false)

// Index for unread count queries
@@index([workspaceSlug, isRead])
```

**Mark read API:**
```typescript
// POST /api/portal/inbox/email/threads/[threadId]/read
// Sets isRead=true on all inbound replies in the thread after 2s delay in client
await prisma.reply.updateMany({
  where: {
    workspaceSlug,
    emailBisonParentId: threadId, // or threadId itself
    direction: "inbound",
  },
  data: { isRead: true },
});
```

### Pattern 2: Mobile Single-Panel Layout

**What:** Use Tailwind responsive prefix to hide the left panel on mobile when a thread is selected, and hide the right panel when no thread is selected.

**When to use:** Mobile breakpoint (below `md`). Desktop always shows both panels.

```tsx
// Left panel — on mobile: hide when a thread is selected
<div className={cn(
  "w-[320px] shrink-0 border-r border-border overflow-y-auto",
  "md:flex",                                       // always show on desktop
  selectedThreadId ? "hidden md:flex" : "flex w-full md:w-[320px]"  // mobile toggle
)}>

// Right panel — on mobile: hide when no thread selected, show back button
<div className={cn(
  "flex-1 overflow-hidden flex flex-col",
  "md:flex",
  selectedThreadId ? "flex" : "hidden md:flex"
)}>
  {/* Back button — mobile only */}
  <button
    onClick={() => setSelectedThreadId(null)}
    className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground md:hidden border-b border-border"
  >
    <ArrowLeft className="h-4 w-4" />
    Back to inbox
  </button>
```

### Pattern 3: Channel Tabs Based on Workspace Package

**What:** Portal app shell already fetches `workspace.name` from DB. Extend the select to include `package`. Pass `package` as prop to `PortalSidebar` and inbox page via server component.

**When to use:** Always — tab visibility is package-gated.

```typescript
// In PortalAppShell (server component)
const workspace = await prisma.workspace.findUnique({
  where: { slug: workspaceSlug },
  select: { name: true, package: true },  // add package
});

// Pass to inbox page via URL search params or a context
// Simplest: read package on the inbox page.tsx directly from portal session
// portal session stores workspaceSlug → fetch package in inbox page loader
```

Package values and what tabs to show:
- `"email"` → Email tab only (no LinkedIn tab)
- `"linkedin"` → LinkedIn tab only (no Email tab)
- `"email_linkedin"` → Both tabs + "All" tab
- `"consultancy"` → Both tabs (Covenco manages platforms) → treat same as `email_linkedin`

**Current workspace packages:**
- email: myacq, outsignal, 1210-solutions, rise, lime-recruitment, yoopknows (6 workspaces)
- linkedin: blanktag (1 workspace)
- consultancy: covenco (1 workspace)
- email_linkedin: none currently

### Pattern 4: Cross-Channel Indicator

**What:** When viewing an email thread, check if the same person (by personId) has a LinkedInConversation. If yes, show a chip. Vice versa for LinkedIn view.

**How to implement:** Enrich the thread detail API response and conversation message API response with a `crossChannelLink` object:

```typescript
// In GET /api/portal/inbox/email/threads/[threadId]
// After fetching thread, check for LinkedIn conversation by personId
const reply = messages.find(m => m.personId);
let crossChannel: { type: "linkedin"; conversationId: string } | null = null;
if (reply?.personId) {
  const liConvo = await prisma.linkedInConversation.findFirst({
    where: { workspaceSlug, personId: reply.personId },
    select: { id: true },
  });
  if (liConvo) crossChannel = { type: "linkedin", conversationId: liConvo.id };
}
```

```tsx
// In EmailThreadView — cross-channel chip
{crossChannel?.type === "linkedin" && (
  <button
    onClick={() => onSwitchToLinkedIn(crossChannel.conversationId)}
    className="inline-flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 rounded-full px-2.5 py-1 hover:bg-blue-50"
  >
    <Linkedin className="h-3 w-3" />
    Also on LinkedIn →
  </button>
)}
```

The inbox page must accept `onSwitchToLinkedIn` callback from EmailThreadView to set `activeChannel="linkedin"` and `selectedConversationId`.

### Pattern 5: Admin Master Inbox

**What:** New page at `/admin/inbox`. Workspace filter dropdown at top of thread list. Separate admin API endpoints (no portal session, uses standard admin auth from the `(admin)` layout).

**Key differences from portal inbox:**
1. API calls go to `/api/admin/inbox/...` not `/api/portal/inbox/...`
2. `workspaceSlug` passed as query param: `?workspace=rise` (empty = all)
3. Thread rows show workspace badge (context from CONTEXT.md: admin sees which client)
4. "Replying as [Workspace Name]" banner above composer
5. Audit trail section (expandable) in conversation view
6. AI suggestion shown alongside conversation

**Workspace filter component:**
```tsx
<Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
  <SelectTrigger className="w-48">
    <SelectValue placeholder="All Workspaces" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">All Workspaces</SelectItem>
    {workspaces.map(ws => (
      <SelectItem key={ws.slug} value={ws.slug}>{ws.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Component reuse strategy:** The four panel components (`EmailThreadList`, `EmailThreadView`, `LinkedInConversationList`, `LinkedInConversationView`) accept `workspaceSlug?: string` and admin-mode-specific props. The simplest approach: add an `isAdmin?: boolean` prop where needed, pass `workspaceSlug` down for display (workspace badge on thread rows), and have the admin inbox page call admin API routes directly (not the component itself).

### Anti-Patterns to Avoid

- **Don't call `prisma db push` in production without review:** Run locally first, verify schema diff, then deploy. Precedent from Phase 35 decision.
- **Don't put portal session auth inside shared components:** Portal components should be dumb. Auth lives in API routes and server components.
- **Don't mark threads as read on every render:** Use a `useEffect` with a 2-second `setTimeout` that is cleared if the user navigates away. Clear the timer on `threadId` change.
- **Don't fetch workspace list in client components for admin dropdown:** Fetch once in the server-rendered admin inbox page and pass as prop.
- **Don't add LinkedIn tab for email-only workspaces:** BlankTag is `linkedin`-only — their portal inbox should show LinkedIn only, no email tab.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative timestamps | Custom date formatter | Reuse existing `timeAgo()` inline helper from existing components | Already in email-thread-list, linkedin-conversation-list, etc. |
| Unread count badge | Custom count component | Same pattern as admin Notifications badge in sidebar.tsx (lines 411-420) | Consistent UX, proven implementation |
| Thread list scrolling | Virtualized list | Plain `overflow-y-auto` div | 50-200 threads max, no perf problem |
| Workspace Select | Custom dropdown | shadcn `Select` component | Already in project |
| Mobile overlay nav | Custom drawer | Existing `PortalMobileMenu` pattern | Re-use backdrop + slide-in pattern |
| Channel icons | Custom SVG | lucide-react `Mail` and `Linkedin` icons | Already used in inbox components |

---

## Common Pitfalls

### Pitfall 1: isRead Field — Email Thread vs. Individual Reply

**What goes wrong:** Setting `isRead=true` on a single Reply when a thread contains multiple replies. The unread dot stays because other replies in the thread still have `isRead=false`.

**Why it happens:** Threads are logical groupings of multiple Reply records. Marking a thread as read must update ALL inbound replies with the same thread key.

**How to avoid:** In the mark-read API, update by `emailBisonParentId` (the thread root), not by individual `replyId`. Use `updateMany` not `update`.

**Warning signs:** Unread dot persists after opening a thread.

### Pitfall 2: Mobile Layout Shift on Auto-Select

**What goes wrong:** On desktop, first thread auto-selects on load. On mobile, this immediately hides the thread list — user sees the conversation before they can see the list.

**Why it happens:** The auto-select logic runs on initial load regardless of screen width.

**How to avoid:** Conditionally auto-select based on `window.innerWidth >= 768` (md breakpoint), or simply don't auto-select on mobile. Or change behavior: on mobile, default to showing the thread list (no auto-selection) and only auto-select on desktop.

**Warning signs:** Mobile users land on conversation view without seeing thread list.

### Pitfall 3: Admin Inbox — Portal Session Auth Leaking

**What goes wrong:** Admin inbox API routes accidentally import or call `getPortalSession()` instead of using standard admin auth.

**Why it happens:** Copy-paste from portal inbox routes.

**How to avoid:** Admin routes live under `/api/admin/inbox/` and use a different auth mechanism (or no auth, relying on the `(admin)` layout middleware). Review each admin API route — no `getPortalSession()` calls.

### Pitfall 4: Cross-Channel Indicator — personId Null Cases

**What goes wrong:** Most replies may have `personId: null` if the email hasn't been matched to a Person record. The cross-channel indicator never shows.

**Why it happens:** Person matching from email isn't guaranteed for all replies.

**How to avoid:** The fallback lookup is by `leadEmail`: if `personId` is null, check if a `Person` with that email has a `linkedinUrl`, then check `LinkedInConversation.personId` matches that Person. This is a secondary lookup — implement only for primary personId match first, document limitation.

### Pitfall 5: Channel Tab for "consultancy" Package

**What goes wrong:** Covenco has `package: "consultancy"`. If code only checks for `"email_linkedin"`, Covenco's inbox shows only one channel.

**Why it happens:** The consultancy package is a special case not in the original design docs.

**How to avoid:** Define a helper:
```typescript
function getAvailableChannels(pkg: string): ("email" | "linkedin")[] {
  if (pkg === "email") return ["email"];
  if (pkg === "linkedin") return ["linkedin"];
  return ["email", "linkedin"]; // email_linkedin, consultancy, unknown
}
```

### Pitfall 6: "Replies" Nav Item Still Visible After Phase 37

**What goes wrong:** Portal sidebar has BOTH "Inbox" (already added in Phase 36) and "Replies" nav items. Phase 37 requirement NAV-01 is to remove "Replies" — but if only "Inbox" is kept, the `/portal/replies` page becomes unreachable from nav (it still exists).

**How to avoid:** The `/portal/replies` page can be left as-is (it's the existing reply listing). Only remove the nav item. The page won't break — just no nav link to it.

---

## Code Examples

### Unread Count Polling in Sidebar

```typescript
// Pattern from admin sidebar.tsx (lines 342-362) — adapt for portal inbox nav badge
useEffect(() => {
  let active = true;
  async function fetchUnread() {
    try {
      const res = await fetch("/api/portal/inbox/unread-count");
      const json = await res.json();
      if (active) setUnreadCount(json.count ?? 0);
    } catch {}
  }
  fetchUnread();
  const interval = setInterval(fetchUnread, 30_000); // 30s per context decision
  return () => { active = false; clearInterval(interval); };
}, []);
```

### 2-Second Read Timer

```typescript
// In inbox page — call when selectedThreadId changes
useEffect(() => {
  if (!selectedThreadId) return;
  const timer = setTimeout(() => {
    fetch(`/api/portal/inbox/email/threads/${selectedThreadId}/read`, {
      method: "POST",
    }).catch(() => {}); // fire-and-forget
  }, 2000);
  return () => clearTimeout(timer); // cancel if user navigates away in < 2s
}, [selectedThreadId]);
```

### Workspace Badge on Thread Rows (Admin Only)

```tsx
// Add to EmailThreadList thread row — only render when workspaceName prop is present
{workspaceName && (
  <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground border border-border">
    {workspaceName}
  </span>
)}
```

### "Replying as" Banner

```tsx
// Admin composer wrapper — appears above EmailReplyComposer
{isAdmin && replyingAs && (
  <div className="px-4 py-2 bg-muted/50 border-b border-border text-xs text-muted-foreground">
    Replying as <span className="font-medium text-foreground">{replyingAs.workspaceName}</span>
    {replyingAs.senderEmail && (
      <> · <span className="font-mono">{replyingAs.senderEmail}</span></>
    )}
  </div>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic inbox page | Component-based split (ThreadList + ThreadView + Composer) | Phases 35-36 | Components can be reused in admin inbox |
| All threads in one list | Channel tabs | Phase 37 | Separation of email/LinkedIn UX |
| No unread tracking | isRead on Reply + unreadCount on LinkedInConversation | Phase 37 | Nav badge, unread dots |

---

## Open Questions

1. **Admin inbox auth model**
   - What we know: Admin pages in `(admin)/` are protected by middleware/layout. No explicit per-route API auth on admin routes (they trust the layout protection).
   - What's unclear: Do admin inbox API routes need explicit auth checks, or does the layout cover it?
   - Recommendation: Check existing admin API routes (e.g., `/api/admin/...`) for pattern. If they have no auth check, follow suit. If they do, replicate.

2. **Email composer subject/CC/BCC fields**
   - What we know: CONTEXT.md says email composer should include subject, CC/BCC fields.
   - What's unclear: Does the EmailBison sendReply API support CC/BCC? Phase 33 spike validated `reply_all:true` and `to_emails[]` but CC/BCC was not tested.
   - Recommendation: Add subject/CC/BCC as optional UI fields. Pass them to the reply API. If EB doesn't support them, they can be shown but not sent — document the limitation.

3. **Admin audit trail data source**
   - What we know: CONTEXT.md says admin sees full audit trail: who replied, when, delivery status, notification history.
   - What's unclear: "Who replied" — is this tracked? Currently `Reply.direction="outbound"` records our sent replies, but `overriddenBy` tracks admin overrides. NotificationAuditLog tracks notifications.
   - Recommendation: The audit trail can be built from: outbound Reply records in the thread (who sent, when), NotificationAuditLog entries for the lead email, and Reply.overriddenBy for classification overrides. This is assembling existing data — no new model needed.

---

## Key Implementation Sequence

Based on dependencies, the natural build order is:

1. **Schema migration** — add `isRead` to Reply, `prisma db push` (no UI blocked without this)
2. **Channel tab logic** — add package-aware tab rendering to portal inbox page (low risk, pure UI)
3. **Unread dot + mark-read** — requires schema migration. Add unread dot to thread list rows + 2s timer
4. **Unread count API + nav badge** — portal sidebar polling
5. **Mobile single-panel layout** — modify inbox page CSS, add back button
6. **Cross-channel indicator** — enrich thread detail API, add chip to conversation views
7. **Intent badges in thread list** — add to EmailThreadList rows (already has `interested` and `hasAiSuggestion`, needs `intent`/`sentiment` from thread summary API)
8. **Email composer subject/CC/BCC** — modify EmailReplyComposer component
9. **Admin inbox API routes** — new routes mirroring portal, workspace-scoped
10. **Admin inbox page** — new `/admin/inbox` page with workspace filter
11. **Admin component variants** — workspace badge, "replying as" banner, audit trail
12. **Navigation updates** — remove "Replies" from portal sidebar, add "Inbox" to admin sidebar

Note: Admin sidebar (`layout/sidebar.tsx`) already has a Replies item but no Inbox item. Portal sidebar already has BOTH Inbox and Replies items — Phase 37 removes Replies only.

---

## Validation Architecture

> `workflow.nyquist_validation` is false in `.planning/config.json` — section skipped.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection:
  - `src/app/(portal)/portal/inbox/page.tsx` — existing monolithic inbox component
  - `src/components/portal/email-thread-list.tsx` — thread list component
  - `src/components/portal/email-thread-view.tsx` — thread conversation view
  - `src/components/portal/linkedin-conversation-list.tsx` — LI conversation list
  - `src/components/portal/linkedin-conversation-view.tsx` — LI conversation view
  - `src/components/portal/email-reply-composer.tsx` — email reply composer
  - `src/components/portal/portal-sidebar.tsx` — portal sidebar (Inbox + Replies both present)
  - `src/components/layout/sidebar.tsx` — admin sidebar (no Inbox item)
  - `prisma/schema.prisma` — Reply model (no isRead), LinkedInConversation model (unreadCount exists), Workspace model (package field)
- Live DB query confirming workspace packages (email: 6, linkedin: 1, consultancy: 1, email_linkedin: 0)

### Secondary (MEDIUM confidence)
- Pattern from admin sidebar unread count polling (lines 342-362 of sidebar.tsx) applied to portal inbox nav badge

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries needed, everything is already installed
- Architecture: HIGH — codebase fully inspected, exact component locations identified
- Pitfalls: HIGH — derived from direct schema/code inspection and project context

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (stable stack)
