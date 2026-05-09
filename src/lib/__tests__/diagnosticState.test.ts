import { describe, expect, it } from 'vitest';
import {
    createDiagnosticState,
    getDiagnosticMessage,
    isDiagnosticBusy,
    readyDiagnosticState,
    transitionDiagnosticState,
} from '../diagnosticState';

describe('diagnosticState', () => {
    it('creates stable display messages', () => {
        const state = createDiagnosticState('error', 'Failed safely', 'ERR_TEST');
        expect(getDiagnosticMessage(state)).toBe('Failed safely');
        expect(getDiagnosticMessage('Plain status')).toBe('Plain status');
        expect(state.stableCode).toBe('ERR_TEST');
    });

    it('tracks busy phases and protects unsupported states from accidental starts', () => {
        expect(isDiagnosticBusy(createDiagnosticState('running', 'Running'))).toBe(true);
        expect(isDiagnosticBusy(readyDiagnosticState())).toBe(false);

        const unsupported = createDiagnosticState('unsupported', 'Not supported');
        expect(transitionDiagnosticState(unsupported, { phase: 'running', message: 'Starting' })).toBe(unsupported);
        expect(transitionDiagnosticState(unsupported, { phase: 'idle', message: 'Ready' }).phase).toBe('idle');
    });
});
