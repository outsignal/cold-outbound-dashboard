# API & Functionality Audit

**Analysis Date:** 2026-03-05

---

## 1. API Route Inventory

**Total route files:** 91

### Admin & Auth
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/admin/login` | POST | Rate-limited (5/min/IP) | Admin password login, sets signed session cookie |
| `/api/admin/logout` | POST | Admin session | Clear admin session cookie |

### Agent System
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/agent-runs` | GET | None detected | List agent run audit logs |
| `/api/chat` | POST | None detected | Orchestrator chat endpoint (Cmd+J) |

### Campaigns
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/campaigns` | GET, POST | None detected | List/create campaigns |
| `/api/campaigns/[id]` | GET, PATCH, DELETE | None detected | Get/update/delete campaign |
| `/api/campaigns/[id]/deploy` | POST | None detected | Deploy campaign to EmailBison/LinkedIn |
| `/api/campaigns/[id]/deploys` | GET | None detected | List deployment history |
| `/api/campaigns/[id]/publish` | POST | None detected | Publish campaign for client approval |
| `/api/campaigns/[id]/signal-status` | GET | None detected | Signal campaign processing status |

### Clients (CRM Pipeline)
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/clients` | GET, POST | None detected | List/create clients |
| `/api/clients/[id]` | GET, PATCH, DELETE | None detected | Get/update/delete client |
| `/api/clients/[id]/populate` | POST | None detected | Auto-populate client tasks |
| `/api/clients/[id]/tasks` | GET, POST | None detected | List/create client tasks |
| `/api/clients/[id]/tasks/[taskId]` | PATCH, DELETE | None detected | Update/delete task |
| `/api/clients/[id]/tasks/[taskId]/subtasks/[subtaskId]` | PATCH, DELETE | None detected | Update/delete subtask |

### Companies
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/companies/enrich` | POST | `x-api-key` (CLAY_WEBHOOK_SECRET) | Clay webhook — company enrichment |
| `/api/companies/search` | GET | None detected | Search companies |

### Cron Jobs
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/cron/session-refresh` | GET | CRON_SECRET (Bearer) | **DEPRECATED** — merged into inbox-health/check |
| `/api/enrichment/jobs/process` | GET, POST | CRON_SECRET | Process enrichment job queue (daily cron) |
| `/api/inbox-health/check` | GET | CRON_SECRET | Master cron: 7 tasks (inbox health, sender health, session refresh, invoice gen, overdue detection, unpaid alerts) |
| `/api/linkedin/maintenance` | GET | CRON_SECRET | LinkedIn daily maintenance (warmup, acceptance rate, stuck/stale action recovery) |

### Dashboard
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/dashboard/stats` | GET | None detected | Dashboard KPIs, time series, alerts |

### Documents
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/documents/upload` | POST | None detected | Upload knowledge base document |

### Domains
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/domains/suggest` | POST | None detected | AI domain suggestions for workspace |

### Enrichment
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/enrichment/costs` | GET | None detected | View enrichment cost data (DailyCostTotal) |
| `/api/enrichment/run` | POST | None detected | Queue enrichment job |

### Extension (Chrome)
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/extension/auth` | POST, OPTIONS | Invite token | Authenticate extension via sender invite token, returns JWT |
| `/api/extension/login` | POST, OPTIONS | Extension JWT | Extension login flow |
| `/api/extension/select-sender` | POST, OPTIONS | Extension JWT | Select active sender for extension |
| `/api/extension/senders` | GET, OPTIONS | Extension JWT | List senders for extension |
| `/api/extension/senders/[id]/cookies` | POST, OPTIONS | Extension JWT | Upload LinkedIn cookies from extension |
| `/api/extension/senders/[id]/expiry` | POST, OPTIONS | Extension JWT | Report session expiry from extension |
| `/api/extension/status` | GET, OPTIONS | Extension JWT | Extension connection status |

### Invoicing
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/invoice-settings` | GET, PUT | None detected | Invoice sender settings (from address, bank details) |
| `/api/invoices` | GET, POST | None detected | List/create invoices |
| `/api/invoices/[id]` | GET, PATCH, DELETE | None detected | Get/update/delete invoice |
| `/api/invoices/[id]/pdf` | GET | Token-based or direct | Generate invoice PDF (react-pdf) |
| `/api/invoices/[id]/send` | POST | None detected | Send invoice email to client |

### LinkedIn (Worker API)
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/linkedin/actions` | GET | WORKER_API_SECRET | List actions for worker |
| `/api/linkedin/actions/next` | GET | WORKER_API_SECRET | Get next action to execute |
| `/api/linkedin/actions/[id]/complete` | POST | WORKER_API_SECRET | Mark action complete |
| `/api/linkedin/actions/[id]/fail` | POST | WORKER_API_SECRET | Mark action failed |
| `/api/linkedin/connections/check` | POST | WORKER_API_SECRET | Check LinkedIn connection status |
| `/api/linkedin/connections/[id]/result` | POST | WORKER_API_SECRET | Report connection check result |
| `/api/linkedin/senders` | GET | WORKER_API_SECRET | List senders for worker |
| `/api/linkedin/senders/[id]/cookies` | GET | WORKER_API_SECRET | Get decrypted LinkedIn session cookies |
| `/api/linkedin/senders/[id]/credentials` | GET | WORKER_API_SECRET | Get decrypted LinkedIn credentials |
| `/api/linkedin/senders/[id]/health` | POST | WORKER_API_SECRET | Report sender health event from worker |
| `/api/linkedin/senders/[id]/login` | POST | WORKER_API_SECRET | Report login result from worker |
| `/api/linkedin/senders/[id]/session` | POST | WORKER_API_SECRET | Update session data from worker |
| `/api/linkedin/usage/[senderId]` | GET, POST | WORKER_API_SECRET | Get/update LinkedIn daily usage counters |

### LinkedIn Queue (Admin UI)
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/linkedin-queue` | GET | None detected | View LinkedIn action queue (admin dashboard) |

### Lists (Target Lists)
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/lists` | GET, POST | None detected | List/create target lists |
| `/api/lists/[id]` | GET, PATCH, DELETE | None detected | Get/update/delete target list |
| `/api/lists/[id]/export` | POST | None detected | Export list to EmailBison |
| `/api/lists/[id]/people` | GET, POST, DELETE | None detected | Manage people in target list |

### Notifications
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/notifications` | GET, PATCH | None detected | List notifications, mark as read |

### Onboarding
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/onboard` | POST | `x-api-key` (timing-safe) | Onboarding form submission |
| `/api/onboarding-invites` | GET, POST | None detected | List/create onboarding invites |
| `/api/onboarding-invites/[id]` | GET, PATCH, DELETE | None detected | Get/update/delete invite |

### People
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/people/enrich` | POST | `x-api-key` (CLAY_WEBHOOK_SECRET) | Clay webhook — person enrichment |
| `/api/people/import` | POST | None detected | Bulk import people from CSV |
| `/api/people/search` | GET | None detected | Search/filter people with pagination |
| `/api/people/sync` | POST | None detected | Sync people with EmailBison |
| `/api/people/[id]/timeline` | GET | None detected | Person activity timeline |

### Pipeline
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/pipeline/signal-campaigns/process` | POST | `x-pipeline-secret` (PIPELINE_INTERNAL_SECRET) | Process signal campaigns (Railway worker trigger) |

### Portal (Client-Facing)
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/portal/login` | POST | None (public) | Portal magic link request |
| `/api/portal/verify` | POST | None (public) | Verify magic link token |
| `/api/portal/logout` | POST | Portal session | Clear portal session |
| `/api/portal/campaigns` | GET | Portal session | List campaigns for workspace |
| `/api/portal/campaigns/[id]` | GET | Portal session | Get campaign detail |
| `/api/portal/campaigns/[id]/approve-content` | POST | Portal session | Approve campaign content |
| `/api/portal/campaigns/[id]/approve-leads` | POST | Portal session | Approve campaign leads |
| `/api/portal/campaigns/[id]/request-changes-content` | POST | Portal session | Request content changes |
| `/api/portal/campaigns/[id]/request-changes-leads` | POST | Portal session | Request lead changes |
| `/api/portal/invoices` | GET | Portal session | List invoices for workspace |

### Proposals
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/proposals` | GET, POST | None detected | List/create proposals |
| `/api/proposals/[id]` | GET, PATCH | None detected | Get/update proposal |
| `/api/proposals/[id]/accept` | POST | None (public, token-based) | Accept/sign proposal |

### Revenue
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/revenue` | GET | None detected | Revenue summary (KPIs, time series, client breakdown) |

### Senders (Admin)
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/senders` | GET, POST | None detected | List/create senders |
| `/api/senders/[id]` | GET, PATCH, DELETE | None detected | Get/update/delete sender |
| `/api/senders/[id]/health-history` | GET | None detected | Sender health event history |
| `/api/senders/[id]/reactivate` | POST | None detected | Reactivate paused/blocked sender |

### Signals
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/signals` | GET | None detected | List signal events |

### Stripe
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/stripe/checkout` | POST | None detected | Create Stripe checkout session |
| `/api/stripe/webhook` | POST | Stripe signature | Handle checkout.session.completed |

### Webhooks
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/webhooks/emailbison` | POST | HMAC-SHA256 signature + rate limit | EmailBison event handler (EMAIL_SENT, LEAD_REPLIED, LEAD_INTERESTED, BOUNCE, UNSUBSCRIBED, UNTRACKED_REPLY_RECEIVED) |
| `/api/webhook-log` | GET | None detected | View webhook event log |

### Workspaces
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/workspaces` | GET | None detected | List all workspaces with billing fields |
| `/api/workspaces/[slug]/package` | GET, PATCH | None detected | Workspace package configuration |
| `/api/workspaces/[slug]/signals` | GET, PATCH | None detected | Workspace signal monitoring config |
| `/api/workspace/[slug]/configure` | PATCH | None detected | Update workspace configuration |
| `/api/workspace/[slug]/provision-emailbison` | POST | None detected | Provision EmailBison API token |

---

## 2. Missing APIs

### Models with No or Partial CRUD Coverage

| Model | Has API? | Missing Operations |
|-------|----------|-------------------|
| `Person` | Partial | No GET by ID, no PUT/PATCH, no DELETE |
| `Company` | Partial | No GET by ID, no PUT/PATCH, no DELETE, only search + enrich |
| `PersonWorkspace` | None | No direct API (managed implicitly) |
| `DiscoveredPerson` | None | No API endpoints at all |
| `WebhookEvent` | Read-only | Only via `/api/webhook-log` GET, no management |
| `CachedMetrics` | None | No API endpoints |
| `InboxStatusSnapshot` | None | Written by cron, no read API |
| `WebsiteAnalysis` | None | No API endpoints (created by Research Agent internally) |
| `KnowledgeDocument` | Write-only | Upload only via `/api/documents/upload`, no list/get/delete |
| `KnowledgeChunk` | None | Internal only |
| `EmailDraft` | None | No API endpoints (managed by Writer Agent internally) |
| `EnrichmentLog` | None | No API endpoints (internal audit trail) |
| `EnrichmentJob` | Partial | Process via cron + run endpoint, no list/status API |
| `DailyCostTotal` | Read-only | Via `/api/enrichment/costs`, no management |
| `SignalEvent` | Read-only | Via `/api/signals` GET only |
| `SignalDailyCost` | None | No API endpoints |
| `SeenSignalUrl` | None | Internal dedup only |
| `TargetListPerson` | Implicit | Managed through `/api/lists/[id]/people` |
| `CampaignDeploy` | Read-only | Via `/api/campaigns/[id]/deploys`, no management |
| `SignalCampaignLead` | None | No API endpoints |
| `SenderHealthEvent` | Read-only | Via `/api/senders/[id]/health-history` |
| `LinkedInAction` | Partial | Worker-facing only, no admin management UI endpoints |
| `LinkedInDailyUsage` | Partial | Via `/api/linkedin/usage/[senderId]`, worker only |
| `LinkedInConnection` | Partial | Via worker endpoints only |
| `CampaignSequenceRule` | None | No API endpoints (managed by agent tools internally) |
| `MagicLinkToken` | None | Internal only (portal auth flow) |
| `InvoiceSequence` | None | Internal auto-increment tracking |
| `InvoiceLineItem` | Implicit | Nested in invoice CRUD |
| `ClientSubtask` | Partial | Via nested task endpoint only |

### Critical Missing Endpoints

1. **Person DELETE** (`/api/people/[id]`): No way to delete a person. GDPR compliance risk. People can only be bulk-imported or created via enrichment, but never removed through the API.
   - Files: `src/app/api/people/` directory
   - Impact: Cannot handle data deletion requests

2. **Company DELETE** (`/api/companies/[id]`): No company management API at all beyond search and Clay enrichment.
   - Files: `src/app/api/companies/` directory
   - Impact: Cannot clean up bad company data

3. **Person GET by ID** (`/api/people/[id]`): No single-person detail endpoint. The search endpoint returns paginated results but there is no direct lookup.
   - Files: `src/app/api/people/` directory
   - Impact: UI must use search to find individual records

4. **Knowledge Document Management**: Upload exists but no list, get, update, or delete endpoints.
   - Files: `src/app/api/documents/upload/route.ts`
   - Impact: Cannot manage knowledge base through UI (only CLI ingestion)

5. **DiscoveredPerson Management**: Discovery pipeline creates these records but no API exists to list, review, promote, or reject them.
   - Files: Model defined in `prisma/schema.prisma` (lines 179-218)
   - Impact: Discovery pipeline output cannot be managed through admin UI

6. **EnrichmentJob Status**: No endpoint to list pending/running jobs or check job progress.
   - Files: `src/app/api/enrichment/` directory
   - Impact: Admin cannot monitor enrichment queue status

7. **Workspace CRUD**: No POST (create), DELETE, or full PUT for workspaces. Only configure/patch endpoints exist.
   - Files: `src/app/api/workspace/` and `src/app/api/workspaces/` directories
   - Impact: Workspace creation only through onboarding flow or agent tools

8. **Signal Campaign Leads**: No endpoint to view which leads were added to a signal campaign or their ICP scores.
   - Files: Model `SignalCampaignLead` in `prisma/schema.prisma` (lines 641-662)
   - Impact: Cannot audit signal pipeline lead selection

9. **CampaignSequenceRule CRUD**: No API to manage LinkedIn sequence rules attached to campaigns.
   - Files: Model in `prisma/schema.prisma` (lines 822-843)
   - Impact: Rules can only be managed through agent tools, not admin UI

10. **WebsiteAnalysis**: Research Agent creates these but no API to list or retrieve analysis results.
    - Files: Model in `prisma/schema.prisma` (lines 332-344)
    - Impact: Website analysis only visible through agent chat responses

---

## 3. Dead/Broken Endpoints

### Deprecated Route (Should Be Deleted)

**`/api/cron/session-refresh`** (`src/app/api/cron/session-refresh/route.ts`)
- Status: Deprecated per inline comment (lines 1-3)
- The route comment reads: "Deprecated: session-refresh logic has been merged into /api/inbox-health/check. This standalone route is kept temporarily for backward compatibility and can be deleted once the Vercel cron schedule is confirmed removed."
- The route is NOT in `vercel.json` cron config, confirming it can be safely deleted.
- Risk: Low (not called by anything), but clutters codebase.

### Data Mismatch: BOUNCE vs BOUNCED

**Dashboard stats endpoint** (`src/app/api/dashboard/stats/route.ts`, line 179) filters for `"BOUNCED"`:
```typescript
eventType: {
  in: ["EMAIL_SENT", "EMAIL_OPENED", "LEAD_REPLIED", "LEAD_INTERESTED", "BOUNCED"],
},
```

**Webhook handler** (`src/app/api/webhooks/emailbison/route.ts`, line 365) stores events as `"BOUNCE"`:
```typescript
if (eventType === "BOUNCE" && leadEmail) {
```

The webhook stores the event type as received from EmailBison. If EmailBison sends `"BOUNCE"` (which the handler checks for), the dashboard filtering for `"BOUNCED"` will miss all bounce events in time series charts.

Additionally, the KPI section (line 276) also uses `"BOUNCED"`:
```typescript
emailBounced: emailMap["BOUNCED"] ?? 0,
```

**Impact:** Bounce counts on the dashboard will always show 0. Time series bounce line will be flat.
**Fix:** Determine which string EmailBison actually sends. If it sends `"BOUNCE"`, change dashboard filters from `"BOUNCED"` to `"BOUNCE"`. Or normalize the event type in the webhook handler before storing.

### Inconsistent Route Prefixes

Two workspace route groups exist with different path patterns:
- `/api/workspace/[slug]/configure` — singular "workspace"
- `/api/workspace/[slug]/provision-emailbison` — singular "workspace"
- `/api/workspaces/[slug]/package` — plural "workspaces"
- `/api/workspaces/[slug]/signals` — plural "workspaces"
- `/api/workspaces` (list) — plural "workspaces"

Files:
- `src/app/api/workspace/[slug]/configure/route.ts`
- `src/app/api/workspace/[slug]/provision-emailbison/route.ts`
- `src/app/api/workspaces/[slug]/package/route.ts`
- `src/app/api/workspaces/[slug]/signals/route.ts`
- `src/app/api/workspaces/route.ts`

**Impact:** Confusing for frontend developers. Should consolidate under one prefix.

---

## 4. API Consistency

### Auth Mechanisms (9 Different Approaches)

| Mechanism | Routes | Implementation |
|-----------|--------|----------------|
| Admin session cookie | Most admin UI endpoints (but NOT enforced on many!) | `src/lib/admin-auth.ts` |
| CRON_SECRET (Bearer header) | `/api/inbox-health/check`, `/api/linkedin/maintenance`, `/api/enrichment/jobs/process` | `src/lib/cron-auth.ts` — `validateCronSecret()` |
| CLAY_WEBHOOK_SECRET (x-api-key) | `/api/people/enrich`, `/api/companies/enrich` | Direct header check |
| WORKER_API_SECRET | All `/api/linkedin/*` worker endpoints | `src/lib/linkedin/auth.ts` — `verifyWorkerAuth()` |
| PIPELINE_INTERNAL_SECRET | `/api/pipeline/signal-campaigns/process` | `x-pipeline-secret` header, timing-safe |
| Extension JWT | All `/api/extension/*` endpoints | `src/lib/extension-auth.ts` — `createExtensionToken()` / verify |
| Portal magic link session | All `/api/portal/*` endpoints | `src/lib/portal-session.ts` — `getPortalSession()` |
| Stripe webhook signature | `/api/stripe/webhook` | Stripe SDK `constructEvent()` |
| HMAC-SHA256 | `/api/webhooks/emailbison` | Custom HMAC verify with timing-safe comparison |
| **None** | Many admin endpoints (dashboard, campaigns, clients, invoices, etc.) | **No auth at all in route handler** |

**Critical Issue:** Many admin-facing endpoints have NO authentication in the route handler itself. If middleware is misconfigured, all data is publicly accessible:
- `/api/dashboard/stats` — exposes all KPIs
- `/api/campaigns` — full CRUD
- `/api/clients` — full CRUD
- `/api/invoices` — full CRUD, financial data
- `/api/revenue` — revenue metrics
- `/api/people/search` — PII data
- `/api/senders` — full CRUD
- `/api/notifications` — read/update
- `/api/webhook-log` — audit data
- `/api/linkedin-queue` — operational data
- `/api/signals` — signal events
- `/api/enrichment/costs` — cost data
- `/api/enrichment/run` — can trigger enrichment

These endpoints are likely protected by Next.js middleware (checking admin session cookie for admin paths), but the route handlers themselves perform no auth validation. If middleware is bypassed or misconfigured, all data is exposed.

### Response Format Inconsistencies

**Pattern A — Wrapped object (most common):**
```typescript
NextResponse.json({ people, total, page, pageSize, filterOptions });
NextResponse.json({ invoices });
NextResponse.json({ workspaces });
```

**Pattern B — Direct data:**
```typescript
NextResponse.json(response); // DashboardStatsResponse directly
```

**Pattern C — Mixed success/error shapes:**
```typescript
// Success
NextResponse.json({ received: true });
NextResponse.json({ ok: true });
NextResponse.json({ message: "No stale sessions found", count: 0 });

// Errors
NextResponse.json({ error: "Not found" }, { status: 404 });
NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
```

**Pattern D — Raw Response (invoice PDF):**
```typescript
return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf" } });
```

**Inconsistency summary:**
- Success responses use different wrapper shapes across endpoints
- Error responses are consistent (`{ error: string }`) which is good
- No standard envelope format (no `{ data, error, meta }` pattern)

### Error Handling Patterns

Most endpoints follow the same pattern (good consistency):
```typescript
try {
  // ... logic
} catch (err) {
  console.error("[ROUTE] Error:", err);
  return NextResponse.json({ error: "Human message" }, { status: 500 });
}
```

However, error detail varies:
- Some expose `error.message`: `error instanceof Error ? error.message : "Check failed"` (at `src/app/api/inbox-health/check/route.ts` line 193)
- Some use generic messages: `"Failed to fetch revenue data"` (at `src/app/api/revenue/route.ts`)
- Some include extra context: `{ error, detail }` shape (at `src/app/api/pipeline/signal-campaigns/process/route.ts` line 76)

---

## 5. Database Schema vs API Gaps

### Schema Complexity vs API Surface

The schema has **40 models** (`prisma/schema.prisma`, 1036 lines). The API covers approximately **22 models** directly, leaving 18 models with no or internal-only access.

### Key Gap Analysis

**High-Value Models Without Proper APIs:**

| Model | Records | Direct API | Gap Impact |
|-------|---------|-----------|------------|
| `DiscoveredPerson` | Growing | None | Cannot manage discovery pipeline output |
| `EmailDraft` | Growing | None | Cannot review drafts outside agent chat |
| `CampaignSequenceRule` | Static | None | Cannot manage LinkedIn sequence rules |
| `WebsiteAnalysis` | Growing | None | Cannot retrieve past analyses |
| `KnowledgeDocument` | 46+ | Upload only | Cannot manage knowledge base |
| `SignalCampaignLead` | Growing | None | Cannot audit signal lead selection |

**Soft References (No FK Constraints):**
- `Person.companyDomain` <> `Company.domain`: Soft link, no FK. Orphan companies possible.
- `DiscoveredPerson.personId`: Soft reference to Person, no FK constraint.
- `SignalCampaignLead.signalEventId`: Soft reference to SignalEvent, no FK constraint.
- `SignalEvent.companyDomain`: Soft link to Company, no FK constraint.

These soft references are intentional (documented in schema comments) but mean referential integrity depends entirely on application logic.

---

## 6. Webhook Handling

### EmailBison Webhook (`src/app/api/webhooks/emailbison/route.ts`)

**Events handled:** EMAIL_SENT, LEAD_REPLIED, LEAD_INTERESTED, UNTRACKED_REPLY_RECEIVED, BOUNCE, UNSUBSCRIBED

**Security:**
- HMAC-SHA256 signature verification using `EMAILBISON_WEBHOOK_SECRET`
- Timing-safe comparison via `crypto.timingSafeEqual`
- Rate limiting: 60 requests/minute/IP via `src/lib/rate-limit.ts`
- Gracefully degrades if secret not configured (logs warning, accepts all requests)

**Processing flow per event type:**
1. All events: stored in `WebhookEvent` table (audit trail)
2. EMAIL_SENT: updates Person/PersonWorkspace status to "contacted", triggers LinkedIn sequence rules via `src/lib/linkedin/sequencing.ts`
3. LEAD_REPLIED / LEAD_INTERESTED: updates status, triggers P1 LinkedIn connection request (fast-track) via `src/lib/linkedin/queue.ts`, generates AI reply suggestion via Writer Agent, sends Slack/email notifications
4. BOUNCE: marks person as "bounced", in-app notification
5. UNSUBSCRIBED: marks person as "unsubscribed", in-app notification
6. Reply events: filters out mailer-daemon, postmaster, OOO auto-replies before notifying

**Missing:**
- **No idempotency check**: If EmailBison retries a webhook (e.g., on timeout), the same event will be stored twice in `WebhookEvent` and all side effects (status updates, LinkedIn actions, notifications) will fire again. The `WebhookEvent` model has no unique constraint on external event ID.
- **No webhook delivery confirmation**: No response body validation or retry acknowledgment protocol.

### Stripe Webhook (`src/app/api/stripe/webhook/route.ts`)

**Events handled:** `checkout.session.completed` only

**Security:** Stripe SDK signature verification via `constructEvent()`

**Processing:** Updates proposal to "paid", sends onboarding email to client, in-app notification.

**Missing:**
- Only handles one event type. May want `payment_intent.payment_failed` or `customer.subscription.deleted` in future.

### Clay Webhooks (`src/app/api/people/enrich/route.ts`, `src/app/api/companies/enrich/route.ts`)

**Security:** `x-api-key` header checked against `CLAY_WEBHOOK_SECRET`

**Note:** Per project memory: "not yet enforced on Vercel" — meaning the secret may not be set in production, allowing unauthenticated enrichment.

---

## 7. Cron Jobs / Workers

### Vercel Cron Schedule (`vercel.json`)

All three jobs run at **06:00 UTC daily** (before UK business hours):

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/enrichment/jobs/process` | `0 6 * * *` | Process enrichment job queue |
| `/api/inbox-health/check` | `0 6 * * *` | Master health/maintenance cron |
| `/api/linkedin/maintenance` | `0 6 * * *` | LinkedIn sender maintenance |

### Master Cron Overload (`/api/inbox-health/check`)

File: `src/app/api/inbox-health/check/route.ts`

This single endpoint runs **7+ sequential tasks**:
1. `checkAllWorkspaces()` — inbox health monitoring via EmailBison API
2. `notifyInboxDisconnect()` — notifications for disconnected inboxes
3. `runSenderHealthCheck()` — LinkedIn sender bounce/health analysis
4. `notifySenderHealth()` / `sendSenderHealthDigest()` — health notifications
5. `refreshStaleSessions()` — flag expired LinkedIn sessions
6. `generateDueInvoices()` — auto-generate invoices near renewal dates
7. `markAndNotifyOverdueInvoices()` — mark overdue, send reminders
8. `alertUnpaidBeforeRenewal()` — alert for unpaid invoices before renewal

**Risk:** If any task throws an unhandled error (despite try/catch), subsequent tasks don't run. Total execution time may exceed Vercel's function timeout (default 10s, Pro 60s). Invoice generation + notification emails could push past limits.

**Recommendation:** Split into separate cron jobs or use a job queue pattern:
- Health checks: `/api/cron/health`
- Invoice processing: `/api/cron/invoices`
- Session maintenance: `/api/cron/sessions`

### LinkedIn Maintenance (`/api/linkedin/maintenance`)

File: `src/app/api/linkedin/maintenance/route.ts`

Runs 4 tasks per active sender:
1. `progressWarmup()` — advance warm-up day and rate limits
2. `updateAcceptanceRate()` — recalculate connection acceptance rate

Per-sender errors are caught individually (good fault isolation).

Plus 2 global tasks:
3. `recoverStuckActions()` — reset actions stuck in "running" status
4. `expireStaleActions()` — expire pending actions older than 14 days

### Enrichment Processor (`/api/enrichment/jobs/process`)

File: `src/app/api/enrichment/jobs/process/route.ts`

- Processes one chunk per invocation (chunk size configurable, default 50)
- Uses circuit breaker pattern (`src/lib/enrichment/waterfall.ts`) to pause on provider failures
- Supports both GET and POST methods (for manual trigger and cron)
- Jobs have `resumeAt` field for daily-cap-based pausing

### External Workers (Railway)

**Signal Worker:** Calls `/api/pipeline/signal-campaigns/process` after each signal polling cycle
- Auth: `x-pipeline-secret` header (PIPELINE_INTERNAL_SECRET)
- Runs PredictLeads + Serper polling, then triggers campaign processing

**LinkedIn Worker:** Calls `/api/linkedin/actions/next`, `/api/linkedin/actions/[id]/complete`, `/api/linkedin/actions/[id]/fail`
- Auth: `WORKER_API_SECRET` header
- Polls for pending actions and executes them against LinkedIn

---

## 8. Email/Notification Flow

### Notification Dual System

**System 1: `notify()` — In-App + Ops Slack**
- File: `src/lib/notify.ts`
- Writes to `Notification` DB model (visible in admin dashboard)
- Posts to `OPS_SLACK_CHANNEL_ID` (admin ops channel)
- Types: "onboard", "provisioning", "agent", "system", "error", "approval", "proposal"
- Severities: "info", "warning", "error" (with emoji mapping)

**System 2: `notifyReply()` / `notifyApproval()` / `notifyInboxDisconnect()` / `notifySenderHealth()` — Client-Facing Notifications**
- File: `src/lib/notifications.ts` (large file, 75KB+)
- Sends emails via Resend (`src/lib/resend.ts`)
- Posts to workspace-specific Slack channels (client channels)
- `notifyReply()`: Sends reply notifications with AI-suggested response to client Slack + email
- `notifyApproval()`: Sends campaign approval/rejection notifications to ops Slack
- `notifyInboxDisconnect()`: Sends inbox disconnection alerts
- `notifySenderHealth()`: Sends sender health alerts (critical = immediate, warning = daily digest)
- `sendSenderHealthDigest()`: Daily digest of warning-level sender health events

### Email Sending

**Provider:** Resend (`src/lib/resend.ts`)
- Used for: notification emails, invoice sending, magic link emails, onboarding emails

### Notification Guard

- File: `src/lib/notification-guard.ts`
- `verifySlackChannel()`: Validates Slack channel ID before posting (prevents accidental posts to wrong channels)
- `verifyEmailRecipients()`: Validates email addresses before sending

### Reply Suggestion Generation

- Triggered by EmailBison webhook on LEAD_REPLIED / LEAD_INTERESTED events
- Uses Writer Agent (`src/lib/agents/writer.ts`) to generate reply suggestions
- Non-blocking: if generation fails, notification still fires without suggestion
- Suggestion included in Slack notification and email

---

## 9. Agent Framework

### Architecture

**Core engine:** `src/lib/agents/runner.ts`
- Wraps Vercel AI SDK `generateText()` with audit logging
- Creates `AgentRun` record before execution, updates on completion/failure
- Extracts tool call steps for audit trail
- Parses JSON from model response (looks for ```json blocks or raw JSON)
- Model provider: Anthropic Claude via `@ai-sdk/anthropic`

### Agent Roster (5 Agents)

| Agent | Model | File | Purpose |
|-------|-------|------|---------|
| **Orchestrator** | claude-sonnet-4-20250514 | `src/lib/agents/orchestrator.ts` | Central coordinator, delegates to specialists. 12 tools including 4 delegation + 8 dashboard tools |
| **Research** | (configured per-agent) | `src/lib/agents/research.ts` | Website analysis, ICP extraction, company intelligence via Firecrawl |
| **Writer** | (configured per-agent) | `src/lib/agents/writer.ts` | Email/LinkedIn copy generation with 4 strategies (creative-ideas, pvp, one-liner, custom) |
| **Leads** | (configured per-agent) | `src/lib/agents/leads.ts` | People search, target list management, ICP scoring, EmailBison export |
| **Campaign** | (configured per-agent) | `src/lib/agents/campaign.ts` | Campaign lifecycle (create, update, publish, deploy, signal campaign management) |

### Orchestrator Tools (12 total)

**Delegation tools (4):**
- `delegateToResearch` — website analysis + ICP extraction
- `delegateToLeads` — people search, list management, scoring, export
- `delegateToWriter` — email/LinkedIn copy with strategy selection
- `delegateToCampaign` — campaign lifecycle management

**Dashboard tools (8):**
- `listWorkspaces` — list all workspaces
- `getWorkspaceInfo` — full workspace details + quota usage
- `updateWorkspacePackage` — modify workspace package config
- `getCampaigns` — EmailBison campaign metrics
- `getReplies` — recent email replies
- `getSenderHealth` — sender email health stats
- `queryPeople` — database people query
- `listProposals` / `createProposal` — proposal management

**Shared tools:**
- `searchKnowledgeBase` — vector similarity search across knowledge documents

### Type System

File: `src/lib/agents/types.ts`

Well-defined input/output interfaces for each agent:
- `ResearchInput/Output` — structured company analysis with ICP indicators, value props, case studies
- `LeadsInput/Output` — action-oriented lead operations (search, create_list, add_to_list, score, export)
- `WriterInput/Output` — email/LinkedIn sequence generation with strategy support and signal context
- `CampaignInput/Output` — campaign lifecycle operations (create, list, get, update, publish, generate_content)
- `SignalContext` — signal-triggered copy context (signal type, domain, high-intent flag)
- `CreativeIdeaDraft` — creative ideas strategy output (position, title, groundedIn, subject, body)

### Agent Entry Point

File: `src/app/api/chat/route.ts`
- Powers the Cmd+J admin chat interface
- Passes user messages to orchestrator
- Orchestrator decides whether to handle directly or delegate

---

## 10. Third-Party Integrations

### EmailBison (White-labeled as Outsignal)
- **API base:** `https://app.outsignal.ai/api`
- **Client:** `src/lib/emailbison/client.ts`
- **Usage:** Campaign deployment, lead sync, sender management, inbox health monitoring
- **Auth:** Per-workspace API token stored in `Workspace.apiToken`
- **Webhook:** HMAC-SHA256 signed webhooks to `/api/webhooks/emailbison`

### Anthropic Claude (AI)
- **SDK:** `@ai-sdk/anthropic` via Vercel AI SDK
- **Models used:**
  - `claude-sonnet-4-20250514` — Orchestrator
  - `claude-opus-4-20250514` — Available for agents
  - `claude-haiku-4-5-20251001` — Available for agents
- **Usage:** All 5 agents (orchestrator, research, writer, leads, campaign)

### Stripe
- **SDK:** `stripe` npm package
- **Client:** `src/lib/stripe.ts` — `getStripeClient()`
- **Usage:** Proposal payment processing (checkout sessions)
- **Webhook:** Signature-verified webhook for `checkout.session.completed`
- **Env vars:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

### Resend (Email)
- **Client:** `src/lib/resend.ts` — `sendNotificationEmail()`
- **Usage:** Notification emails (replies, approvals, invoices, magic links, onboarding)
- **Env var:** `RESEND_API_KEY`

### Slack
- **Client:** `src/lib/slack.ts` — `postMessage()`
- **SDK:** `@slack/web-api`
- **Usage:** Ops notifications, client workspace notifications, health digests
- **Env vars:** `SLACK_BOT_TOKEN`, `OPS_SLACK_CHANNEL_ID`
- **Guard:** `src/lib/notification-guard.ts` prevents accidental cross-channel posts

### Firecrawl (Web Scraping)
- **Usage:** Website crawling for Research Agent, company homepage analysis for ICP scoring
- **Env var:** `FIRECRAWL_API_KEY`

### PredictLeads (Signal Data)
- **Usage:** Signal monitoring — job changes, funding, hiring spikes, tech adoption
- **Part of:** Railway signal worker
- **Env var:** `PREDICTLEADS_API_KEY`

### Serper (Social Listening)
- **Usage:** Signal monitoring — social mentions, news articles
- **Part of:** Railway signal worker
- **Env var:** `SERPER_API_KEY`

### Enrichment Providers (Waterfall Pattern)
- **Prospeo** — email finding
- **AiArk** — data enrichment
- **LeadMagic** — lead data
- **Findymail** — email verification
- **File:** `src/lib/enrichment/waterfall.ts`
- **Pattern:** Circuit breaker wraps provider calls; tries providers in sequence until data is found

### OpenAI (Embeddings)
- **Usage:** Knowledge base vector embeddings (text-embedding-3-small, 1536 dimensions)
- **Stored in:** `KnowledgeChunk.embedding` using pgvector

### React PDF
- **Package:** `@react-pdf/renderer`
- **Usage:** Invoice PDF generation at `src/app/api/invoices/[id]/pdf/route.ts`
- **Component:** `src/lib/invoices/pdf.ts`

---

## Summary: Top 15 Issues by Priority

### HIGH Priority

1. **BOUNCE vs BOUNCED mismatch** — Dashboard shows 0 bounces because webhook stores "BOUNCE" but dashboard filters for "BOUNCED"
   - Files: `src/app/api/dashboard/stats/route.ts` (lines 179, 276), `src/app/api/webhooks/emailbison/route.ts` (line 365)
   - Fix: Normalize event type in webhook handler OR change dashboard filter

2. **No auth on admin API routes** — 30+ admin endpoints have no authentication in the route handler itself. If middleware is misconfigured, all data is publicly accessible.
   - Files: All `src/app/api/campaigns/`, `src/app/api/clients/`, `src/app/api/invoices/`, `src/app/api/revenue/`, `src/app/api/senders/`, etc.
   - Fix: Add admin session validation to each route handler (defense in depth)

3. **No Person DELETE endpoint** — GDPR compliance risk, no way to delete personal data
   - Files: `src/app/api/people/` directory
   - Fix: Add DELETE endpoint with cascade through PersonWorkspace, TargetListPerson

4. **Master cron overload** — 7+ sequential tasks in single `/api/inbox-health/check` function
   - Files: `src/app/api/inbox-health/check/route.ts`
   - Fix: Split into separate cron endpoints or add individual try/catch per section (partially done)

5. **No webhook idempotency** — Duplicate EmailBison webhook deliveries cause duplicate side effects
   - Files: `src/app/api/webhooks/emailbison/route.ts`
   - Fix: Add dedup check using external event ID + `WebhookEvent` unique constraint

### MEDIUM Priority

6. **Deprecated route still present** — `/api/cron/session-refresh` marked deprecated but not deleted
   - Files: `src/app/api/cron/session-refresh/route.ts`
   - Fix: Delete the file

7. **Inconsistent workspace route prefixes** — Mix of `/api/workspace/` (singular) and `/api/workspaces/` (plural)
   - Files: `src/app/api/workspace/` and `src/app/api/workspaces/` directories
   - Fix: Consolidate under `/api/workspaces/` (plural) with redirects

8. **No DiscoveredPerson API** — Discovery pipeline output has no management interface
   - Files: Model in `prisma/schema.prisma` (lines 179-218)
   - Fix: Add CRUD endpoints under `/api/discovered-people/`

9. **Knowledge base management gap** — Can upload but cannot list, get, update, or delete documents
   - Files: `src/app/api/documents/upload/route.ts`
   - Fix: Add `/api/documents` GET, `/api/documents/[id]` GET/DELETE

10. **Clay webhook auth possibly unenforced** — CLAY_WEBHOOK_SECRET may not be set in production
    - Files: `src/app/api/people/enrich/route.ts`, `src/app/api/companies/enrich/route.ts`
    - Fix: Verify env var is set on Vercel, add enforcement logging

### LOW Priority

11. **No EnrichmentJob status API** — Cannot monitor enrichment queue from admin UI
    - Files: `src/app/api/enrichment/` directory
    - Fix: Add `/api/enrichment/jobs` GET endpoint

12. **No Company management API** — Only search and Clay enrichment exist
    - Files: `src/app/api/companies/` directory
    - Fix: Add `/api/companies/[domain]` GET, PATCH, DELETE

13. **Response format inconsistency** — Different wrapper shapes across endpoints
    - Files: All route files
    - Fix: Adopt standard envelope `{ data, error?, meta? }` pattern

14. **Soft references without cleanup** — Orphaned records possible when referenced entities are deleted
    - Files: `prisma/schema.prisma` (Person.companyDomain, DiscoveredPerson.personId, SignalCampaignLead.signalEventId)
    - Fix: Add periodic cleanup job or cascade logic

15. **EmailBison webhook graceful degradation concern** — If `EMAILBISON_WEBHOOK_SECRET` is not configured, all webhook requests are accepted without signature verification
    - Files: `src/app/api/webhooks/emailbison/route.ts` (lines 27-32)
    - Fix: Make signature verification mandatory (reject if secret not configured)

---

*API & Functionality Audit: 2026-03-05*
