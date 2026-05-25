import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeProgress } from '../../benchmarkRunner';

/**
 * Property 10: Benchmark progress percentage
 * Validates: Requirements 7.3
 *
 * For any elapsed time value where 0 ≤ elapsed ≤ totalDuration, the progress
 * percentage SHALL equal Math.round((elapsed / totalDuration) * 100) and SHALL
 * be in the range [0, 100].
 */
describe('Property 10: Benchmark progress percentage', () => {
    it('percentage equals Math.round((elapsed / totalDuration) * 100) and is in [0, 100]', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 10000 }),
                fc.integer({ min: 0, max: 10000 }),
                (totalDuration, rawElapsed) => {
                    // Constrain elapsed to be between 0 and totalDuration
                    const elapsed = Math.min(rawElapsed, totalDuration);

                    const result = computeProgress(elapsed, totalDuration);
                    const expected = Math.round((elapsed / totalDuration) * 100);

                    expect(result).toBe(Math.min(100, expected));
                    expect(result).toBeGreaterThanOrEqual(0);
                    expect(result).toBeLessThanOrEqual(100);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('returns 0 when elapsed === 0', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 10000 }),
                (totalDuration) => {
                    const result = computeProgress(0, totalDuration);
                    expect(result).toBe(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('returns 100 when elapsed === totalDuration', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 10000 }),
                (totalDuration) => {
                    const result = computeProgress(totalDuration, totalDuration);
                    expect(result).toBe(100);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('result is always an integer in [0, 100]', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 10000 }),
                fc.integer({ min: 0, max: 10000 }),
                (totalDuration, rawElapsed) => {
                    const elapsed = Math.min(rawElapsed, totalDuration);
                    const result = computeProgress(elapsed, totalDuration);

                    expect(Number.isInteger(result)).toBe(true);
                    expect(result).toBeGreaterThanOrEqual(0);
                    expect(result).toBeLessThanOrEqual(100);
                }
            ),
            { numRuns: 100 }
        );
    });
});
