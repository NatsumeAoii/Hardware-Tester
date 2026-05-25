# Implementation Plan: New Hardware Testers

## Overview

Add seven new hardware diagnostic testers (USB/Storage, Multi-Monitor, NFC, Serial/HID, Clipboard, Wake Lock, Performance Benchmark) to the existing Hardware Diagnostic Suite. Each tester is a standalone React component registered in the tester registry, mapped in the component map, and rendered via hash-based routing. Implementation uses TypeScript with React 19, Vitest for unit tests, and fast-check for property-based tests.

## Tasks

- [x] 1. Set up shared infrastructure and utility functions
  - [x] 1.1 Extend the tester registry with new tester IDs and metadata
    - Add 7 new entries to the `TesterId` union type in `src/lib/testerRegistry.ts`: `usb-storage`, `multi-monitor`, `nfc`, `serial-hid`, `clipboard`, `wake-lock`, `benchmark`
    - Add corresponding entries to the `testers` array with id, label, group, and dashboardDescription
    - Add SVG icon paths to `navIconPaths` for each new tester
    - Update `reportGroups` to include new tester IDs in appropriate groups
    - _Requirements: 1.8, 2.7, 3.8, 4.8, 5.8, 6.8, 7.9_

  - [x] 1.2 Create hex formatting utility module
    - Create `src/lib/hexFormat.ts` with `formatBytesAsHex(data: ArrayBuffer | Uint8Array): string` and `formatLogEntry(data: Uint8Array, reportId?: number): { hex: string; timestamp: string }`
    - `formatBytesAsHex` produces space-separated two-character uppercase hex values
    - `formatLogEntry` adds ISO timestamp and optional report ID
    - _Requirements: 4.2, 4.4_

  - [x] 1.3 Add new formatter functions to existing formatters module
    - Add `formatHhMmSs(totalSeconds: number): string` to `src/lib/formatters.ts`
    - Add `formatOpsPerSecond(operations: number, durationMs: number): string`
    - Add `formatMbPerSecond(bytes: number, durationMs: number): string`
    - _Requirements: 6.7, 7.1, 7.2_

  - [x] 1.4 Create benchmark runner utility module
    - Create `src/lib/benchmarkRunner.ts` with `runCpuBenchmark` and `runMemoryBenchmark` functions
    - Both accept `onProgress` callback and `AbortSignal` for cancellation
    - Use chunked execution via `setTimeout`/`requestAnimationFrame` to avoid blocking main thread > 50ms
    - CPU benchmark: timed computation loop for 3 seconds, returns ops/sec
    - Memory benchmark: allocate and measure throughput for 3 seconds, returns MB/s
    - _Requirements: 7.1, 7.2, 7.8_

  - [x] 1.5 Extend hardware capabilities with new API detection entries
    - Add 7 new capability entries to `src/lib/hardwareCapabilities.ts` for storage-api, window-management, web-nfc, web-hid, clipboard, wake-lock, and perf-timing
    - Each entry links to its corresponding tester ID and platform
    - _Requirements: 8.3, 8.7_

  - [x] 1.6 Install fast-check as a dev dependency
    - Run `npm install --save-dev fast-check` to add property-based testing library
    - Create `src/lib/__tests__/properties/` directory for property test files
    - _Requirements: (testing infrastructure)_

- [x] 2. Implement USB/Storage Tester
  - [x] 2.1 Create UsbStorageTester component
    - Create `src/components/UsbStorageTester.tsx` as a default-exported functional component
    - Detect `navigator.storage` availability on mount; show Unsupported_State if missing
    - Query `navigator.storage.estimate()` to get quota and usage
    - Display formatted quota, usage (using existing `formatBytes`), and percentage indicator
    - Handle quota === 0 by displaying 0% (no division by zero)
    - Provide a refresh button that re-queries without page reload
    - Handle API errors gracefully via `userSafeErrors`
    - Use `tester-panel__header` and `tester-panel__body` layout structure
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 8.1, 8.3, 8.5, 8.6, 8.8_

  - [x] 2.2 Register UsbStorageTester in the component map
    - Add import and mapping for `usb-storage` → `UsbStorageTester` in `src/testerComponents.ts`
    - _Requirements: 1.9_

  - [x] 2.3 Write property test for storage percentage calculation
    - **Property 1: Storage percentage calculation**
    - Create `src/lib/__tests__/properties/storagePercentage.prop.test.ts`
    - Generate random quota (≥0) and usage (≥0) pairs using fast-check
    - Verify percentage = Math.round((usage / quota) * 100) clamped to [0, 100] when quota > 0, and 0 when quota === 0
    - Minimum 100 iterations
    - **Validates: Requirements 1.4, 1.5**

- [x] 3. Implement Multi-Monitor Tester
  - [x] 3.1 Create MultiMonitorTester component
    - Create `src/components/MultiMonitorTester.tsx` as a default-exported functional component
    - Detect `window.getScreenDetails` availability; show Unsupported_State if missing
    - Request window management permission and handle denial with instructions
    - Display list of screens with resolution, position, device pixel ratio, and label
    - Mark primary screen with a visible "Primary" label
    - Listen for `screenschange` event to update within 2 seconds
    - Render visual layout diagram with proportionally positioned/scaled rectangles
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 8.1, 8.3, 8.5, 8.6_

  - [x] 3.2 Register MultiMonitorTester in the component map
    - Add import and mapping for `multi-monitor` → `MultiMonitorTester` in `src/testerComponents.ts`
    - _Requirements: 2.8_

  - [x] 3.3 Write property test for screen data completeness
    - **Property 2: Multi-monitor screen data completeness**
    - Create `src/lib/__tests__/properties/screenData.prop.test.ts`
    - Generate random arrays of screen objects with resolution, position, dpr, label, isPrimary
    - Verify all fields are present in output and exactly one screen is marked Primary
    - **Validates: Requirements 2.1, 2.4**

  - [x] 3.4 Write property test for layout diagram proportional positioning
    - **Property 3: Screen layout diagram proportional positioning**
    - Create `src/lib/__tests__/properties/layoutDiagram.prop.test.ts`
    - Generate screen configs with various offsets and sizes
    - Verify relative distances are proportional and aspect ratios match
    - **Validates: Requirements 2.6**

- [x] 4. Implement NFC Tester
  - [x] 4.1 Create NfcTester component
    - Create `src/components/NfcTester.tsx` as a default-exported functional component
    - Detect `NDEFReader` availability; show Unsupported_State with Chrome Android + HTTPS hint
    - Implement start/stop scan controls using NDEFReader with AbortController
    - Display tag serial number and NDEF records (record type + UTF-8 payload)
    - Handle zero-record tags with "no NDEF data" message
    - Show scan status indicator: idle, active, or detected (mutually exclusive)
    - Handle permission denial with instructions
    - Handle read errors via `userSafeErrors` without exposing internals
    - Clean up AbortController on unmount
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 8.1, 8.3, 8.6, 8.7_

  - [x] 4.2 Register NfcTester in the component map
    - Add import and mapping for `nfc` → `NfcTester` in `src/testerComponents.ts`
    - _Requirements: 3.9_

  - [x] 4.3 Write property test for NFC tag data display completeness
    - **Property 4: NFC tag data display completeness**
    - Create `src/lib/__tests__/properties/nfcTagDisplay.prop.test.ts`
    - Generate random tag data with serial numbers and 0–N NDEF records
    - Verify serial number displayed, all records shown, or "no NDEF data" when N=0
    - **Validates: Requirements 3.1, 3.2**

  - [x] 4.4 Write property test for NFC scan status state exclusivity
    - **Property 5: NFC scan status state exclusivity**
    - Create `src/lib/__tests__/properties/nfcStatus.prop.test.ts`
    - Generate sequences of scan lifecycle events (start, tag-detected, stop, error)
    - Verify status is always exactly one of: idle, active, detected
    - **Validates: Requirements 3.7**

- [x] 5. Checkpoint - Verify first batch of testers
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Serial/HID Tester
  - [x] 6.1 Create SerialHidTester component
    - Create `src/components/SerialHidTester.tsx` as a default-exported functional component
    - Detect `navigator.hid` and `navigator.serial` availability independently
    - Show Unsupported_State only if BOTH APIs are unavailable; otherwise enable available section
    - HID section: request device via picker, display product name, vendor/product ID, collection usage pages/IDs
    - HID input reports: append log entries with report ID, hex bytes, timestamp (max 200 entries)
    - Serial section: request port via picker, open at user-selected baud rate (default 9600)
    - Serial data: display incoming data as hex log with timestamps (max 200 entries)
    - Provide independent connect/disconnect controls for each section
    - Handle connection failures and unexpected disconnects via `userSafeErrors`
    - Close ports and device handles on unmount
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.10, 8.1, 8.3, 8.6_

  - [x] 6.2 Register SerialHidTester in the component map
    - Add import and mapping for `serial-hid` → `SerialHidTester` in `src/testerComponents.ts`
    - _Requirements: 4.9_

  - [x] 6.3 Write property test for hex formatting and log entry cap
    - **Property 6: Device log hex formatting and entry cap**
    - Create `src/lib/__tests__/properties/hexFormatAndCap.prop.test.ts`
    - Generate random byte arrays, verify hex string has L space-separated 2-char uppercase hex values
    - Generate log sequences > 200 entries, verify retained log is exactly 200 (most recent)
    - **Validates: Requirements 4.2, 4.4**

- [x] 7. Implement Clipboard Tester
  - [x] 7.1 Create ClipboardTester component
    - Create `src/components/ClipboardTester.tsx` as a default-exported functional component
    - Detect `navigator.clipboard` availability; show Unsupported_State if missing
    - Implement write test: write sample text to clipboard, show success status
    - Implement read test: read clipboard contents, display in read-only text area
    - Query and display permission states for clipboard-read and clipboard-write
    - Handle permission denial with specific message identifying which permission
    - Handle operation failures via `userSafeErrors`
    - Clear displayed clipboard contents on unmount/navigation away
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 8.1, 8.3, 8.6_

  - [x] 7.2 Register ClipboardTester in the component map
    - Add import and mapping for `clipboard` → `ClipboardTester` in `src/testerComponents.ts`
    - _Requirements: 5.9_

  - [x] 7.3 Write property test for clipboard permission state display
    - **Property 7: Clipboard permission state display**
    - Create `src/lib/__tests__/properties/clipboardPermission.prop.test.ts`
    - Generate all combinations of clipboard-read and clipboard-write permission states
    - Verify both permission names and their state values are displayed
    - **Validates: Requirements 5.5**

- [x] 8. Implement Wake Lock Tester
  - [x] 8.1 Create WakeLockTester component
    - Create `src/components/WakeLockTester.tsx` as a default-exported functional component
    - Detect `navigator.wakeLock` availability; show Unsupported_State and disable controls if missing
    - Implement activate: request screen wake lock, show "Active" status with elapsed timer
    - Implement deactivate: release wake lock, stop timer, show "Inactive" status
    - Handle system-initiated release (tab hidden, low battery): show "Released" with reason
    - Show re-acquire button when document becomes visible after visibility-triggered release
    - Display duration timer in HH:MM:SS format updating every 1 second
    - Handle request failures via `userSafeErrors`
    - Release WakeLockSentinel on unmount
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 8.1, 8.3, 8.6_

  - [x] 8.2 Register WakeLockTester in the component map
    - Add import and mapping for `wake-lock` → `WakeLockTester` in `src/testerComponents.ts`
    - _Requirements: 6.9_

  - [x] 8.3 Write property test for HH:MM:SS duration formatting
    - **Property 8: Duration timer HH:MM:SS formatting**
    - Create `src/lib/__tests__/properties/durationFormat.prop.test.ts`
    - Generate non-negative integers for elapsed seconds
    - Verify output matches `HH:MM:SS` pattern with correct zero-padding and arithmetic
    - **Validates: Requirements 6.7**

- [x] 9. Checkpoint - Verify second batch of testers
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Performance Benchmark Tester
  - [x] 10.1 Create BenchmarkTester component
    - Create `src/components/BenchmarkTester.tsx` as a default-exported functional component
    - Check `performance.now()` resolution; show Unsupported_State if coarser than 5μs
    - Implement CPU benchmark: run 3-second computation loop, display ops/sec
    - Implement memory benchmark: run 3-second allocation test, display MB/s
    - Show progress indicator (0–100%) updating at least once per second during execution
    - Disable start controls while benchmark is running
    - Display hardware concurrency and device memory alongside results
    - Maintain history of up to 10 most recent results (newest first)
    - Use chunked execution to keep main thread responsive (< 50ms blocking)
    - Abort via AbortController on unmount
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 8.1, 8.3_

  - [x] 10.2 Register BenchmarkTester in the component map
    - Add import and mapping for `benchmark` → `BenchmarkTester` in `src/testerComponents.ts`
    - _Requirements: 7.10_

  - [x] 10.3 Write property test for benchmark result calculation
    - **Property 9: Benchmark result calculation**
    - Create `src/lib/__tests__/properties/benchmarkCalc.prop.test.ts`
    - Generate positive operation counts and positive durations
    - Verify CPU ops/sec = operations / (durationMs / 1000) and memory MB/s = bytes / (durationMs / 1000) / 1_000_000
    - **Validates: Requirements 7.1, 7.2**

  - [x] 10.4 Write property test for benchmark progress percentage
    - **Property 10: Benchmark progress percentage**
    - Create `src/lib/__tests__/properties/progressPercentage.prop.test.ts`
    - Generate elapsed/total duration pairs where 0 ≤ elapsed ≤ total
    - Verify percentage = Math.round((elapsed / total) * 100) in range [0, 100]
    - **Validates: Requirements 7.3**

  - [x] 10.5 Write property test for benchmark history ordering and cap
    - **Property 11: Benchmark history ordering and cap**
    - Create `src/lib/__tests__/properties/historyOrdering.prop.test.ts`
    - Generate sequences of N > 10 benchmark results with timestamps
    - Verify displayed history has exactly 10 entries, newest first, timestamps non-increasing
    - **Validates: Requirements 7.6**

- [x] 11. Cross-cutting tests and integration
  - [x] 11.1 Write unit tests for hex formatting utility
    - Create `src/lib/__tests__/hexFormat.test.ts`
    - Test edge cases: empty array, single byte, all-255 values, large arrays
    - Test `formatLogEntry` with and without report ID
    - _Requirements: 4.2, 4.4_

  - [x] 11.2 Write unit tests for benchmark runner
    - Create `src/lib/__tests__/benchmarkRunner.test.ts`
    - Test that chunked execution yields control (mock timing)
    - Test abort signal cancellation
    - Test progress callback invocation
    - _Requirements: 7.8_

  - [x] 11.3 Extend existing formatter tests with new functions
    - Add tests for `formatHhMmSs`, `formatOpsPerSecond`, `formatMbPerSecond` to `src/lib/__tests__/formatters.test.ts`
    - Test edge cases: 0 seconds, exactly 3600 seconds, large values, zero duration
    - _Requirements: 6.7, 7.1, 7.2_

  - [x] 11.4 Write property test for error sanitization
    - **Property 12: Error sanitization through userSafeErrors**
    - Create `src/lib/__tests__/properties/errorSanitization.prop.test.ts`
    - Generate various DOMException and Error instances
    - Verify output never contains raw exception name/stack/message when mapped differently
    - Verify output always contains stableCode, message, and detail
    - **Validates: Requirements 3.5, 8.6, 8.8**

  - [x] 11.5 Write property test for graceful degradation
    - **Property 13: Graceful degradation for unsupported APIs**
    - Create `src/lib/__tests__/properties/gracefulDegradation.prop.test.ts`
    - For each new tester, mock required API as undefined
    - Verify component renders without throwing, shows unsupported message, disables controls
    - **Validates: Requirements 8.3**

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses React 19 + TypeScript 6 + Vite 8 + Vitest 4 with fast-check for PBT
- All components follow the existing tester pattern: no props, default export, `tester-panel__header`/`tester-panel__body` layout
- No backend dependencies — all diagnostics run client-side

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "6.1", "7.1", "8.1", "10.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "4.2", "6.2", "7.2", "8.2", "10.2"] },
    { "id": 3, "tasks": ["2.3", "3.3", "3.4", "4.3", "4.4", "6.3", "7.3", "8.3", "10.3", "10.4", "10.5"] },
    { "id": 4, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5"] }
  ]
}
```
