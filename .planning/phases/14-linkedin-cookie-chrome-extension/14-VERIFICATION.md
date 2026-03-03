---
phase: 14-linkedin-cookie-chrome-extension
verified: 2026-03-03T12:30:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Load extension as unpacked in Chrome and complete full login -> connect flow"
    expected: "Login form accepts credentials, status view shows green checkmark after Connect LinkedIn clicked, LinkedIn cookies successfully saved to sender"
    why_human: "Chrome extension popup behavior and chrome.cookies.getAll require a live browser environment with a LinkedIn-authenticated session"
  - test: "Wait for 4-hour alarm or manually trigger cookie check in service worker console"
    expected: "When li_at is absent from LinkedIn cookies, red '!' badge appears on extension icon and browser notification fires"
    why_human: "chrome.alarms behavior and chrome.notifications require live Chrome extension runtime to observe"
  - test: "Verify EXTENSION_TOKEN_SECRET env var is set on Vercel before live use"
    expected: "Extension login endpoint returns 200 with tokens; without the var it throws 500"
    why_human: "Env var presence on Vercel cannot be verified from codebase scan"
---

# Phase 14: LinkedIn Cookie Chrome Extension Verification Report

**Phase Goal:** Ship a lightweight Chrome extension that lets clients (and admins) connect their LinkedIn account to Outsignal with one click — no DevTools required. Extension reads li_at + JSESSIONID cookies from linkedin.com, POSTs them to the sender session API, and confirms success. Includes auto-detection of cookie expiry (periodic check) with a badge notification prompting re-auth. Pairs with Phase 12's LinkedIn sender management page.
**Verified:** 2026-03-03T12:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All truths derived from phase plan must_haves across plans 01, 02, and 03.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Extension login endpoint accepts email + workspaceSlug + password, validates credentials, returns workspace token + sender list (and sender token if single sender) | VERIFIED | `src/app/api/extension/login/route.ts` — validates via `validateAdminPassword()`, queries workspace + senders, returns `workspaceToken`, `senders`, and conditionally `senderToken + selectedSenderId` for single-sender workspaces |
| 2 | Extension select-sender endpoint converts workspace token to sender-scoped token | VERIFIED | `src/app/api/extension/select-sender/route.ts` — reads Bearer workspace token, verifies sender belongs to workspace, calls `createExtensionToken(workspaceSlug, senderId)`, returns `{ senderToken }` |
| 3 | Extension cookie save endpoint accepts cookies array with Bearer token auth, encrypts and stores on Sender.sessionData, sets sessionStatus to active and loginMethod to extension | VERIFIED | `src/app/api/extension/senders/[id]/cookies/route.ts` — verifies `session.senderId === id`, calls `encrypt(JSON.stringify(cookies))`, updates sender with `sessionData`, `sessionStatus: "active"`, `loginMethod: "extension"`, `healthStatus: "healthy"` |
| 4 | Extension expiry endpoint marks sender sessionStatus as expired and healthStatus as session_expired | VERIFIED | `src/app/api/extension/senders/[id]/expiry/route.ts` — uses `prisma.$transaction` to atomically update sender and create `SenderHealthEvent` with `status: "session_expired"` |
| 5 | Extension status endpoint validates token and returns sender connection status | VERIFIED | `src/app/api/extension/status/route.ts` — calls `getExtensionSession()`, rejects workspace-scoped tokens (senderId empty), fetches sender with `sessionStatus`, `healthStatus`, `lastActiveAt` |
| 6 | Extension senders endpoint returns senders for the token's workspace | VERIFIED | `src/app/api/extension/senders/route.ts` — queries `prisma.sender.findMany({ where: { workspaceSlug: session.workspaceSlug } })` with status fields |
| 7 | Extension popup shows login form (email, workspace slug, password) when not authenticated | VERIFIED | `extension/popup.html` — login-view with email/workspace/password inputs; `popup.js` DOMContentLoaded handler shows login view when no `apiToken` in storage |
| 8 | After login, popup shows sender picker if multiple senders, or auto-connects if single sender | VERIFIED | `popup.js` login handler — branches on `data.senderToken && data.selectedSenderId` (single sender: go to status view) vs `data.workspaceToken && data.senders.length > 0` (multiple senders: show sender-view with select dropdown) |
| 9 | Connect button reads all linkedin.com cookies via chrome.cookies.getAll and POSTs to extension API | VERIFIED | `popup.js` connectBtn handler — `chrome.cookies.getAll({ domain: '.linkedin.com' })`, maps to `{ name, value, domain }`, POSTs to `/api/extension/senders/${selectedSenderId}/cookies` with Bearer token |
| 10 | Successful connection shows green checkmark + "LinkedIn connected" status | VERIFIED | `popup.js` on success: `renderStatus({ sessionStatus: 'active', healthStatus: 'healthy', ... })` sets status-green circle with Unicode checkmark and "LinkedIn Connected" text; `showToast('LinkedIn connected successfully', 'success')` |
| 11 | Error/expired state shows red X + error message + "Reconnect" button | VERIFIED | `popup.js` `renderStatus()` — `sessionStatus === 'expired' || healthStatus === 'session_expired'` triggers `status-red` class, X icon (Unicode 2717), "Session Expired" text, button text "Reconnect LinkedIn" |
| 12 | Extension icon shows red badge when session is expired | VERIFIED | `extension/background.js` — on missing li_at: `chrome.action.setBadgeText({ text: '!' })` with `chrome.action.setBadgeBackgroundColor({ color: '#EF4444' })` |
| 13 | Service worker creates a periodic alarm (every 4 hours) to check LinkedIn cookie presence | VERIFIED | `extension/background.js` — `ensureAlarm()` creates alarm with `periodInMinutes: CHECK_INTERVAL_MINUTES` (240), called from both `onInstalled` and `onStartup` |
| 14 | One-click on notification opens extension popup for reconnection | VERIFIED | `background.js` `chrome.notifications.onClicked` handler — calls `chrome.action.openPopup().catch(...)` when notification ID is `'session-expired'` |

**Score:** 14/14 truths verified

---

### Required Artifacts

#### Plan 01 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/extension-auth.ts` | VERIFIED | 111 lines — exports `ExtensionSession` interface, `signExtensionToken`, `verifyExtensionToken`, `createExtensionToken`, `getExtensionSession`; HMAC-SHA256 with `timingSafeEqual`; 7-day TTL |
| `src/app/api/extension/login/route.ts` | VERIFIED | 123 lines — POST + OPTIONS handlers; validates admin password; workspace + sender DB queries; two-token response pattern |
| `src/app/api/extension/select-sender/route.ts` | VERIFIED | 71 lines — POST + OPTIONS; workspace-token validation; sender ownership check; returns sender-scoped token |
| `src/app/api/extension/status/route.ts` | VERIFIED | 68 lines — GET + OPTIONS; rejects workspace-scoped tokens; fetches sender status fields |
| `src/app/api/extension/senders/route.ts` | VERIFIED | 55 lines — GET + OPTIONS; returns all workspace senders with status fields |
| `src/app/api/extension/senders/[id]/cookies/route.ts` | VERIFIED | 96 lines — POST + OPTIONS; senderId cross-check; encrypt() + prisma update; sets loginMethod=extension and healthStatus=healthy |
| `src/app/api/extension/senders/[id]/expiry/route.ts` | VERIFIED | 79 lines — POST + OPTIONS; senderId cross-check; `prisma.$transaction` for atomic sender update + SenderHealthEvent creation |

#### Plan 02 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `extension/manifest.json` | VERIFIED | Valid Manifest V3; permissions: cookies/alarms/storage/notifications; host_permissions for *.linkedin.com and admin.outsignal.ai; background service_worker: background.js; action popup: popup.html |
| `extension/popup.html` | VERIFIED | 45 lines — three-view structure (login-view, sender-view, status-view); loads popup.css + popup.js; all required DOM elements present |
| `extension/popup.js` | VERIFIED | 376 lines — full flow: DOMContentLoaded init with token validation, login, sender selection, connect, logout, toast helper; uses chrome.cookies.getAll and chrome.storage.local; no external dependencies |
| `extension/popup.css` | VERIFIED | 216 lines — dark theme (#1a1a1a), #F0FF7A brand color on logo, primary buttons, focus states; status-green/status-red/status-gray circles; toast animations |
| `extension/icons/icon-16.png` | VERIFIED | Valid PNG 16x16 RGB |
| `extension/icons/icon-32.png` | VERIFIED | Valid PNG 32x32 RGB |
| `extension/icons/icon-48.png` | VERIFIED | Valid PNG 48x48 RGB |
| `extension/icons/icon-128.png` | VERIFIED | Valid PNG 128x128 RGB |

#### Plan 03 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `extension/background.js` | VERIFIED | 182 lines — Manifest V3 service worker; alarm setup on install + startup; 4-hour periodic check; li_at detection; badge + notification + API expiry call; message handler for check-cookies-now and clear-badge; no in-memory state |
| `extension/README.txt` | VERIFIED | Exists with dev loading, testing, and Chrome Web Store publication instructions |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `extension-auth.ts` | `admin-auth.ts` pattern | HMAC-SHA256 `createHmac`, `timingSafeEqual`, base64url encode | WIRED | Same pattern; uses `EXTENSION_TOKEN_SECRET` (separate from admin secret) |
| `cookies/route.ts` | `src/lib/crypto.ts` | `import { encrypt } from "@/lib/crypto"` | WIRED | `encrypt(JSON.stringify(cookies))` in save handler; `crypto.ts` exports `encrypt` at line 16 |
| `expiry/route.ts` | Phase 13 health system | `prisma.senderHealthEvent.create(...)` inside `prisma.$transaction` | WIRED | Creates `SenderHealthEvent` with `status: "session_expired"` for Phase 13 cron pickup |
| `popup.js` | `/api/extension/login` | `apiPost('/api/extension/login', { email, workspaceSlug, password })` | WIRED | Response handled: branches on senderToken vs workspaceToken |
| `popup.js` | `/api/extension/senders/[id]/cookies` | `apiPost('/api/extension/senders/' + selectedSenderId + '/cookies', { cookies: cookiePayload }, apiToken)` | WIRED | Response handled: renderStatus on success |
| `popup.js` | `/api/extension/status` | `apiGet('/api/extension/status', stored.apiToken)` | WIRED | Called on DOMContentLoaded; 401 triggers logout; ok triggers renderStatus |
| `background.js` | chrome.storage.local | `chrome.storage.local.get(['apiToken', 'selectedSenderId'])` | WIRED | Reads tokens set by popup.js login/select-sender flows |
| `background.js` | `/api/extension/senders/[id]/expiry` | `fetch(API_BASE + /api/extension/senders/${selectedSenderId}/expiry, ...)` | WIRED | Called when li_at absent; 401 handled; non-fatal on network error |
| `background.js` | `chrome.alarms` | `chrome.alarms.create(ALARM_NAME, { periodInMinutes: CHECK_INTERVAL_MINUTES })` + `chrome.alarms.onAlarm.addListener` | WIRED | Both `onInstalled` and `onStartup` call `ensureAlarm()` |

---

### Requirements Coverage

All three phase plans declare `requirements: []`. Phase 14 does not have formal requirement IDs in REQUIREMENTS.md (ROADMAP shows "Requirements: TBD"). No orphaned requirements found — REQUIREMENTS.md has no entries mapped to Phase 14.

| Traceability | Status |
|---|---|
| Phase 14 in REQUIREMENTS.md traceability table | Not present (TBD in ROADMAP) |
| Orphaned requirements for Phase 14 | None found |
| Phase goal satisfied by implementation | Yes — all goal clauses covered |

---

### Anti-Patterns Found

No anti-patterns found. Scanned all 10 phase 14 files for:
- TODO/FIXME/PLACEHOLDER comments — none found
- Stub return patterns (return null, return {}, return []) — only found in `verifyExtensionToken()` guard clauses (intentional, not stubs)
- Empty handlers — none found
- Console.log-only implementations — none found; all console.log calls are diagnostic logs alongside real logic

---

### Human Verification Required

#### 1. Full Extension Flow End-to-End

**Test:** Install extension as unpacked in Chrome (chrome://extensions, developer mode, Load Unpacked pointing to `extension/`). Click extension icon, enter workspace credentials, click "Connect LinkedIn" while logged into LinkedIn.
**Expected:** Green checkmark appears; GET /api/extension/status confirms sender sessionStatus=active, loginMethod=extension.
**Why human:** chrome.cookies.getAll requires actual browser with active LinkedIn session; extension popup rendering cannot be verified programmatically.

#### 2. Cookie Expiry Detection via Service Worker

**Test:** With extension installed and configured, manually clear LinkedIn cookies in browser settings or wait for li_at to expire. Observe extension icon within 4 hours (or trigger via `chrome.alarms.getAll()` in service worker DevTools and manually fire the alarm).
**Expected:** Red "!" badge appears on extension icon; browser notification "LinkedIn Session Expired" fires; Outsignal database shows sender healthStatus=session_expired and a SenderHealthEvent record.
**Why human:** chrome.alarms behavior and notification system require live Chrome runtime to observe.

#### 3. EXTENSION_TOKEN_SECRET Environment Variable

**Test:** Verify `EXTENSION_TOKEN_SECRET` is set in Vercel environment variables for the outsignal-agents project.
**Expected:** Extension login endpoint returns 200; without the var it throws 500 ("EXTENSION_TOKEN_SECRET is not set").
**Why human:** Vercel env var presence cannot be verified from codebase scan. The SUMMARY notes this as a required setup step.

---

### Gaps Summary

No gaps. All 14 observable truths are VERIFIED. All 16 artifacts exist and are substantive (non-stub). All 9 key links are confirmed wired by code inspection. TypeScript compiles cleanly (`npx tsc --noEmit` exits 0). All 6 documented commits (c4b0c89, f48f861, 98301ad, a2c2df3, f02fcd0, fc30226) confirmed in git log.

**Note on JSESSIONID:** The phase goal mentions "li_at + JSESSIONID cookies." The implementation captures all linkedin.com cookies via `chrome.cookies.getAll({ domain: '.linkedin.com' })` — JSESSIONID is included in the batch along with all other cookies. Only li_at is checked as the session health indicator (correct — JSESSIONID alone does not indicate active session). This is the correct approach.

**Note on requirements:** Phase 14 has no formal requirement IDs. The ROADMAP shows "Requirements: TBD" and all plan frontmatter has `requirements: []`. No REQUIREMENTS.md entries map to Phase 14. This is expected — the phase was added to the roadmap after the v1.1 requirements definition phase.

---

_Verified: 2026-03-03T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
