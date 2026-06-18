// Options page script

// Debounce helper
let saveTimeouts = {};

function debouncedSave(key, getValue, delay = 500) {
  clearTimeout(saveTimeouts[key]);
  saveTimeouts[key] = setTimeout(async () => {
    const value = getValue();
    await chrome.storage.sync.set({ [key]: value });
    showSaveNotice();
  }, delay);
}

// Save pending changes on page unload
window.addEventListener('beforeunload', () => {
  Object.keys(saveTimeouts).forEach(key => {
    clearTimeout(saveTimeouts[key]);
  });
});

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();

  // Toggle switches
  setupToggle('enabledToggle', 'enabled', true);
  setupToggle('notificationsToggle', 'notifications', true);
  setupToggle('autoOpenToggle', 'autoOpen', true);

  // Client ID input (Firefox only)
  const clientIdInput = document.getElementById('clientId');
  if (clientIdInput) {
    clientIdInput.addEventListener('input', (e) => {
      debouncedSave('firefoxClientId', () => e.target.value.trim());
    });
  }

  // Input fields with debouncing
  document.getElementById('checkTime').addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ checkTime: e.target.value });
    showSaveNotice();
  });

  document.getElementById('includeKeywords').addEventListener('input', (e) => {
    debouncedSave('includeKeywords', () =>
      e.target.value.split(',').map(k => k.trim()).filter(k => k)
    );
  });

  document.getElementById('excludeKeywords').addEventListener('input', (e) => {
    debouncedSave('excludeKeywords', () =>
      e.target.value.split(',').map(k => k.trim()).filter(k => k)
    );
  });

  document.getElementById('includeEmails').addEventListener('input', (e) => {
    debouncedSave('includeEmails', () =>
      e.target.value.split(',').map(email => email.trim().toLowerCase()).filter(email => email)
    );
  });

  document.getElementById('excludeEmails').addEventListener('input', (e) => {
    debouncedSave('excludeEmails', () =>
      e.target.value.split(',').map(email => email.trim().toLowerCase()).filter(email => email)
    );
  });

  document.getElementById('maxResults').addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ maxResults: parseInt(e.target.value, 10) || 20 });
    showSaveNotice();
  });

  // Clear buttons
  document.getElementById('clearProcessed').addEventListener('click', async () => {
    await chrome.storage.sync.set({ processedEmails: [] });
    showSaveNotice('Processed emails cleared');
  });

  document.getElementById('clearDismissed').addEventListener('click', async () => {
    // Moved to local storage
    await chrome.storage.local.set({ dismissedUrls: [] });
    showSaveNotice('Dismissed URLs cleared');
  });
});

async function loadSettings() {
  const settings = await chrome.storage.sync.get([
    'enabled',
    'checkTime',
    'includeKeywords',
    'excludeKeywords',
    'includeEmails',
    'excludeEmails',
    'maxResults',
    'notifications',
    'autoOpen',
    'firefoxClientId'
  ]);

  // Set toggle states
  document.getElementById('enabledToggle').classList.toggle('active', settings.enabled !== false);
  document.getElementById('notificationsToggle').classList.toggle('active', settings.notifications !== false);
  document.getElementById('autoOpenToggle').classList.toggle('active', settings.autoOpen !== false);

  // Set input values (use ?? for proper default handling)
  document.getElementById('checkTime').value = settings.checkTime ?? '09:00';
  document.getElementById('includeKeywords').value = (settings.includeKeywords ?? ['register', 'registration', 'sign up', 'signup', 'rsvp', 'enroll']).join(', ');
  document.getElementById('excludeKeywords').value = (settings.excludeKeywords ?? []).join(', ');
  document.getElementById('includeEmails').value = (settings.includeEmails ?? []).join(', ');
  document.getElementById('excludeEmails').value = (settings.excludeEmails ?? []).join(', ');
  document.getElementById('maxResults').value = settings.maxResults ?? 20;

  // Firefox Client ID (if element exists)
  const clientIdInput = document.getElementById('clientId');
  if (clientIdInput) {
    clientIdInput.value = settings.firefoxClientId ?? '';
  }
}

function setupToggle(elementId, settingKey, defaultValue) {
  const toggle = document.getElementById(elementId);

  toggle.addEventListener('click', async () => {
    const isActive = toggle.classList.toggle('active');

    // Special handling for disabling extension
    if (settingKey === 'enabled' && !isActive) {
      // Revoke OAuth token
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (token) {
          chrome.identity.removeCachedAuthToken({ token }, () => {
            console.log('Token revoked');
          });
        }
      });
    }

    await chrome.storage.sync.set({ [settingKey]: isActive });
    showSaveNotice(settingKey === 'enabled' && !isActive ?
      'Extension disabled. Token revoked.' :
      'Settings saved ✓'
    );
  });
}

function showSaveNotice(message = 'Settings saved ✓') {
  const notice = document.getElementById('saveNotice');
  notice.textContent = message;
  notice.classList.add('show');

  setTimeout(() => {
    notice.classList.remove('show');
  }, 2000);
}
