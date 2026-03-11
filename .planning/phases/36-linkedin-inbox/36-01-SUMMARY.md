---
phase: 36-linkedin-inbox
plan: "01"
subsystem: portal-api
tags: [linkedin, inbox, api-routes, portal, queue]
dependency_graph:
  requires: [34-01]
  provides: [36-02]
  affects: [portal-inbox, linkedin-worker]
tech_stack:
  added: []
  patterns:
    - two-query Person join (no @relation on LinkedInConversation.personId)
    - on-demand worker fetch with DB upsert on first access
    - defensive response envelope parsing (messages ?? data ?? [])
    - priority-1 action queue for warm lead fast-track
key_files:
  created:
    - src/app/api/portal/inbox/linkedin/conversations/route.ts
    - src/app/api/portal/inbox/linkedin/conversations/[conversationId]/messages/route.ts
    - src/app/api/portal/inbox/linkedin/reply/route.ts
    - src/app/api/portal/inbox/linkedin/actions/[actionId]/status/route.ts
  modified: []
decisions:
  - Two-query pattern for Person join — personId has no @relation on LinkedInConversation, so separate prisma.person.findMany with Map lookup avoids N+1 queries
  - On-demand message fetch — worker is only called when no DB messages exist (or refresh=true), minimizing Voyager API calls
  - Graceful degradation on worker failure — returns existing DB messages, never 500s
  - 422 vs 404 for missing personId — 422 Unprocessable Entity semantically correct for "can't proceed without Person record"
metrics:
  duration: "2 minutes"
  completed_date: "2026-03-11"
  tasks_completed: 2
  files_created: 4
---

# Phase 36 Plan 01: LinkedIn Inbox API Routes Summary

**One-liner:** Four workspace-scoped portal API routes for LinkedIn inbox — conversation list with Person subtitle join, on-demand message fetch from Railway worker with DB upsert, priority-1 reply queuing, and action status polling.

## What Was Built

Four REST API routes under `/api/portal/inbox/linkedin/` that form the data layer for the LinkedIn inbox UI (Plan 02).

### Routes Created

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/portal/inbox/linkedin/conversations` | GET | Workspace-scoped conversation list with Person jobTitle/company for "Title @ Company" subtitle |
| `/api/portal/inbox/linkedin/conversations/[id]/messages` | GET | On-demand message fetch from Railway worker, DB upsert, chronological return |
| `/api/portal/inbox/linkedin/reply` | POST | Queue reply as priority-1 LinkedInAction via enqueueAction() |
| `/api/portal/inbox/linkedin/actions/[actionId]/status` | GET | Poll action status for optimistic UI updates (Queued -> Sent badge) |

## Key Implementation Details

**Conversation list two-query pattern:** `LinkedInConversation.personId` has no Prisma `@relation` to `Person` (it's a plain `String?`). The route collects non-null personIds, does a single `prisma.person.findMany({ where: { id: { in: personIds } } })`, then builds a `Map<string, {jobTitle, company}>` for O(1) lookup. Falls back to `participantHeadline` if no Person record matched.

**Message fetch on-demand:** First checks DB for existing messages. If none (or `?refresh=true`), calls `GET {WORKER_URL}/sessions/{senderId}/conversations/{conversationId}/messages` with Bearer auth. Uses defensive envelope parsing (`raw?.messages ?? raw?.data ?? []`) to handle Railway worker response variations. Each message upserted with `update: {}` (messages immutable). Gracefully degrades to DB messages on worker failure.

**Reply queue:** POST validates both `conversationId` and `message` fields, resolves the conversation to its workspace, returns 422 if `personId` is null (no Person match), then calls `enqueueAction()` with `priority: 1` and `scheduledFor: new Date()` for immediate worker pickup.

**Action status polling:** Simple `findFirst` scoped to `workspaceSlug` to prevent cross-workspace data leakage. Returns `{ status, completedAt }` for the UI to update reply state.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

All four files created and type-checked (npx tsc --noEmit passes with zero errors). All routes use getPortalSession() for auth. Two-query pattern confirmed. Defensive parsing confirmed. enqueueAction with priority=1 confirmed.

## Self-Check: PASSED
