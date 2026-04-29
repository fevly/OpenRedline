# OpenRedline Mac Preview Installer

This preview installer installs:

- `/Applications/OpenRedlineHelper.app`
- `/Library/Application Support/OpenRedline`
- npm dependencies in `/Library/Application Support/OpenRedline/node_modules`
- Word sideload manifest for the current logged-in user

Requirements:

- macOS with Microsoft Word
- Node.js available as `node`

After installation:

1. Open `OpenRedlineHelper.app` from Applications.
2. Use the menu bar icon to start the backend.
3. Open Word and look for `OpenRedline` on the Home ribbon.

Uninstall:

```bash
sudo zsh "/Library/Application Support/OpenRedline/uninstall-openredline.sh"
```

Keep local settings while uninstalling:

```bash
sudo zsh "/Library/Application Support/OpenRedline/uninstall-openredline.sh" --keep-settings
```

This preview package does not include your local `.env`, `data/settings.json`, API keys, logs, or cache files.
