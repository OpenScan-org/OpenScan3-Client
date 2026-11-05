# Changelog

All notable user-facing changes to OpenScan3 Client are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Added an AWB Auto-Lock button to the scan page.
- Added an experimental scan wizard that starts by helping users choose or create a project before opening the scan settings.
- Added a second scan wizard step with a fast camera preview and motor controls for positioning the object before cropping.
- Added rectangle selection in the scan wizard with centring feedback and a pedestal check hint for vertically offset objects.
- The scan wizard now applies the selected crop and starts scan analysis, showing task progress and allowing retries on errors.
- Added actionable feature quality feedback and a scan quality slider that chooses photo counts and focus stacking from the analysis, starts the scan and opens scan progress.
- Added an enabled-by-default option in the scan wizard to queue focus stack processing after the scan.
- Added expandable analysis debug values and an explicit autofocus fallback so inconclusive focus measurements no longer block the scan wizard.
- Added an Ultra scan quality level with a larger photo budget and selection of calculated focus stack options using mean and worst-view sharpness scores.
- Added a SIFT feature check before scan quality selection, with feature distribution maps, understandable quality ratings and suggestions for improving weak results.
- Matched the scan wizard crop rectangle to the scan page and added independent resizing of all four edges with mouse, touch and keyboard controls.
- Unified the motor control toolbar across the scan wizard, scan page and full preview, including the return-to-home button.
- Removed nested scan wizard cards and placed navigation inside each wizard step so content and actions share one area.

### Changed

- Updated the missing-camera dialog with a shutdown button and instructions to disconnect power before checking the camera cable; removed the image-flashing tip.

## 0.8.0 - 2026-09-15

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
