import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatHhMmSs } from '../../formatters';

/**
 * Property 8: Duration timer HH:MM:SS formatting
 * Validates: Requirements 6.7
 *
 * For any non-negative integer representing elapsed seconds, the formatted
 * duration string SHALL match the pattern HH:MM:SS where:
 * - HH = Math.floor(seconds / 3600) zero-padded to 2 digits
 * - MM = Math.floor((seconds % 3600) / 60) zero-padded to 2 digits
 * - SS = (seconds % 60) zero-padded to 2 digits
 */
describe('Property 8: Duration timer HH:MM:SS formatting', () => {
    it('output matches HH:MM:SS pattern with at least 2-digit zero-padded segments', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 999999 }),
                (seconds) => {
                    const result = formatHhMmSs(seconds);
                    // HH is zero-padded to minimum 2 digits (can exceed 99 for large values)
                    // MM and SS are always exactly 2 digits (0-59 range)
                    expect(result).toMatch(/^\d{2,}:\d{2}:\d{2}$/);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('HH equals Math.floor(seconds / 3600) zero-padded to 2 digits', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 999999 }),
                (seconds) => {
                    const result = formatHhMmSs(seconds);
                    const hh = result.split(':')[0];
                    const expectedHH = Math.floor(seconds / 3600).toString().padStart(2, '0');
                    expect(hh).toBe(expectedHH);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('MM equals Math.floor((seconds % 3600) / 60) zero-padded to 2 digits', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 999999 }),
                (seconds) => {
                    const result = formatHhMmSs(seconds);
                    const mm = result.split(':')[1];
                    const expectedMM = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
                    expect(mm).toBe(expectedMM);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('SS equals (seconds % 60) zero-padded to 2 digits', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 999999 }),
                (seconds) => {
                    const result = formatHhMmSs(seconds);
                    const ss = result.split(':')[2];
                    const expectedSS = (seconds % 60).toString().padStart(2, '0');
                    expect(ss).toBe(expectedSS);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('parsing back HH*3600 + MM*60 + SS equals input seconds', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 999999 }),
                (seconds) => {
                    const result = formatHhMmSs(seconds);
                    const [hh, mm, ss] = result.split(':').map(Number);
                    expect(hh * 3600 + mm * 60 + ss).toBe(seconds);
                }
            ),
            { numRuns: 100 }
        );
    });
});
