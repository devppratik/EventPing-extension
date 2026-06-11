// Background Service Worker for EventPing Extension

// Constants
const ALARM_NAME = 'daily-email-check';
const DEFAULT_KEYWORDS = ['register', 'registration', 'sign up', 'signup', 'rsvp', 'enroll'];
const BATCH_DELAY_MS = 50;  // Keepalive signal for service worker
const MAX_DISMISSED_URLS = 500;  // ~50KB @ 100 chars/URL
const MAX_DETECTED_FORMS = 100;  // Limit stored forms
const MAX_PROCESSED_EMAILS = 100;  // Keep last 100
const MAX_PENDING_REGISTRATIONS = 100;  // Limit pending URLs
const DEBUG = false;  // Set to true for verbose logging

// Debug logging wrapper
function log(...args) {
  if (DEBUG) console.log(...args);
}

// Allowed domains for registration URLs
const ALLOWED_DOMAINS = [
  'eventbrite.com',
  'eventbrite.co.uk',
  'eventbrite.ca',
  'lu.ma',
  'luma.co',
  'typeform.com',
  'forms.gle',
  'meetup.com',
  'universe.com',
  'ticketmaster.com',
  'facebook.com',
  'hopin.com',
  'zoom.us'
];

// URL patterns to exclude (unsubscribe, preferences, etc)
const EXCLUDE_PATTERNS = [
  /unsubscribe/i,
  /opt-out/i,
  /opt_out/i,
  /remove/i,
  /preferences/i,
  /settings/i,
  /manage.*subscription/i
];

let checkInProgress = false;
let lastNotificationId = null;

// Install/Update handler
chrome.runtime.onInstalled.addListener(async (details) => {
  log('Extension installed/updated:', details.reason);

  const currentVersion = chrome.runtime.getManifest().version;

  // Validate OAuth client ID
  const manifest = chrome.runtime.getManifest();
  if (manifest.oauth2.client_id.startsWith('YOUR_')) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Setup Required',
      message: 'Please configure OAuth Client ID. See README.md',
      requireInteraction: true
    });
  }

  if (details.reason === 'install') {
    // Only initialize on fresh install (not update)
    await chrome.storage.sync.set({
      processedEmails: [],
      enabled: true,
      checkTime: '09:00',
      notifications: true,
      autoOpen: false  // Default to false for safety
    });

    // Initialize local storage
    await chrome.storage.local.set({
      dismissedUrls: [],
      pendingRegistrations: [],
      detectedForms: [],
      version: currentVersion
    });
  } else if (details.reason === 'update') {
    // Migration logic for updates
    const { version: oldVersion } = await chrome.storage.local.get('version');

    if (oldVersion && oldVersion !== currentVersion) {
      log(`Migrating from ${oldVersion} to ${currentVersion}`);

      // Example migration: if detectedForms had old schema, migrate it
      // Add future migrations here as needed

      await chrome.storage.local.set({ version: currentVersion });

      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Extension Updated',
        message: `EventPing updated to v${currentVersion}`,
        requireInteraction: false
      });
    }
  }

  // Always reschedule alarm (but don't reset data on update)
  const settings = await chrome.storage.sync.get(['checkTime']);
  scheduleDailyCheck(settings.checkTime || '09:00');
});

// Schedule daily alarm (DST-aware)
function scheduleDailyCheck(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const now = new Date();
  const scheduledTime = new Date();
  scheduledTime.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (scheduledTime < now) {  // Strict less-than to avoid edge case at exact time
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  // Use absolute timestamp instead of periodInMinutes to avoid DST drift
  // Note: Chrome alarms have ~1 min precision and may fire slightly late
  chrome.alarms.create(ALARM_NAME, {
    when: scheduledTime.getTime()
  }, () => {
    // Callback ensures alarm created before verification
    log('Scheduled next check for:', scheduledTime);

    chrome.alarms.get(ALARM_NAME, (alarm) => {
      if (!alarm) {
        console.error('[ERROR] Failed to create alarm');
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Setup Error',
          message: 'Could not schedule daily checks'
        });
      }
    });
  });
}

// Alarm listener
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    log('Daily alarm triggered');
    await checkForRegistrationEmails();

    // Reschedule for tomorrow (prevents DST drift)
    const settings = await chrome.storage.sync.get(['checkTime']);
    scheduleDailyCheck(settings.checkTime || '09:00');
  }
});

// Main function to check Gmail for registration emails
async function checkForRegistrationEmails() {
  // Single-flight pattern - prevent concurrent checks
  if (checkInProgress) {
    log('Check already in progress');
    return;
  }

  checkInProgress = true;

  try {
    const settings = await chrome.storage.sync.get(['enabled']);
    if (!settings.enabled) {
      log('Extension disabled by user');
      return;
    }

    // Check if online
    if (!navigator.onLine) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Offline',
        message: 'Cannot check emails while offline'
      });
      return;
    }

    // Get OAuth token
    const token = await getAuthToken();
    if (!token) {
      console.error('Failed to get auth token');
      chrome.runtime.sendMessage({
        action: 'checkError',
        error: 'Authentication failed. Please check OAuth setup.'
      }).catch(() => {});
      return;
    }

    // Fetch unread emails with registration keywords
    const { emails, processedEmails } = await fetchUnreadEmails(token);
    log(`Found ${emails.length} potential registration emails`);

    if (emails.length === 0) {
      // Update last check timestamp even when no emails
      await chrome.storage.sync.set({ lastCheck: Date.now() });

      // Notify completion
      chrome.runtime.sendMessage({ action: 'checkComplete' }).catch(() => {});
      return;
    }

    // Process emails and extract URLs (pass processedEmails to avoid re-reading)
    const registrationUrls = await extractRegistrationUrls(emails, token, processedEmails);

    if (registrationUrls.length > 0) {
      // Get existing pending registrations
      const { pendingRegistrations = [] } = await chrome.storage.local.get(['pendingRegistrations']);

      // Create new timestamped URLs
      const timestampedUrls = registrationUrls.map(u => ({
        ...u,
        timestamp: Date.now()
      }));

      // Merge with existing, remove duplicates by URL
      const existingUrls = new Set(pendingRegistrations.map(r => r.url));
      const newUrls = timestampedUrls.filter(u => !existingUrls.has(u.url));
      const combined = [...pendingRegistrations, ...newUrls].slice(0, MAX_PENDING_REGISTRATIONS);

      await chrome.storage.local.set({ pendingRegistrations: combined });

      const settings = await chrome.storage.sync.get(['notifications', 'autoOpen']);
      const showNotifications = settings.notifications !== false;
      const autoOpen = settings.autoOpen === true;  // Explicit opt-in only

      // Show notification with fallback to badge
      if (showNotifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Registration Forms Found!',
          message: `Found ${registrationUrls.length} registration form(s) to complete`,
          buttons: [{ title: 'View Now' }],
          requireInteraction: true
        }, (notificationId) => {
          if (chrome.runtime.lastError) {
            console.warn('Notification blocked:', chrome.runtime.lastError);
            // Fallback: show badge on extension icon
            chrome.action.setBadgeText({ text: String(registrationUrls.length) });
            chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
          } else {
            // Store ID to clear later if needed
            lastNotificationId = notificationId;
            // Clear badge since notification shown
            chrome.action.setBadgeText({ text: '' });
          }
        });
      }

      // Open URLs in background tabs (only validated URLs)
      if (autoOpen) {
        for (const urlData of registrationUrls) {
          if (isValidUrl(urlData.url)) {
            chrome.tabs.create({ url: urlData.url, active: false });
          }
        }
      }
    }

    // Update last check timestamp
    await chrome.storage.sync.set({ lastCheck: Date.now() });

    // Notify completion
    chrome.runtime.sendMessage({ action: 'checkComplete' }).catch(() => {
      // Popup might not be open
    });

  } catch (error) {
    console.error('Error checking emails:', error.message || error);
    console.error('Full error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

    // User-friendly error notifications
    if (error.message === 'QUOTA_EXCEEDED') {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Gmail API Quota Exceeded',
        message: 'Daily limit reached. Extension will resume tomorrow.',
        requireInteraction: true
      });
    }

    chrome.runtime.sendMessage({
      action: 'checkError',
      error: error.message
    }).catch(() => {});
  } finally {
    checkInProgress = false;
  }
}

// Get OAuth token for Gmail API
async function getAuthToken(interactive = false) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        if (chrome.runtime.lastError.message.includes('not granted') && !interactive) {
          // Token expired or never granted - try interactive
          return getAuthToken(true).then(resolve).catch(reject);
        }
        console.error('Auth error details:', JSON.stringify(chrome.runtime.lastError, null, 2));
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}

// Retry helper for transient failures
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      // Check for specific HTTP errors
      if (response.status === 401) {
        // Clear cached token before retrying
        chrome.identity.getAuthToken({ interactive: false }, (cachedToken) => {
          if (cachedToken) {
            chrome.identity.removeCachedAuthToken({ token: cachedToken });
          }
        });
        throw new Error('AUTH_EXPIRED');
      } else if (response.status === 403) {
        const error = await response.json();
        if (error.error?.message?.includes('quota')) {
          throw new Error('QUOTA_EXCEEDED');
        }
        throw new Error('FORBIDDEN');
      } else if (response.status >= 500 && attempt < maxRetries - 1) {
        // Server error - retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;

      if (error.message === 'AUTH_EXPIRED' ||
          error.message === 'QUOTA_EXCEEDED' ||
          error.message === 'FORBIDDEN') {
        throw error;
      }

      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff for network errors
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  // Explicit return if all retries exhausted (should never reach here)
  throw lastError || new Error('All retries failed');
}

// Fetch unread emails from Gmail
async function fetchUnreadEmails(token) {
  const settings = await chrome.storage.sync.get([
    'includeKeywords',
    'excludeKeywords',
    'includeEmails',
    'excludeEmails',
    'maxResults'
  ]);

  const keywords = settings.includeKeywords || DEFAULT_KEYWORDS;
  const excludeKeywords = settings.excludeKeywords || [];
  const includeEmails = settings.includeEmails || [];
  const excludeEmails = settings.excludeEmails || [];
  const maxResults = settings.maxResults || 10;

  // Escape function for Gmail query injection prevention
  function escapeGmailQuery(str) {
    return str.replace(/"/g, '\\"');
  }

  // Build search query
  let queryParts = [];

  // Include keywords (escaped)
  const keywordQuery = keywords.map(kw => `"${escapeGmailQuery(kw)}"`).join(' OR ');
  queryParts.push(`(${keywordQuery})`);

  // Exclude keywords (escaped)
  if (excludeKeywords.length > 0) {
    const excludeQuery = excludeKeywords.map(kw => `-"${escapeGmailQuery(kw)}"`).join(' ');
    queryParts.push(excludeQuery);
  }

  // RFC 5322 email validation (simplified but more accurate)
  function isValidEmail(email) {
    return /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email);
  }

  // Include specific senders (validated email format)
  if (includeEmails.length > 0) {
    const validEmails = includeEmails.filter(isValidEmail);
    if (validEmails.length > 0) {
      const fromQuery = validEmails.map(email => `from:${email}`).join(' OR ');
      queryParts.push(`(${fromQuery})`);
    }
  }

  // Exclude specific senders (validated email format)
  if (excludeEmails.length > 0) {
    const validEmails = excludeEmails.filter(isValidEmail);
    if (validEmails.length > 0) {
      const excludeFromQuery = validEmails.map(email => `-from:${email}`).join(' ');
      queryParts.push(excludeFromQuery);
    }
  }

  const searchQuery = `is:unread ${queryParts.join(' ')}`;

  const response = await fetchWithRetry(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}&maxResults=${maxResults}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();

  // Get processed emails to avoid duplicates
  const { processedEmails = [] } = await chrome.storage.sync.get(['processedEmails']);

  if (!data.messages) {
    return { emails: [], processedEmails };
  }

  // Filter out already processed emails
  const newEmails = data.messages.filter(msg => !processedEmails.includes(msg.id));

  return { emails: newEmails, processedEmails };
}

// Extract registration URLs from emails
async function extractRegistrationUrls(emails, token, processedEmailsArray = []) {
  const urls = [];
  const seenUrls = new Set();

  // Use provided array or read from storage
  let processedEmails = processedEmailsArray.length > 0
    ? [...processedEmailsArray]
    : (await chrome.storage.sync.get(['processedEmails'])).processedEmails || [];

  const { dismissedUrls = [] } = await chrome.storage.local.get(['dismissedUrls']);
  const dismissedSet = new Set(dismissedUrls);

  // Process in batches to avoid service worker timeout
  const BATCH_SIZE = 5;  // Process 5 emails concurrently

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);

    for (const email of batch) {
      try {
        // Proactively trim to avoid quota issues
        if (processedEmails.length > 90) {
          processedEmails = processedEmails.slice(-80);
        }

        // Fetch full email content with retry
        const response = await fetchWithRetry(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.id}?format=full`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const emailData = await response.json();

      // Extract subject and body
      const rawSubject = emailData.payload.headers.find(h => h.name === 'Subject')?.value || '';
      // Sanitize subject: remove newlines, control chars, and limit length
      const subject = rawSubject
        .replace(/[\r\n\t\x00-\x1F\x7F]/g, ' ')
        .trim()
        .substring(0, 200);
      const bodyPart = findBodyPart(emailData.payload);

      if (bodyPart) {
        const body = decodeBase64(bodyPart);
        const extractedUrls = extractUrlsFromText(body);

        // Filter for valid, likely registration URLs, not dismissed, and not duplicates
        const registrationUrls = extractedUrls.filter(url =>
          isValidUrl(url) &&
          isLikelyRegistrationUrl(url) &&
          !dismissedSet.has(url) &&
          !seenUrls.has(url)
        );

        if (registrationUrls.length > 0) {
          // Mark as seen
          registrationUrls.forEach(url => seenUrls.add(url));

          urls.push(...registrationUrls.map(url => ({
            url,
            subject,
            emailId: email.id
          })));
        }
      }

        // Mark email as processed
        processedEmails.push(email.id);

      } catch (error) {
        console.error('Error processing email:', email.id, {
          message: error.message,
          name: error.name
        });
      }
    }

    // Write progress after each batch (avoid losing work on timeout)
    await chrome.storage.sync.set({
      processedEmails: processedEmails.slice(-MAX_PROCESSED_EMAILS)
    });

    // Small delay between batches to keep service worker alive
    if (i + BATCH_SIZE < emails.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return urls;
}

// Helper: Find email body part
function findBodyPart(payload) {
  if (payload.body && payload.body.data) {
    return payload.body.data;
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
        if (part.body && part.body.data) {
          return part.body.data;
        }
      }
      if (part.parts) {
        const found = findBodyPart(part);
        if (found) return found;
      }
    }
  }

  return null;
}

// Helper: Decode base64 email body
function decodeBase64(data) {
  try {
    // Add padding for URL-safe base64
    data = data.replace(/-/g, '+').replace(/_/g, '/');
    data += '='.repeat((4 - data.length % 4) % 4);

    const decoded = atob(data);

    // Convert to UTF-8 properly
    const bytes = Uint8Array.from(decoded, c => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch (error) {
    console.error('Error decoding base64:', error);
    return '';
  }
}

// Helper: Extract URLs from text
function extractUrlsFromText(text) {
  // RFC 3986 compliant URL regex
  const urlRegex = /(https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+)/g;
  const matches = text.match(urlRegex);
  return matches ? [...new Set(matches)] : [];
}

// Validate URL scheme and domain
function isValidUrl(url) {
  try {
    const parsed = new URL(url);

    // Only allow https (or http for localhost testing)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }

    // Block localhost/private IPs in production
    if (parsed.hostname === 'localhost' || parsed.hostname.startsWith('127.') ||
        parsed.hostname.startsWith('192.168.') || parsed.hostname.startsWith('10.')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Check if domain is whitelisted
function isAllowedDomain(url) {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(domain =>
      parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

// Helper: Check if URL is likely a registration link
function isLikelyRegistrationUrl(url) {
  // First check: exclude unsubscribe/preferences links
  if (EXCLUDE_PATTERNS.some(p => p.test(url))) {
    return false;
  }

  try {
    const parsed = new URL(url);
    const pathAndQuery = parsed.pathname + parsed.search;

    // Path-based patterns (more precise)
    const registrationPatterns = [
      /\/register/i,
      /\/signup/i,
      /\/sign-up/i,
      /\/enroll/i,
      /\/rsvp/i,
      /[?&]register/i,
      /\/join/i,
      /\/apply/i,
      /\/reserve/i
    ];

    // Check if it's a whitelisted domain OR has registration pattern in path
    return isAllowedDomain(url) ||
           registrationPatterns.some(p => p.test(pathAndQuery));
  } catch {
    return false;
  }
}

// Listen for notification clicks
chrome.notifications.onClicked.addListener(() => {
  chrome.action.openPopup().catch(() => {
    // Fallback if popup fails (already open, unpinned, etc.)
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
  });
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    // openPopup() requires user gesture - open in new tab instead
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
  }
});

// Clear notification ID when user closes notification
chrome.notifications.onClosed.addListener((notificationId) => {
  if (notificationId === lastNotificationId) {
    lastNotificationId = null;
  }
});

// Rate limiting for manual checks
let lastManualCheck = 0;
const MANUAL_CHECK_COOLDOWN = 3000; // 3 seconds (reasonable anti-spam)

// Message listener for manual check
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'manualCheck') {
    const now = Date.now();
    if (now - lastManualCheck < MANUAL_CHECK_COOLDOWN) {
      sendResponse({
        success: false,
        error: 'Please wait a moment between checks'
      });
      return true;
    }

    lastManualCheck = now;

    checkForRegistrationEmails().then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }

  if (message.action === 'dismissUrl') {
    // Use local storage to avoid sync quota
    chrome.storage.local.get(['dismissedUrls'], (result) => {
      const dismissedUrls = result.dismissedUrls || [];
      dismissedUrls.push(message.url);
      chrome.storage.local.set({ dismissedUrls: dismissedUrls.slice(-MAX_DISMISSED_URLS) }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (message.action === 'formDetected') {
    // Content script detected a form
    chrome.storage.local.get(['detectedForms'], (result) => {
      // Slice before push to prevent unbounded growth during rapid messages
      const forms = (result.detectedForms || []).slice(-(MAX_DETECTED_FORMS - 1));

      // Only store domain to protect privacy
      try {
        const urlObj = new URL(sender.tab.url);
        forms.push({
          domain: urlObj.hostname,
          title: sender.tab.title?.replace(/[<>"']/g, '').substring(0, 100) || 'Untitled',
          timestamp: Date.now()
        });
      } catch {
        // Invalid URL, skip
      }

      chrome.storage.local.set({ detectedForms: forms }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (message.action === 'clearNotification') {
    // Clear notification when all URLs dismissed
    if (lastNotificationId) {
      chrome.notifications.clear(lastNotificationId);
      lastNotificationId = null;
    }
    sendResponse({ success: true });
    return true;
  }
});
