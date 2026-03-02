# Phase 14: LinkedIn Cookie Chrome Extension - Research

**Researched:** 2026-03-02
**Domain:** Chrome Extension (Manifest V3), LinkedIn cookie capture, REST API integration
**Confidence:** HIGH

## Summary

This phase delivers a Chrome extension (Manifest V3) that reads LinkedIn session cookies and POSTs them to the existing Outsignal sender session API. The extension domain is well-established with stable Chrome APIs (chrome.cookies, chrome.alarms, chrome.storage.local) and a clear Manifest V3 pattern. The existing codebase already has the critical server-side infrastructure: `POST /api/linkedin/senders/[id]/session` encrypts and stores cookies, `GET /api/linkedin/senders/[id]/cookies` decrypts and returns them for the worker. The extension needs a new auth mechanism (scoped API token, not the worker shared secret) and a new endpoint that lists senders for the authenticated user's workspace so the extension can target the right sender.

The architecture is straightforward: popup UI (HTML/CSS/JS, no framework) handles login + status display, service worker handles periodic cookie-health checks via chrome.alarms, and chrome.cookies.getAll reads all linkedin.com cookies. Chrome Web Store publication requires Manifest V3 (enforced since 2025), a one-time $5 developer fee, and 1-3 day review.

**Primary recommendation:** Build a minimal vanilla JS extension with zero dependencies. Reuse the existing session POST endpoint with a new extension-auth token system (HMAC-signed, scoped to workspace + sender). Keep the extension code in a new `extension/` directory at the project root, separate from the Next.js app.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Minimal one-button popup: Outsignal logo, connection status indicator (green checkmark / red X), single "Connect LinkedIn" button
- Both admins and clients use the extension to connect their LinkedIn accounts
- Login flow with token: user logs in via extension popup (email + workspace slug or magic link), extension stores scoped API token in chrome.storage
- Success: green checkmark indicator + toast notification "LinkedIn connected"
- Error/expired: red X indicator + toast notification with error message
- One-click re-auth when expired: open popup, click "Reconnect"
- Capture ALL LinkedIn cookies (not just li_at + JSESSIONID) — future-proofs against auth changes
- Use chrome.cookies API to read cookies from linkedin.com domain
- POST cookies to existing sender session endpoint (extend Phase 12 sender management API)
- Extension authenticates with scoped API token (Bearer header) generated during login flow
- Token stored securely in chrome.storage.local
- Background alarm via chrome.alarms API: check cookie presence every 4 hours
- On expiry detected: extension icon gets red badge + browser notification "LinkedIn session expired — click to reconnect"
- Extension POSTs expiry event to Outsignal API -> sender session marked as expired -> Phase 13 health check picks it up immediately
- One-click re-auth: user clicks notification or opens popup, clicks "Reconnect", extension re-reads cookies and POSTs
- Chrome Web Store publication (one-time $5 developer fee, 1-3 day review)
- Manifest V3 required (Chrome Web Store requirement for new submissions)
- Service worker background script with chrome.alarms for periodic checks
- Chrome only for now -- Firefox support deferred to future enhancement
- Auto-updates via Chrome Web Store

### Claude's Discretion
- Exact popup layout/styling (keep it minimal, use Outsignal brand color #F0FF7A)
- Login flow implementation details (magic link vs email/password)
- Chrome Web Store listing copy and screenshots
- Extension icon design
- chrome.storage encryption approach for API token
- Manifest permissions scope

### Deferred Ideas (OUT OF SCOPE)
- Firefox extension support -- future enhancement using WebExtension API compatibility
- Auto-refresh cookies by visiting LinkedIn in background -- risky, may not work, deferred
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Chrome Extension Manifest V3 | v3 | Extension framework | Required by Chrome Web Store since 2025; replaces MV2 |
| chrome.cookies API | Built-in | Read LinkedIn cookies | Native Chrome API, promise-based in MV3 |
| chrome.alarms API | Built-in | Periodic cookie health checks | MV3 replacement for setInterval in service workers |
| chrome.storage.local | Built-in | Store API token + state | Persistent storage surviving service worker termination |
| chrome.notifications | Built-in | Badge + notification on expiry | Native OS notification support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vanilla JS (no framework) | ES2022+ | Popup + service worker logic | Extension is small; React/Svelte is overkill |
| None (no bundler) | - | MV3 service workers don't need bundling | Single-file service worker, single-file popup script |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vanilla JS | React + Vite | Adds complexity, build step, and 100KB+ bundle for a 200-line popup |
| No bundler | Webpack/Vite | Only needed if importing node_modules; this extension has zero npm deps |
| chrome.storage.local | chrome.storage.session | session clears on browser close; local persists (needed for token) |

**Installation:** No npm packages needed for the extension itself. Server-side changes use the existing Next.js project dependencies.

## Architecture Patterns

### Recommended Project Structure
```
extension/                    # Separate from Next.js app
  manifest.json              # MV3 manifest
  background.js              # Service worker (alarms, cookie checks)
  popup.html                 # Popup UI
  popup.js                   # Popup logic (login, connect, status)
  popup.css                  # Popup styles (Outsignal brand)
  icons/
    icon-16.png
    icon-32.png
    icon-48.png
    icon-128.png
```

### Pattern 1: Manifest V3 Service Worker with chrome.alarms
**What:** Service worker registers a periodic alarm for cookie health checks. Service workers terminate when idle; alarms wake them up.
**When to use:** Any periodic background task in MV3.
**Example:**
```javascript
// background.js — service worker
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('check-cookies', { periodInMinutes: 240 }); // every 4 hours
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'check-cookies') {
    const cookies = await chrome.cookies.getAll({ domain: '.linkedin.com' });
    const liAt = cookies.find(c => c.name === 'li_at');
    if (!liAt) {
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
      chrome.notifications.create('session-expired', {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'LinkedIn Session Expired',
        message: 'Click to reconnect your LinkedIn account in Outsignal'
      });
      // POST expiry event to Outsignal API
    }
  }
});
```

### Pattern 2: chrome.cookies.getAll for LinkedIn Domain
**What:** Read all cookies from linkedin.com domain at once.
**When to use:** Cookie capture on connect button click and periodic health checks.
**Example:**
```javascript
// Requires: permissions: ["cookies"], host_permissions: ["*://*.linkedin.com/*"]
const cookies = await chrome.cookies.getAll({ domain: '.linkedin.com' });
// Returns array: [{ name: 'li_at', value: '...', ... }, { name: 'JSESSIONID', value: '...', ... }, ...]
```

### Pattern 3: Extension Auth via Scoped API Token
**What:** Extension login generates a signed token (HMAC-SHA256) scoped to workspace + sender. Stored in chrome.storage.local.
**When to use:** Extension authenticating to Outsignal API.
**Example:**
```javascript
// Server generates on login:
// token = base64url(JSON.stringify({ ws, senderId, exp })) + "." + hmac(payload, secret)
// Extension stores:
await chrome.storage.local.set({ apiToken: token, senderId: senderId });
// Extension uses on API calls:
const { apiToken } = await chrome.storage.local.get('apiToken');
fetch(apiUrl, { headers: { Authorization: `Bearer ${apiToken}` } });
```

### Anti-Patterns to Avoid
- **Importing node_modules in extension:** Service workers cannot use Node.js modules. Everything must be browser-native.
- **Using setTimeout/setInterval:** These don't survive service worker termination. Always use chrome.alarms.
- **Storing sensitive data in chrome.storage.sync:** Sync storage is backed up to Google account. Use chrome.storage.local for tokens.
- **Requesting broad host_permissions:** Only request `*://*.linkedin.com/*` and the Outsignal API domain. Broad permissions trigger Chrome Web Store review delays.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Periodic background tasks | Custom keepalive/heartbeat | chrome.alarms API | Service workers terminate; alarms are the official pattern |
| Cookie reading | Content script cookie injection | chrome.cookies.getAll() | API is purpose-built, handles httpOnly cookies |
| Persistent storage | localStorage in popup | chrome.storage.local | localStorage doesn't survive popup close; storage.local persists |
| OS notifications | Custom popup overlays | chrome.notifications API | Native OS integration, works when popup is closed |

**Key insight:** Chrome provides purpose-built APIs for every extension need. The entire extension can be built with zero external dependencies using only Chrome extension APIs.

## Common Pitfalls

### Pitfall 1: Service Worker Termination
**What goes wrong:** Service worker terminates after 30 seconds of inactivity, losing in-memory state.
**Why it happens:** MV3 service workers are non-persistent by design.
**How to avoid:** Never store state in memory variables. Always use chrome.storage.local for state and chrome.alarms for scheduling.
**Warning signs:** Extension "forgets" login state after browser sits idle.

### Pitfall 2: Alarm Not Created After Chrome Restart
**What goes wrong:** Alarms don't persist across Chrome restarts.
**Why it happens:** Chrome clears alarms on shutdown.
**How to avoid:** Always check for existing alarm in chrome.runtime.onStartup and re-create if missing.
**Warning signs:** Cookie health checks stop after user restarts Chrome.

### Pitfall 3: Host Permission Scope for Cookies
**What goes wrong:** chrome.cookies.getAll returns empty array.
**Why it happens:** Missing or incorrect host_permissions for linkedin.com.
**How to avoid:** Manifest must include `"host_permissions": ["*://*.linkedin.com/*"]`. The `*://*.linkedin.com/*` pattern covers all subdomains and paths.
**Warning signs:** Empty cookie array despite being logged into LinkedIn.

### Pitfall 4: Chrome Web Store Review Rejection for Cookie Access
**What goes wrong:** Extension rejected during Chrome Web Store review.
**Why it happens:** Cookie + host permission requests get extra scrutiny. Reviewers want clear justification.
**How to avoid:** Include a detailed "Single Purpose" description in manifest and Chrome Web Store listing. Clearly explain: "This extension connects your LinkedIn account to Outsignal for automated outreach management."
**Warning signs:** Review takes >3 days or asks for justification.

### Pitfall 5: CORS on API Calls from Extension
**What goes wrong:** Fetch from extension to Outsignal API blocked by CORS.
**Why it happens:** Extension popups and service workers have a `chrome-extension://` origin, not the API's allowed origins.
**How to avoid:** Extension service workers bypass CORS (they're not subject to same-origin policy). Popup fetch calls work if the API domain is in host_permissions or permissions includes the URL pattern. Alternatively, route all API calls through the service worker via chrome.runtime.sendMessage.
**Warning signs:** Network errors in popup console on API calls.

### Pitfall 6: Sender ID Selection
**What goes wrong:** Extension doesn't know which sender to POST cookies for.
**Why it happens:** A workspace may have multiple senders; extension needs to target the right one.
**How to avoid:** During login, API returns the list of senders for the workspace. Extension shows sender picker if >1, auto-selects if only 1.
**Warning signs:** Cookies uploaded to wrong sender.

## Code Examples

### Manifest V3 Configuration
```json
{
  "manifest_version": 3,
  "name": "Outsignal LinkedIn Connector",
  "version": "1.0.0",
  "description": "Connect your LinkedIn account to Outsignal with one click",
  "permissions": [
    "cookies",
    "alarms",
    "storage",
    "notifications"
  ],
  "host_permissions": [
    "*://*.linkedin.com/*",
    "https://admin.outsignal.ai/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

### Extension Login Flow
```javascript
// popup.js — login handler
async function login(email, workspaceSlug) {
  const res = await fetch('https://admin.outsignal.ai/api/extension/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, workspaceSlug })
  });

  if (!res.ok) throw new Error('Login failed');

  const { token, senders } = await res.json();
  await chrome.storage.local.set({ apiToken: token, senders });

  // If one sender, auto-select. If multiple, show picker.
  if (senders.length === 1) {
    await chrome.storage.local.set({ selectedSenderId: senders[0].id });
  }
}
```

### Cookie Capture and POST
```javascript
// popup.js — connect handler
async function connectLinkedIn() {
  const cookies = await chrome.cookies.getAll({ domain: '.linkedin.com' });

  if (!cookies.length) {
    showError('Please log into LinkedIn first');
    return;
  }

  const { apiToken, selectedSenderId } = await chrome.storage.local.get(['apiToken', 'selectedSenderId']);

  const res = await fetch(`https://admin.outsignal.ai/api/extension/senders/${selectedSenderId}/cookies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`
    },
    body: JSON.stringify({ cookies: cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })) })
  });

  if (res.ok) {
    showSuccess('LinkedIn connected');
    chrome.action.setBadgeText({ text: '' });
  } else {
    showError('Failed to connect');
  }
}
```

### Expiry Notification to API
```javascript
// background.js — notify server of expiry
async function notifyExpiry() {
  const { apiToken, selectedSenderId } = await chrome.storage.local.get(['apiToken', 'selectedSenderId']);
  if (!apiToken || !selectedSenderId) return;

  await fetch(`https://admin.outsignal.ai/api/extension/senders/${selectedSenderId}/expiry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`
    }
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manifest V2 background pages | Manifest V3 service workers | 2023 (enforced 2025) | Background scripts must use service worker pattern |
| Persistent background page | Event-driven + chrome.alarms | 2023 | No persistent in-memory state |
| chrome.browserAction / chrome.pageAction | chrome.action (unified) | MV3 | Single API for toolbar button |
| Callback-based APIs | Promise-based APIs | MV3 | Modern async/await patterns |

**Deprecated/outdated:**
- Manifest V2: No longer accepted on Chrome Web Store (2025+)
- chrome.browserAction: Replaced by chrome.action in MV3
- Background pages: Replaced by service workers in MV3

## Existing Codebase Integration Points

### Server-Side Endpoints (Already Exist)
| Endpoint | Method | Auth | Purpose | Status |
|----------|--------|------|---------|--------|
| `/api/linkedin/senders/[id]/session` | POST | Worker (Bearer) | Save encrypted cookies | Exists — needs extension auth variant |
| `/api/linkedin/senders/[id]/session` | GET | None | Get session status | Exists |
| `/api/linkedin/senders/[id]/cookies` | GET | Worker (Bearer) | Get decrypted cookies | Exists — worker only |
| `/api/senders` | GET | None | List senders | Exists — needs workspace filter for extension |
| `/api/senders/[id]` | PATCH | None | Update sender | Exists |

### New Endpoints Needed
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/extension/login` | POST | Email + workspace slug | Generate scoped extension token |
| `/api/extension/senders/[id]/cookies` | POST | Extension token (Bearer) | Save cookies (wraps existing encrypt + store logic) |
| `/api/extension/senders/[id]/expiry` | POST | Extension token (Bearer) | Mark session as expired |
| `/api/extension/senders` | GET | Extension token (Bearer) | List senders for token's workspace |
| `/api/extension/status` | GET | Extension token (Bearer) | Token validation + sender status |

### Key Files to Modify
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add ExtensionToken model (token, workspaceSlug, senderId, expiresAt) |
| `src/lib/crypto.ts` | Reuse existing encrypt/decrypt for cookie storage |
| `src/lib/extension-auth.ts` | New: token generation + verification |

### Sender Model (Relevant Fields)
- `sessionData` (String?) — AES-256-GCM encrypted JSON of cookies
- `sessionStatus` (String) — "not_setup" | "active" | "expired"
- `healthStatus` (String) — "healthy" | "warning" | "paused" | "blocked" | "session_expired"
- `loginMethod` (String) — should be set to "extension" when cookies come from extension
- `lastActiveAt` (DateTime?) — updated on cookie save

## Open Questions

1. **Extension Token Storage Model**
   - What we know: Need a way to generate and validate scoped tokens for the extension
   - What's unclear: Whether to use a DB-backed token (ExtensionToken table) or stateless HMAC-signed tokens (like admin session)
   - Recommendation: Use HMAC-signed stateless tokens (same pattern as admin-auth.ts). Simpler, no DB migration needed. Token encodes { workspaceSlug, senderId, exp }. Only downside: can't revoke individual tokens (but 7-day expiry is acceptable).

2. **Extension Login Method**
   - What we know: CONTEXT.md says "email + workspace slug or magic link"
   - What's unclear: Whether to implement magic link (requires email sending) or just admin password
   - Recommendation: Start with admin password for simplicity (reuses existing validateAdminPassword). Add workspace slug selection from a dropdown. Magic link is a future enhancement.

3. **Multiple Senders Per Workspace**
   - What we know: A workspace can have multiple LinkedIn senders
   - What's unclear: UX for sender selection in a minimal popup
   - Recommendation: After login, show a dropdown of senders for the workspace. Auto-select if only one. Store selected sender in chrome.storage.local.

## Sources

### Primary (HIGH confidence)
- [Chrome Cookies API](https://developer.chrome.com/docs/extensions/reference/api/cookies) — API reference for chrome.cookies
- [Chrome Alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms) — Periodic task scheduling
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3) — MV3 requirements and changes
- [Chrome Extension Permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) — Permission declaration patterns
- [Chrome Web Store Review Process](https://developer.chrome.com/docs/webstore/review-process) — Publication requirements

### Secondary (MEDIUM confidence)
- [Chrome Web Store Publishing Guide 2026](https://www.righttail.co/blog/how-to-publish-chrome-extension-2026-guide) — Step-by-step publishing
- [Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) — Termination and wakeup patterns

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Chrome extension APIs are stable, well-documented, and unchanged in recent years
- Architecture: HIGH — MV3 patterns are well-established; existing codebase has all server-side infrastructure
- Pitfalls: HIGH — Well-documented MV3 migration pitfalls with clear solutions

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (30 days — Chrome extension APIs are stable)
