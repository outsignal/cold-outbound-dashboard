---
phase: 37-inbox-ui-polish-admin-inbox-navigation
plan: 02
subsystem: ui
tags: [react, nextjs, tailwind, portal, inbox, mobile-responsive, cross-channel]

# Dependency graph
requires:
  - phase: 36-linkedin-inbox
    provides: LinkedInConversationList, LinkedInConversationView with channel toggle
  - phase: 35-email-inbox
    provides: EmailThreadList, EmailThreadView, EmailReplyComposer, thread API
provides:
  - Mobile single-panel inbox with back-button navigation
  - Package-aware channel tabs (All / Email / LinkedIn based on workspace.package)
  - Email thread rows with Mail channel icon, unread dot, intent badge
  - LinkedIn conversation rows with Linkedin channel icon
  - Cross-channel chips (email <-> LinkedIn) for same-person conversations
  - Email composer with subject line and channel mode label
  - 2-second read timer on thread selection
  - Mark all as read button
  - /api/portal/workspace endpoint returning workspace package
affects: [phase 37 plans, portal inbox feature]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getAvailableChannels(pkg) helper derives tabs from workspace package string"
    - "Mobile single-panel: conditional hidden/flex classes on list vs detail panels based on hasSelection"
    - "Cross-channel via personId: API joins email thread personId -> LinkedInConversation"
    - "2s read timer: useEffect + setTimeout + cleanup on selectedThreadId change"

key-files:
  created:
    - src/app/api/portal/workspace/route.ts
  modified:
    - src/app/(portal)/portal/inbox/page.tsx
    - src/components/portal/email-thread-list.tsx
    - src/components/portal/email-thread-view.tsx
    - src/components/portal/email-reply-composer.tsx
    - src/components/portal/linkedin-conversation-list.tsx
    - src/components/portal/linkedin-conversation-view.tsx
    - src/app/api/portal/inbox/email/threads/[threadId]/route.ts

key-decisions:
  - "Mobile hides list panel via hidden md:flex when hasSelection is true — no JS resize listener needed"
  - "All tab renders per-item list components with single-element arrays — avoids separate combined component"
  - "Cross-channel lookup uses personId from firstInbound reply -> LinkedInConversation.personId — no extra join table needed"
  - "workspace package fetched from dedicated /api/portal/workspace endpoint — cleanest separation"
  - "Auto-select guarded by window.innerWidth >= 768 — prevents mobile from pre-selecting items on load"

patterns-established:
  - "Channel tabs: always check channels.length > 1 before rendering tab bar — single-channel workspaces see no tabs"
  - "Cross-channel chips: optional prop pattern — parent passes onSwitchChannel, component renders chip only when both prop + data present"

requirements-completed: [UI-01, UI-02, UI-04, UI-05, UI-06, UI-07]

# Metrics
duration: 22min
completed: 2026-03-11
---

# Phase 37 Plan 02: Inbox UI Polish Summary

**Mobile-responsive single-panel inbox with package-aware channel tabs, intent/sentiment badges, cross-channel navigation chips, and email composer subject field**

## Performance

- **Duration:** 22 min
- **Started:** 2026-03-11T18:45:00Z
- **Completed:** 2026-03-11T19:07:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Mobile layout collapses to single panel — list hides when item selected, back button returns to list
- Channel tabs (All / Email / LinkedIn) render only for multi-channel workspaces based on `workspace.package`
- All tab merges email threads + LinkedIn conversations sorted by recency in a unified feed
- Email thread rows show Mail icon, blue unread dot (isRead=false), intent badge with color-coded labels
- LinkedIn conversation rows show Linkedin icon matching email row layout
- Cross-channel chips ("Also on LinkedIn →" / "Also on Email →") appear when same person has both channels — clicking switches active channel and selects the corresponding conversation
- Email composer shows read-only subject ("Re: [subject]") and "Email Reply" channel mode label
- 2-second read timer fires POST to mark thread as read after selection
- Mark all as read button in thread list header

## Task Commits

1. **Task 1: Mobile single-panel layout + channel tabs + read timer** - `391bed1` (feat)
2. **Task 2: Thread list badges + cross-channel chips + composer upgrade** - `019be72` (feat)

## Files Created/Modified
- `src/app/api/portal/workspace/route.ts` — GET endpoint returning workspace.package and name
- `src/app/(portal)/portal/inbox/page.tsx` — Mobile layout, channel tabs, all-feed, read timer, mark-all-read, cross-channel routing
- `src/components/portal/email-thread-list.tsx` — Mail icon, unread dot, intent badge, expanded ThreadSummary interface
- `src/components/portal/email-thread-view.tsx` — crossChannel prop, LinkedIn chip, sentiment indicator, onSwitchChannel callback, passes subject to composer
- `src/components/portal/email-reply-composer.tsx` — subject prop (read-only display), "Email Reply" channel mode label
- `src/components/portal/linkedin-conversation-list.tsx` — Linkedin icon on each row
- `src/components/portal/linkedin-conversation-view.tsx` — crossChannel prop, Email chip, onSwitchChannel callback
- `src/app/api/portal/inbox/email/threads/[threadId]/route.ts` — Cross-channel lookup via personId -> LinkedInConversation

## Decisions Made
- Mobile panel visibility uses CSS classes (`hidden md:flex`) not JS resize listeners — no hydration issues, pure CSS breakpoint
- All tab renders EmailThreadList/LinkedInConversationList with single-item arrays per row — reuses existing row rendering without a new combined component
- Cross-channel data added to thread detail API response (not a separate fetch) — single round-trip for full thread + cross-channel metadata
- workspace package fetched on mount from `/api/portal/workspace` — dedicated endpoint, clean separation from inbox data

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - TypeScript compiled cleanly after both tasks.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 6 UI requirements (UI-01 through UI-07 excluding UI-03) complete
- Cross-channel navigation wired end-to-end
- Mark all as read and 2s read timer depend on Plan 01's `/api/portal/inbox/email/mark-all-read` and `/api/portal/inbox/email/threads/[threadId]/read` endpoints (both pre-created)

---
*Phase: 37-inbox-ui-polish-admin-inbox-navigation*
*Completed: 2026-03-11*
