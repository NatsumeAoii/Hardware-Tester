import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { hardwareCapabilities, detectHardwareCapabilities } from '../../hardwareCapabilities';

/**
 * Property 13: Graceful degradation for unsupported APIs
 * **Validates: Requirements 8.3**
 *
 * For any new tester component rendered in an environment where its required
 * browser API is undefined, the component SHALL render without throwing an
 * uncaught exception, SHALL display a status message identifying the unsupported
 * feature, and SHALL have all API-dependent interactive controls disabled.
 *
 * This test verifies that the API detection logic (isSupported functions) in
 * hardwareCapabilities correctly identifies when APIs are unavailable by:
 * 1. Mocking the required browser API as undefined
 * 2. Verifying the detection function returns false (never throws)
 * 3. Verifying that detectHardwareCapabilities produces a valid 'unsupported' status
 */

// The 7 new tester capability IDs and their required API paths
const NEW_TESTER_CAPABILITIES = [
    {
        id: 'storage-api',
        testerId: 'usb-storage',
        apiDescription: 'navigator.storage',
    },
    {
        id: 'window-management',
        testerId: 'multi-monitor',
        apiDescription: 'window.getScreenDetails',
    },
    {
        id: 'web-nfc',
        testerId: 'nfc',
        apiDescription: 'NDEFReader',
    },
    {
        id: 'web-hid',
        testerId: 'serial-hid',
        apiDescription: 'navigator.hid',
    },
    {
        id: 'clipboard',
        testerId: 'clipboard',
        apiDescription: 'navigator.clipboard',
    },
    {
        id: 'wake-lock',
        testerId: 'wake-lock',
        apiDescription: 'navigator.wakeLock',
    },
    {
        id: 'perf-timing',
        testerId: 'benchmark',
        apiDescription: 'performance.now',
    },
] as const;

/**
 * Creates a minimal scope (window-like) object with APIs selectively enabled/disabled.
 * Each boolean in the apiAvailability map controls whether that API is present.
 */
function createMockScope(apiAvailability: Record<string, boolean>) {
    const scope: Record<string, unknown> = {
        // Minimal window-like properties
        document: { createElement: () => ({ getContext: () => null }) },
        isSecureContext: true,
        location: { hostname: 'localhost' },
        innerWidth: 1920,
        innerHeight: 1080,
        screen: { width: 1920, height: 1080 },
        matchMedia: () => ({ matches: false }),
    };

    // Conditionally add getScreenDetails
    if (apiAvailability['window-management']) {
        scope['getScreenDetails'] = () => Promise.resolve({ screens: [] });
    }

    // Conditionally add NDEFReader
    if (apiAvailability['web-nfc']) {
        scope['NDEFReader'] = class MockNDEFReader {};
    }

    // Conditionally add performance.now
    if (apiAvailability['perf-timing']) {
        scope['performance'] = { now: () => 0 };
    }

    return scope;
}

/**
 * Creates a minimal navigator-like object with APIs selectively enabled/disabled.
 */
function createMockNavigator(apiAvailability: Record<string, boolean>) {
    const nav: Record<string, unknown> = {
        maxTouchPoints: 0,
        platform: 'Win32',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        mediaDevices: { getUserMedia: () => Promise.resolve(null) },
        geolocation: {},
    };

    // Conditionally add storage API
    if (apiAvailability['storage-api']) {
        nav['storage'] = { estimate: () => Promise.resolve({ quota: 0, usage: 0 }) };
    }

    // Conditionally add HID
    if (apiAvailability['web-hid']) {
        nav['hid'] = { requestDevice: () => Promise.resolve([]) };
    }

    // Conditionally add clipboard
    if (apiAvailability['clipboard']) {
        nav['clipboard'] = { readText: () => Promise.resolve(''), writeText: () => Promise.resolve() };
    }

    // Conditionally add wakeLock
    if (apiAvailability['wake-lock']) {
        nav['wakeLock'] = { request: () => Promise.resolve({}) };
    }

    return nav;
}

// Arbitrary that generates a random availability map for the 7 APIs
const apiAvailabilityArb = fc.record({
    'storage-api': fc.boolean(),
    'window-management': fc.boolean(),
    'web-nfc': fc.boolean(),
    'web-hid': fc.boolean(),
    'clipboard': fc.boolean(),
    'wake-lock': fc.boolean(),
    'perf-timing': fc.boolean(),
});

describe('Property 13: Graceful degradation for unsupported APIs', () => {
    it('isSupported never throws for any combination of available/unavailable APIs', () => {
        fc.assert(
            fc.property(apiAvailabilityArb, (availability) => {
                const scope = createMockScope(availability);
                const nav = createMockNavigator(availability);

                // Add navigator to scope
                (scope as Record<string, unknown>)['navigator'] = nav;

                const profile = {
                    formFactor: 'desktop' as const,
                    viewportWidth: 1920,
                    viewportHeight: 1080,
                    maxTouchPoints: 0,
                    coarsePointer: false,
                    finePointer: true,
                    secureContext: true,
                    standalone: false,
                    platform: 'Win32',
                };

                // For each new tester capability, verify isSupported never throws
                for (const cap of NEW_TESTER_CAPABILITIES) {
                    const descriptor = hardwareCapabilities.find((c) => c.id === cap.id);
                    expect(descriptor).toBeDefined();

                    let result: boolean;
                    try {
                        result = descriptor!.isSupported(
                            scope as never,
                            nav as never,
                            profile,
                        );
                    } catch {
                        // If it throws, the property is violated
                        expect.fail(
                            `isSupported for ${cap.id} threw an exception when ${cap.apiDescription} ` +
                            `was ${availability[cap.id] ? 'available' : 'unavailable'}`,
                        );
                        return;
                    }

                    // Result must be a boolean
                    expect(typeof result).toBe('boolean');
                }
            }),
            { numRuns: 100 },
        );
    });

    it('returns false (unsupported) when the required API is undefined', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...NEW_TESTER_CAPABILITIES),
                (cap) => {
                    // Create scope/nav with ALL APIs disabled
                    const allDisabled: Record<string, boolean> = {
                        'storage-api': false,
                        'window-management': false,
                        'web-nfc': false,
                        'web-hid': false,
                        'clipboard': false,
                        'wake-lock': false,
                        'perf-timing': false,
                    };

                    const scope = createMockScope(allDisabled);
                    const nav = createMockNavigator(allDisabled);
                    (scope as Record<string, unknown>)['navigator'] = nav;

                    const profile = {
                        formFactor: 'desktop' as const,
                        viewportWidth: 1920,
                        viewportHeight: 1080,
                        maxTouchPoints: 0,
                        coarsePointer: false,
                        finePointer: true,
                        secureContext: true,
                        standalone: false,
                        platform: 'Win32',
                    };

                    const descriptor = hardwareCapabilities.find((c) => c.id === cap.id);
                    expect(descriptor).toBeDefined();

                    const result = descriptor!.isSupported(
                        scope as never,
                        nav as never,
                        profile,
                    );

                    // When the API is unavailable, detection must return false
                    expect(result).toBe(false);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('returns true (supported) when the required API is present', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...NEW_TESTER_CAPABILITIES),
                (cap) => {
                    // Create scope/nav with ALL APIs enabled
                    const allEnabled: Record<string, boolean> = {
                        'storage-api': true,
                        'window-management': true,
                        'web-nfc': true,
                        'web-hid': true,
                        'clipboard': true,
                        'wake-lock': true,
                        'perf-timing': true,
                    };

                    const scope = createMockScope(allEnabled);
                    const nav = createMockNavigator(allEnabled);
                    (scope as Record<string, unknown>)['navigator'] = nav;

                    const profile = {
                        formFactor: 'desktop' as const,
                        viewportWidth: 1920,
                        viewportHeight: 1080,
                        maxTouchPoints: 0,
                        coarsePointer: false,
                        finePointer: true,
                        secureContext: true,
                        standalone: false,
                        platform: 'Win32',
                    };

                    const descriptor = hardwareCapabilities.find((c) => c.id === cap.id);
                    expect(descriptor).toBeDefined();

                    const result = descriptor!.isSupported(
                        scope as never,
                        nav as never,
                        profile,
                    );

                    // When the API is available, detection must return true
                    expect(result).toBe(true);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('detectHardwareCapabilities produces valid status for random API combinations', () => {
        fc.assert(
            fc.property(apiAvailabilityArb, (availability) => {
                const scope = createMockScope(availability);
                const nav = createMockNavigator(availability);
                (scope as Record<string, unknown>)['navigator'] = nav;

                // detectHardwareCapabilities should never throw
                let results: ReturnType<typeof detectHardwareCapabilities>['results'];
                try {
                    results = detectHardwareCapabilities(scope as never).results;
                } catch {
                    expect.fail('detectHardwareCapabilities threw an exception');
                    return;
                }

                // For each new tester capability, verify the result is valid
                for (const cap of NEW_TESTER_CAPABILITIES) {
                    const result = results.find((r) => r.id === cap.id);
                    expect(result).toBeDefined();

                    // Status must be one of the valid values
                    expect(['available', 'permission', 'partial', 'blocked', 'unsupported']).toContain(
                        result!.status,
                    );

                    // When API is unavailable, status should be 'unsupported'
                    if (!availability[cap.id]) {
                        expect(result!.status).toBe('unsupported');
                    }

                    // Reason must always be a non-empty string
                    expect(typeof result!.reason).toBe('string');
                    expect(result!.reason.length).toBeGreaterThan(0);
                }
            }),
            { numRuns: 100 },
        );
    });
});
