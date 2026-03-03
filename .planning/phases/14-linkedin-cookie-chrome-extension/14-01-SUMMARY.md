---
phase: 14-linkedin-cookie-chrome-extension
plan: 01
subsystem: auth
tags: [hmac, chrome-extension, bearer-token, linkedin, session-management, cors, nextjs-api]

# Dependency graph
requires:
  - phase: 11-linkedin-voyager-api
    provides: Sender model with sessionData, sessionStatus, healthStatus, loginMethod fields
  - phase: 13-smart-sender-health
    provides: SenderHealthEvent model for session_expired events

provides:
  - HMAC-SHA256 stateless extension tokens (7-day expiry, workspace+sender scoped)
  - POST /api/extension/login — authenticate with admin password, return workspace token + senders
  - POST /api/extension/select-sender — convert workspace token to sender-scoped token
  - GET /api/extension/status — poll sender connection status with Bearer auth
  - GET /api/extension/senders — list workspace senders with Bearer auth
  - POST /api/extension/senders/[id]/cookies — save AES-256-GCM encrypted LinkedIn cookies
  - POST /api/extension/senders/[id]/expiry — report session expiry, create SenderHealthEvent

affects:
  - 14-02 (Chrome extension background/popup — will consume all these endpoints)
  - phase-13 (expiry endpoint feeds into health check system)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - HMAC-SHA256 Bearer token auth for extension (mirrors admin-auth.ts cookie pattern, repurposed as Bearer)
    - CORS headers on all extension endpoints (OPTIONS preflight + response headers)
    - senderId="" sentinel for workspace-scoped tokens before sender selection
    - Atomic prisma.$transaction for expiry (sender update + SenderHealthEvent creation)

key-files:
  created:
    - src/lib/extension-auth.ts
    - src/app/api/extension/login/route.ts
    - src/app/api/extension/select-sender/route.ts
    - src/app/api/extension/status/route.ts
    - src/app/api/extension/senders/route.ts
    - src/app/api/extension/senders/[id]/cookies/route.ts
    - src/app/api/extension/senders/[id]/expiry/route.ts
  modified: []

key-decisions:
  - "Extension login endpoint validates admin password — extension users are treated as admins, no separate extension password"
  - "Two-token flow: workspace-scoped token (senderId='') from login, then sender-scoped token from select-sender — single-sender workspaces skip select-sender step"
  - "CORS headers on all extension endpoints with Access-Control-Allow-Origin: * — Chrome extension service workers bypass CORS but popup fetch may need it"
  - "Cookie save sets healthStatus=healthy on reconnect — clears any prior session_expired flag automatically"
  - "expiry endpoint uses prisma.$transaction — ensures sender status update and SenderHealthEvent creation are always atomic"
  - "li_at warning returned in response but cookies still saved — non-fatal, all captured cookies stored"

patterns-established:
  - "Extension Bearer token: payload.signature (base64url JSON + HMAC-SHA256 signature) — same string format as admin cookie but carried in Authorization header"
  - "senderId check in cookie/expiry endpoints: session.senderId !== id returns 403 — prevents cross-sender token reuse"

requirements-completed: []

# Metrics
duration: 85min
completed: 2026-03-03
---

# Phase 14 Plan 01: Extension Auth & API Surface Summary

**HMAC-SHA256 Bearer token auth system for Chrome extension with 7 API endpoints: login, sender selection, status polling, cookie save (AES-256-GCM encrypted), and session expiry reporting to Phase 13 health event system**

## Performance

- **Duration:** ~85 min
- **Started:** 2026-03-03T09:04:44Z
- **Completed:** 2026-03-03T10:29:00Z
- **Tasks:** 2
- **Files modified:** 7 created

## Accomplishments

- Extension auth library (`src/lib/extension-auth.ts`) with HMAC-SHA256 stateless tokens scoped to workspace + sender, 7-day expiry, Bearer header extraction, and timing-safe signature verification
- Full extension API surface (7 routes) with two-token authentication flow: workspace token from login, sender-scoped token from select-sender
- Cookie save endpoint encrypts with existing AES-256-GCM `encrypt()` from `crypto.ts`, sets loginMethod=extension, clears any prior session_expired health flag
- Expiry endpoint creates `SenderHealthEvent` atomically with `prisma.$transaction` for Phase 13 health check pickup
- All endpoints include CORS headers (`Access-Control-Allow-Origin: *`) with OPTIONS preflight handlers
- TypeScript compiles cleanly (`npx tsc --noEmit` passes)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create extension auth library** - `c4b0c89` (feat)
2. **Task 2: Create extension API endpoints** - `f48f861` (feat)

**Plan metadata:** pending (docs commit follows)

## Self-Check: PASSED

All 7 files confirmed present. Both task commits (c4b0c89, f48f861) confirmed in git log.

## Files Created/Modified

- `src/lib/extension-auth.ts` — ExtensionSession interface + signExtensionToken, verifyExtensionToken, createExtensionToken, getExtensionSession exports
- `src/app/api/extension/login/route.ts` — Admin password validation, workspace token + senders; auto-selects single sender
- `src/app/api/extension/select-sender/route.ts` — Converts workspace token to sender-scoped token
- `src/app/api/extension/status/route.ts` — Returns sender sessionStatus + healthStatus + lastActiveAt
- `src/app/api/extension/senders/route.ts` — Lists workspace senders with token auth
- `src/app/api/extension/senders/[id]/cookies/route.ts` — Saves AES-256-GCM encrypted LinkedIn cookies, sets loginMethod=extension
- `src/app/api/extension/senders/[id]/expiry/route.ts` — Reports session expiry, atomic SenderHealthEvent creation

## Decisions Made

- **Extension login uses admin password:** Extension users are trusted admins/operators; no separate extension credential needed at this stage.
- **Two-token flow (workspace then sender):** Allows multi-sender workspaces to show a sender picker in the extension popup before committing to a sender. Single-sender workspaces skip this step automatically.
- **senderId="" sentinel:** Workspace-scoped token uses empty string senderId rather than a separate token type. Simple and avoids a second session interface.
- **CORS: Allow-Origin *:** Extension popup fetch may trigger CORS depending on browser version. Service worker context bypasses it, but having headers is correct and harmless.
- **Cookie save clears healthStatus:** When extension reconnects (saves new cookies), `healthStatus` is reset to `healthy` inline — avoids a stale `session_expired` state after the user re-authenticates.
- **Atomic expiry transaction:** Sender update + SenderHealthEvent must both succeed or neither; `prisma.$transaction` ensures this.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

New environment variable required before extension can authenticate:

- `EXTENSION_TOKEN_SECRET` — random secret string (e.g. `openssl rand -hex 32`) used to sign extension tokens

Add to Vercel environment variables and local `.env` file.

## Next Phase Readiness

- Extension API surface is complete and type-safe
- Phase 14 Plan 02 (Chrome extension popup + background script) can now be implemented against these endpoints
- `EXTENSION_TOKEN_SECRET` env var must be added to Vercel before live testing

---
*Phase: 14-linkedin-cookie-chrome-extension*
*Completed: 2026-03-03*
