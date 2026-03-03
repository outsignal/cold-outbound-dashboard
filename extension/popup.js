// Outsignal LinkedIn Connector — Popup Script
// Vanilla JS, no framework, no build step required.

const API_BASE = 'https://admin.outsignal.ai';

// ---- DOM refs ----

const loginView = document.getElementById('login-view');
const statusView = document.getElementById('status-view');

const loginForm = document.getElementById('login-form');
const inviteTokenInput = document.getElementById('invite-token');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

const statusIndicator = document.getElementById('status-indicator');
const statusIcon = document.getElementById('status-icon');
const statusText = document.getElementById('status-text');
const statusMeta = document.getElementById('status-meta');
const connectBtn = document.getElementById('connect-btn');
const logoutBtn = document.getElementById('logout-btn');

// ---- View management ----

function showView(view) {
  loginView.classList.add('hidden');
  statusView.classList.add('hidden');
  view.classList.remove('hidden');
}

// ---- Toast helper ----

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ---- Error helpers ----

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.classList.remove('hidden');
}

function clearLoginError() {
  loginError.textContent = '';
  loginError.classList.add('hidden');
}

// ---- Status view rendering ----

function renderStatus(sender) {
  const sessionStatus = sender.sessionStatus;
  const healthStatus = sender.healthStatus;

  statusIndicator.classList.remove('status-green', 'status-red', 'status-gray');

  if (sessionStatus === 'active' && healthStatus === 'healthy') {
    statusIndicator.classList.add('status-green');
    statusIcon.textContent = '\u2713'; // checkmark
    statusText.textContent = 'LinkedIn Connected';
    connectBtn.textContent = 'Reconnect LinkedIn';
    if (sender.lastActiveAt) {
      const when = new Date(sender.lastActiveAt).toLocaleString();
      statusMeta.textContent = 'Last active: ' + when;
    } else {
      statusMeta.textContent = '';
    }
  } else if (sessionStatus === 'expired' || healthStatus === 'session_expired') {
    statusIndicator.classList.add('status-red');
    statusIcon.textContent = '\u2717'; // ballot X
    statusText.textContent = 'Session Expired';
    statusMeta.textContent = 'Reconnect to restore access';
    connectBtn.textContent = 'Reconnect LinkedIn';
  } else {
    statusIndicator.classList.add('status-gray');
    statusIcon.textContent = '\u2014'; // em dash
    statusText.textContent = 'Not Connected';
    statusMeta.textContent = 'Connect your LinkedIn account below';
    connectBtn.textContent = 'Connect LinkedIn';
  }
}

// ---- API helpers ----

async function apiPost(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return res;
}

async function apiGet(path, token) {
  const headers = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, { headers });
  return res;
}

// ---- Initialization ----

document.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.local.get(['apiToken', 'selectedSenderId']);

  if (stored.apiToken && stored.selectedSenderId) {
    try {
      const res = await apiGet('/api/extension/status', stored.apiToken);

      if (res.status === 401) {
        await chrome.storage.local.remove(['apiToken', 'selectedSenderId', 'workspaceSlug']);
        showView(loginView);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        renderStatus(data.sender);
        showView(statusView);
        return;
      }

      // Other error — fall through to login
    } catch (err) {
      // Network error — still show status view so user can try connect
      renderStatus({ sessionStatus: 'unknown', healthStatus: 'unknown', lastActiveAt: null });
      showView(statusView);
      return;
    }
  }

  showView(loginView);
});

// ---- Connect form handler (invite token) ----

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearLoginError();

  const token = inviteTokenInput.value.trim();
  if (!token) {
    showLoginError('Please enter your invite token.');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Connecting...';

  try {
    const res = await apiPost('/api/extension/auth', { token });
    const data = await res.json();

    if (!res.ok) {
      showLoginError(data.error || 'Invalid token. Ask your admin for a new invite token.');
      return;
    }

    // Store sender-scoped token
    await chrome.storage.local.set({
      apiToken: data.senderToken,
      selectedSenderId: data.senderId,
      workspaceSlug: data.workspaceSlug,
    });

    // Render status from the auth response (avoids extra round-trip)
    renderStatus(data.sender || { sessionStatus: 'not_setup', healthStatus: 'healthy', lastActiveAt: null });
    showView(statusView);
  } catch (err) {
    showLoginError('Connection failed — check your internet connection.');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Connect';
  }
});

// ---- Connect LinkedIn button ----

connectBtn.addEventListener('click', async () => {
  connectBtn.disabled = true;
  connectBtn.textContent = 'Connecting...';

  try {
    const cookies = await chrome.cookies.getAll({ domain: '.linkedin.com' });

    if (!cookies || cookies.length === 0) {
      showToast('Please log into LinkedIn first in your browser', 'error');
      return;
    }

    const cookiePayload = cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
    }));

    const stored = await chrome.storage.local.get(['apiToken', 'selectedSenderId']);
    if (!stored.apiToken || !stored.selectedSenderId) {
      showToast('Session lost. Please reconnect with your invite token.', 'error');
      await doLogout();
      return;
    }

    const res = await apiPost(
      '/api/extension/senders/' + stored.selectedSenderId + '/cookies',
      { cookies: cookiePayload },
      stored.apiToken
    );
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Failed to save LinkedIn cookies.', 'error');
      return;
    }

    renderStatus({ sessionStatus: 'active', healthStatus: 'healthy', lastActiveAt: new Date().toISOString() });
    showToast('LinkedIn connected successfully', 'success');
    chrome.action.setBadgeText({ text: '' });

    if (data.warning) {
      setTimeout(() => showToast('Note: ' + data.warning, 'error'), 3500);
    }
  } catch (err) {
    showToast('Connection failed — check your internet connection.', 'error');
  } finally {
    connectBtn.disabled = false;
    connectBtn.textContent = 'Reconnect LinkedIn';
  }
});

// ---- Logout / Disconnect ----

async function doLogout() {
  await chrome.storage.local.remove(['apiToken', 'selectedSenderId', 'workspaceSlug']);
  chrome.action.setBadgeText({ text: '' });
  clearLoginError();
  inviteTokenInput.value = '';
  showView(loginView);
}

logoutBtn.addEventListener('click', async () => {
  await doLogout();
});
