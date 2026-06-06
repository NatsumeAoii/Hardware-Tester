# Hardware Diagnostic Suite

A client-side browser app for testing common hardware and browser-exposed device capabilities: input devices, media devices, sensors, display output, network behavior, printing, and system reporting.

Most tests run entirely in the browser. Network diagnostics contact public test endpoints only after the user starts the network test.

## Quick Start

```sh
npm ci
npm run dev
```

Open the Vite dev server:

```text
http://localhost:3000/
```

Vite is configured for port `3000` in `vite.config.ts` and may report another port if `3000` is already in use.

## Requirements

- Node.js 24 or newer
- npm 11 or newer
- A modern browser
- No `.env` file is required by the current codebase

Some hardware APIs require HTTPS or `localhost`. Some APIs are browser-specific or permission-gated:

- Web Bluetooth, Web MIDI, and several sensor APIs are best supported in Chromium-based browsers.
- Camera, microphone, geolocation, motion, Bluetooth, and MIDI require explicit user permission.
- Some APIs may be unavailable on desktop, mobile, private browsing, insecure contexts, or restricted enterprise browsers.

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

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Create a production build in `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run check` | Run TypeScript type checking. |
| `npm test` | Run unit tests for shared frontend logic. |
| `npm run test:smoke` | Run lightweight repository and frontend smoke checks. |
| `npm run test:e2e` | Run browser route and responsive navigation regression tests with Playwright. |

On a fresh machine, install the Chromium browser used by Playwright once:

```sh
npx playwright install chromium
```

The GitHub Actions workflow installs Chromium with system dependencies by running `npx playwright install --with-deps chromium`.

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
  lib/                  # Registries, adapters, diagnostics, formatters, and shared logic
  styles/               # Extracted component CSS
  App.tsx               # Main shell, hash routing, Suspense boundary
  app.css               # Global design tokens and shared styles
  main.tsx              # React entry point
  testerComponents.ts   # Lazy-loaded tester component map
index.html              # App HTML shell and metadata
package.json            # Scripts, engines, metadata, and dependencies
playwright.config.ts    # Playwright browser test configuration
vite.config.ts          # Vite configuration
vitest.config.ts        # Vitest unit test collection
```

## Architecture Overview

- `src/main.tsx` mounts React, applies document metadata, wraps the app with `HardwareCapabilitiesProvider`, and loads global CSS.
- `src/App.tsx` owns the app shell, hash-based routing, responsive sidebar state, and a Suspense boundary for lazy-loaded testers.
- `src/components/Sidebar.tsx` renders navigation, hardware capability status dots, and project links.
- `src/components/A11yControls.tsx` renders theme, contrast, and text-size display preference controls.
- `src/testerComponents.ts` maps every `TesterId` to a lazy-loaded React component (except Dashboard which is eagerly loaded).
- `src/lib/testerRegistry.ts` is the source of truth for tester IDs, labels, groups, dashboard descriptions, nav icons, and tech stack labels.
- `src/lib/hardwareCapabilities.ts` detects browser/device support and returns capability statuses used by the dashboard and navigation.
- `src/hooks/useHardwareCapabilities.ts` caches hardware capability snapshots and refreshes them on resize, orientation, online/offline, and visibility changes.
- `src/hooks/useAppearancePreferences.ts` stores theme, contrast, and text-size preferences in `localStorage`.
- `src/lib/userSafeErrors.ts` maps browser/API failures to stable user-safe messages.
- `src/lib/networkDiagnostics.ts` and `src/lib/networkDiagnosticRunner.ts` contain network API parsing, timeout, fallback, and test runner logic outside the UI.
- Tester components in `src/components/` own the UI and browser interactions for individual tools.

## Routing

Routing is hash-based. Tester IDs from `src/lib/testerRegistry.ts` map directly to hashes, for example:

```text
#dashboard
#keyboard
#network
#printer
#report
```

Unknown hashes are repaired to `#dashboard`.

When adding a new tester:

1. Add or update metadata in `src/lib/testerRegistry.ts`.
2. Add the component to `src/testerComponents.ts`.
3. Add shared logic to `src/lib/` only when more than one component needs it or the code is hard to test inside a component.
4. Update unit, smoke, or e2e coverage when route metadata, shared logic, or app-shell behavior changes.

## Configuration

Current configuration is code-based:

- `vite.config.ts` sets `base: './'` for relative assets, enables React and Lightning CSS, and sets the dev server port to `3000`.
- `playwright.config.ts` starts a local Vite server for browser tests and targets Chromium by default.
- `PLAYWRIGHT_HOST` and `PLAYWRIGHT_PORT` can override the local e2e server host and port.
- `CI` changes Playwright retries, workers, reporter, and server reuse behavior.
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

See [SECURITY.md](SECURITY.md) for vulnerability reporting and deployer considerations.

## Known Limitations

- Hardware support depends on the user's browser, operating system, device hardware, permissions, and secure context.
- Some tests cannot be fully validated without physical hardware such as a webcam, microphone, Bluetooth device, MIDI device, gamepad, printer, or mobile sensors.
- Automated tests cover shared logic, route rendering, responsive navigation, network request gating, WebGL probe count, and print style guards.
- Physical hardware behavior still requires manual device testing.

## Troubleshooting

- If `npm ci` fails on Windows with `EPERM` while removing native `.node` files, stop any running Vite/Node processes for this repo and retry.
- If Playwright cannot find Chromium, run `npx playwright install chromium`.
- If a hardware test says it is unsupported, confirm the page is running on `localhost` or HTTPS and try a Chromium-based browser for APIs such as Bluetooth and MIDI.
- If camera or microphone tests fail, check browser site permissions and close other apps using the device.
- If network diagnostics fail, check VPN, firewall, captive portal, or blocked public test endpoints.
- If print colors are wrong, use browser print dialog options that preserve background graphics/colors.

## Deployment

The repository includes a GitHub Pages workflow at `.github/workflows/deploy.yml`.

The workflow:

- Installs dependencies with `npm ci`.
- Runs dependency audit, unit tests, smoke checks, type checking, Playwright browser route tests, and production build.
- Uploads `dist/` to GitHub Pages.

The canonical and Open Graph URLs in `index.html` point to `https://natsumeaoii.github.io/Hardware-Tester/`.

## Q&A

<details><summary><strong>Do I need an `.env` file?</strong></summary>

No. The current codebase does not read `import.meta.env` values or document required runtime environment variables. Playwright uses process environment variables only for local test configuration: `PLAYWRIGHT_HOST`, `PLAYWRIGHT_PORT`, and `CI`.

</details>

<details><summary><strong>Why do some hardware tests show unsupported in my browser?</strong></summary>

The app depends on browser-exposed hardware APIs. Some require HTTPS or `localhost`, some require user permission, and some are only available in specific browsers or device classes. Web Bluetooth, Web MIDI, and several sensor APIs are most likely to work in Chromium-based browsers.

</details>

<details><summary><strong>When does the app make network requests?</strong></summary>

The app loads Google Fonts from `index.html`. Network diagnostics contact public test endpoints only after the user starts the network test. The e2e suite includes a regression that the network route does not contact third-party diagnostic endpoints before user action.

</details>

<details><summary><strong>How do I add a new tester?</strong></summary>

Add the tester metadata in `src/lib/testerRegistry.ts`, map the component in `src/testerComponents.ts`, and add route or shared-logic coverage when needed. If the tester appears on the dashboard, include a `dashboardDescription` in the registry.

</details>

<details><summary><strong>Why does `npm ci` sometimes fail on Windows with `EPERM`?</strong></summary>

Native packages such as Lightning CSS can leave `.node` files locked while a dev server, editor, antivirus scanner, or previous test process is still using them. Stop Vite/Node processes for this repo and retry `npm ci`.

</details>

<details><summary><strong>Where is the canonical URL configured?</strong></summary>

The canonical and Open Graph URLs are set in `index.html` and point to the GitHub Pages deployment: `https://natsumeaoii.github.io/Hardware-Tester/`. Update these if the deployment target changes.

</details>

<details><summary><strong>Why are there both unit tests and Playwright tests?</strong></summary>

Vitest covers shared logic in `src/lib/`. Playwright covers route rendering, navigation behavior, network request gating, print-critical styles, and the WebGL probe-count regression in a browser.

</details>

<details><summary><strong>Can automated tests validate every hardware flow?</strong></summary>

No. Browser permissions and physical devices such as cameras, microphones, Bluetooth devices, MIDI devices, gamepads, printers, and mobile sensors still require manual testing on real hardware.

</details>

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local development, quality gates, and pull request expectations.

## Code Of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

Licensed under the [MIT License](LICENSE.md).
