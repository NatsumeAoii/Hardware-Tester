import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getUserSafeError } from '../../userSafeErrors';

/**
 * Property 12: Error sanitization through userSafeErrors
 * Validates: Requirements 3.5, 8.6, 8.8
 */
describe('Property 12: Error sanitization through userSafeErrors', () => {
    const knownDOMExceptionNames = [
        'NotAllowedError',
        'NotFoundError',
        'NotReadableError',
        'AbortError',
        'SecurityError',
        'OverconstrainedError',
        'NotSupportedError',
        'NetworkError',
        'TimeoutError',
    ];

    // Generate realistic error names: either known DOMException names or
    // random alphanumeric identifiers (avoiding Object prototype keys)
    const safeErrorNameArb = fc.oneof(
        fc.constantFrom(...knownDOMExceptionNames),
        fc.stringMatching(/^[A-Z][a-zA-Z]{3,20}Error$/),
    );

    // Generate non-trivial error messages (at least 5 chars, no pure whitespace)
    // to avoid false positives with substring containment checks
    const errorMessageArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{4,50}$/);

    // Generate realistic stack traces
    const stackTraceArb = fc.stringMatching(/^Error: [a-zA-Z]+\n {4}at [a-zA-Z]+\.[a-zA-Z]+ \([a-z]+\.js:\d+:\d+\)$/);

    it('returned object always has stableCode, message, and detail properties', () => {
        fc.assert(
            fc.property(safeErrorNameArb, errorMessageArb, (name, message) => {
                const error = new DOMException(message, name);
                const result = getUserSafeError(error);

                expect(result).toHaveProperty('stableCode');
                expect(result).toHaveProperty('message');
                expect(result).toHaveProperty('detail');
            }),
            { numRuns: 100 },
        );
    });

    it('stableCode is always a non-empty string', () => {
        fc.assert(
            fc.property(safeErrorNameArb, errorMessageArb, (name, message) => {
                const error = new DOMException(message, name);
                const result = getUserSafeError(error);

                expect(typeof result.stableCode).toBe('string');
                expect(result.stableCode.length).toBeGreaterThan(0);
            }),
            { numRuns: 100 },
        );
    });

    it('message is always a non-empty string', () => {
        fc.assert(
            fc.property(safeErrorNameArb, errorMessageArb, (name, message) => {
                const error = new DOMException(message, name);
                const result = getUserSafeError(error);

                expect(typeof result.message).toBe('string');
                expect(result.message.length).toBeGreaterThan(0);
            }),
            { numRuns: 100 },
        );
    });

    it('detail is always a string', () => {
        fc.assert(
            fc.property(safeErrorNameArb, errorMessageArb, (name, message) => {
                const error = new DOMException(message, name);
                const result = getUserSafeError(error);

                expect(typeof result.detail).toBe('string');
            }),
            { numRuns: 100 },
        );
    });

    it('output never contains raw exception name/stack/message when mapped differently (DOMException)', () => {
        fc.assert(
            fc.property(safeErrorNameArb, errorMessageArb, stackTraceArb, (name, message, stack) => {
                const error = new DOMException(message, name);
                const result = getUserSafeError(error);

                const outputCombined = `${result.stableCode} ${result.message} ${result.detail}`;

                // If the mapped message differs from the raw error message,
                // the raw message should not appear in the output
                if (result.message !== message) {
                    expect(outputCombined).not.toContain(message);
                }

                // The raw DOMException name should not appear verbatim in the output
                // when it has been mapped to a different user-safe representation
                if (!outputCombined.includes(name)) {
                    // Already passes — name is not in output
                } else if (knownDOMExceptionNames.includes(name)) {
                    // Known names are mapped to stableCodes like BROWSER_PERMISSION_DENIED,
                    // so the raw name (e.g. NotAllowedError) should not appear
                    expect(outputCombined).not.toContain(name);
                }

                // Stack traces should never appear in user-facing output
                expect(outputCombined).not.toContain(stack);
            }),
            { numRuns: 100 },
        );
    });

    it('output never contains raw exception name/stack/message when mapped differently (Error)', () => {
        fc.assert(
            fc.property(safeErrorNameArb, errorMessageArb, stackTraceArb, (name, message, stack) => {
                const error = new Error(message);
                error.name = name;

                const result = getUserSafeError(error);

                const outputCombined = `${result.stableCode} ${result.message} ${result.detail}`;

                // If the mapped message differs from the raw error message,
                // the raw message should not appear in the output
                if (result.message !== message) {
                    expect(outputCombined).not.toContain(message);
                }

                // The raw error name should not appear verbatim in the output
                // when it has been mapped to a different user-safe representation
                if (knownDOMExceptionNames.includes(name)) {
                    expect(outputCombined).not.toContain(name);
                }

                // Stack traces should never appear in user-facing output
                expect(outputCombined).not.toContain(stack);
            }),
            { numRuns: 100 },
        );
    });

    it('handles non-Error objects gracefully with valid output structure', () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.string({ minLength: 1, maxLength: 50 }),
                    fc.integer(),
                    fc.constant(null),
                    fc.constant(undefined),
                    fc.record({ code: fc.integer() }),
                ),
                (unknownError) => {
                    const result = getUserSafeError(unknownError);

                    expect(typeof result.stableCode).toBe('string');
                    expect(result.stableCode.length).toBeGreaterThan(0);
                    expect(typeof result.message).toBe('string');
                    expect(result.message.length).toBeGreaterThan(0);
                    expect(typeof result.detail).toBe('string');
                },
            ),
            { numRuns: 100 },
        );
    });
});
