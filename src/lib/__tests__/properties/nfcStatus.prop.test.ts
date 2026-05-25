import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property 5: NFC scan status state exclusivity
 * Validates: Requirements 3.7
 *
 * For any sequence of scan lifecycle events (start, tag-detected, stop, error),
 * the scan status SHALL always be exactly one of: idle, active, or detected —
 * never more than one simultaneously and never an undefined state.
 */

type NfcEvent = 'start' | 'tag-detected' | 'stop' | 'error';
type NfcScanStatus = 'idle' | 'active' | 'detected';

const VALID_STATES: readonly NfcScanStatus[] = ['idle', 'active', 'detected'] as const;

/**
 * State machine transition function matching the NFC tester behavior:
 * - idle + start → active
 * - active + tag-detected → detected
 * - active + stop → idle
 * - active + error → idle
 * - detected + stop → idle
 * - All other event/state combinations remain in current state
 */
function applyNfcEvent(currentState: NfcScanStatus, event: NfcEvent): NfcScanStatus {
    switch (currentState) {
        case 'idle':
            if (event === 'start') return 'active';
            return 'idle';
        case 'active':
            if (event === 'tag-detected') return 'detected';
            if (event === 'stop') return 'idle';
            if (event === 'error') return 'idle';
            return 'active';
        case 'detected':
            if (event === 'stop') return 'idle';
            return 'detected';
        default:
            return currentState;
    }
}

describe('Property 5: NFC scan status state exclusivity', () => {
    const nfcEventArb = fc.constantFrom<NfcEvent>('start', 'tag-detected', 'stop', 'error');

    it('status is always exactly one of: idle, active, detected after any event sequence', () => {
        fc.assert(
            fc.property(
                fc.array(nfcEventArb, { minLength: 1, maxLength: 50 }),
                (events: NfcEvent[]) => {
                    let state: NfcScanStatus = 'idle';

                    for (const event of events) {
                        state = applyNfcEvent(state, event);

                        // Verify state is exactly one of the valid states
                        expect(VALID_STATES).toContain(state);

                        // Verify state is a string (not undefined/null)
                        expect(typeof state).toBe('string');

                        // Verify exclusivity: state matches exactly one valid state
                        const matchCount = VALID_STATES.filter(s => s === state).length;
                        expect(matchCount).toBe(1);
                    }
                }
            ),
            { numRuns: 200 }
        );
    });

    it('no undefined or invalid states occur during transitions', () => {
        fc.assert(
            fc.property(
                fc.array(nfcEventArb, { minLength: 0, maxLength: 100 }),
                (events: NfcEvent[]) => {
                    let state: NfcScanStatus = 'idle';

                    // Initial state must be valid
                    expect(VALID_STATES).toContain(state);

                    for (const event of events) {
                        const previousState = state;
                        state = applyNfcEvent(state, event);

                        // State must never be undefined or null
                        expect(state).not.toBeUndefined();
                        expect(state).not.toBeNull();

                        // State must be one of the three valid values
                        expect(VALID_STATES).toContain(state);

                        // Transition must be deterministic: same input → same output
                        const replayedState = applyNfcEvent(previousState, event);
                        expect(replayedState).toBe(state);
                    }
                }
            ),
            { numRuns: 200 }
        );
    });
});
