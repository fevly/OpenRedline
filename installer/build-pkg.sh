#!/bin/zsh
set -euo pipefail
export COPYFILE_DISABLE=1

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/dist/pkg-build"
PAYLOAD="$BUILD/payload"
SCRIPTS="$ROOT/installer/scripts"
PKG="$ROOT/dist/OpenRedline-mac-preview.pkg"

rm -rf "$BUILD"
mkdir -p "$PAYLOAD/Applications"
mkdir -p "$PAYLOAD/Library/Application Support/OpenRedline"
mkdir -p "$ROOT/dist"

zsh "$ROOT/mac-helper/build-helper.sh"
ditto "$ROOT/mac-helper/OpenRedlineHelper.app" "$PAYLOAD/Applications/OpenRedlineHelper.app"

rsync -a \
  --exclude ".git" \
  --exclude ".DS_Store" \
  --exclude ".env" \
  --exclude "data" \
  --exclude "dist" \
  --exclude "installer" \
  --exclude "assets/openredline-logo.png" \
  --exclude "docs/assets/openredline-logo.png" \
  --exclude "docs/assets/openredline-logo-256.png" \
  --exclude "mac-helper/OpenRedlineHelper.app" \
  --exclude "openredline-helper.log" \
  --exclude "src/app 2.js" \
  "$ROOT/" "$PAYLOAD/Library/Application Support/OpenRedline/"

find "$PAYLOAD" -name ".DS_Store" -delete
find "$PAYLOAD" -name "._*" -delete
xattr -cr "$PAYLOAD" 2>/dev/null || true

pkgbuild \
  --root "$PAYLOAD" \
  --scripts "$SCRIPTS" \
  --identifier "vip.openredline.mac.preview" \
  --version "0.1.0" \
  --install-location "/" \
  "$PKG"

pkgutil --check-signature "$PKG" || true
echo "Built $PKG"
