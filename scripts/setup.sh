#!/bin/bash
# Setup script for EventPing development

set -e

echo "Setting up EventPing development environment..."
echo ""

# 1. Copy manifest template
if [ ! -f "manifest.json" ]; then
  echo "✓ Creating manifest.json from template"
  cp manifest.example.json manifest.json
else
  echo "⚠ manifest.json already exists, skipping"
fi

# 2. Install pre-commit hook
echo "✓ Installing pre-commit hook"
mkdir -p .git/hooks
cp scripts/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# 3. Prompt for Client ID
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "OAuth Client ID Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Do you have your OAuth Client ID from Google Cloud Console?"
echo "(Format: xxxxx-xxxxx.apps.googleusercontent.com)"
echo ""
read -p "Enter Client ID (or press Enter to skip): " CLIENT_ID

if [ -n "$CLIENT_ID" ]; then
  echo ""
  echo "✓ Updating manifest.json with Client ID"

  # macOS compatible sed
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/YOUR_CLIENT_ID.apps.googleusercontent.com/$CLIENT_ID/g" manifest.json
  else
    sed -i "s/YOUR_CLIENT_ID.apps.googleusercontent.com/$CLIENT_ID/g" manifest.json
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Setup complete! ✓"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Next steps:"
  echo "1. Load extension in chrome://extensions/"
  echo "2. Enable Developer mode"
  echo "3. Click 'Load unpacked' → select this folder"
  echo "4. Grant Gmail permissions when prompted"
else
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Setup complete! (Manual configuration needed)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Next steps:"
  echo "1. Create OAuth credentials in Google Cloud Console"
  echo "2. Edit manifest.json and replace YOUR_CLIENT_ID (line 57)"
  echo "3. Load extension in chrome://extensions/"
fi

echo ""
echo "See SETUP.md for detailed instructions."
