# Phase 34: LinkedIn Data Layer - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Create Prisma models for LinkedIn conversations and messages, build a sync API route that triggers async worker fetch (fire-and-forget), upsert synced data into the DB, and match conversation participants to existing Person records by LinkedIn URL. No UI components, no inbox page — pure data layer that Phase 36 reads from.

</domain>

<decisions>
## Implementation Decisions

### Sync Trigger Behavior
- On-demand only — no background cron job. Sync fires when client opens LinkedIn inbox tab or hits refresh.
- 5-minute cooldown between syncs (per sender). If called within cooldown, return 200 with existing DB conversations (not a rejection).
- Sync triggers for ALL LinkedIn senders in the workspace at once (not one sender per request). Workspace may have 1-3 LinkedIn senders.
- Fire-and-forget pattern: POST /api/portal/inbox/linkedin/sync returns 202 immediately + includes existing conversations from DB in the response body. Worker syncs asynchronously. Client shows existing data instantly, 15s polling picks up fresh data when sync completes.
- No extra client-side work to detect when fresh data arrives — normal polling interval handles it.

### Person Matching Logic
- Match by LinkedIn URL only — no fuzzy name matching. Match participant's `participantProfileUrl` from worker response against `Person.linkedinUrl` in DB.
- Matching happens during sync upsert (at DB write time), not lazily on inbox load. `personId` is pre-populated on LinkedInConversation.
- Edge case: if no Person match found, store conversation anyway with `personId: null`. This should rarely happen since we only reach out to people via LinkedInActions tied to Person records.

### Conversation Filtering
- Only store conversations where the participant matches a Person record (LinkedIn URL match found). Unmatched conversations from the worker response are discarded — keeps inbox focused on our outbound contacts.
- Exception: conversations with `personId: null` (from the edge case above where URL format differs) are still stored.
- Once stored, conversations are kept forever — never archived or deleted. Historical data is valuable for analyzing which outbound messages generate positive responses.
- Messages are fetched on-demand only (separate worker endpoint call when a client opens a specific conversation). NOT synced inline with conversations.
- `lastMessageSnippet` from the worker's rich metadata is sufficient for the conversation list preview — no need to fetch messages just for the list view.

### Data Freshness
- Show "Last synced: X minutes ago" timestamp in the LinkedIn inbox (UI concern but the data layer must store/expose `lastSyncedAt`)
- `lastSyncedAt` stored per-sender on a sync tracking record (or per-conversation, whichever is simpler)
- When sync response includes existing data + 202, the `lastSyncedAt` value should be included so the frontend can display it

### Claude's Discretion
- Exact Prisma model field names and types (follow existing schema conventions)
- Index strategy for conversation/message queries
- How to structure the sync upsert transaction (batch vs individual)
- Whether to use a separate SyncStatus model or store lastSyncedAt on the Sender model

</decisions>

<specifics>
## Specific Ideas

- "We only ever take actions with people based on their LinkedIn URL" — so every conversation participant should match a Person. Filtering is a safeguard, not a primary flow.
- "We want as much data as possible to determine what messages generate what kind of responses" — retention is permanent, never archive.
- Sync response returning existing data means the client never sees an empty state on first load of the LinkedIn tab (unless it's genuinely the first sync ever).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 34-linkedin-data-layer*
*Context gathered: 2026-03-11*
