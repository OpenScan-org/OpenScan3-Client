# Changelog

All notable user-facing changes to OpenScan3 Client are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Added a camera orientation dialog that can be opened from the camera settings and scan page, allowing camera orientation to be adjusted outside the setup wizard.
- Added a warning at the start of the setup wizard when no camera is detected, including cable troubleshooting tips and a camera report download.
- Added an option in the Focus Stacking tab to schedule focus stacking automatically after a scan completes.

### Changed

- Improved the focus stacking and hq preview by removing the loading overlay while keeping the spinner visible, making focus changes easier to judge visually. (Thanks agryson!)
- Enabled resuming interrupted tasks from the task drawer.
- Added configurable fine, medium and coarse movement steps to the frontend settings, with the selected levels available in the motor controls.

### Fixed

- Focus stacking now allows setting a focus value of 0 in the frontend.
