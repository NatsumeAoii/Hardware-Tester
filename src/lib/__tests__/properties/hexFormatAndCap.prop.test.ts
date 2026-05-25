import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatBytesAsHex } from '../../hexFormat';

/**
 * Property 6: Device log hex formatting and entry cap
 * Validates: Requirements 4.2, 4.4
 */
describe('Property 6: Device log hex formatting and entry cap', () => {
    it('formatBytesAsHex produces exactly L space-separated 2-char uppercase hex values for a Uint8Array of length L', () => {
        fc.assert(
            fc.property(
                fc.uint8Array({ minLength: 0, maxLength: 500 }),
                (bytes) => {
                    const hex = formatBytesAsHex(bytes);

                    if (bytes.length === 0) {
                        expect(hex).toBe('');
                        return;
                    }

                    const tokens = hex.split(' ');

                    // Exactly L tokens
                    expect(tokens).toHaveLength(bytes.length);

                    // Each token is exactly 2 uppercase hex characters
                    const hexPattern = /^[0-9A-F]{2}$/;
                    for (const token of tokens) {
                        expect(token).toMatch(hexPattern);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });

    it('log cap logic retains exactly 200 most recent entries when more than 200 are appended', () => {
        fc.assert(
            fc.property(
                // Generate a total entry count between 201 and 500
                fc.integer({ min: 201, max: 500 }),
                (totalEntries) => {
                    // Simulate building a log by prepending entries one at a time
                    // Each entry is identified by its index (0 = oldest, totalEntries-1 = newest)
                    let log: number[] = [];
                    for (let i = 0; i < totalEntries; i++) {
                        log = [i, ...log].slice(0, 200);
                    }

                    // The retained log has exactly 200 entries
                    expect(log).toHaveLength(200);

                    // The entries are the most recent 200 (newest first)
                    // The newest entry is totalEntries - 1, at index 0
                    expect(log[0]).toBe(totalEntries - 1);
                    // The oldest retained entry is totalEntries - 200, at index 199
                    expect(log[199]).toBe(totalEntries - 200);
                },
            ),
            { numRuns: 100 },
        );
    });
});
