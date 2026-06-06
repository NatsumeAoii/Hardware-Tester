# Security Policy

## Supported Versions

The repository does not document a long-term support policy.

Until maintainers define one, treat the `main` branch and the latest version in `package.json` as the only supported line for security fixes.

| Version | Supported |
| --- | --- |
| 4.x | Yes |
| Earlier versions | No documented support |

## Reporting A Vulnerability

Do not publish vulnerability details in public issues, pull requests, discussions, screenshots, or logs.

Private disclosure contact:

```text
[FILL IN: SECURITY_CONTACT]
```

This placeholder must be replaced with a real private contact method before the repository is published for external contributors. Acceptable options include a monitored security email address or a private vulnerability reporting process configured for the repository.

When reporting, include:

- A concise description of the issue.
- Affected files, routes, browser APIs, or workflows.
- Reproduction steps.
- Expected and actual behavior.
- Impact assessment.
- Suggested fix, if known.

Do not include real credentials, private keys, precise user location, private network details, or captured device/user data unless the maintainer explicitly requests it through the private channel.

## Response Expectations

The repository does not currently publish a formal response SLA. Until one is defined, maintainers should acknowledge valid reports as soon as practical, keep reporters updated when a fix is being prepared, and coordinate disclosure timing before public details are released.

Recommended maintainer process:

1. Acknowledge receipt through the private channel.
2. Confirm whether the report is reproducible.
3. Assess severity and affected versions.
4. Prepare a fix without exposing exploit details in public commit messages.
5. Credit the reporter if they request credit and it is safe to do so.
6. Publish disclosure notes after the fix is available.

## Security Considerations For Deployers

- Serve the app over HTTPS. Several browser hardware APIs require secure contexts.
- Keep the canonical and Open Graph URLs in `index.html` accurate for the deployment target.
- Do not add analytics, telemetry, persistent remote storage, or new external endpoints without documenting the data flow and privacy impact.
- Keep dependency audit in CI: `npm audit --audit-level=moderate`.
- Do not commit `.env` files, captured reports, tokens, private keys, or device/user data.
- Network diagnostics intentionally contact public test endpoints only after user action.

## Known Security Boundaries

- The app is client-side and does not include a backend API in the current repository.
- Hardware, camera, microphone, sensor, and report data are handled in the browser.
- Browser permission prompts are the enforcement boundary for camera, microphone, geolocation, motion, Bluetooth, MIDI, and related APIs.
- UI hiding must not be treated as authorization if backend functionality is added later.
