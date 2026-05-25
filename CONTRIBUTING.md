# Contributing

Thanks for improving Hardware Diagnostic Suite. This project is a browser-based hardware diagnostic app, so correctness, compatibility, accessibility, and privacy matter more than broad refactors.

## Development Setup

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

The dev server is configured in `vite.config.ts` with port `3000` and `open: true`.

No `.env` file or external service setup is required by the current repository.

## Quality Gates

Run these before opening a pull request:

```sh
npm audit --audit-level=moderate
npm test
npm run test:smoke
npm run check
npm run test:e2e
npm run build
```

If a change affects a hardware-specific flow, also test it manually in at least one browser that supports the relevant API.

On a fresh machine, install the local Playwright Chromium browser before running e2e tests:

```sh
npx playwright install chromium
```

## Change Guidelines

- Preserve existing routes, tester IDs, exported symbols, and public behavior unless fixing a clear bug.
- Keep changes focused and reviewable.
- Prefer local fixes over broad rewrites.
- Do not add third-party dependencies unless the benefit clearly outweighs bundle, maintenance, and security cost.
- Do not add telemetry, analytics, external storage, or new remote endpoints without documenting the privacy and security impact.
- Keep browser API failures user-safe. Do not expose stack traces or internal diagnostics in UI messages.
- Respect permission-gated APIs. Do not try to bypass browser permission prompts.
- Preserve keyboard access, focus-visible behavior, touch targets, print output, and reduced-motion support.

## Code Organization

- Register tester metadata in `src/lib/testerRegistry.ts`.
- Wire tester components into `src/testerComponents.ts`.
- Put reusable browser capability checks in `src/lib/hardwareCapabilities.ts`.
- Put user-safe browser error messages in `src/lib/userSafeErrors.ts`.
- Keep component-specific UI in `src/components/` unless the behavior is shared.
- Keep dashboard-only UI in `src/components/dashboard/`.

## Frontend Standards

- Use semantic HTML where practical.
- Keep UI states explicit: loading, empty, error, success, disabled, and unsupported.
- Prefer existing design tokens and shared helpers before adding local styling patterns.
- Keep hardware capability checks aligned with actual tester runtime guards.
- Use stable user-facing error codes and safe messages for recoverable browser API failures.
- Avoid browser-global side effects unless they are cleaned up on unmount.

## Testing Expectations

Add or update smoke checks when changing:

- Tester registry or route metadata.
- App metadata, manifest, or deployment assumptions.
- Hardware capability detection.
- User-safe browser error handling.
- Print-specific styles or print actions.
- Known fragile hardware/browser API paths.

Add or update unit tests when changing shared logic in `src/lib/`.

Add or update Playwright tests when changing routing, responsive navigation, print-critical rendering, or app shell accessibility.

Manual verification is still required for APIs that depend on real devices, browser permissions, or secure contexts.

For manual checks, include the browser, operating system, device type, and any required hardware in the pull request notes.

## Pull Request Checklist

- The change is scoped to one coherent problem.
- Public route IDs and exported symbols are preserved.
- New tester routes are added to both `src/lib/testerRegistry.ts` and `src/testerComponents.ts`.
- No secrets, tokens, captured reports, or device data are committed.
- Type checking passes.
- Unit tests pass.
- Smoke checks pass.
- Browser route tests pass.
- Production build passes.
- Dependency audit passes.
- Browser or device caveats are documented when relevant.

## Reporting Security Issues

Do not open a public issue for a vulnerability that could expose users or systems.

Send a private report to the project maintainer with:

- A concise description of the issue.
- Affected files, flows, or browser APIs.
- Reproduction steps.
- Impact and suggested fix, if known.

Do not include sensitive user data, real credentials, or unauthorized test results.
