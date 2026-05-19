# Changelog

All notable changes to this project will be documented here.

## [0.1.4] - 2026-05-20

### Added
- Username/password authentication, on by default with credentials `deck` / `deck` (editable in Settings).
- Anonymous (no-password) mode as an opt-in toggle, gated by a confirmation prompt.
- Login row on the main panel showing the active username (or "anonymous").

### Changed
- Root directory is now locked to `/`. Navigate to subdirectories from your FTP client. This sidesteps a "no access" bug seen when the configured root resolved through a symlink (notably `/run/media` for the SD card).
- Settings modal: removed the Root directory field; added Username, Password, and Anonymous access controls.
- Quick Paths panel removed from the main screen.
- Settings moved from a bottom button to a gear icon in the panel title bar. The Options section is gone; the QAM panel is now action-only.
- Login and Sharing rows merged into a single line (`<user> · /`) to tighten the FTP Server section.

### Migration
- Existing installations with a custom `root_dir` setting will start serving `/` after upgrade. Authentication is on by default, so existing users automatically gain credential protection.

## [0.1.3] - 2026-04-18

### Fixed
- Plugin failed to load with `ModuleNotFoundError: No module named 'utils'`; helper module moved to `py_modules/`.
- QAM panel opened scrolled to the bottom instead of the top when content overflowed.

### Changed
- Added Quick Paths section for one-tap root directory switching.
- Panel layout no longer jumps height when the server is toggled on or off.

## [0.1.2] - 2026-04-18

### Added
- Quick Paths section in QAM with one-tap switching between Home, SD Card, and full filesystem

### Fixed
- Partial settings updates no longer reset unspecified fields to defaults

## [0.1.1] - 2026-04-18

### Added
- Settings modal accessible from the QAM panel
- Configurable FTP port (default 2121)
- Configurable root directory (default /)

### Changed
- Server state now updates reactively via events instead of polling
- Root directory setting now properly chroots the FTP session

### Fixed
- Server getting stuck in a "running but untoggleable" state after rapid start/stop cycles, requiring a reboot to recover

## [0.1.0] - 2026-04-17

### Added
- Initial release
- Anonymous FTP server accessible from Game Mode via Quick Access Menu
- Toggle to start/stop the server
- Displays local IP and port when server is running
- Full read/write access to `/home/deck`
- pyftpdlib vendored — no internet required on the Deck
