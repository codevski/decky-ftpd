# decky-ftpd

> An FTP server for Steam Deck Game Mode — no desktop required.  
> Inspired by ftpd on PSP / PS Vita.

## Features

- 📡 Start/stop an FTP server directly from the Quick Access Menu
- 🔗 Shows your local IP + port so you can connect instantly
- 📁 Shares `/home/deck` with full read/write (anonymous login)
- ⚡ pyftpdlib vendored at runtime into `py_modules/` — zero setup
- 🔒 Runs as root via `_root` flag — port 21 works out of the box

## Usage

1. Install via Decky Loader (plugin browser or manual drop into `~/homebrew/plugins/`)
2. Open the Quick Access Menu (`…` button)
3. Toggle **Enable FTP Server** ON
4. Connect from any FTP client on the same Wi-Fi:
   ```
   Host:     <IP shown in panel>
   Port:     21
   Username: anonymous  (or leave blank)
   Password: (anything / empty)
   ```

Works with FileZilla, WinSCP, Cyberduck, Total Commander, `ftp` CLI, and most file managers.

## Development

```bash
# Install deps (uses pnpm)
pnpm install

# Build frontend
pnpm build

# Watch mode during development
pnpm watch

# Deploy to Deck over SSH (adjust IP)
zip -r decky-ftpd.zip dist/ main.py plugin.json package.json py_modules/
rsync -av decky-ftpd.zip deck@<DECK_IP>:~/Downloads
```

The Python backend auto-installs `pyftpdlib` into `py_modules/` on first launch.

## Roadmap / follow-up PRs

- [ ] Settings page: custom port, root directory, passive port range
- [ ] Username/password auth option  
- [ ] MicroSD shortcut (`/run/media/mmcblk0p1`)
- [ ] Active connection count in the status line

## License

MIT
