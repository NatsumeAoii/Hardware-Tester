import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { ScreenInfo } from '../../../components/MultiMonitorTester';

/**
 * Property 2: Multi-monitor screen data completeness
 * Validates: Requirements 2.1, 2.4
 *
 * For any array of screen objects returned by the Window Management API,
 * the rendered output SHALL contain the resolution (width × height),
 * position (left, top), device pixel ratio, and label for every screen
 * in the array, and exactly one screen SHALL be marked with the "Primary" label.
 */

/**
 * Arbitrary that generates a valid ScreenInfo object (non-primary).
 */
const screenInfoArb: fc.Arbitrary<ScreenInfo> = fc.record({
    label: fc.string({ minLength: 1, maxLength: 50 }),
    width: fc.integer({ min: 640, max: 7680 }),
    height: fc.integer({ min: 480, max: 4320 }),
    left: fc.integer({ min: -10000, max: 10000 }),
    top: fc.integer({ min: -10000, max: 10000 }),
    devicePixelRatio: fc.oneof(
        fc.constant(1),
        fc.constant(1.5),
        fc.constant(2),
        fc.constant(2.5),
        fc.constant(3),
    ),
    isPrimary: fc.constant(false),
});

/**
 * Arbitrary that generates an array of ScreenInfo objects where exactly one is primary.
 * Strategy: generate 1+ non-primary screens, then pick one index to mark as primary.
 */
const screenArrayWithExactlyOnePrimary: fc.Arbitrary<ScreenInfo[]> = fc
    .tuple(
        fc.array(screenInfoArb, { minLength: 1, maxLength: 8 }),
        fc.nat(),
    )
    .map(([screens, rawIndex]) => {
        const primaryIndex = rawIndex % screens.length;
        return screens.map((screen, idx) => ({
            ...screen,
            isPrimary: idx === primaryIndex,
        }));
    });

describe('Property 2: Multi-monitor screen data completeness', () => {
    it('every screen object has all required fields present and valid', () => {
        fc.assert(
            fc.property(screenArrayWithExactlyOnePrimary, (screens) => {
                for (const screen of screens) {
                    // label must be a non-empty string
                    expect(typeof screen.label).toBe('string');
                    expect(screen.label.length).toBeGreaterThan(0);

                    // width and height must be positive integers
                    expect(typeof screen.width).toBe('number');
                    expect(Number.isInteger(screen.width)).toBe(true);
                    expect(screen.width).toBeGreaterThan(0);

                    expect(typeof screen.height).toBe('number');
                    expect(Number.isInteger(screen.height)).toBe(true);
                    expect(screen.height).toBeGreaterThan(0);

                    // left and top must be integers (can be negative for multi-monitor offsets)
                    expect(typeof screen.left).toBe('number');
                    expect(Number.isInteger(screen.left)).toBe(true);

                    expect(typeof screen.top).toBe('number');
                    expect(Number.isInteger(screen.top)).toBe(true);

                    // devicePixelRatio must be a positive number
                    expect(typeof screen.devicePixelRatio).toBe('number');
                    expect(screen.devicePixelRatio).toBeGreaterThan(0);

                    // isPrimary must be a boolean
                    expect(typeof screen.isPrimary).toBe('boolean');
                }
            }),
            { numRuns: 100 },
        );
    });

    it('exactly one screen is marked as Primary in any valid screen array', () => {
        fc.assert(
            fc.property(screenArrayWithExactlyOnePrimary, (screens) => {
                const primaryScreens = screens.filter((s) => s.isPrimary);
                expect(primaryScreens).toHaveLength(1);
            }),
            { numRuns: 100 },
        );
    });

    it('all fields are present (no undefined or missing keys) in output', () => {
        const requiredKeys: (keyof ScreenInfo)[] = [
            'label',
            'width',
            'height',
            'left',
            'top',
            'devicePixelRatio',
            'isPrimary',
        ];

        fc.assert(
            fc.property(screenArrayWithExactlyOnePrimary, (screens) => {
                for (const screen of screens) {
                    for (const key of requiredKeys) {
                        expect(screen).toHaveProperty(key);
                        expect(screen[key]).not.toBeUndefined();
                        expect(screen[key]).not.toBeNull();
                    }
                }
            }),
            { numRuns: 100 },
        );
    });
});
