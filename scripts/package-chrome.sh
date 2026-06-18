#!/bin/bash
# Package Chrome extension for Chrome Web Store submission

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_ZIP="$PROJECT_ROOT/eventping-chrome.zip"

echo "📦 Packaging Chrome extension for Chrome Web Store..."

# Remove old package
if [ -f "$OUTPUT_ZIP" ]; then
  echo "Removing old package..."
  rm "$OUTPUT_ZIP"
fi

# Create zip from project root, include only necessary files
echo "Creating package..."
cd "$PROJECT_ROOT"

zip -r "$OUTPUT_ZIP" \
  manifest.json \
  background.js \
  content-script.js \
  popup.html \
  popup.js \
  options.html \
  options.js \
  styles.css \
  icons/ \
  -x "*.DS_Store" \
  -x "__MACOSX/*"

# Get file size
SIZE=$(du -h "$OUTPUT_ZIP" | cut -f1)

echo "✅ Package created!"
echo "📁 File: $OUTPUT_ZIP"
echo "📊 Size: $SIZE"
echo ""
echo "Next steps:"
echo "1. Go to https://chrome.google.com/webstore/devconsole"
echo "2. Click your extension (EventPing)"
echo "3. Click 'Package' → 'Upload new package'"
echo "4. Upload $OUTPUT_ZIP"
echo "5. Submit for review"
