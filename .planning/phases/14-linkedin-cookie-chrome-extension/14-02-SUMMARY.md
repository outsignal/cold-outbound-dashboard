---
phase: 14-linkedin-cookie-chrome-extension
plan: 02
subsystem: chrome-extension
tags: [chrome-extension, manifest-v3, popup, vanilla-js, linkedin-cookies, dark-ui]

# Dependency graph
requires:
  - phase: 14-01
    provides: Extension API endpoints (login, select-sender, status, senders/[id]/cookies)

provides:
  - Manifest V3 Chrome extension with cookies/alarms/storage/notifications permissions
  - Popup UI: login view, sender picker view, status/connect view
  - Branded icon PNGs (16/32/48/128px) in Outsignal #F0FF7A color
  - chrome.cookies.getAll LinkedIn cookie capture
  - chrome.storage.local state persistence (apiToken, selectedSenderId, workspaceSlug)

affects:
  - 14-03 (service worker background.js — already implemented, manifest references it)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Vanilla JS popup (no framework, no build step) — Chrome extension MV3 pattern
    - Three-view show/hide pattern (login / sender-pick / status) via classList.add('hidden')
    - Toast notification via dynamic DOM element creation with setTimeout fade-out
    - Minimal PNG generation via pure Node.js (zlib.deflateSync + manual PNG chunks)

key-files:
  created:
    - extension/manifest.json
    - extension/popup.html
    - extension/popup.js
    - extension/popup.css
    - extension/icons/icon-16.png
    - extension/icons/icon-32.png
    - extension/icons/icon-48.png
    - extension/icons/icon-128.png
  modified: []

key-decisions:
  - "Icons generated via pure Node.js zlib/Buffer PNG construction — no image library dependency; solid #F0FF7A squares are valid PNGs for Chrome extension loading"
  - "Three-view popup managed by classList hide/show — no framework overhead for a 3-state UI"
  - "chrome.storage.local persists apiToken, selectedSenderId, workspaceSlug — popup re-checks /api/extension/status on every open to catch expired tokens"
  - "Token expiry detection: 401 from /status clears storage and redirects to login view automatically"
  - "connectBtn handler reads all .linkedin.com cookies via chrome.cookies.getAll and POSTs them to /api/extension/senders/[id]/cookies"

requirements-completed: []

# Metrics
duration: 58min
completed: 2026-03-03
---

# Phase 14 Plan 02: Chrome Extension Popup UI Summary

**Manifest V3 Chrome extension popup with dark-themed Outsignal-branded UI: login form, sender picker, LinkedIn cookie capture via chrome.cookies.getAll, and status display (connected / expired / not connected) — zero npm dependencies**

## Performance

- **Duration:** ~58 min
- **Started:** 2026-03-03T10:59:58Z
- **Completed:** 2026-03-03T11:58:34Z
- **Tasks:** 2
- **Files created:** 8

## Accomplishments

- `extension/manifest.json`: Manifest V3 with cookies/alarms/storage/notifications permissions, host_permissions for `*.linkedin.com` and `admin.outsignal.ai`, background service worker reference, popup action config
- Icon PNGs (16/32/48/128px) generated via pure Node.js PNG binary construction — valid, loadable, Outsignal brand color `#F0FF7A`
- `extension/popup.html`: Three-view layout (login / sender-picker / status) with DOM sections hidden/shown via CSS class
- `extension/popup.css`: Dark theme (#1a1a1a background, #F0FF7A accent), status circles (green/red/gray), primary button, text button, error, subtitle, toast styles
- `extension/popup.js`: Full flow implementation — DOMContentLoaded init with token validation, login form, sender selection, LinkedIn connect (chrome.cookies.getAll), logout, toast helper; all API calls to Plan 01 endpoints

## Task Commits

Each task was committed atomically:

1. **Task 1: Create extension manifest and icon placeholders** — `98301ad` (feat)
2. **Task 2: Build popup UI with login, sender selection, and connect flow** — `a2c2df3` (feat)

## Self-Check: PASSED

All 8 files confirmed present. Both task commits (98301ad, a2c2df3) confirmed in git log.

## Files Created/Modified

- `extension/manifest.json` — Manifest V3, permissions: cookies/alarms/storage/notifications, host_permissions: linkedin.com + admin.outsignal.ai
- `extension/popup.html` — Login view, sender-view, status-view; loads popup.css + popup.js
- `extension/popup.js` — Full popup logic: init, login, sender select, connect, logout, toast; uses chrome.cookies.getAll and chrome.storage.local
- `extension/popup.css` — Outsignal dark theme with #F0FF7A accent, status circles, toast animations
- `extension/icons/icon-{16,32,48,128}.png` — Valid PNG files with solid #F0FF7A fill, generated via pure Node.js

## Decisions Made

- **Icon generation via pure Node.js:** No image library available without npm install. Used Node.js `zlib.deflateSync` and manual CRC32 + PNG chunk construction to produce valid binary PNG files. No dependencies added.
- **Three-view show/hide pattern:** Simple classList toggle approach is appropriate for a 3-state popup with no dynamic routing needed.
- **Token validation on every popup open:** `DOMContentLoaded` always calls `GET /api/extension/status` if a token exists, ensuring stale tokens are caught immediately and user is redirected to login.
- **401 auto-logout:** When status endpoint returns 401, storage is cleared and login view is shown — no manual user action needed.

## Deviations from Plan

None — plan executed exactly as written. Note: `background.js` and `README.txt` were already present in the extension directory from Plan 03 which appears to have been executed out of sequence; these files were not modified.

## Issues Encountered

None.

## Verification Results

- `extension/` directory exists at project root
- `extension/manifest.json` is valid Manifest V3 with correct permissions
- `extension/popup.html` loads popup.css and popup.js
- `extension/popup.js` implements login, sender selection, and cookie capture flows
- `extension/popup.css` uses Outsignal brand color #F0FF7A (3 occurrences)
- No external dependencies — all vanilla JS/CSS
- `extension/icons/` has 4 valid PNG files
- Extension ready to load as unpacked extension in chrome://extensions (developer mode)

## Next Phase Readiness

- Plan 02 complete: popup UI implemented against all Plan 01 endpoints
- Plan 03 (service worker background.js) already committed — implements alarm-based cookie health checks
- Ready to load extension as unpacked and test end-to-end with a LinkedIn account

---
*Phase: 14-linkedin-cookie-chrome-extension*
*Completed: 2026-03-03*
