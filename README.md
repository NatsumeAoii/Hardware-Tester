# Hardware Diagnostic Suite

A client-side browser app for testing common hardware and browser-exposed device capabilities: input devices, media devices, sensors, display output, network behavior, printing, and system reporting.

Most tests run entirely in the browser. Network diagnostics contact public test endpoints only after the user starts the network test.

## Features

- Dashboard with detected device profile, browser capabilities, and compatibility status.
- Keyboard, mouse, double-click, gamepad, touch, and pen input tests.
- Screen, microphone, speaker, webcam, vibration, printer, and stuck-pixel utility tests.
- Battery, GPU/WebGL, motion, geolocation, ambient light, Bluetooth LE, MIDI, and network diagnostics.
- System report workflow with print-safe output.
- Light, dark, system, high-contrast, and large-text display preferences.
- Hash-based routing for direct links to individual tools.
- Web app metadata and manifest for install/share support.

## Tech Stack

- React 19
- TypeScript 6
- Vite 8
- Lightning CSS
- Vitest
- Playwright
- GitHub Pages workflow

## Requirements

- Node.js 22 or newer
- npm
- A modern browser
- No environment variables are required by the current codebase.

Some hardware APIs require HTTPS or localhost. Some APIs are browser-specific or permission-gated:

- Web Bluetooth, Web MIDI, and several sensor APIs are best supported in Chromium-based browsers.
- Camera, microphone, geolocation, motion, Bluetooth, and MIDI require explicit user permission.
- Some APIs may be unavailable on desktop, mobile, private browsing, insecure contexts, or restricted enterprise browsers.

## Quick Start

```sh
npm ci
npm run dev
```

The Vite dev server is configured for port `3000` and opens the browser automatically when possible. Open:

```text
http://localhost:3000/
```

If port `3000` is already in use, Vite may report an alternate port in the terminal.

## Scripts

```sh
npm run dev
```

Start the Vite development server.

```sh
npm run build
```

Create a production build in `dist/`.

```sh
npm run preview
```

Serve the production build locally.

```sh
npm run check
```

Run TypeScript type checking.

```sh
npm test
```

Run unit tests for shared frontend logic.

```sh
npm run test:smoke
```

Run lightweight frontend smoke checks for routing metadata, browser capability handling, print safeguards, app metadata, and CI expectations.

```sh
npm run test:e2e
```

Run browser route and responsive navigation regression tests with Playwright. On a fresh machine, install the Chromium test browser once with:

```sh
npx playwright install chromium
```

## Verification

Before opening a pull request or publishing a build, run the same checks used by CI:

```sh
npm audit --audit-level=moderate
npm test
npm run test:smoke
npm run check
npm run test:e2e
npm run build
```

## Project Structure

```text
.
.github/workflows/      # GitHub Pages deployment workflow
public/                 # Static public assets and web manifest
scripts/                # Local smoke checks
tests/e2e/              # Playwright browser regression tests
src/
  components/           # Hardware tester UI components
  components/dashboard/ # Dashboard-specific subcomponents
  hooks/                # Shared React hooks
  lib/                  # Test registry, metadata, capabilities, errors
  App.tsx               # Main shell, sidebar, hash routing, display controls
  app.css               # Global design tokens and shared styles
  main.tsx              # React entry point
index.html              # App HTML shell and metadata
package.json            # Scripts and dependencies
playwright.config.ts    # Playwright browser test configuration
vite.config.ts          # Vite configuration
```

## Architecture Overview

- `src/main.tsx` mounts React, applies document metadata, and loads global CSS.
- `src/App.tsx` owns the app shell, sidebar navigation, hash-based routing, responsive sidebar state, and display preference controls.
- `src/lib/testerRegistry.ts` is the source of truth for tester IDs, labels, groups, dashboard descriptions, nav icons, and tech stack labels.
- `src/lib/hardwareCapabilities.ts` detects browser/device support and returns capability statuses used by the dashboard and navigation.
- `src/lib/userSafeErrors.ts` maps browser/API failures to stable user-safe messages.
- `src/hooks/useAppearancePreferences.ts` stores theme, contrast, and text-size preferences in `localStorage`.
- `src/hooks/useHardwareCapabilities.ts` refreshes capability detection on resize, orientation, online/offline, and visibility changes.
- Tester components in `src/components/` are mostly self-contained and may include component-local styles.

## Routing

Routing is hash-based. Tester IDs from `src/lib/testerRegistry.ts` map directly to hashes, for example:

```text
#dashboard
#keyboard
#network
#printer
#report
```

Unknown hashes are replaced with `#dashboard`.

When adding a new tester, update the registry and wire the component in `src/App.tsx`. If the tester appears on the dashboard, include a `dashboardDescription`.

## Configuration

Current configuration is code-based:

- `vite.config.ts` sets `base: './'` for relative assets, enables React and Lightning CSS, and sets the dev server port to `3000`.
- `playwright.config.ts` starts a local Vite server for browser tests and targets Chromium by default. `PLAYWRIGHT_HOST` and `PLAYWRIGHT_PORT` can override the local e2e server host and port.
- `tsconfig.json` enables strict TypeScript checks and includes `src`.
- `index.html` contains app metadata, structured data, and the manifest link.
- `public/site.webmanifest` defines install/display metadata.

There are no documented `.env` files or required runtime configuration values in the current repository.

## Privacy And Security

- Hardware, camera, microphone, sensor, and report data are handled client-side.
- Appearance preferences are stored locally in the browser under `hardware-suite:appearance`.
- Network diagnostics make outbound requests only when the network test is started.
- Do not add telemetry, analytics, persistent remote storage, or new external endpoints without documenting the data flow and privacy impact.
- Do not commit secrets, tokens, private keys, `.env` files, or captured user/device data.

## Known Limitations

- Hardware support depends on the user's browser, operating system, device hardware, permissions, and secure context.
- Some tests cannot be fully validated without physical hardware such as a webcam, microphone, Bluetooth device, MIDI device, gamepad, printer, or mobile sensors.
- Automated tests cover shared logic, route rendering, responsive navigation, and print style guards. Physical hardware behavior still requires manual device testing.
- The project is licensed under the MIT License in `LICENSE.md`.

## Troubleshooting

- If a hardware test says it is unsupported, confirm the page is running on `localhost` or HTTPS and try a Chromium-based browser for APIs such as Bluetooth and MIDI.
- If camera or microphone tests fail, check browser site permissions and close other apps using the device.
- If network diagnostics fail, check VPN, firewall, captive portal, or blocked public test endpoints.
- If print colors are wrong, use the browser print dialog options that preserve background graphics/colors.
- If `npm ci` fails, verify Node.js 22 or newer and recreate `node_modules` only if the install is corrupted.

## Deployment

The repository includes a GitHub Pages workflow at `.github/workflows/deploy.yml`.

The workflow:

- Installs dependencies with `npm ci`.
- Runs dependency audit, unit tests, smoke checks, type checking, Playwright browser route tests, and production build.
- Uploads `dist/` to GitHub Pages.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local development, quality gates, and pull request expectations.

## Code Of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

Licensed under the [MIT License](LICENSE.md).
