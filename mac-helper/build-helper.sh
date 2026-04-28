#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/mac-helper/OpenRedlineHelper.app"

mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
swiftc "$ROOT/mac-helper/OpenRedlineHelper.swift" \
  -framework AppKit \
  -o "$APP/Contents/MacOS/OpenRedlineHelper"
chmod +x "$APP/Contents/MacOS/OpenRedlineHelper"

echo "Built $APP"
