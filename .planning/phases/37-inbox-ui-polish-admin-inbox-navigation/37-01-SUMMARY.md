---
phase: 37-inbox-ui-polish-admin-inbox-navigation
plan: "01"
subsystem: portal-inbox
tags: [schema, api, navigation, unread-tracking]
dependency_graph:
  requires: [35-01, 36-01]
  provides: [unread-tracking-infrastructure, nav-inbox-badge]
  affects: [portal-sidebar, admin-sidebar, reply-model]
tech_stack:
  added: []
  patterns: [30s-polling, prisma-updateMany, nav-badge]
key_files:
  created:
    - src/app/api/portal/inbox/email/threads/[threadId]/read/route.ts
    - src/app/api/portal/inbox/email/mark-all-read/route.ts
    - src/app/api/portal/inbox/unread-count/route.ts
  modified:
    - prisma/schema.prisma
    - src/components/portal/portal-sidebar.tsx
    - src/components/layout/sidebar.tsx
    - src/components/portal/email-thread-view.tsx
    - src/components/portal/linkedin-conversation-view.tsx
decisions:
  - "isRead field with @@index([workspaceSlug, isRead]) for efficient unread count queries"
  - "OR clause on emailBisonParentId/emailBisonReplyId covers both thread roots and reply children"
  - "LinkedIn unreadCount pulled from LinkedInConversation._sum aggregate — reuses existing field"
  - "prisma db push used (not migrate dev) — per Phase 35 decision to avoid migration history drift"
metrics:
  duration: "4 min"
  completed: "2026-03-11T19:33:00Z"
  tasks_completed: 2
  files_changed: 7
---

# Phase 37 Plan 01: Schema Migration + Navigation Updates Summary

Unread tracking infrastructure (isRead on Reply model + 3 API endpoints) and navigation polish: portal sidebar removes Replies, shows unread count badge on Inbox via 30s polling; admin sidebar gains Inbox as first item in Email group.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Schema migration + unread tracking API endpoints | 58a2132 | schema.prisma, 3 new routes |
| 2 | Navigation updates (portal + admin sidebars) | 44d9f2d | portal-sidebar.tsx, sidebar.tsx |

## What Was Built

**Schema:**
- `isRead Boolean @default(false)` added to Reply model after `aiSuggestedReply`
- `@@index([workspaceSlug, isRead])` added for efficient unread count queries
- Applied via `prisma db push` (consistent with Phase 35 decision)

**API Endpoints:**
- `POST /api/portal/inbox/email/threads/[threadId]/read` — marks all inbound replies in thread as read using OR clause on `emailBisonParentId | emailBisonReplyId`
- `POST /api/portal/inbox/email/mark-all-read` — bulk mark all workspace unread as read, returns `{ updated: N }`
- `GET /api/portal/inbox/unread-count` — returns `{ email, linkedin, total }` using parallel Promise.all, LinkedIn from `linkedInConversation._sum.unreadCount`

**Navigation:**
- Portal sidebar: Replies nav item removed; Inbox gains unread count badge (inline pill when expanded, absolute dot when collapsed); polls every 30s
- Admin sidebar: `{ href: "/inbox", label: "Inbox", icon: Inbox }` added as first item in Email group

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TypeScript errors from Phase 36**
- **Found during:** Task 2 TypeScript verification
- **Issue:** `onSwitchChannel` prop passed from inbox page but not declared in `EmailThreadViewProps` or `LinkedInConversationViewProps` (3 TS errors)
- **Fix:** Added optional `onSwitchChannel` prop to both component interfaces
- **Files modified:** `src/components/portal/email-thread-view.tsx`, `src/components/portal/linkedin-conversation-view.tsx`
- **Commit:** 44d9f2d (included in same task commit)

## Self-Check: PASSED

All 3 API route files confirmed present. Both task commits (58a2132, 44d9f2d) confirmed in git log. TypeScript compiles clean. Prisma schema valid.
