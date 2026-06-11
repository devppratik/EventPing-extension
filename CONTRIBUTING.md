# Contributing to EventPing

Thanks for your interest in contributing! This guide will help you get started.

## Quick Start

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/extension-email-register.git
   cd extension-email-register
   ```
3. **Create branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make changes** and test
5. **Commit** with clear message:
   ```bash
   git commit -m "Add feature: description"
   ```
6. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open Pull Request** on GitHub

## Development Guidelines

### Code Style
- Use ES6+ JavaScript features
- Keep functions small and focused
- Add comments for complex logic only
- No external dependencies (vanilla JS)

### Testing
- Test manually in Chrome before submitting PR
- Load unpacked extension → verify changes work
- Check service worker console for errors
- Test both manual and automatic email checks

### File Structure
```
extension-email-register/
├── manifest.json          # Extension config
├── background.js          # Service worker (main logic)
├── content-script.js      # Form detection
├── popup.html/js          # Main UI
├── options.html/js        # Settings page
├── styles.css             # Shared styles
└── icons/                 # Extension icons
```

### What to Contribute

**Good first contributions:**
- Bug fixes
- Documentation improvements
- Additional allowed domains
- Custom keyword suggestions
- UI/UX improvements

**Larger features:**
- Multi-account support
- Calendar integration
- Export functionality
- Firefox/Edge support

Open an issue first to discuss larger changes.

## Pull Request Checklist

Before submitting PR:

- [ ] Tested changes in Chrome
- [ ] No errors in service worker console
- [ ] Updated documentation if needed (README, SETUP)
- [ ] Clear commit messages
- [ ] PR description explains what/why

## Code Review Process

1. Maintainer reviews PR within 1-2 weeks
2. Feedback provided via PR comments
3. Make requested changes → push to same branch
4. Approved PRs merged to main

## Bug Reports

Found a bug? Open an issue with:

1. **Description**: What happened?
2. **Steps to reproduce**: How to trigger bug?
3. **Expected behavior**: What should happen?
4. **Environment**: Chrome version, OS
5. **Console errors**: From service worker console

## Feature Requests

Have an idea? Open an issue with:

1. **Use case**: Why is this needed?
2. **Proposed solution**: How would it work?
3. **Alternatives**: Other approaches considered?

## Questions?

- Open a discussion issue
- Check existing issues first
- Be respectful and constructive

## License

By contributing, you agree your contributions will be licensed under MIT License.
