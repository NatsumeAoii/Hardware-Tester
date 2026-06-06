import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { trimLatencySamples, averageSamples } from '../../networkDiagnostics';

/**
 * Feature: codebase-quality-improvements, Property 7: trimLatencySamples preserves all elements for small arrays
 * Validates: Requirements 15.3
 *
 * For any array of positive numbers with length ≤ 4, trimLatencySamples shall return
 * a sorted copy with the same length as the input (no elements removed).
 */
describe('Feature: codebase-quality-improvements, Property 7: trimLatencySamples preserves all elements for small arrays', () => {
    it('preserves all elements and returns sorted output for arrays with length ≤ 4', () => {
        fc.assert(
            fc.property(
                fc.array(fc.float({ min: Math.fround(0.01), max: 10000, noNaN: true }), { minLength: 0, maxLength: 4 }),
                (arr) => {
                    const result = trimLatencySamples(arr);

                    // Output length equals input length (no trimming)
                    expect(result).toHaveLength(arr.length);

                    // Output is sorted in ascending order
                    for (let i = 1; i < result.length; i++) {
                        expect(result[i]).toBeGreaterThanOrEqual(result[i - 1]);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * Feature: codebase-quality-improvements, Property 8: Latency pipeline output validity
 * Validates: Requirements 15.4
 *
 * For any non-empty array of positive finite numbers, calling trimLatencySamples then
 * averageSamples shall produce either null or a finite positive number. The result shall
 * never be NaN, Infinity, negative, or undefined.
 */
describe('Feature: codebase-quality-improvements, Property 8: Latency pipeline output validity', () => {
    it('averageSamples(trimLatencySamples(arr)) is either null or a finite positive number', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.float({ min: Math.fround(0.01), max: 10000, noNaN: true, noDefaultInfinity: true }),
                    { minLength: 1, maxLength: 100 }
                ),
                (arr) => {
                    const result = averageSamples(trimLatencySamples(arr));

                    // Result is never undefined
                    expect(result).not.toBeUndefined();

                    if (result !== null) {
                        // Result is a finite positive number
                        expect(Number.isFinite(result)).toBe(true);
                        expect(result).toBeGreaterThan(0);
                        expect(Number.isNaN(result)).toBe(false);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
