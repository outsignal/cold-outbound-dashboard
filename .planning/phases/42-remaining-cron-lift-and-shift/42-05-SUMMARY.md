---
phase: 42-remaining-cron-lift-and-shift
plan: "05"
started: 2026-03-12
completed: 2026-03-12
status: complete
---

# Plan 42-05 Summary: Deploy + Verify + Disable cron-job.org

## What was done
Deployed all Phase 42 tasks to Trigger.dev Cloud (version 20260312.11, 15 tasks total). Consolidated 4 scheduled tasks into existing ones to stay within the free tier's 10-schedule limit. Removed inbox-health Vercel cron entry. Disabled 7 cron-job.org jobs via API.

## Schedule consolidation (free tier: 10 max)
| Merged Task | Into | Reason |
|-------------|------|--------|
| inbox-sender-health | inbox-check | Both run daily 6am UTC |
| bounce-snapshots | domain-health | Snapshots at 8am, domain-health includes 8am run |
| inbox-linkedin-maintenance | generate-insights | Both run every 6h |
| enrichment-job-processor | (deleted — kept as Vercel cron) | Already works on Vercel, no timeout issue |

## cron-job.org jobs disabled
| Job ID | Name | Status |
|--------|------|--------|
| 7364417 | Deliverability Digest (Monday 8am UTC) | disabled |
| 7364172 | Bounce Monitor (4h) | disabled |
| 7363960 | Bounce Snapshots | disabled |
| 7363961 | Domain Health | disabled |
| 7350269 | Reply Poll | disabled |
| 7364510 | Sender Sync (Daily 5am UTC) | disabled |
| 7337090 | Inbox Checker | disabled |

**Remaining active:** Only Postmaster Stats Sync (7368027) — not part of v6.0 migration scope.

## Production schedules (10/10)
| Task | Schedule |
|------|----------|
| bounce-monitor | 0 */4 * * * |
| inbox-check (+ sender health) | 0 6 * * * |
| domain-health (+ bounce snapshots) | 0 8,20 * * * |
| deliverability-digest | 0 8 * * 1 |
| poll-replies | */10 * * * * |
| invoice-processor | 0 7 * * * |
| sync-senders | 0 5 * * * |
| generate-insights (+ LinkedIn maintenance) | 0 */6 * * * |
| snapshot-metrics | 0 0 * * * |
| retry-classification | */30 * * * * |

## Key files
### Modified
- `vercel.json` — removed inbox-health cron entry
- `trigger/inbox-check.ts` — merged sender health logic
- `trigger/domain-health.ts` — merged bounce snapshots logic
- `trigger/generate-insights.ts` — merged LinkedIn maintenance logic

### Deleted
- `trigger/inbox-sender-health.ts`
- `trigger/bounce-snapshots.ts`
- `trigger/inbox-linkedin-maintenance.ts`
- `trigger/enrichment-job-processor.ts`

## Deviations
- **Schedule limit hit (10/10 free tier)** — consolidated 4 tasks into existing ones instead of upgrading to Hobby tier ($20/mo). Functionally identical, slightly less granular dashboard observability.
- Deleted enrichment-job-processor schedule via Trigger.dev API before redeploying.

## Self-Check: PASSED
- [x] 15 tasks deployed to Trigger.dev (version 20260312.11)
- [x] 10/10 production schedules active and correct
- [x] 7 cron-job.org jobs disabled via API
- [x] Vercel inbox-health cron removed
- [x] Only Postmaster Stats Sync remains active on cron-job.org
