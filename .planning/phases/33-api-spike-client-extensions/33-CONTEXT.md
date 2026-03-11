# Phase 33: API Spike & Client Extensions - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Validate EmailBison sendReply endpoint via live spike test, extend EmailBisonClient with inbox methods (sendReply, getReply, getRepliesPage), extend VoyagerClient with conversation/message fetch methods, and expose worker endpoints for the portal to consume LinkedIn data. No UI, no DB models, no portal routes — pure API foundation.

</domain>

<decisions>
## Implementation Decisions

### Spike Validation Approach
- Standalone TypeScript script at `scripts/spike-emailbison-reply.ts` — NOT a test file, a one-off validation tool
- Only use Outsignal or Rise workspace replies (internal workspaces) — never test against external client data
- Send a real reply to validate full end-to-end delivery — no dry-run
- If sendReply endpoint fails (doesn't exist, wrong auth, different params), investigate alternatives (SMTP, different endpoint) rather than falling back to mailto: or blocking v5.0
- Script should log full request/response details to console for developer to review

### Voyager Conversation Scope
- fetchConversations() returns last 20 conversations from Voyager API — unfiltered at the API level
- Filtering by "our initiated contacts" happens in Phase 34 at the DB layer (match participants against Person records)
- fetchMessages() returns last 20 messages per conversation
- Messages are fetched on-demand (separate call when user opens a conversation), NOT inline with the conversations list
- This pattern minimizes Voyager API calls per sync: 1 call for conversation list, 1 call per opened conversation

### Error Handling & Fallbacks
- Voyager session expiry (401/403): Worker returns `{ error: 'session_expired', message: 'Reconnect LinkedIn in settings' }` — portal displays to client
- Voyager rate limit (429): Fail fast, no retry — let the 5-min cache cool down naturally. Account safety is priority.
- EmailBison errors: Wrap in typed `EmailBisonError` class with `code`, `message`, `statusCode` properties
- Unexpected EmailBison response shapes: Throw EmailBisonError with raw response body — fail loud to catch API drift early
- Do NOT retry automatically on any Voyager error — let it cool down

### Worker Endpoint Contract
- Authentication: Shared secret header (x-api-key or match existing worker auth pattern)
- Two endpoints in this phase:
  1. `GET /sessions/{senderId}/conversations` — returns conversation list
  2. `GET /sessions/{senderId}/conversations/{conversationId}/messages` — returns messages for one conversation
- Conversations response includes rich metadata: conversationId, participantName, participantUrl, participantHeadline, participantProfilePicUrl, lastActivityAt, unreadCount, lastMessageSnippet
- 2-3 second random delay between each Voyager API call to mimic human browsing speed

### Claude's Discretion
- Exact TypeScript type names and interface structure for Voyager responses
- How to parse LinkedIn's normalized JSON (`included[]`) format
- Whether to use existing worker auth middleware or create new auth check
- Spike script implementation details (how to load env, pick reply ID, etc.)

</decisions>

<specifics>
## Specific Ideas

- "We don't want to pull conversations they've started themselves" — filtering should happen at DB layer (Phase 34) by matching against Person records, not at the Voyager API level
- Worker already has all the Voyager session/cookie infrastructure — this phase extends it, doesn't rebuild it

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 33-api-spike-client-extensions*
*Context gathered: 2026-03-11*
