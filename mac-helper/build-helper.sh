#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/mac-helper/OpenRedlineHelper.app"

mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
swiftc "$ROOT/mac-helper/OpenRedlineHelper.swift" \
  -framework AppKit \
  -o "$APP/Contents/MacOS/OpenRedlineHelper"
chmod +x "$APP/Contents/MacOS/OpenRedlineHelper"

ICONSET="$ROOT/mac-helper/OpenRedlineHelper.iconset"
rm -rf "$ICONSET"
mkdir -p "$ICONSET"
sips -z 16 16 "$ROOT/assets/icon-80.png" --out "$ICONSET/icon_16x16.png" >/dev/null
sips -z 32 32 "$ROOT/assets/icon-80.png" --out "$ICONSET/icon_16x16@2x.png" >/dev/null
sips -z 32 32 "$ROOT/assets/icon-80.png" --out "$ICONSET/icon_32x32.png" >/dev/null
sips -z 64 64 "$ROOT/assets/icon-80.png" --out "$ICONSET/icon_32x32@2x.png" >/dev/null
sips -z 128 128 "$ROOT/assets/icon-80.png" --out "$ICONSET/icon_128x128.png" >/dev/null
sips -z 256 256 "$ROOT/assets/icon-80.png" --out "$ICONSET/icon_128x128@2x.png" >/dev/null
sips -z 256 256 "$ROOT/assets/icon-80.png" --out "$ICONSET/icon_256x256.png" >/dev/null
sips -z 512 512 "$ROOT/assets/icon-80.png" --out "$ICONSET/icon_256x256@2x.png" >/dev/null
sips -z 512 512 "$ROOT/assets/icon-80.png" --out "$ICONSET/icon_512x512.png" >/dev/null
sips -z 1024 1024 "$ROOT/assets/icon-80.png" --out "$ICONSET/icon_512x512@2x.png" >/dev/null
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/OpenRedline.icns"
rm -rf "$ICONSET"

echo "Built $APP"
