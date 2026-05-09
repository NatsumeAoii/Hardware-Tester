export type DiagnosticPhase = 'idle' | 'loading' | 'running' | 'success' | 'error' | 'unsupported' | 'stopped';

export interface DiagnosticState {
    phase: DiagnosticPhase;
    message: string;
    stableCode?: string;
}

export type DiagnosticTransition = {
    phase: DiagnosticPhase;
    message: string;
    stableCode?: string;
};

export function createDiagnosticState(
    phase: DiagnosticPhase,
    message: string,
    stableCode?: string,
): DiagnosticState {
    return stableCode ? { phase, message, stableCode } : { phase, message };
}

export function getDiagnosticMessage(state: DiagnosticState | string): string {
    return typeof state === 'string' ? state : state.message;
}

export function isDiagnosticBusy(state: DiagnosticState): boolean {
    return state.phase === 'loading' || state.phase === 'running';
}

export function transitionDiagnosticState(
    current: DiagnosticState,
    next: DiagnosticTransition,
): DiagnosticState {
    if (current.phase === 'unsupported' && (next.phase === 'loading' || next.phase === 'running')) {
        return current;
    }

    return createDiagnosticState(next.phase, next.message, next.stableCode);
}

export const readyDiagnosticState = (message = 'Ready') => createDiagnosticState('idle', message);
export const errorDiagnosticState = (message: string, stableCode?: string) =>
    createDiagnosticState('error', message, stableCode);
