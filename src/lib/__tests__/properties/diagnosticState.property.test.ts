import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
    transitionDiagnosticState,
    createDiagnosticState,
    type DiagnosticPhase,
    type DiagnosticState,
    type DiagnosticTransition,
} from '../../diagnosticState';

/**
 * Property 5: Diagnostic state transition guard blocks invalid transitions from unsupported
 * Validates: Requirements 12.1
 *
 * Feature: codebase-quality-improvements, Property 5: Diagnostic state transition guard blocks invalid transitions from unsupported
 */
describe('Feature: codebase-quality-improvements, Property 5: Diagnostic state transition guard blocks invalid transitions from unsupported', () => {
    const allPhases: DiagnosticPhase[] = ['idle', 'loading', 'running', 'success', 'error', 'unsupported', 'stopped'];
    const nonUnsupportedPhases: DiagnosticPhase[] = ['idle', 'loading', 'running', 'success', 'error', 'stopped'];

    const messageArb = fc.string({ minLength: 1, maxLength: 80 });
    const stableCodeArb = fc.option(fc.stringMatching(/^[A-Z][A-Z_]{2,30}$/), { nil: undefined });

    const diagnosticStateArb = (phase: DiagnosticPhase): fc.Arbitrary<DiagnosticState> =>
        fc.tuple(messageArb, stableCodeArb).map(([message, stableCode]) =>
            createDiagnosticState(phase, message, stableCode),
        );

    const transitionArb = (targetPhase: DiagnosticPhase): fc.Arbitrary<DiagnosticTransition> =>
        fc.tuple(messageArb, stableCodeArb).map(([message, stableCode]) => ({
            phase: targetPhase,
            message,
            stableCode,
        }));

    it('blocks transitions from unsupported to loading', () => {
        fc.assert(
            fc.property(
                diagnosticStateArb('unsupported'),
                transitionArb('loading'),
                (current, next) => {
                    const result = transitionDiagnosticState(current, next);
                    expect(result).toEqual(current);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('blocks transitions from unsupported to running', () => {
        fc.assert(
            fc.property(
                diagnosticStateArb('unsupported'),
                transitionArb('running'),
                (current, next) => {
                    const result = transitionDiagnosticState(current, next);
                    expect(result).toEqual(current);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('allows transitions from non-unsupported phases to any target phase', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...nonUnsupportedPhases),
                fc.constantFrom(...allPhases),
                messageArb,
                stableCodeArb,
                messageArb,
                stableCodeArb,
                (currentPhase, targetPhase, currentMsg, currentCode, nextMsg, nextCode) => {
                    const current = createDiagnosticState(currentPhase, currentMsg, currentCode);
                    const next: DiagnosticTransition = { phase: targetPhase, message: nextMsg, stableCode: nextCode };

                    const result = transitionDiagnosticState(current, next);

                    expect(result.phase).toBe(targetPhase);
                    expect(result.message).toBe(nextMsg);
                    if (nextCode !== undefined) {
                        expect(result.stableCode).toBe(nextCode);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });

    it('unsupported state allows transitions to non-blocked phases', () => {
        const nonBlockedTargets: DiagnosticPhase[] = ['idle', 'success', 'error', 'unsupported', 'stopped'];

        fc.assert(
            fc.property(
                diagnosticStateArb('unsupported'),
                fc.constantFrom(...nonBlockedTargets),
                messageArb,
                stableCodeArb,
                (current, targetPhase, nextMsg, nextCode) => {
                    const next: DiagnosticTransition = { phase: targetPhase, message: nextMsg, stableCode: nextCode };
                    const result = transitionDiagnosticState(current, next);

                    expect(result.phase).toBe(targetPhase);
                    expect(result.message).toBe(nextMsg);
                },
            ),
            { numRuns: 100 },
        );
    });
});
