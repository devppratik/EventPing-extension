# EventPing - Installation Guide for Testers

**IMPORTANT**: This extension is not yet on Chrome Web Store. Follow these steps to install manually.

## Prerequisites

- Google Chrome browser
- Gmail account
- Google Cloud account (free tier works)

## Installation Steps

### 1. Download Extension

Unzip `EventPing.zip` to a folder (e.g., `~/Downloads/EventPing/`)

### 2. Set Up Google Cloud OAuth

You need your own OAuth credentials because this is a pre-release version.

#### 2.1 Create Google Cloud Project
1. Go to https://console.cloud.google.com/
2. Click **Select a Project** → **New Project**
3. Name: "EventPing" → **Create**

#### 2.2 Enable Gmail API
1. **APIs & Services** → **Library**
2. Search "Gmail API" → **Enable**
3. Wait 2-3 minutes for propagation

#### 2.3 Configure OAuth Consent Screen
1. **APIs & Services** → **OAuth consent screen**
2. **External** → **Create**
3. Fill in:
   - App name: `EventPing`
   - User support email: your email
   - Developer contact: your email
4. **Save and Continue**
5. **Scopes** → **Add or Remove Scopes**
6. Search "Gmail API" → select `https://www.googleapis.com/auth/gmail.readonly`
7. **Update** → **Save and Continue**
8. **Test users** → **Add Users** → add your Gmail
9. **Save and Continue** → **Back to Dashboard**

#### 2.4 Get Extension ID (temporary)
1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the EventPing folder you unzipped
5. **Copy the Extension ID** (long alphanumeric string under extension name)

#### 2.5 Create OAuth Client ID
1. Back in Google Cloud Console
2. **APIs & Services** → **Credentials**
3. **Create Credentials** → **OAuth client ID**
4. Application type: **Chrome extension**
5. Name: `EventPing Extension`
6. Item ID: **Paste Extension ID** from step 2.4
7. **Create**
8. **Copy the Client ID** (ends with `.apps.googleusercontent.com`)

#### 2.6 Update Extension Manifest
1. Open `manifest.json` in the EventPing folder
2. Find line 54 (the `oauth2` section)
3. Replace:
   ```json
   "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
   ```
   with your actual Client ID:
   ```json
   "client_id": "123456789-abcdefg.apps.googleusercontent.com",
   ```
4. Save file
5. Go to `chrome://extensions/` → click **Reload** under EventPing

### 3. First Run

1. Click EventPing icon in toolbar (pin it from puzzle icon menu)
2. Click **Check Emails Now**
3. OAuth popup appears → sign in with Gmail
4. Grant "Read email messages and settings" permission
5. Extension scans unread emails
6. Pending registrations appear in popup

### 4. Configure Settings (Optional)

Click **Settings** in popup:
- **Daily check time**: when to auto-scan (default 9 AM)
- **Include keywords**: add custom terms (e.g., "workshop, conference")
- **Exclude keywords**: skip emails with these words
- **Notifications**: toggle desktop alerts
- **Auto-open tabs**: automatically open URLs (off by default)

## Troubleshooting

### "Invalid OAuth client ID"
- Verify Client ID includes `.apps.googleusercontent.com`
- Check Extension ID in manifest matches Google Cloud Console
- Reload extension after editing manifest

### "Gmail API has not been used..."
- Enable Gmail API in Google Cloud Console
- Wait 2-3 minutes, then retry

### No emails found
- Need unread emails with "register", "signup", or "RSVP"
- Test with: send yourself an email with "Please register at https://eventbrite.com/..."
- Check Gmail search: `is:unread (register OR signup OR rsvp)`

### Extension errors
- Open `chrome://extensions/` → click "Errors" under EventPing
- Inspect service worker console for detailed logs

## Privacy

- All email processing happens **locally in your browser**
- No external servers except:
  - Google Gmail API (to fetch emails)
  - Google OAuth (standard authentication)
- Revoke access anytime: https://myaccount.google.com/permissions

## Feedback

Report issues or suggestions to: [your contact method]

---

**Note**: Once published to Chrome Web Store, these OAuth steps won't be needed!
