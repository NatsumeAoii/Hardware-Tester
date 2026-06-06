import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computePercentage } from '../../displayLayout';

/**
 * Property 1: Storage percentage calculation
 * Validates: Requirements 1.4, 1.5
 *
 * For any storage quota > 0 and any usage value ≥ 0, the computed percentage
 * SHALL equal Math.round((usage / quota) * 100) clamped to [0, 100].
 * For quota === 0 the result SHALL be 0.
 */
describe('Property 1: Storage percentage calculation', () => {
    it('returns Math.round((usage / quota) * 100) clamped to [0, 100] when quota > 0', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
                fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
                (quota, usage) => {
                    const result = computePercentage(usage, quota);
                    const expected = Math.min(100, Math.max(0, Math.round((usage / quota) * 100)));
                    expect(result).toBe(expected);
                    expect(result).toBeGreaterThanOrEqual(0);
                    expect(result).toBeLessThanOrEqual(100);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('returns 0 when quota === 0', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
                (usage) => {
                    const result = computePercentage(usage, 0);
                    expect(result).toBe(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('result is always an integer in [0, 100]', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
                fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
                (usage, quota) => {
                    const result = computePercentage(usage, quota);
                    expect(Number.isInteger(result)).toBe(true);
                    expect(result).toBeGreaterThanOrEqual(0);
                    expect(result).toBeLessThanOrEqual(100);
                }
            ),
            { numRuns: 100 }
        );
    });
});
