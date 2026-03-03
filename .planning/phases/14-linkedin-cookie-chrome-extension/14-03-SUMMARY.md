---
phase: 14-linkedin-cookie-chrome-extension
plan: 03
subsystem: chrome-extension
tags: [chrome-extension, service-worker, alarms, cookie-monitoring, notifications, linkedin, session-health]

# Dependency graph
requires:
  - phase: 14-linkedin-cookie-chrome-extension
    plan: 01
    provides: POST /api/extension/senders/[id]/expiry endpoint and extension auth tokens

provides:
  - extension/background.js — Manifest V3 service worker with 4-hour alarm-based LinkedIn cookie health checks
  - Automatic expiry detection: red badge + browser notification + API POST on li_at absence
  - Popup communication protocol: check-cookies-now and clear-badge message handlers

affects:
  - 14-02 (popup.js will use clear-badge message to background.js after successful connect)
  - phase-13 (expiry API call feeds SenderHealthEvent into Phase 13 health check system)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Manifest V3 service worker with chrome.alarms for periodic background work
    - ensureAlarm() idempotency guard — checks chrome.alarms.get before creating
    - All async ops wrapped in try/catch (service workers must not throw unhandled rejections)
    - No module-level state — all reads from chrome.storage.local (service worker can terminate)
    - Non-fatal API failure — badge + notification still work if fetch fails

key-files:
  created:
    - extension/background.js
    - extension/README.txt
  modified:
    - .gitignore

key-decisions:
  - "CHECK_INTERVAL_MINUTES constant (240) used in alarm creation — readable intent, easy to adjust"
  - "API expiry call is non-fatal — badge and notification fire regardless of network failure"
  - "chrome.action.openPopup() wrapped in .catch() — API exists in MV3 Chrome 99+ but may not work in all contexts"
  - "ensureAlarm() checks for existing alarm before creating — prevents duplicate alarms on reloads"

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 14 Plan 03: Extension Service Worker Summary

**Manifest V3 service worker with 4-hour chrome.alarms cookie health check cycle: detects missing li_at, triggers red badge + browser notification + atomic API POST to Phase 13 health system**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-03T11:54:12Z
- **Completed:** 2026-03-03T11:55:48Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- Extension service worker (`extension/background.js`) with alarm-based 4-hour cookie health monitoring
- `ensureAlarm()` called on both `onInstalled` and `onStartup` — ensures alarm persists across Chrome restarts
- Cookie health check reads all `.linkedin.com` cookies via `chrome.cookies.getAll`, looks for `li_at` as primary session indicator
- Missing `li_at` triggers three-channel alert: red "!" badge via `chrome.action.setBadgeText`, browser notification via `chrome.notifications.create`, and `POST /api/extension/senders/[id]/expiry` with Bearer token
- Notification click handler attempts `chrome.action.openPopup()` (MV3 Chrome 99+) for one-click reconnect
- Message handler allows popup to send `check-cookies-now` (immediate health check) and `clear-badge` (after successful reconnect)
- No module-level state — all reads from `chrome.storage.local` so service worker can safely terminate when idle
- All async operations wrapped in `try/catch` to prevent unhandled rejections (fatal in service workers)
- Developer and Chrome Web Store publication instructions in `extension/README.txt`
- `.gitignore` updated to exclude `extension/*.zip` build artifacts while tracking extension source

## Task Commits

Each task was committed atomically:

1. **Task 1: Build service worker** - `f02fcd0` (feat)
2. **Task 2: README and .gitignore** - `fc30226` (chore)

## Self-Check: PASSED

All files confirmed present and both commits verified in git log.

## Files Created/Modified

- `extension/background.js` — MV3 service worker: alarm setup, cookie health check, badge/notification, API expiry call, message handler
- `extension/README.txt` — Developer loading, testing, and Chrome Web Store publication instructions
- `.gitignore` — Added `extension/*.zip` entry

## Decisions Made

- **CHECK_INTERVAL_MINUTES constant:** 240 minutes passed by name to alarm creation rather than inline literal — readable intent, easy to adjust for testing.
- **Non-fatal API failure:** If the expiry `fetch()` fails (network down), badge and notification still fire. Logged to console for debugging.
- **openPopup wrapped in .catch():** API is available in MV3 Chrome 99+ but may not work in all contexts; graceful fallback (user sees badge, clicks extension icon).
- **ensureAlarm() idempotency guard:** Checks `chrome.alarms.get()` before creating — prevents duplicate alarms if `onInstalled` fires multiple times during development reloads.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- `extension/background.js` service worker is complete and ready for testing
- Plan 14-02 (popup UI) is the remaining extension piece — popup.js will communicate with background.js via the message protocol defined here (`clear-badge`, `check-cookies-now`)
- Extension can be loaded as unpacked in Chrome developer mode (chrome://extensions) once Plan 14-02 completes the popup and manifest

---
*Phase: 14-linkedin-cookie-chrome-extension*
*Completed: 2026-03-03*
