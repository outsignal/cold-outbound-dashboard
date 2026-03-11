# Phase 37: Inbox UI Polish, Admin Inbox & Navigation - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Polish the unified inbox with channel tabs (All/Email/LinkedIn), mobile single-panel layout, unread tracking, cross-channel indicators, an admin master inbox with workspace filtering, and navigation updates in both portals. Email and LinkedIn inboxes must already exist from Phases 35-36.

</domain>

<decisions>
## Implementation Decisions

### Thread list design
- Rich rows: avatar, name, subject/preview line, relative timestamp, channel icon (email/LinkedIn), unread dot
- Workspace tag badge shown in admin master inbox only (not in portal)
- Sorted by most recent activity (newest message bumps thread to top)
- Channel differentiation via small icon only — no colored accents or borders on rows

### Conversation view
- LinkedIn threads: chat bubble layout (inbound left-aligned, outbound right-aligned)
- Email threads: stacked full-width email-style layout (from, subject, timestamp headers per message)
- Different visual treatment per channel — not a unified layout
- Intent/sentiment badges (Interested, Objection, OOO, etc.) shown in both places: on thread list row AND inline below message in conversation view

### Composer
- Visually distinct composers per channel
- Email composer: includes subject line, CC/BCC fields, "Send" button
- LinkedIn composer: simpler chat-style input, "Queue Message" button
- Channel mode indicated clearly so user knows which channel they're replying on

### Admin master inbox
- Workspace filter: dropdown above thread list, default "All Workspaces", select specific workspace to filter
- "Replying as [Workspace Name]" banner above composer with sender email shown, confirming context before sending
- Admin sees full audit trail per thread: who replied, when, delivery status, notification history
- Admin also sees AI-generated reply suggestion alongside the conversation
- Reuses same two-panel components from portal inbox

### Unread behavior
- Thread marked as read after 2 seconds of viewing (prevents accidental read on quick taps)
- Unread dot on thread rows, total unread count on Inbox nav item
- Unread counts poll every 30 seconds (lightweight polling, no WebSocket)
- "Mark all as read" action available in thread list header

### Cross-channel indicator
- Clickable link chip inside conversation view: "Also on LinkedIn →" or "Also on Email →"
- Click navigates to the other channel's thread for the same person
- Indicator appears only when the same person has active threads in both channels

### Navigation
- Portal sidebar: "Replies" replaced with "Inbox"
- Admin sidebar: "Inbox" nav item added

### Claude's Discretion
- Exact spacing, typography, and color values
- Loading states and skeleton screens
- Mobile breakpoint and single-panel transition animation
- Error states for failed message sends
- Empty inbox state design
- Thread list pagination/virtualization approach

</decisions>

<specifics>
## Specific Ideas

- Email conversation view should feel like Gmail's stacked thread view — familiar to email users
- LinkedIn conversation view should feel like a chat app — bubbles, lightweight, conversational
- Admin audit trail should be unobtrusive — expandable section or side panel, not cluttering the main conversation
- 2-second read delay is intentional — prevents marking threads as read during quick scanning

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 37-inbox-ui-polish-admin-inbox-navigation*
*Context gathered: 2026-03-11*
