# Architecture Review: Hardware Diagnostic Suite

**Date:** June 3, 2026  
**Reviewer:** Principal Software Architect (automated)  
**Version reviewed:** 4.0.1

---

## Architecture Map

### Structure

Client-side single-page application (SPA) with no backend:

```
Entry:       index.html → main.tsx → App.tsx
Routing:     Hash-based (#keyboard, #network), validated against testerRegistry
Components:  30 tester components (28 lazy-loaded, 2 eager)
Hooks:       3 custom hooks (appearance, device specs, hardware capabilities)
Lib:         18 utility/logic modules (formatters, diagnostics, adapters, state)
Tests:       15 unit test files + 13 property-based tests + 1 e2e spec + 1 smoke script
Build:       Vite 8, TypeScript 6 strict, Lightning CSS, Playwright, Vitest
Deploy:      GitHub Actions → GitHub Pages
```

### Boundaries

| Layer | Responsibility |
|---|---|
| `src/components/` | UI rendering, user interaction, local component state |
| `src/hooks/` | Shared stateful logic (appearance, specs, capabilities) |
| `src/lib/` | Pure logic, browser API adapters, formatters, diagnostics |
| `src/styles/` | Layout-level CSS (sidebar, content area, a11y controls) |
| `src/app.css` | Design tokens, resets, shared component classes |
| `scripts/` | Build-time structural contract validation |
| `tests/e2e/` | Browser-based route and interaction tests |

### Data Flow

1. User lands on page → `main.tsx` renders `App` inside `HardwareCapabilitiesProvider`
2. `App` reads hash → resolves to `TesterId` → selects lazy component from `testerComponents`
3. `Sidebar` shows all testers with capability status dots (from context)
4. Each tester component owns its state, uses `lib/` modules for browser API interaction
5. No network calls until user action (except dashboard device spec detection which is synchronous)

---

## Findings & Recommendations

| Priority | Area | Problem | Recommendation | Effort | Status |
|---|---|---|---|---|---|
| Medium | CSS architecture | Inline `<style>` tags inside 28+ components bypass Lightning CSS bundling/minification | Extract component styles to collocated `.css` files imported at the top of each component. Migrate incrementally. | Medium | Accepted tradeoff (colocation + lazy-loading makes this low-impact) |
| Medium | `deviceDiagnostics.ts` scope | Module handles 6+ different concerns (browser detection, device type, GPU info, RAM, heap, connection, screen, battery) | Consider splitting into `browserDetection.ts` and `systemProbes.ts` if the file continues to grow beyond ~200 lines. | Low | Deferred (file is only ~105 lines) |
| Medium | Error boundary | No React error boundary wrapping lazy-loaded tester components. Unexpected render errors crash the entire app. | Add an error boundary around `<Suspense>` in `App.tsx` with recovery UI. | Low | **Fixed** — `TesterErrorBoundary.tsx` |
| Medium | Dependency direction | Property tests in `lib/__tests__/` imported pure functions from `components/`, violating layer boundaries. | Extract `computePercentage` and `computeLayoutRects` to `lib/displayLayout.ts`. | Low | **Fixed** |
| Low | Bundle monitoring | No bundle size tracking or budget enforcement in CI | Add a size check in CI that fails if the main chunk exceeds 200KB compressed. | Low | Acceptable (main chunk is 76.9KB gzipped — well under budget) |
| Low | `index.html` placeholders | Two `[FILL IN: PUBLIC_CANONICAL_URL]` placeholders remain in production HTML | Replace with actual GitHub Pages URL or inject via Vite plugin during build. | Low | **Fixed** |
| Low | Network test server naming | "Google"/"Apple"/"Mozilla" servers use Cloudflare for speed tests, only their own URLs for ping | Add UI note or rename to clarify the actual test topology. | Low | Accepted tradeoff (CORS limitation, user-facing behavior is fine) |
| Low | Accessibility landmark | `A11yControls` pill uses `aria-label` on a `<div>` which is not a landmark | Change to `<section>` or add `role="region"` so screen readers discover it via landmark navigation. | Low | **Fixed** |

---

## Architecture Summary

- **Current structure:** Well-architected client-side SPA with clear layer separation (components → hooks → lib), centralized metadata, aggressive code splitting (28 lazy-loaded routes), hash-based routing, TypeScript strict mode.
- **Major strengths:** Self-enforcing architecture via smoke tests, excellent error handling with stable codes, clean dependency injection for testability, minimal runtime dependencies (React only), proper resource cleanup, graceful degradation for unsupported hardware.
- **Critical structural problems:** None.
- **High priority improvements:** All resolved.
- **Acceptable tradeoffs:** Inline styles (colocation + lazy-loading), single deviceDiagnostics module (domain cohesion, only 105 lines), hash routing without library (flat route structure), no global state (independent testers).
- **Changes made in this review:**
  1. Added `TesterErrorBoundary` component for crash resilience
  2. Fixed `A11yControls` to use `<section role="region">` for landmark discovery
  3. Replaced placeholder canonical/OG URLs with actual GitHub Pages URL
  4. Extracted `computePercentage` and `computeLayoutRects` to `lib/displayLayout.ts` to fix layer boundary violation

---

## Performance Optimization Pass

**Date:** June 3, 2026

### Changes Made

| File | Optimization | Evidence |
|---|---|---|
| `src/hooks/useHardwareCapabilities.ts` | Replaced `.filter().length` with a single `for` loop for `availableCount` | Eliminates intermediate array allocation on every capability refresh (26 items) |
| `src/lib/hardwareCapabilities.ts` | Added `as const` status literals for better tree-shaking of unused branches | Minor type-level improvement |
| `src/components/KeyboardTester.tsx` | Moved `totalKeys` computation to module-level constant (`TOTAL_KEYS`) | Was recomputed on every render (14 rows × filter per row) during rapid keystroke re-renders |
| `src/components/KeyboardTester.tsx` | Added early-return in `setPressedKeys`/`setActivatedKeys` when key already in Set | Prevents allocating a new Set object + triggering a re-render when holding a key (keydown repeats) |
| `src/components/Dashboard.tsx` | Moved `new Date().getFullYear()` to module-level `CURRENT_YEAR` | Eliminates Date allocation on every Dashboard render |
| `src/components/dashboard/CompatibilityMatrix.tsx` | Replaced two `.filter()` passes with a single `for` loop in `platformSummary` | Single pass over 26 capabilities instead of two separate filter+count passes |

### Performance Summary

- **Critical paths identified:** Initial render (hardware detection + WebGL probe + device specs), KeyboardTester keydown hot path, Dashboard/CompatibilityMatrix render cycle
- **Unnecessary work eliminated:** Redundant Set allocation on repeated keydown events (key hold), duplicate array filtering in CompatibilityMatrix, per-render Date instantiation, per-render totalKeys recomputation
- **Algorithmic improvements:** Two O(n) filter passes replaced with single O(n) for loop in CompatibilityMatrix; O(n) reduce replaced with module-level constant in KeyboardTester
- **I/O and network improvements:** None needed — network calls are already user-initiated with AbortController, timeouts, and debouncing
- **Memory improvements:** KeyboardTester no longer allocates a new Set on every repeated keydown event (key repeat fires ~30/sec while held)
- **Micro-optimizations applied:** Module-level year constant, `as const` status narrowing
- **Correctness preserved (confirmed):** All 102 unit tests pass, smoke tests pass, TypeScript strict check passes, production build succeeds
- **Tradeoffs made and why:** None — all changes are strictly improvements with no readability cost
- **Assumptions about scale, environment, or data:** Hardware capability list is 26 items (small N, so algorithmic changes are about eliminating allocations, not asymptotic complexity). KeyboardTester is the only component with high-frequency event handlers (30+ events/sec during key hold).

---

## Correctness & Resilience Pass

**Date:** June 3, 2026

### Bugs Fixed

| File | Bug | Fix |
|---|---|---|
| `src/components/SoundTester.tsx` | Changing waveform type while tone is playing had no effect — oscillator kept the old waveType | Added `oscillatorRef.current.type = waveType` to the live-update useEffect, and included `waveType` in its dependency array |
| `src/components/ScreenTester.tsx` | Refresh rate measurement RAF loop continued for one extra frame after hitting 60 samples — the `return` didn't cancel the already-scheduled next frame | Set `cancelled = true` before returning so the dangling callback exits immediately |
| `src/components/BurnInFixer.tsx` | Noise canvas used fixed 320×240 resolution even in fullscreen, producing very coarse grain ineffective for pixel recovery | Canvas now resizes to `min(screen.width, 1920) × min(screen.height, 1080)` before starting the animation |

### Summary

- **Bugs and logic fixed:** 3 (SoundTester waveform live-update, ScreenTester RAF leak, BurnInFixer canvas resolution)
- **Robustness improvements:** Canvas sizing for effective pixel stimulation; proper RAF termination
- **Modularity changes:** None needed — code is already well-structured
- **Performance changes:** None in this pass (covered in previous pass)
- **Assumptions and unresolved risks:** GamepadTester `setVibrating(false)` may be called after unmount if the vibration timeout fires during navigation — this is harmless (React ignores state updates on unmounted components in v19) but not ideal. Left as-is since the fix (adding a mounted ref) adds complexity for a no-op scenario.
- **Self-corrections made during recheck:** Fixed variable name collision in BurnInFixer where `const canvas` was declared twice in the same block scope after the resize addition.
