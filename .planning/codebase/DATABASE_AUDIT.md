# Database & Data Integrity Audit

**Analysis Date:** 2026-03-05

## 1. Schema Review

### Models (32 total)
Workspace, Person (@@map Lead), PersonWorkspace (@@map LeadWorkspace), Company, DiscoveredPerson, WebhookEvent, CachedMetrics, InboxStatusSnapshot, Proposal, OnboardingInvite, AgentRun, WebsiteAnalysis, KnowledgeDocument, KnowledgeChunk, EmailDraft, EnrichmentLog, EnrichmentJob, DailyCostTotal, SignalEvent, SignalDailyCost, SeenSignalUrl, TargetList, TargetListPerson, Campaign, CampaignDeploy, SignalCampaignLead, Sender, SenderHealthEvent, LinkedInAction, LinkedInDailyUsage, LinkedInConnection, CampaignSequenceRule, MagicLinkToken, Notification, Client, ClientTask, ClientSubtask, InvoiceSenderSettings, Invoice, InvoiceLineItem, InvoiceSequence

### Missing Indexes (Action Required)

**Person.companyDomain** -- No index. Used heavily for:
- Enrichment matching (`Person.companyDomain` <-> `Company.domain`)
- Discovery dedup in `src/lib/discovery/promotion.ts` line 133: `prisma.person.findMany({ where: { companyDomain: dp.companyDomain } })`
- Vertical backfill queries
- **Impact:** Full table scan on ~14,500 rows every dedup/enrichment run
- **Fix:** Add `@@index([companyDomain])` to Person model

**Person.linkedinUrl** -- No index on Person model. Used for:
- Discovery dedup leg 2 in `src/lib/discovery/promotion.ts` line 121: `prisma.person.findFirst({ where: { linkedinUrl } })`
- Webhook handler LinkedIn fast-track lookup
- **Impact:** Full table scan on 14,500 rows per dedup check
- **Fix:** Add `@@index([linkedinUrl])` to Person model

**WebhookEvent.receivedAt** -- No index. Used in:
- Dashboard time-series query `src/app/api/dashboard/stats/route.ts` line 87: `receivedAt: { gte: sinceDate }`
- Health check bounce rate calculation `src/lib/linkedin/health-check.ts` line 50: `receivedAt: { gte: since24h }`
- **Impact:** Full table scan on potentially thousands of webhook events for every dashboard load
- **Fix:** Add `@@index([receivedAt])` to WebhookEvent model

**Redundant indexes to remove:**
- `MagicLinkToken.@@index([token])` -- redundant with `@unique`
- `InboxStatusSnapshot.@@index([workspaceSlug])` -- redundant with `@unique`
- `SignalDailyCost.@@index([workspaceSlug, date])` -- redundant with `@@unique([workspaceSlug, date])`

### Indexes That Are Well-Designed
- WebhookEvent: `[workspace, eventType]`, `[leadEmail]`, `[senderEmail, eventType]` -- covers all query patterns
- LinkedInAction: `[status, scheduledFor]`, `[senderId, status]`, `[priority, scheduledFor]` -- excellent for queue polling
- SignalEvent: `[source, externalId]` unique, `[companyDomain, workspaceSlug, status]`, `[expiresAt, status]` -- well-thought-out for pipeline queries
- Campaign: `[workspaceSlug, name]` unique, `[type, status]` -- covers signal campaign pipeline lookups

---

## 2. Data Model Gaps

### Missing Foreign Key: PersonWorkspace -> Workspace
- `PersonWorkspace.workspace` is a plain `String` field, not a FK to `Workspace.slug`
- **Impact:** Orphan PersonWorkspace records possible if workspace slug is mistyped or workspace deleted
- **Fix approach:** Add `workspace Workspace @relation(fields: [workspace], references: [slug])`. Requires migration to clean any orphans first.

### Missing Foreign Key: DiscoveredPerson -> Workspace
- `DiscoveredPerson.workspaceSlug` is a plain `String`, not a FK

### Missing Foreign Key: EmailDraft -> Workspace
- `EmailDraft.workspaceSlug` is a plain `String`, not a FK

### Missing Foreign Key: CampaignSequenceRule -> Workspace/Campaign
- Uses plain `String` fields for `workspaceSlug` and `campaignName`

### Soft Reference Pattern (Intentional)
- `Person.companyDomain` <-> `Company.domain` -- intentionally soft, documented in MEMORY.md
- `DiscoveredPerson.personId` -- soft reference, documented in schema comment
- `SignalCampaignLead.signalEventId` -- soft reference, documented
- `SignalEvent.companyDomain` -- soft reference, consistent with Person pattern

---

## 3. Migration Safety

**No migrations directory exists.** The project uses `prisma db push` rather than formal migrations.

- **Risk:** No migration history, no rollback path, no audit trail of schema changes
- **Impact at current scale:** Low -- 6 workspaces, single developer
- **Impact at growth:** High -- multi-developer teams need migration history
- **Fix approach:** Run `prisma migrate dev --name init` to baseline

---

## 4. Soft Deletes vs Hard Deletes

**The codebase uses hard deletes exclusively.** No `deletedAt` patterns exist.

| Model | Where | Guard |
|-------|-------|-------|
| Client | `src/lib/clients/operations.ts:509` | Existence check only |
| ClientTask | `src/lib/clients/operations.ts:800` | Existence check only |
| Campaign | `src/lib/campaigns/operations.ts:457` | Status guard: only `draft` or `internal_review` |
| KnowledgeDocument | `src/lib/knowledge/store.ts:302` | None |
| TargetList | `src/app/api/lists/[id]/route.ts:110` | Existence check only |
| Sender | `src/app/api/senders/[id]/route.ts:141` | Blocks if pending/running actions |
| Proposal | `src/app/api/proposals/[id]/route.ts:90` | Existence check only |
| OnboardingInvite | `src/app/api/onboarding-invites/[id]/route.ts:80` | Existence check only |

**Recommendation:** Add soft delete (`deletedAt DateTime?`) for Client, Proposal, Campaign.

---

## 5. Cascade Rules

### Cascade Deletes (Properly Configured)
Person -> PersonWorkspace, TargetListPerson (Cascade)
KnowledgeDocument -> KnowledgeChunk (Cascade)
Campaign -> SignalCampaignLead (Cascade)
Sender -> SenderHealthEvent (Cascade)
Client -> ClientTask -> ClientSubtask (Cascade)
Invoice -> InvoiceLineItem (Cascade)

### ORPHAN RISKS
| Parent | Child | Issue |
|--------|-------|-------|
| Sender | LinkedInAction | No cascade -- completed actions orphaned on sender delete |
| Sender | LinkedInDailyUsage | No cascade -- usage records orphaned |
| Sender | LinkedInConnection | No cascade -- connection records orphaned |

**Fix:** Add `onDelete: Cascade` to LinkedInAction, LinkedInDailyUsage, LinkedInConnection relations.

---

## 6. Unique Constraints

All properly enforced: Person.email, Company.domain, Workspace.slug, PersonWorkspace[personId, workspace], Campaign[workspaceSlug, name], SignalEvent[source, externalId], Invoice.invoiceNumber, etc.

**Gap:** Client.name has no uniqueness constraint.

---

## 7. JSON Fields

Uses `String` columns for JSON (not Prisma `Json` type). High-risk fields:
- Person.enrichmentData -- no schema validation
- Campaign.emailSequence / linkedinSequence -- no schema validation
- Campaign.icpCriteria -- parsed in signal pipeline

All `JSON.parse()` calls use try-catch. Won't crash but silently returns null.

**Recommendation:** Add Zod schemas for critical JSON fields.

---

## 8. Timestamps

Models missing `updatedAt`: PersonWorkspace (important -- tracks ICP scores), AgentRun, Notification, KnowledgeDocument.

---

## 9. Enum Consistency

No Prisma enums. Status fields enforced at app level for Campaign, Invoice, Sender. NOT enforced for Person.status, Client.pipelineStatus.

**Recommendation:** Use Prisma enums for Campaign.status, Invoice.status, Sender.status.

---

## 10. Query Performance

### N+1 Patterns
1. **People enrichment batch** -- sequential queries per person in loop
2. **Discovery dedup loop** -- 1-3 queries per staged person
3. **People sync loop** -- two upserts per lead per workspace

### Unbounded Queries
1. Dashboard time-series loads ALL webhook events into memory
2. List summary loads ALL members to count
3. getCampaignLeadSample loads ALL then slices
4. listInvoices has no pagination

---

## 11. Transaction Safety

### Transactions Used (4 locations) -- All correct
Invoice numbering, health check campaign pause, sender reactivation, session expiry

### Missing Transactions
1. **Campaign dual-approval** -- race condition on concurrent approves
2. **Person + PersonWorkspace status sync** -- can diverge on partial failure
3. **Invoice payment + renewal advance** -- not atomic
4. **Health check detect + flag + reassign** -- partial failure risk
5. **Webhook handler status updates** -- Person and PersonWorkspace updated separately

---

## 12. Data Validation

No validation library (Zod). Manual `if (!field)` checks only. No email format validation, no input length validation, no JSON schema validation on write.

---

## Summary: Priority Fixes

### P0 -- Critical
1. Add `@@index([companyDomain])` to Person
2. Add `@@index([linkedinUrl])` to Person
3. Add `@@index([receivedAt])` to WebhookEvent
4. Wrap campaign dual-approval in transaction
5. Fix Sender deletion orphan cascade

### P1 -- High
6. Fix unbounded dashboard time-series query
7. Fix unbounded list summary query
8. Fix getCampaignLeadSample unbounded fetch
9. Wrap Person + PersonWorkspace status updates in transaction
10. Wrap invoice payment + renewal advance in transaction
11. Batch enrichment queries to reduce N+1

### P2 -- Medium
12. Adopt Zod for API request validation
13. Add JSON field schemas
14. Initialize Prisma migrations
15. Add soft deletes for Client, Proposal, Campaign
16. Remove redundant indexes
17. Add PersonWorkspace.updatedAt
18. Consider Prisma enums

### P3 -- Low
19. Add FK constraints for soft-linked fields
20. Add pagination to listClients, listInvoices, getList
21. Implement workspace deletion with cascade planning
22. Add email format validation at API boundaries
