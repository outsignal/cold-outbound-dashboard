# Phase 30: Inbox Placement Testing - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

On-demand inbox placement testing for at-risk senders using mail-tester.com JSON API, with auto-send via EmailBison, result storage, and Slack alerting on bad scores. API-only (no dashboard UI — that's Phase 32). Covers PLACE-01 through PLACE-04. No auto-rotation logic (Phase 31), no dashboard rendering (Phase 32).

</domain>

<decisions>
## Implementation Decisions

### Test Trigger Flow
- API-only for now — no UI page. `POST /api/placement-tests` triggers a test. Phase 32 dashboard adds buttons later.
- "Recommended for testing" badge logic: simple >3% bounce rate threshold across 20+ sends (from Phase 29 BounceSnapshot data). No multi-signal complexity.
- Auto-send via EmailBison `POST /api/replies/new` endpoint — system sends the test email automatically to the mail-tester.com address using the sender's `sender_email_id`
- EmailBison send endpoint: `POST https://dedi.emailbison.com/api/replies/new` with `sender_email_id`, `to_emails`, `subject`, `message`, `content_type`, `use_dedicated_ips: true`
- Test email content: realistic campaign-style email (personalization tokens, CTA, signature) — mimics real outbound copy for accurate placement results

### mail-tester.com Integration
- $50 for 500 test credits (never expire) — user will purchase
- API key stored in `MAILTESTER_API_KEY` env var with graceful degradation if not set
- Result fetching: poll every 10s up to 60s until results appear (accounts for processing time)
- Respect Vercel 60s function timeout — if results aren't ready after polling, store a "pending" status and the admin can re-fetch

### Results Storage
- PlacementTest model with `score` as a separate Float field for easy querying/sorting
- Full mail-tester.com JSON response stored in a `details` JSON column for drill-down
- Results accessible via `GET /api/placement-tests?senderEmail=x` — returns test history as JSON
- Score thresholds: 7+ = good, 5-6 = warning, <5 = critical

### Alerting on Bad Results
- Slack notification on warning (<7) and critical (<5) scores only — good results (7+) don't notify
- Critical score (<5): auto-escalate sender health status to 'critical' and notify admin
- Warning score (5-6): set health status to 'warning' and notify admin
- Add `emailHealthStatus` field to SenderEmail model now (healthy/warning/critical) — Phase 31 expands with bounce-based escalation
- No auto-pause on critical — flag only, admin decides action. Auto-pause deferred to Phase 31.

### Claude's Discretion
- Exact test email template content (subject, body, signature style)
- mail-tester.com API endpoint details and response parsing
- PlacementTest model field names and exact schema
- Polling implementation (setTimeout vs setInterval pattern)
- Error handling for failed sends or API timeouts

</decisions>

<specifics>
## Specific Ideas

- EmailBison "Compose new email" endpoint discovered: `POST /api/replies/new` — accepts `sender_email_id`, `to_emails`, `subject`, `message`, `content_type`, `use_dedicated_ips`
- Use `use_dedicated_ips: true` on test emails to test from the same IP as real campaigns
- The `GET /api/placement-tests` endpoint will be consumed by Phase 32's deliverability dashboard for rendering timeline views

</specifics>

<deferred>
## Deferred Ideas

- Auto-pause sender via EmailBison API on critical placement score — Phase 31
- Dashboard UI for placement test results (timeline, trigger buttons) — Phase 32
- Scheduled/automated placement testing for flagged senders — future phase
- Integration with other placement testing services (GlockApps, etc.) — future phase

</deferred>

---

*Phase: 30-inbox-placement-testing*
*Context gathered: 2026-03-10*
