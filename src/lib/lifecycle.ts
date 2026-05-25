export interface CleanupResult {
    errors: unknown[];
}

export interface CleanupStack {
    add: (cleanup: () => void) => () => void;
    run: () => CleanupResult;
    size: () => number;
}

export function createCleanupStack(): CleanupStack {
    const cleanups: Array<() => void> = [];

    return {
        add(cleanup) {
            cleanups.push(cleanup);
            return () => {
                const index = cleanups.indexOf(cleanup);
                if (index >= 0) cleanups.splice(index, 1);
            };
        },
        run() {
            const errors: unknown[] = [];
            // Iterate in reverse without allocating a reversed copy
            for (let i = cleanups.length - 1; i >= 0; i--) {
                try {
                    cleanups[i]();
                } catch (error) {
                    errors.push(error);
                }
            }
            cleanups.length = 0;
            return { errors };
        },
        size() {
            return cleanups.length;
        },
    };
}

const toAbortError = (reason: unknown) =>
    reason instanceof DOMException
        ? reason
        : new DOMException('The operation was cancelled.', 'AbortError');

export function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return Promise.reject(toAbortError(signal.reason));

    // Fast path: no signal means no abort listener to manage
    if (!signal) {
        return new Promise<void>((resolve) => {
            globalThis.setTimeout(resolve, Math.max(0, ms));
        });
    }

    let abort: (() => void) | null = null;
    return new Promise<void>((resolve, reject) => {
        const timeoutId = globalThis.setTimeout(() => {
            abort = null;
            resolve();
        }, Math.max(0, ms));
        abort = () => {
            globalThis.clearTimeout(timeoutId);
            reject(toAbortError(signal.reason));
        };

        signal.addEventListener('abort', abort, { once: true });
    }).finally(() => {
        if (abort) signal.removeEventListener('abort', abort);
    });
}

export function cancelAnimationFrameIfSet(frameId: number | null | undefined): void {
    if (typeof frameId === 'number' && frameId > 0 && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frameId);
    }
}

export function clearTimeoutIfSet(timeoutId: number | null | undefined): void {
    if (typeof timeoutId === 'number') globalThis.clearTimeout(timeoutId);
}
