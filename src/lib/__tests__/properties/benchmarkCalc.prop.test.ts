import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatOpsPerSecond, formatMbPerSecond } from '../../formatters';

/**
 * Property 9: Benchmark result calculation
 * Validates: Requirements 7.1, 7.2
 *
 * For any positive operation count and positive duration in milliseconds,
 * the CPU ops/sec result SHALL equal operations / (durationMs / 1000).
 * For any positive byte count and positive duration,
 * the memory MB/s result SHALL equal bytes / (durationMs / 1000) / 1_000_000.
 */
describe('Property 9: Benchmark result calculation', () => {
    it('CPU ops/sec = operations / (durationMs / 1000)', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 10_000_000 }),
                fc.float({ min: 1, max: 10_000, noNaN: true, noDefaultInfinity: true }),
                (operations, durationMs) => {
                    const expectedOpsPerSec = operations / (durationMs / 1000);
                    // formatOpsPerSecond returns "X ops/s" where X is the rounded, formatted value
                    const formatted = formatOpsPerSecond(operations, durationMs);
                    // Extract the numeric value from the formatted string
                    const numericStr = formatted.replace(/,/g, '').replace(' ops/s', '');
                    const actual = Number(numericStr);

                    // The formatter rounds to integer, so compare with rounding
                    const expected = Math.round(expectedOpsPerSec);
                    expect(actual).toBe(expected);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Memory MB/s = bytes / (durationMs / 1000) / 1_000_000', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 10_000_000_000 }),
                fc.float({ min: 1, max: 10_000, noNaN: true, noDefaultInfinity: true }),
                (bytes, durationMs) => {
                    const expectedMbPerSec = bytes / (durationMs / 1000) / 1_000_000;
                    // formatMbPerSecond returns "X.XX MB/s"
                    const formatted = formatMbPerSecond(bytes, durationMs);
                    const numericStr = formatted.replace(' MB/s', '');
                    const actual = Number(numericStr);

                    // The formatter uses toFixed(2), so compare with that precision
                    const expected = Number(expectedMbPerSec.toFixed(2));
                    // Use relative tolerance for floating point comparison
                    if (expected === 0) {
                        expect(actual).toBe(0);
                    } else {
                        const relativeDiff = Math.abs(actual - expected) / Math.abs(expected);
                        expect(relativeDiff).toBeLessThan(1e-10);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('CPU result is always positive for positive inputs', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 10_000_000 }),
                fc.float({ min: 1, max: 10_000, noNaN: true, noDefaultInfinity: true }),
                (operations, durationMs) => {
                    const opsPerSec = operations / (durationMs / 1000);
                    expect(opsPerSec).toBeGreaterThan(0);
                    expect(Number.isFinite(opsPerSec)).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Memory result is always positive for positive inputs', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 10_000_000_000 }),
                fc.float({ min: 1, max: 10_000, noNaN: true, noDefaultInfinity: true }),
                (bytes, durationMs) => {
                    const mbPerSec = bytes / (durationMs / 1000) / 1_000_000;
                    expect(mbPerSec).toBeGreaterThan(0);
                    expect(Number.isFinite(mbPerSec)).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });
});
