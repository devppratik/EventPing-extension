# EventPing

<p align="center">
  <img src="icons/icon128.png" alt="EventPing Logo" width="128">
</p>

> Browser extension that automatically scans Gmail for registration forms and reminds you about upcoming events.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

EventPing monitors your Gmail inbox for event registration emails (conferences, workshops, meetups) and surfaces them when you need them. All processing happens locally in your browser—no data leaves your machine.

> **Browser Support:** Chrome (Manifest V3) and Firefox (Manifest V2). Arc, Brave, Edge support via Chrome build.

**Key Features:**
- 🔍 **Automatic scanning** - Daily Gmail checks for registration-related emails
- 🎯 **Smart detection** - Finds registration URLs from email content
- ⏰ **Flexible reminders** - Manual checks or scheduled daily scans
- 🎨 **Form highlighting** - Visual indicators on registration pages
- 🔒 **Privacy-first** - All processing local, OAuth token secured by Chrome
- ⚙️ **Customizable** - Configure keywords, check times, notifications

## Quick Start

**Chrome / Arc / Brave / Edge:**  
See **[SETUP.md](SETUP.md)** for complete installation instructions.

**Firefox:**  
See **[SETUP.FIREFOX.md](SETUP.FIREFOX.md)** for Firefox-specific setup.

Quick build:
```bash
./scripts/build-firefox.sh
```

## Usage

### Automatic Mode
Set check time in Settings (default 9 AM). Extension runs daily and shows notifications when registration forms are found.

### Manual Mode
Click extension icon → **Check Emails Now** → view pending registrations

**Managing Registrations:**
- **🔗** Open registration page
- **✕** Dismiss (won't reappear)

## Privacy

- ✅ All processing happens in your browser
- ✅ No external servers (only Google OAuth + Gmail API)
- ✅ Revoke access anytime at [Google Permissions](https://myaccount.google.com/permissions)

See [PRIVACY.md](PRIVACY.md) for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

MIT License - see [LICENSE](LICENSE) file.
