// Popup script

document.addEventListener('DOMContentLoaded', async () => {
  await loadStatus();
  await loadPendingRegistrations();
  await loadDetectedForms();

  // Event listeners
  document.getElementById('checkNow').addEventListener('click', handleManualCheck);
  document.getElementById('openOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Listen for check completion from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'checkComplete') {
      loadStatus();
      loadPendingRegistrations();
      loadDetectedForms();

      const btn = document.getElementById('checkNow');
      btn.textContent = 'Check Complete ✓';
      btn.disabled = false;

      setTimeout(() => {
        btn.textContent = 'Check Emails Now';
      }, 2000);
    } else if (message.action === 'checkError') {
      const btn = document.getElementById('checkNow');
      const errorMsg = message.error || 'Check failed';
      btn.textContent = '❌ Failed';
      btn.disabled = false;
      btn.title = errorMsg;

      setTimeout(() => {
        btn.textContent = 'Check Emails Now';
        btn.title = '';
      }, 3000);
    }
  });
});

async function loadStatus() {
  const settings = await chrome.storage.sync.get(['enabled', 'lastCheck']);

  const enabled = settings.enabled !== false;
  const statusEl = document.getElementById('status');
  statusEl.textContent = enabled ? 'Active' : 'Disabled';
  statusEl.className = 'value ' + (enabled ? 'status-active' : 'status-disabled');

  // Disable check button if extension disabled
  const btn = document.getElementById('checkNow');
  btn.disabled = !enabled;
  btn.title = enabled ? '' : 'Extension is disabled. Enable in Settings.';

  const lastCheckEl = document.getElementById('lastCheck');
  if (settings.lastCheck) {
    const date = new Date(settings.lastCheck);
    lastCheckEl.textContent = formatRelativeTime(date);
  } else {
    lastCheckEl.textContent = 'Never';
  }
}

async function loadPendingRegistrations() {
  const { pendingRegistrations = [] } = await chrome.storage.local.get(['pendingRegistrations']);

  // Filter expired registrations (older than 30 days) and validate schema
  const EXPIRY_DAYS = 30;
  const now = Date.now();
  const validRegistrations = pendingRegistrations.filter(r => {
    // Schema validation
    if (!r || !r.url || !r.subject) return false;

    // Expiry check
    const age = now - (r.timestamp || 0);
    return age < EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  });

  // Update storage if any expired or invalid
  if (validRegistrations.length !== pendingRegistrations.length) {
    await chrome.storage.local.set({ pendingRegistrations: validRegistrations });
  }

  const countEl = document.getElementById('pendingCount');
  const listEl = document.getElementById('pendingList');

  countEl.textContent = validRegistrations.length;

  // Clear notification if all URLs dismissed
  if (validRegistrations.length === 0) {
    chrome.runtime.sendMessage({ action: 'clearNotification' }).catch(() => {});
  }

  if (validRegistrations.length === 0) {
    listEl.innerHTML = '<p class="empty-state">No pending registrations found</p>';
    return;
  }

  listEl.innerHTML = '';
  validRegistrations.forEach((item, index) => {
    const itemEl = createRegistrationItem(item, index);
    listEl.appendChild(itemEl);
  });
}

async function loadDetectedForms() {
  const { detectedForms = [] } = await chrome.storage.local.get(['detectedForms']);

  const countEl = document.getElementById('formsCount');
  const listEl = document.getElementById('formsList');

  countEl.textContent = detectedForms.length;

  if (detectedForms.length === 0) {
    listEl.innerHTML = '<p class="empty-state">No forms detected yet</p>';
    return;
  }

  listEl.innerHTML = '';
  detectedForms.slice(-10).reverse().forEach((form) => {
    const itemEl = createFormItem(form);
    listEl.appendChild(itemEl);
  });
}

function createRegistrationItem(item, index) {
  const div = document.createElement('div');
  div.className = 'registration-item';

  // Create elements safely without innerHTML
  const contentDiv = document.createElement('div');
  contentDiv.className = 'item-content';

  const titleDiv = document.createElement('div');
  titleDiv.className = 'item-title';
  titleDiv.textContent = item.subject;

  const link = document.createElement('a');
  link.className = 'item-url';
  link.href = item.url;  // Browser auto-encodes
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = truncateUrl(item.url);

  contentDiv.appendChild(titleDiv);
  contentDiv.appendChild(link);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'item-actions';

  const openBtn = document.createElement('button');
  openBtn.className = 'btn-icon btn-open';
  openBtn.title = 'Open';
  openBtn.textContent = '🔗';
  openBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: item.url });
  });

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'btn-icon btn-dismiss';
  dismissBtn.title = 'Dismiss';
  dismissBtn.textContent = '✕';
  dismissBtn.addEventListener('click', async () => {
    await dismissRegistration(index, item.url);
    await loadPendingRegistrations();
  });

  actionsDiv.appendChild(openBtn);
  actionsDiv.appendChild(dismissBtn);

  div.appendChild(contentDiv);
  div.appendChild(actionsDiv);

  return div;
}

function createFormItem(form) {
  const div = document.createElement('div');
  div.className = 'registration-item';

  const timeAgo = formatRelativeTime(new Date(form.timestamp));

  // Create elements safely without innerHTML
  const contentDiv = document.createElement('div');
  contentDiv.className = 'item-content';

  const titleDiv = document.createElement('div');
  titleDiv.className = 'item-title';
  titleDiv.textContent = sanitizeTitle(form.title);

  // Form now only has domain (privacy protection)
  const domainText = document.createElement('div');
  domainText.className = 'item-url';
  domainText.textContent = form.domain || 'Unknown';
  domainText.style.color = '#666';
  domainText.style.fontSize = '12px';

  const metaDiv = document.createElement('div');
  metaDiv.className = 'item-meta';
  metaDiv.textContent = timeAgo;

  contentDiv.appendChild(titleDiv);
  contentDiv.appendChild(domainText);
  contentDiv.appendChild(metaDiv);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'item-actions';

  const openBtn = document.createElement('button');
  openBtn.className = 'btn-icon btn-open';
  openBtn.title = 'Open domain';
  openBtn.textContent = '🔗';
  openBtn.addEventListener('click', () => {
    if (form.domain) {
      chrome.tabs.create({ url: `https://${form.domain}` });
    }
  });

  actionsDiv.appendChild(openBtn);

  div.appendChild(contentDiv);
  div.appendChild(actionsDiv);

  return div;
}

async function dismissRegistration(index, url) {
  // Remove from pending list
  const { pendingRegistrations = [] } = await chrome.storage.local.get(['pendingRegistrations']);
  pendingRegistrations.splice(index, 1);
  await chrome.storage.local.set({ pendingRegistrations });

  // Add to dismissed URLs
  chrome.runtime.sendMessage({ action: 'dismissUrl', url });
}

async function handleManualCheck() {
  const btn = document.getElementById('checkNow');

  btn.disabled = true;
  btn.textContent = 'Checking...';

  try {
    await chrome.runtime.sendMessage({ action: 'manualCheck' });

    // Update last check time
    await chrome.storage.sync.set({ lastCheck: Date.now() });

    // Background will send checkComplete or checkError message
    // Listener above will handle UI updates

  } catch (error) {
    console.error('Manual check failed:', error);
    btn.textContent = 'Check Failed';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Check Emails Now';
    }, 2000);
  }
}

// Helper functions
function sanitizeTitle(title) {
  if (!title) return '';
  return title
    .replace(/[<>"']/g, '')
    .substring(0, 100);
}

function truncateUrl(url, maxLength = 50) {
  if (!url || url.length <= maxLength) return url;

  try {
    // Preserve domain, truncate path
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    if (domain.length < maxLength) {
      const pathLength = maxLength - domain.length - 10;
      if (urlObj.pathname.length > pathLength) {
        return domain + urlObj.pathname.substring(0, pathLength) + '...';
      }
    }
  } catch {
    // Invalid URL, fallback
  }

  return url.substring(0, maxLength) + '...';
}

function formatRelativeTime(date) {
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now - date) / 1000));

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
}
