# Changelog

All notable changes to this project will be documented here.

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
