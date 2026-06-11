# EventPing Setup Guide

Complete installation instructions for EventPing Chrome extension.

## Prerequisites

- Google Chrome browser
- Gmail account
- Google Cloud account (free tier works)

## Installation Steps

### 1. Clone Repository & Run Setup

```bash
git clone https://github.com/devppratik/EventPing-extension.git
cd EventPing-extension
./scripts/setup.sh
```

This script:
- Creates `manifest.json` from template
- Installs pre-commit hook to prevent committing OAuth credentials

**Optional**: Pass Client ID directly (automated):
```bash
./scripts/setup.sh YOUR_CLIENT_ID.apps.googleusercontent.com
```

If not provided, you'll manually edit `manifest.json` in step 4.

### 2. Create Google Cloud OAuth Credentials

#### 2.1 Create Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a Project** → **New Project**
3. Name: "EventPing" → **Create**

#### 2.2 Enable Gmail API
1. **APIs & Services** → **Library**
2. Search "Gmail API" → **Enable**
3. Wait 2-3 minutes for propagation

#### 2.3 Configure OAuth Consent Screen
1. **APIs & Services** → **OAuth consent screen**
2. User type:
   - **Internal** (if using Google Workspace - recommended)
   - **External** (for personal Gmail)
3. Fill required fields:
   - App name: `EventPing`
   - User support email: your email
   - Developer contact: your email
4. **Save and Continue**
5. **Scopes** → **Add or Remove Scopes**
6. Search "Gmail API" → select:
   - `https://www.googleapis.com/auth/gmail.readonly`
7. **Update** → **Save and Continue**
8. If External: **Test users** → add your Gmail address
9. **Save and Continue** → **Back to Dashboard**

#### 2.4 Create OAuth Client ID

**Important**: Use **Web application** type (Chrome extension type has Google Cloud Console bug)

1. **APIs & Services** → **Credentials**
2. **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `EventPing`
5. Leave **Authorized redirect URIs** empty
6. **Create**
7. **Copy the Client ID** (format: `xxxxx-xxxxx.apps.googleusercontent.com`)

### 3. Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `EventPing-extension` folder
5. Extension loads → note Extension ID (e.g., `logcacfonhedncnnigehlajkaogicfkb`)

### 4. Update manifest.json

1. Open `manifest.json` in project folder (created by setup script)
3. Find line 57 (`oauth2` section)
4. Replace `client_id` value:
   ```json
   "oauth2": {
     "client_id": "YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com",
     "scopes": ["https://www.googleapis.com/auth/gmail.readonly"]
   }
   ```
5. Save file

**Note**: `manifest.json` is git-ignored to prevent committing OAuth credentials

### 5. Reload Extension

1. Go to `chrome://extensions/`
2. Click **Reload** button (circular arrow) under EventPing

### 6. Test Extension

1. Click EventPing icon in Chrome toolbar (pin from puzzle icon if needed)
2. Click **Check Emails Now**
3. OAuth consent screen appears → sign in with Gmail
4. Grant "Read email messages and settings" permission
5. Extension scans unread emails
6. Pending registrations appear in popup

### 7. Configure Settings (Optional)

Click **Settings** in popup:

| Setting | Description | Default |
|---------|-------------|---------|
| Enable/Disable | Toggle extension | On |
| Daily check time | When to auto-scan | 9:00 AM |
| Custom keywords | Add search terms | - |
| Max results | Emails per scan | 20 |
| Notifications | Desktop alerts | On |
| Auto-open tabs | Open URLs automatically | Off |

## Troubleshooting

### Authentication Errors

**"Access blocked: invalid request"**
- Verify OAuth type = **Web application** (not Chrome extension)
- Check Client ID in manifest ends with `.apps.googleusercontent.com`
- Ensure no typos in Client ID

**"Gmail API has not been used..."**
- Enable Gmail API in Google Cloud Console
- Wait 2-3 minutes after enabling
- Try check again

**"The user did not approve access"**
- If using External consent: add your email as test user
- Check OAuth consent screen status = Testing or Published
- Clear browser cache → retry

### No Emails Found

**No pending registrations appear:**
- Need unread emails containing keywords: `register`, `signup`, `RSVP`, `enroll`
- Email must contain registration URL (form link)
- Test Gmail search: `is:unread (register OR signup OR rsvp)`
- Add custom keywords in Settings if using different terms

**Allowed domains:**
- eventbrite.com, lu.ma, typeform.com, forms.gle, meetup.com
- Any URL with `/register`, `/signup`, `/rsvp`, `/join` in path

### Extension Errors

**Extension won't load:**
- Check all icon files exist in `icons/` folder (16.png, 48.png, 128.png)
- `chrome://extensions/` → check "Errors" section
- Click "service worker" → inspect console

**"Could not create options page":**
- Fixed in latest version (uses `options_ui` in manifest)
- Reload extension after update

**Last Check shows "Never":**
- Fixed in latest version
- Appears after first successful check

### Browser Compatibility

**Arc Browser:**
- OAuth for unpacked extensions works in Chrome but may fail in Arc/Brave
- Use Chrome for development/testing
- Arc support requires Chrome Web Store publishing

**Other Browsers:**
- Extension tested on Chrome
- Edge/Brave may work but untested
- Firefox requires different manifest (not supported yet)

## Privacy & Security

All email processing happens locally:
- No external servers except Google OAuth + Gmail API
- OAuth token secured by Chrome's storage
- Revoke access: https://myaccount.google.com/permissions

See [PRIVACY.md](PRIVACY.md) for full policy.

## Getting Help

1. Check this troubleshooting guide
2. Inspect service worker console: `chrome://extensions/` → EventPing → "service worker"
3. Open issue: [GitHub Issues](https://github.com/devppratik/EventPing-extension/issues)

## Next Steps

- Explore Settings to customize behavior
- Test with real emails or send yourself test registration email
- Set daily check time for automatic scanning
- Check popup regularly for pending registrations
