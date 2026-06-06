import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatUserSafeError, isAbortError, getUserSafeError } from '../../userSafeErrors';

/**
 * Feature: codebase-quality-improvements
 * Property 3: Error formatting always produces structured output with stable code
 * Validates: Requirements 5.1, 5.3
 */
describe('Property 3: Error formatting always produces structured output with stable code', () => {
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

    const arbitraryErrorValue = fc.oneof(
        // DOMException with known names
        fc.constantFrom(...knownDOMExceptionNames).map(
            (name) => new DOMException('test message', name),
        ),
        // DOMException with unknown/random names
        fc.stringMatching(/^[A-Z][a-zA-Z]{2,15}Error$/).map(
            (name) => new DOMException('unknown error', name),
        ),
        // Plain Error instances
        fc.string({ minLength: 1, maxLength: 50 }).map((msg) => new Error(msg)),
        // Non-Error objects with name property
        fc.record({ name: fc.string({ minLength: 1, maxLength: 20 }), message: fc.string() }),
        // Primitives and nullish
        fc.constant(null),
        fc.constant(undefined),
        fc.string({ minLength: 0, maxLength: 30 }),
        fc.integer(),
    );

    it('returns a non-empty string for any error value', () => {
        fc.assert(
            fc.property(arbitraryErrorValue, (errorValue) => {
                const result = formatUserSafeError(errorValue);

                expect(typeof result).toBe('string');
                expect(result.length).toBeGreaterThan(0);
            }),
            { numRuns: 100 },
        );
    });

    it('output contains a stable code matching [A-Z_]+', () => {
        fc.assert(
            fc.property(arbitraryErrorValue, (errorValue) => {
                const result = formatUserSafeError(errorValue);

                // The stable code appears in parentheses at the end of the formatted string
                const stableCodeMatch = result.match(/[A-Z_]+/);
                expect(stableCodeMatch).not.toBeNull();
                expect(stableCodeMatch![0].length).toBeGreaterThan(0);
            }),
            { numRuns: 100 },
        );
    });

    it('falls back safely for names inherited from Object.prototype', () => {
        const result = getUserSafeError({ name: 'constructor', message: '' });

        expect(result.stableCode).toBe('UNKNOWN_BROWSER_ERROR');
    });
});

/**
 * Feature: codebase-quality-improvements
 * Property 4: isAbortError correctly classifies abort errors
 * Validates: Requirements 5.2, 9.3
 */
describe('Property 4: isAbortError correctly classifies abort errors', () => {
    const nonAbortNames = [
        'NotAllowedError',
        'NotFoundError',
        'NotReadableError',
        'SecurityError',
        'TypeError',
        'RangeError',
        'NetworkError',
        '',
    ];

    it('returns true if and only if error name is AbortError (DOMException)', () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.constant('AbortError'),
                    fc.constantFrom(...nonAbortNames),
                    fc.stringMatching(/^[A-Z][a-zA-Z]{2,20}$/),
                ),
                (name) => {
                    const error = name === '' ? new Error('no name') : new DOMException('msg', name);
                    if (name === '') {
                        // Error with default name 'Error'
                        expect(isAbortError(error)).toBe(false);
                    } else if (name === 'AbortError') {
                        expect(isAbortError(error)).toBe(true);
                    } else {
                        expect(isAbortError(error)).toBe(false);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });

    it('returns false for non-Error values (null, undefined, strings, numbers, objects)', () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.constant(null),
                    fc.constant(undefined),
                    fc.string({ minLength: 0, maxLength: 30 }),
                    fc.integer(),
                    fc.record({ code: fc.integer() }),
                ),
                (value) => {
                    expect(isAbortError(value)).toBe(false);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('returns true for plain objects with name === "AbortError"', () => {
        fc.assert(
            fc.property(
                fc.record({
                    name: fc.constant('AbortError'),
                    message: fc.string({ minLength: 0, maxLength: 30 }),
                }),
                (obj) => {
                    expect(isAbortError(obj)).toBe(true);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('returns false for plain objects with name !== "AbortError"', () => {
        fc.assert(
            fc.property(
                fc.record({
                    name: fc.string({ minLength: 1, maxLength: 20 }).filter((n) => n !== 'AbortError'),
                    message: fc.string({ minLength: 0, maxLength: 30 }),
                }),
                (obj) => {
                    expect(isAbortError(obj)).toBe(false);
                },
            ),
            { numRuns: 100 },
        );
    });
});

/**
 * Feature: codebase-quality-improvements
 * Property 9: getUserSafeError output structure invariant
 * Validates: Requirements 5.1, 5.2, 5.3
 */
describe('Property 9: getUserSafeError output structure invariant', () => {
    const arbitraryInput = fc.oneof(
        fc.string({ minLength: 0, maxLength: 50 }),
        fc.integer(),
        fc.double({ noNaN: true }),
        fc.constant(null),
        fc.constant(undefined),
        fc.record({
            key: fc.string({ minLength: 1, maxLength: 10 }),
            value: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
        }),
        fc.array(fc.integer(), { minLength: 0, maxLength: 5 }),
    );

    it('returns an object with exactly stableCode, message, and detail as string properties', () => {
        fc.assert(
            fc.property(arbitraryInput, (input) => {
                const result = getUserSafeError(input);

                // Has exactly three keys
                const keys = Object.keys(result).sort();
                expect(keys).toEqual(['detail', 'message', 'stableCode']);

                // All are strings
                expect(typeof result.stableCode).toBe('string');
                expect(typeof result.message).toBe('string');
                expect(typeof result.detail).toBe('string');
            }),
            { numRuns: 100 },
        );
    });

    it('stableCode is always non-empty', () => {
        fc.assert(
            fc.property(arbitraryInput, (input) => {
                const result = getUserSafeError(input);
                expect(result.stableCode.length).toBeGreaterThan(0);
            }),
            { numRuns: 100 },
        );
    });

    it('message is always non-empty', () => {
        fc.assert(
            fc.property(arbitraryInput, (input) => {
                const result = getUserSafeError(input);
                expect(result.message.length).toBeGreaterThan(0);
            }),
            { numRuns: 100 },
        );
    });

    it('detail is always a string (possibly empty)', () => {
        fc.assert(
            fc.property(arbitraryInput, (input) => {
                const result = getUserSafeError(input);
                expect(typeof result.detail).toBe('string');
            }),
            { numRuns: 100 },
        );
    });
});
