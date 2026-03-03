// Outsignal LinkedIn Connector — Popup Script
// Vanilla JS, no framework, no build step required.

const API_BASE = 'https://admin.outsignal.ai';

// ---- DOM refs ----

const loginView = document.getElementById('login-view');
const senderView = document.getElementById('sender-view');
const statusView = document.getElementById('status-view');

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const workspaceInput = document.getElementById('workspace');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

const senderSelect = document.getElementById('sender-select');
const selectSenderBtn = document.getElementById('select-sender-btn');
const senderError = document.getElementById('sender-error');

const statusIndicator = document.getElementById('status-indicator');
const statusIcon = document.getElementById('status-icon');
const statusText = document.getElementById('status-text');
const statusMeta = document.getElementById('status-meta');
const connectBtn = document.getElementById('connect-btn');
const logoutBtn = document.getElementById('logout-btn');

// ---- View management ----

function showView(view) {
  loginView.classList.add('hidden');
  senderView.classList.add('hidden');
  statusView.classList.add('hidden');
  view.classList.remove('hidden');
}

// ---- Toast helper ----

function showToast(message, type = 'success') {
  // Remove any existing toast
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

function showSenderError(msg) {
  senderError.textContent = msg;
  senderError.classList.remove('hidden');
}

function clearSenderError() {
  senderError.textContent = '';
  senderError.classList.add('hidden');
}

// ---- Status view rendering ----

function renderStatus(sender) {
  const sessionStatus = sender.sessionStatus;
  const healthStatus = sender.healthStatus;

  // Reset indicator classes
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
    // not_setup or unknown
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
  // Load state from storage
  const stored = await chrome.storage.local.get([
    'apiToken',
    'selectedSenderId',
    'workspaceToken',
    'workspaceSlug',
  ]);

  if (stored.apiToken && stored.selectedSenderId) {
    // Validate token by calling status endpoint
    try {
      const res = await apiGet('/api/extension/status', stored.apiToken);

      if (res.status === 401) {
        // Token expired or invalid — clear storage and show login
        await chrome.storage.local.remove(['apiToken', 'selectedSenderId', 'workspaceToken', 'workspaceSlug']);
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

  // No valid token — show login
  showView(loginView);
});

// ---- Login form handler ----

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearLoginError();

  const email = emailInput.value.trim();
  const workspaceSlug = workspaceInput.value.trim();
  const password = passwordInput.value;

  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';

  try {
    const res = await apiPost('/api/extension/login', { email, workspaceSlug, password });
    const data = await res.json();

    if (!res.ok) {
      showLoginError(data.error || 'Login failed. Check your credentials.');
      return;
    }

    if (data.senderToken && data.selectedSenderId) {
      // Single sender — store sender-scoped token directly
      await chrome.storage.local.set({
        apiToken: data.senderToken,
        selectedSenderId: data.selectedSenderId,
        workspaceSlug,
      });
      // Fetch status and show status view
      const statusRes = await apiGet('/api/extension/status', data.senderToken);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        renderStatus(statusData.sender);
      } else {
        renderStatus({ sessionStatus: 'not_setup', healthStatus: 'unknown', lastActiveAt: null });
      }
      showView(statusView);
    } else if (data.workspaceToken && data.senders && data.senders.length > 0) {
      // Multiple senders — store workspace token and show sender picker
      await chrome.storage.local.set({
        workspaceToken: data.workspaceToken,
        workspaceSlug,
      });
      populateSenderSelect(data.senders);
      showView(senderView);
    } else {
      showLoginError('No senders found in this workspace. Add a sender first.');
    }
  } catch (err) {
    showLoginError('Connection failed — check your internet connection.');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Log In';
  }
});

// ---- Sender selection ----

function populateSenderSelect(senders) {
  senderSelect.innerHTML = '';
  for (const sender of senders) {
    const opt = document.createElement('option');
    opt.value = sender.id;
    opt.textContent = sender.name + (sender.emailAddress ? ' (' + sender.emailAddress + ')' : '');
    senderSelect.appendChild(opt);
  }
}

selectSenderBtn.addEventListener('click', async () => {
  clearSenderError();

  const senderId = senderSelect.value;
  if (!senderId) {
    showSenderError('Please select a sender.');
    return;
  }

  const stored = await chrome.storage.local.get(['workspaceToken', 'workspaceSlug']);
  if (!stored.workspaceToken) {
    showSenderError('Session lost. Please log in again.');
    showView(loginView);
    return;
  }

  selectSenderBtn.disabled = true;
  selectSenderBtn.textContent = 'Connecting...';

  try {
    const res = await apiPost('/api/extension/select-sender', { senderId }, stored.workspaceToken);
    const data = await res.json();

    if (!res.ok) {
      showSenderError(data.error || 'Failed to select sender.');
      return;
    }

    // Store sender-scoped token
    await chrome.storage.local.set({
      apiToken: data.senderToken,
      selectedSenderId: senderId,
    });
    // Remove workspace token — no longer needed
    await chrome.storage.local.remove(['workspaceToken']);

    // Fetch status and show status view
    const statusRes = await apiGet('/api/extension/status', data.senderToken);
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      renderStatus(statusData.sender);
    } else {
      renderStatus({ sessionStatus: 'not_setup', healthStatus: 'unknown', lastActiveAt: null });
    }
    showView(statusView);
  } catch (err) {
    showSenderError('Connection failed — check your internet connection.');
  } finally {
    selectSenderBtn.disabled = false;
    selectSenderBtn.textContent = 'Continue';
  }
});

// ---- Connect LinkedIn button ----

connectBtn.addEventListener('click', async () => {
  connectBtn.disabled = true;
  connectBtn.textContent = 'Connecting...';

  try {
    // Get all LinkedIn cookies
    const cookies = await chrome.cookies.getAll({ domain: '.linkedin.com' });

    if (!cookies || cookies.length === 0) {
      showToast('Please log into LinkedIn first in your browser', 'error');
      return;
    }

    // Map to { name, value, domain }
    const cookiePayload = cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
    }));

    const stored = await chrome.storage.local.get(['apiToken', 'selectedSenderId']);
    if (!stored.apiToken || !stored.selectedSenderId) {
      showToast('Session lost. Please log in again.', 'error');
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

    // Success — update status indicator and clear badge
    renderStatus({ sessionStatus: 'active', healthStatus: 'healthy', lastActiveAt: new Date().toISOString() });
    showToast('LinkedIn connected successfully', 'success');
    chrome.action.setBadgeText({ text: '' });

    if (data.warning) {
      // li_at cookie not found — non-fatal, show info
      setTimeout(() => showToast('Note: ' + data.warning, 'error'), 3500);
    }
  } catch (err) {
    showToast('Connection failed — check your internet connection.', 'error');
  } finally {
    connectBtn.disabled = false;
    // Update button text based on new status
    connectBtn.textContent = 'Reconnect LinkedIn';
  }
});

// ---- Logout ----

async function doLogout() {
  await chrome.storage.local.remove(['apiToken', 'workspaceToken', 'selectedSenderId', 'workspaceSlug']);
  chrome.action.setBadgeText({ text: '' });
  clearLoginError();
  emailInput.value = '';
  workspaceInput.value = '';
  passwordInput.value = '';
  showView(loginView);
}

logoutBtn.addEventListener('click', async () => {
  await doLogout();
});
