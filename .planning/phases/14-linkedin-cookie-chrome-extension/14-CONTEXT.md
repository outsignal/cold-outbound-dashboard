# Phase 14: LinkedIn Cookie Chrome Extension - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Chrome extension (Manifest V3) that lets admins and clients connect their LinkedIn account to Outsignal with one click. Reads LinkedIn cookies, POSTs them to the sender session API, and confirms success. Auto-detects cookie expiry with badge notification prompting re-auth. Published to Chrome Web Store.

</domain>

<decisions>
## Implementation Decisions

### Extension UX & Flow
- Minimal one-button popup: Outsignal logo, connection status indicator (green checkmark / red X), single "Connect LinkedIn" button
- Both admins and clients use the extension to connect their LinkedIn accounts
- Login flow with token: user logs in via extension popup (email + workspace slug or magic link), extension stores scoped API token in chrome.storage
- Success: green checkmark indicator + toast notification "LinkedIn connected"
- Error/expired: red X indicator + toast notification with error message
- One-click re-auth when expired: open popup, click "Reconnect"

### Cookie Capture & Session API
- Capture ALL LinkedIn cookies (not just li_at + JSESSIONID) — future-proofs against auth changes
- Use chrome.cookies API to read cookies from linkedin.com domain
- POST cookies to existing sender session endpoint (extend Phase 12 sender management API)
- Extension authenticates with scoped API token (Bearer header) generated during login flow
- Token stored securely in chrome.storage.local

### Expiry Detection & Re-auth
- Background alarm via chrome.alarms API: check cookie presence every 4 hours
- On expiry detected: extension icon gets red badge + browser notification "LinkedIn session expired — click to reconnect"
- Extension POSTs expiry event to Outsignal API → sender session marked as expired → Phase 13 health check picks it up immediately
- One-click re-auth: user clicks notification or opens popup, clicks "Reconnect", extension re-reads cookies and POSTs

### Distribution & Install
- Chrome Web Store publication (one-time $5 developer fee, 1-3 day review)
- Manifest V3 required (Chrome Web Store requirement for new submissions)
- Service worker background script with chrome.alarms for periodic checks
- Chrome only for now — Firefox support deferred to future enhancement
- Auto-updates via Chrome Web Store

### Claude's Discretion
- Exact popup layout/styling (keep it minimal, use Outsignal brand color #F0FF7A)
- Login flow implementation details (magic link vs email/password)
- Chrome Web Store listing copy and screenshots
- Extension icon design
- chrome.storage encryption approach for API token
- Manifest permissions scope

</decisions>

<specifics>
## Specific Ideas

- Sender session API already exists from Phase 12 sender management — extend, don't rebuild
- Phase 13 health check already detects session expiry — extension's API notification gives instant signal vs waiting for daily cron
- Extension should be lightweight — no heavy frameworks, vanilla JS or minimal bundler
- Popup should match Outsignal brand: #F0FF7A accent color, clean minimal design

</specifics>

<deferred>
## Deferred Ideas

- Firefox extension support — future enhancement using WebExtension API compatibility
- Auto-refresh cookies by visiting LinkedIn in background — risky, may not work, deferred

</deferred>

---

*Phase: 14-linkedin-cookie-chrome-extension*
*Context gathered: 2026-03-02*
