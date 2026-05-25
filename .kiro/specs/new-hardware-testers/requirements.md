# Requirements Document

## Introduction

This feature adds seven new hardware testers to the existing Hardware Diagnostic Suite browser application. Each tester is a standalone React component that follows the established tester registry pattern. The new testers cover USB/Storage detection, multi-monitor information, NFC reading, Serial/HID device access, clipboard behavior, screen wake lock capability, and CPU/memory performance benchmarking. All tests run client-side with no backend dependency, handle unsupported browsers gracefully, and respect user privacy by keeping all data local.

## Glossary

- **Tester_Registry**: The central metadata store in `src/lib/testerRegistry.ts` that defines tester IDs, labels, groups, dashboard descriptions, and navigation icons.
- **Component_Map**: The typed mapping in `src/testerComponents.ts` that associates each tester ID with its React component.
- **Storage_API**: The browser Storage Manager API (`navigator.storage`) that provides quota and usage estimates for client-side storage.
- **Window_Management_API**: The browser API (`window.getScreenDetails()`) that provides information about connected displays including position, size, and device pixel ratio.
- **Web_NFC_API**: The browser API (`NDEFReader`) that enables reading and writing NFC tags on supported mobile devices.
- **WebHID_API**: The browser API (`navigator.hid`) that provides low-level access to Human Interface Devices such as keyboards, game controllers, and lab equipment.
- **Web_Serial_API**: The browser API (`navigator.serial`) that provides access to serial port devices for raw communication.
- **Clipboard_API**: The browser API (`navigator.clipboard`) that provides programmatic read and write access to the system clipboard.
- **Wake_Lock_API**: The browser API (`navigator.wakeLock`) that prevents the screen from dimming or locking while active.
- **Performance_API**: The browser APIs (`performance.now()`, `PerformanceObserver`) used for high-resolution timing and performance measurement.
- **Unsupported_State**: A UI state displayed when the browser does not support the required API, showing a clear message and suggesting compatible browsers.
- **Tester_Component**: A standalone React component that owns the UI and browser interactions for an individual hardware test.
- **Hardware_Diagnostic_Suite**: The client-side React 19 + TypeScript 6 + Vite 8 browser application that hosts all hardware testers.

## Requirements

### Requirement 1: USB/Storage Tester

**User Story:** As a user, I want to view storage capacity and usage information detected via the browser Storage API, so that I can understand my device's available storage.

#### Acceptance Criteria

1. WHEN the user navigates to the USB/Storage tester, THE Hardware_Diagnostic_Suite SHALL display the estimated storage quota and current usage retrieved from the Storage_API.
2. WHEN the Storage_API reports quota and usage values, THE Tester_Component SHALL display the values formatted in human-readable units (B, KB, MB, GB) using base-10 thresholds consistent with the existing formatBytes utility.
3. WHEN the Storage_API is not available in the browser, THE Tester_Component SHALL display the Unsupported_State with a message indicating Storage API is unavailable.
4. WHEN the Storage_API reports a quota greater than zero, THE Tester_Component SHALL display a percentage indicator showing the ratio of used storage to total quota, rounded to the nearest integer (0–100%).
5. IF the Storage_API reports a quota of zero, THEN THE Tester_Component SHALL display the percentage indicator as 0% rather than attempting a division by zero.
6. WHEN the user requests a storage refresh, THE Tester_Component SHALL re-query the Storage_API and update displayed values within the same page context without triggering a full page reload.
7. IF the Storage_API is available but the quota query fails or rejects, THEN THE Tester_Component SHALL display an error message indicating that storage information could not be retrieved.
8. THE Tester_Registry SHALL include metadata for the USB/Storage tester with a unique non-empty ID of type TesterId, a non-empty label string, a valid TesterGroupKey group assignment, and a non-empty dashboardDescription string.
9. THE Component_Map SHALL map the USB/Storage tester ID to its corresponding Tester_Component.

### Requirement 2: Multi-Monitor Tester

**User Story:** As a user, I want to detect and view information about all connected screens, so that I can verify my multi-monitor setup.

#### Acceptance Criteria

1. WHEN the user navigates to the Multi-Monitor tester and grants window management permission, THE Tester_Component SHALL display a list of all connected screens showing each screen's resolution (width × height in pixels), position (left and top offset in pixels), device pixel ratio (numeric multiplier), and label (as reported by the Window Management API).
2. WHEN the Window_Management_API is not available in the browser, THE Tester_Component SHALL display the Unsupported_State with a message indicating the Window Management API is unavailable.
3. WHEN the user denies the window management permission, THE Tester_Component SHALL display a message explaining that permission is required and provide instructions to grant it.
4. WHEN the screen list is displayed, THE Tester_Component SHALL identify the primary screen by rendering a visible "Primary" label adjacent to its entry that is not present on secondary screen entries.
5. WHEN a screen is connected or disconnected while the tester is active, THE Tester_Component SHALL update the displayed screen list within 2 seconds.
6. THE Tester_Component SHALL display a visual layout diagram representing each detected screen as a rectangle positioned according to its reported left and top offset coordinates, with each rectangle scaled proportionally to its resolution relative to the other screens.
7. THE Tester_Registry SHALL include metadata for the Multi-Monitor tester with a unique ID of type TesterId, a human-readable label, a group assignment matching one of the defined TesterGroupKey values, and a non-empty dashboard description string.
8. THE Component_Map SHALL map the Multi-Monitor tester ID to its corresponding Tester_Component.

### Requirement 3: NFC Tester

**User Story:** As a mobile user, I want to read NFC tags using my device's NFC reader, so that I can verify NFC hardware functionality.

#### Acceptance Criteria

1. WHEN the user starts an NFC scan and a tag is detected, THE Tester_Component SHALL display the tag's serial number and all NDEF records with their record type (TNF and type field) and payload decoded as UTF-8 text, each in a distinct labeled section.
2. WHEN the user starts an NFC scan and a tag is detected that contains zero NDEF records, THE Tester_Component SHALL display the tag's serial number and a message indicating the tag contains no NDEF data.
3. WHEN the Web_NFC_API is not available in the browser, THE Tester_Component SHALL display the Unsupported_State with a message indicating Web NFC is unavailable and stating that Chrome for Android with HTTPS is required.
4. WHEN the user denies NFC permission, THE Tester_Component SHALL display a message explaining that NFC permission is required and instructing the user to enable it in browser site settings.
5. IF an NFC scan encounters a read error, THEN THE Tester_Component SHALL display an error message describing the failure reason without exposing internal exception details.
6. WHEN the user stops the NFC scan, THE Tester_Component SHALL abort the active NDEFReader scan and release the NFC hardware.
7. THE Tester_Component SHALL display a scan status indicator showing one of three mutually exclusive states: idle (no scan in progress), active (scan running, awaiting tag), or detected (tag successfully read).
8. THE Tester_Registry SHALL include metadata for the NFC tester with a TesterId value of 'nfc', a human-readable label, a TesterGroupKey group assignment, and a dashboardDescription string summarizing the tester's purpose.
9. THE Component_Map SHALL map the NFC tester ID to its corresponding Tester_Component.

### Requirement 4: Serial/HID Tester

**User Story:** As a user, I want to connect to HID or serial devices through the browser, so that I can verify raw device communication with keyboards, game controllers, or lab equipment.

#### Acceptance Criteria

1. WHEN the user requests a HID device connection and selects a device from the browser picker, THE Tester_Component SHALL display the device's product name, vendor ID, product ID, and a list of HID collection usage pages and usage IDs.
2. WHEN the user requests a serial port connection and selects a port from the browser picker, THE Tester_Component SHALL open the port at a user-selected baud rate (defaulting to 9600) and display incoming data as a scrollable log in hexadecimal byte format with a timestamp per line, retaining a maximum of 200 log entries.
3. IF neither the WebHID_API nor the Web_Serial_API is available in the browser, THEN THE Tester_Component SHALL display the Unsupported_State with a message indicating both APIs are unavailable.
4. WHEN a connected HID device sends an input report, THE Tester_Component SHALL append a log entry displaying the report ID, the report data as space-separated two-character hexadecimal bytes, and a timestamp indicating when the report was received, retaining a maximum of 200 log entries.
5. WHEN the user activates the disconnect control for a connected device, THE Tester_Component SHALL close the connection, release the device handle, and return the corresponding interface section to the disconnected state.
6. IF a device connection fails or is lost unexpectedly, THEN THE Tester_Component SHALL display an error message describing the failure reason and reset the corresponding interface section to the disconnected state.
7. THE Tester_Component SHALL provide separate interface sections for WebHID and Web Serial connections, each with independent connect and disconnect controls visible at all times.
8. THE Tester_Registry SHALL include metadata for the Serial/HID tester with a unique string ID, a human-readable label, a group assignment matching an existing TesterGroupKey, and a dashboard description summarizing the tester's purpose.
9. THE Component_Map SHALL map the Serial/HID tester ID to its corresponding Tester_Component.
10. IF only one of the WebHID_API or Web_Serial_API is available in the browser, THEN THE Tester_Component SHALL enable the section for the supported API and display a message in the unsupported section indicating which API is unavailable.

### Requirement 5: Clipboard Tester

**User Story:** As a user, I want to test clipboard read and write permissions and behavior, so that I can verify clipboard functionality in my browser.

#### Acceptance Criteria

1. WHEN the user triggers a clipboard write test with sample text, THE Tester_Component SHALL write the text to the system clipboard using the Clipboard_API and confirm success with a visible status message.
2. WHEN the user triggers a clipboard read test, THE Tester_Component SHALL read the current clipboard contents and display the retrieved text in a read-only text area.
3. WHEN the Clipboard_API is not available in the browser, THE Tester_Component SHALL display the Unsupported_State with a message indicating the Clipboard API is unavailable.
4. WHEN the user denies clipboard read or write permission, THE Tester_Component SHALL display a message explaining which specific permission was denied and provide instructions to grant it via browser site settings.
5. THE Tester_Component SHALL display the current permission state for both clipboard-read and clipboard-write as queried from the Permissions API, showing one of: granted, denied, or prompt.
6. WHEN a clipboard operation fails for a reason other than permission denial, THE Tester_Component SHALL display a user-friendly error message describing the failure without exposing raw exception details.
7. THE Tester_Component SHALL clear displayed clipboard contents from the UI when the user navigates away from the tester, ensuring no residual data remains visible.
8. THE Tester_Registry SHALL include metadata for the Clipboard tester with an appropriate ID, label, group assignment, and dashboard description.
9. THE Component_Map SHALL map the Clipboard tester ID to its corresponding Tester_Component.

### Requirement 6: Wake Lock Tester

**User Story:** As a user, I want to test screen wake lock capability, so that I can verify my browser can prevent the screen from dimming or locking.

#### Acceptance Criteria

1. WHEN the user activates the wake lock, THE Tester_Component SHALL request a screen wake lock using the Wake_Lock_API and display a status indicator showing the text "Active" with a visible elapsed-time timer.
2. WHEN the user deactivates the wake lock, THE Tester_Component SHALL release the wake lock, stop the elapsed-time timer, and display a status indicator showing the text "Inactive".
3. WHEN the Wake_Lock_API is not available in the browser, THE Tester_Component SHALL display the Unsupported_State with a message indicating the Wake Lock API is unavailable and disable the activate/deactivate controls.
4. IF the wake lock request fails due to a reason other than API unavailability (e.g., permission denied or document not visible), THEN THE Tester_Component SHALL display an error message indicating the failure reason and remain in the inactive state.
5. WHEN the wake lock is released by the system (due to tab visibility change or low battery), THE Tester_Component SHALL update the status indicator to "Released", stop the elapsed-time timer, and display the release reason as one of: "tab hidden" or "system released".
6. WHEN the document becomes visible again after a visibility-triggered release, THE Tester_Component SHALL display a button allowing the user to re-acquire the wake lock.
7. WHILE the wake lock is active, THE Tester_Component SHALL display a duration timer in HH:MM:SS format that updates every 1 second showing how long the wake lock has been continuously held.
8. THE Tester_Registry SHALL include metadata for the Wake Lock tester with the ID "wake-lock", a label of "Wake Lock", a group assignment to the "system" group, and a dashboard description summarizing the tester's purpose.
9. THE Component_Map SHALL map the Wake Lock tester ID to its corresponding Tester_Component.

### Requirement 7: Performance Benchmark Tester

**User Story:** As a user, I want to run a simple CPU and memory benchmark in my browser, so that I can gauge my device's processing performance.

#### Acceptance Criteria

1. WHEN the user starts the CPU benchmark, THE Tester_Component SHALL execute a timed computation loop for a fixed duration of 3 seconds using `performance.now()` and display the operations-per-second result as a formatted numeric value.
2. WHEN the user starts the memory benchmark, THE Tester_Component SHALL allocate and measure memory throughput over a fixed duration of 3 seconds and display the result in MB/s as a formatted numeric value.
3. WHILE a benchmark is executing, THE Tester_Component SHALL display a progress indicator showing estimated completion percentage (0–100%) updated at least once per second.
4. WHILE a benchmark is executing, THE Tester_Component SHALL disable the start controls to prevent concurrent benchmark execution.
5. WHEN a benchmark completes, THE Tester_Component SHALL display the result alongside the device's hardware concurrency (logical CPU count via `navigator.hardwareConcurrency`) and device memory (if available via `navigator.deviceMemory`).
6. THE Tester_Component SHALL allow the user to run benchmarks multiple times and display a history of up to 10 most recent results from the current session, ordered from newest to oldest.
7. IF `performance.now()` returns timestamps with resolution coarser than 5 microseconds (indicating reduced precision due to browser mitigations), THEN THE Tester_Component SHALL display the Unsupported_State with a message indicating high-resolution timing is unavailable.
8. THE Tester_Component SHALL execute benchmarks without blocking the main thread for more than 50ms continuously, using chunked execution to maintain UI responsiveness.
9. THE Tester_Registry SHALL include metadata for the Performance Benchmark tester with id `benchmark`, label `Benchmark`, group `system`, and a dashboard description summarizing CPU and memory performance testing.
10. THE Component_Map SHALL map the Performance Benchmark tester ID to its corresponding Tester_Component.

### Requirement 8: Cross-Cutting Constraints

**User Story:** As a developer, I want all new testers to follow existing patterns and constraints, so that the codebase remains consistent and maintainable.

#### Acceptance Criteria

1. THE Hardware_Diagnostic_Suite SHALL execute all new tester functionality entirely client-side with no backend or server dependency.
2. THE Hardware_Diagnostic_Suite SHALL retain all user data within the browser using localStorage and transmit no diagnostic data to external services.
3. WHEN any new tester detects that its required browser API is unavailable, THE Tester_Component SHALL disable interactive controls that depend on the API and display an inline status message identifying the unsupported feature, without throwing uncaught exceptions to the browser console.
4. THE Hardware_Diagnostic_Suite SHALL follow the existing hash-based routing pattern, mapping each new tester ID to a URL hash registered in the tester registry so that navigating to `#<tester-id>` renders the corresponding component.
5. THE Hardware_Diagnostic_Suite SHALL follow the existing UI patterns by using the shared CSS custom properties for colors, spacing, and typography, the `tester-panel__header` and `tester-panel__body` layout structure, and minimum 44×44 px touch targets for interactive elements.
6. WHEN a permission-gated API denies access, THE Tester_Component SHALL display a user-safe error message identifying the required permission and a remediation hint using the existing `userSafeErrors` mapping, without exposing raw exception names or stack traces to the user.
7. THE Hardware_Diagnostic_Suite SHALL support each new tester in Chromium-based browsers (Chrome, Edge) at minimum, and IF a required API is unavailable in a non-Chromium browser, THEN THE Tester_Component SHALL render in a read-only informational state indicating which browser supports the feature rather than rendering a blank or broken view.
8. WHEN any new tester encounters an operational error during a diagnostic action, THE Tester_Component SHALL catch the error, map it through the existing `userSafeErrors` utility, and display the resulting message inline within the tester panel without navigating away or disrupting other testers.
