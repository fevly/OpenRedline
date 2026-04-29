#!/bin/zsh
set -euo pipefail

KEEP_SETTINGS=0
if [ "${1:-}" = "--keep-settings" ]; then
  KEEP_SETTINGS=1
fi

APP_SUPPORT="/Library/Application Support/OpenRedline"
APP_PATH="/Applications/OpenRedlineHelper.app"
MANIFEST_NAME="openredline.xml"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run with sudo:"
  echo "sudo zsh \"$0\""
  exit 1
fi

pkill -f "OpenRedlineHelper" 2>/dev/null || true
pkill -f "$APP_SUPPORT/server.js" 2>/dev/null || true
lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null | while read -r pid; do
  [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
done

CONSOLE_USER="$(stat -f %Su /dev/console)"
CONSOLE_HOME="$(dscl . -read "/Users/$CONSOLE_USER" NFSHomeDirectory 2>/dev/null | awk '{print $2}')"

if [ "$CONSOLE_USER" != "root" ] && [ -d "$CONSOLE_HOME" ]; then
  rm -f "$CONSOLE_HOME/Library/Containers/com.microsoft.Word/Data/Documents/wef/$MANIFEST_NAME"
  rm -rf "$CONSOLE_HOME/Library/Containers/com.microsoft.Word/Data/Library/Caches/com.microsoft.Word/WebKit/LocalStorage"/*openredline* 2>/dev/null || true
fi

rm -rf "$APP_PATH"

if [ "$KEEP_SETTINGS" -eq 1 ] && [ -d "$APP_SUPPORT/data" ]; then
  TMP_SETTINGS="$(mktemp -d)"
  ditto "$APP_SUPPORT/data" "$TMP_SETTINGS/data"
  rm -rf "$APP_SUPPORT"
  mkdir -p "$APP_SUPPORT"
  ditto "$TMP_SETTINGS/data" "$APP_SUPPORT/data"
  rm -rf "$TMP_SETTINGS"
  if [ "$CONSOLE_USER" != "root" ] && [ -d "$CONSOLE_HOME" ]; then
    chown -R "$CONSOLE_USER":staff "$APP_SUPPORT"
  fi
else
  rm -rf "$APP_SUPPORT"
fi

echo "OpenRedline uninstalled."
