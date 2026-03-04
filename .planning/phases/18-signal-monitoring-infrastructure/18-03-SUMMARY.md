---
phase: 18-signal-monitoring-infrastructure
plan: 03
subsystem: worker
tags: [predictleads, signals, zod, prisma, upsert, ttl, high-intent, stacking]

requires:
  - 18-01 (SignalEvent Prisma model, @@unique([source, externalId]) constraint)
  - 18-02 (predictLeadsGet HTTP client, Zod schemas for all signal types)
provides:
  - fetchJobOpenings() adapter — job change signals + totalJobCount for hiring spike detection
  - fetchFinancingEvents() adapter — funding round signals with amount/type/investor metadata
  - fetchNewsEvents() adapter — company news signals with title, summary, sourceUrl
  - fetchTechnologyDetections() adapter — tech adoption signals with "Adopted/Detected {tech}" title
  - writeSignalEvents() — upserts SignalInput[] to DB with 90-day TTL, triggers high-intent check
  - checkAndFlagHighIntent() — detects 2+ distinct signal types in 30-day window, sets isHighIntent flag
  - expireOldSignals() — marks signals with expiresAt < now as "expired" (run at cycle start)
  - disconnectPrisma() — clean Prisma pool close before process.exit
affects:
  - 18-04 (cycle orchestration imports all adapters and signals.ts functions)

tech-stack:
  added: []
  patterns:
    - "Zod safeParse with per-record skip on invalid items (warn, don't throw)"
    - "404 from PredictLeads = no-cost empty return (company not found)"
    - "Prisma upsert on source_externalId composite key for dedup across cycles"
    - "null externalId = always create (social mentions have no stable ID)"
    - "90-day expiresAt set on every write, extended on re-detection"
    - "Multi-signal stacking: Set of distinct signalType values, isHighIntent if size >= 2"

key-files:
  created:
    - worker-signals/src/types.ts
    - worker-signals/src/predictleads/job-openings.ts
    - worker-signals/src/predictleads/financing.ts
    - worker-signals/src/predictleads/news.ts
    - worker-signals/src/predictleads/technology.ts
    - worker-signals/src/signals.ts
  modified: []

key-decisions:
  - "SignalInput interface defined in worker-signals/src/types.ts (not inlined in adapters) — shared type used by all 4 adapters and signals.ts"
  - "404 handling: PredictLeads 404 (company not found) returns empty signals with costUsd=0 — no budget charge for unknown domains"
  - "Hiring spike threshold (>10 job openings) handled by caller via totalJobCount, not a separate API call — avoids extra PredictLeads cost"
  - "checkAndFlagHighIntent sets isHighIntent=false when distinctTypes < 2 — clears stale flags when signals expire"
  - "upsert updates expiresAt on re-detection — extends signal lifetime, prevents premature expiry of active signals"
  - "technology.ts uses is_new field to choose 'Adopted' vs 'Detected' verb in signal title"

requirements-completed: [SIG-01, SIG-02, SIG-03, SIG-04, SIG-05, SIG-10]

duration: 3min
completed: 2026-03-04
---

# Phase 18 Plan 03: PredictLeads Signal Adapters + DB Write Logic Summary

**Five PredictLeads adapters (job changes, funding, news, tech adoption) and a signals.ts module with Prisma upsert, 90-day TTL cleanup, and multi-signal high-intent stacking detection**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-04T20:18:58Z
- **Completed:** 2026-03-04T20:21:57Z
- **Tasks:** 2
- **Files modified:** 6 created (0 modified)

## Accomplishments

- Created 4 PredictLeads adapter files, each following the same pattern: import client + types, call API, Zod safeParse, convert to SignalInput, return `{ signals, costUsd, rawResponse }`
- job-openings.ts additionally returns `totalJobCount` for hiring spike detection by the caller (>10 threshold, derived from job volume, no extra API call)
- financing.ts builds human-readable title from funding type + amount + currency
- technology.ts chooses "Adopted" vs "Detected" based on `is_new` field
- news.ts passes through title, summary, and sourceUrl directly
- All adapters: 404 from PredictLeads returns `{ signals: [], costUsd: 0 }` — no budget charge for unknown domains
- All adapters: Zod safeParse used at batch level (warn + return empty on parse failure) and per-record (warn + skip invalid items)
- signals.ts: writeSignalEvents upserts by source+externalId composite key, creates for null externalId, sets 90-day expiresAt
- signals.ts: checkAndFlagHighIntent uses Set of distinct signalType values, flags all active signals for company when size >= 2
- signals.ts: expireOldSignals runs updateMany for expiresAt < now, returns count for logging
- signals.ts: disconnectPrisma wraps prisma.$disconnect() for clean Railway cron exit

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement 5 PredictLeads signal type adapter functions** - `7750508` (feat)
2. **Task 2: Implement SignalEvent write logic, high-intent stacking, and TTL cleanup** - `bae68a9` (feat)

## Files Created/Modified

- `worker-signals/src/types.ts` — Shared SignalInput interface used by all adapters and signals.ts
- `worker-signals/src/predictleads/job-openings.ts` — fetchJobOpenings() with totalJobCount
- `worker-signals/src/predictleads/financing.ts` — fetchFinancingEvents() with funding metadata
- `worker-signals/src/predictleads/news.ts` — fetchNewsEvents() with title/summary/sourceUrl
- `worker-signals/src/predictleads/technology.ts` — fetchTechnologyDetections() with Adopted/Detected title
- `worker-signals/src/signals.ts` — writeSignalEvents, checkAndFlagHighIntent, expireOldSignals, disconnectPrisma

## Decisions Made

- `SignalInput` defined in a shared `src/types.ts` (not in each adapter) — avoids circular deps, single source of truth
- 404 handling: PredictLeads 404 returns `costUsd: 0` — we don't pay for querying unknown domains
- `totalJobCount` returned from fetchJobOpenings so caller (cycle.ts in Plan 04) can decide hiring spike threshold without an extra API call
- `checkAndFlagHighIntent` sets `isHighIntent=false` when distinctTypes < 2 — actively clears stale flags when signals expire out of the 30-day window
- upsert extends `expiresAt` on re-detection — a signal seen again in a new cycle gets a fresh 90-day TTL
- TypeScript strict mode flag on `recentSignals.map` callback required explicit type annotation to satisfy the `noImplicitAny` rule

## Deviations from Plan

**1. [Rule 1 - Bug] TypeScript implicit any on findMany result map callback**
- **Found during:** Task 2 verification (tsc --noEmit)
- **Issue:** `recentSignals.map((s) => s.signalType)` — Prisma `findMany` with `select` returns a typed tuple in runtime but tsc strict mode flagged `s` as implicit any
- **Fix:** Added explicit type annotation `(s: { signalType: string })` on the map callback
- **Files modified:** `worker-signals/src/signals.ts`
- **Commit:** Included in bae68a9 (same task commit)

## Issues Encountered

None beyond the TypeScript strict mode annotation fix above.

## User Setup Required

None for this plan. PredictLeads credentials (`PREDICTLEADS_API_KEY`, `PREDICTLEADS_API_TOKEN`) were already documented in Plan 02 as Railway env var requirements.

## Next Phase Readiness

- Plan 04 (cycle orchestration) can import all adapters and signals.ts functions immediately
- `fetchJobOpenings` → totalJobCount > 10 → create hiring_spike SignalEvent in cycle.ts
- `expireOldSignals()` should be called at the start of each cycle before fetching new signals
- `disconnectPrisma()` must be called before `process.exit(0)` in index.ts

---
*Phase: 18-signal-monitoring-infrastructure*
*Completed: 2026-03-04*

## Self-Check: PASSED

All created files verified on disk. Both task commits (7750508, bae68a9) confirmed in git log.
