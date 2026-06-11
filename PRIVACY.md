# Privacy & Data Storage

## All Data Stays Local

Extension stores all data locally in Chrome storage. Nothing sent to external servers.

## Detected Forms Privacy Protection

When the extension detects registration forms on pages you visit, it stores **only the domain name** (e.g., `eventbrite.com`), not the full URL or path. This protects your privacy by:
- Not tracking specific pages you visit
- Not storing query parameters that might contain sensitive data
- Minimizing stored information

**Trade-off:** The "Open" button in detected forms navigates to the domain homepage rather than the exact registration page. You may need to navigate to the form manually.

## What Gets Stored

### chrome.storage.sync (synced across devices)
- `enabled`: boolean - extension on/off
- `checkTime`: string - daily check time
- `includeKeywords`: array - keywords to search for
- `excludeKeywords`: array - keywords to skip
- `includeEmails`: array - allowed sender emails
- `excludeEmails`: array - blocked sender emails
- `maxResults`: number - max emails per check
- `notifications`: boolean - show notifications
- `autoOpen`: boolean - auto-open tabs
- `processedEmails`: array - already-checked email IDs (last 100)
- `dismissedUrls`: array - URLs user dismissed (last 200)

### chrome.storage.local (device-only)
- `pendingRegistrations`: array - current registration URLs waiting
- `detectedForms`: array - forms found on pages

## External Data Access

Extension only calls:
- **Gmail API** (`https://gmail.googleapis.com`) - read unread emails matching your filters
- **Google OAuth** - authenticate (standard Google login flow)

No tracking. No analytics. No third-party servers.

## Data You Control

### View stored data
```javascript
// Open console in extension popup (right-click > Inspect)
chrome.storage.sync.get(null, console.log);
chrome.storage.local.get(null, console.log);
```

### Clear all data
Settings page has buttons to clear:
- Processed emails list
- Dismissed URLs list

Or clear everything:
```javascript
chrome.storage.sync.clear();
chrome.storage.local.clear();
```

### Revoke Gmail access
Go to: https://myaccount.google.com/permissions
Find "EventPing" → Remove access

## Gmail API Permissions

Extension requests:
- `https://www.googleapis.com/auth/gmail.readonly` - read-only access to Gmail

What it reads:
- Unread emails matching your keyword/sender filters
- Email subject, sender, body text (to extract URLs)

What it cannot do:
- Send emails
- Delete emails
- Modify emails
- Access sent/drafts/trash
- Read emails after marking as read

## OAuth Token Storage

Chrome stores OAuth token securely via `chrome.identity` API. Extension cannot export or view raw token. Token auto-refreshes when expired.

## Sync vs Local

**chrome.storage.sync** (8 KB limit):
- Settings and filters
- Small lists (processed emails, dismissed URLs)
- Syncs across Chrome browsers signed into same Google account

**chrome.storage.local** (10 MB limit):
- Pending URLs and detected forms
- Stays on current device only

## No Server Communication

Extension architecture:
```
Your Browser → Gmail API (Google's servers)
     ↓
Local Chrome Storage (your device)
```

No intermediate servers. No data leaves your control except OAuth requests to Google.
