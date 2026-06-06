# Changelog

All notable changes to this project should be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows semantic versioning through the `version` field in `package.json`.

## [4.0.2]

### Fixed

- Corrected Node.js and npm version requirements in README and CONTRIBUTING (22/10 → 24/11 to match `package.json` engines).
- Removed stale `[FILL IN: PUBLIC_CANONICAL_URL]` references from README and SECURITY docs (URL was already set in `index.html`).
- Added `dev/`, `temp/`, `tmp/`, `scratch/`, `.worktrees/` to `.gitignore`.

### Changed

- Aligned CHANGELOG with the current package version (added 4.0.0 and 4.0.1 release notes).

## [4.0.1]

### Fixed

- Finalized documentation to match current requirements (Node 24, npm 11).
- Removed stale placeholder references from README, SECURITY, and CONTRIBUTING docs.
- Aligned CHANGELOG with the current package version.

## [4.0.0]

### Added

- Benchmark tester (CPU and memory performance).
- Wake Lock tester (prevent screen dimming).
- Clipboard tester (read and write clipboard content).
- NFC reader tester.
- Serial/HID tester for raw device communication.
- Multi-Monitor tester with window management API.
- USB/Storage tester for quota and usage info.
- Property-based test suite (16 property tests via fast-check).
- TesterErrorBoundary for crash resilience per tester route.
- Accessibility controls (theme, contrast, large text) with localStorage persistence.
- Hardware compatibility matrix on the dashboard.
- Network diagnostic runner extracted from UI with full abort/progress support.
- Architecture review document.

### Changed

- Upgraded to React 19, TypeScript 6, Vite 8, Vitest 4, Playwright 1.59.
- Node.js minimum raised to 24, npm minimum raised to 11.
- Replaced all inline browser API usage with typed adapters (`browserAdapters.ts`).
- Centralized user-facing errors with stable codes (`userSafeErrors.ts`).
- Extracted lifecycle, permissions, media, graphics, and diagnostic state helpers to `src/lib/`.
- All tester components use centralized cleanup stacks and permission preflight guards.
- Sidebar shows hardware capability readiness status per tester.
- Dashboard no longer renders tech stack labels.
- All 28 non-dashboard testers are lazy-loaded.

### Fixed

- SoundTester waveform not updating while tone is playing.
- ScreenTester refresh rate RAF loop running one extra frame.
- BurnInFixer noise canvas using fixed 320×240 in fullscreen.
- A11yControls not discoverable via screen reader landmark navigation.

## [0.0.3]

### Added

- Developer-facing README Q&A covering setup, routing, hardware API limitations, network behavior, and test responsibilities.
- Security policy with deployer considerations and a marked private disclosure contact placeholder.
- Structured changelog file.

### Changed

- Clarified README architecture, configuration, troubleshooting, and new-tester workflow to match the current source layout.
- Updated the code of conduct to use the Contributor Covenant structure with project-specific security/privacy expectations.

### Security

- Documented that a private security contact must be filled before publishing the repository as a public project.

## [0.0.2] - Release date not documented

### Added

- Current package version is visible in `package.json`.

## Earlier History

The Git history contains commit messages for `v0.0.2`, `v0.0.1a`, and earlier fixes, but the repository does not include enough release notes to reconstruct accurate change details without guessing.
