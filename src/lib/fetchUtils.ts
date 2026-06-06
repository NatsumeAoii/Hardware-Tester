/**
 * Generic timeout-aware fetch utilities.
 * Decoupled from network diagnostic domain logic for independent reuse and testing.
 */

export const DEFAULT_FETCH_TIMEOUT_MS = 5000;

const toAbortError = (reason: unknown) =>
    reason instanceof DOMException
        ? reason
        : new DOMException('The operation was cancelled.', 'AbortError');

export const createTimeoutError = (timeoutMs: number) =>
    new DOMException(`Request timed out after ${timeoutMs}ms.`, 'TimeoutError');

/**
 * Wraps the native fetch with an explicit timeout and abort signal forwarding.
 * If the caller's signal aborts, the internal controller also aborts.
 * If the timeout expires first, a TimeoutError DOMException is thrown.
 */
export async function fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit = {},
    timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
    const sourceSignal = init.signal;
    if (sourceSignal?.aborted) throw toAbortError(sourceSignal.reason);

    const controller = new AbortController();
    const safeTimeoutMs = Math.max(1, timeoutMs);
    const timeoutId = globalThis.setTimeout(() => {
        controller.abort(createTimeoutError(safeTimeoutMs));
    }, safeTimeoutMs);
    const abortFromSource = () => {
        controller.abort(toAbortError(sourceSignal?.reason));
    };

    if (sourceSignal) sourceSignal.addEventListener('abort', abortFromSource, { once: true });

    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } catch (error) {
        const reason = controller.signal.reason;
        if (reason instanceof DOMException) throw reason;
        throw error;
    } finally {
        globalThis.clearTimeout(timeoutId);
        sourceSignal?.removeEventListener('abort', abortFromSource);
    }
}

/**
 * Appends a cache-busting `t` query parameter to a URL.
 * Handles both parseable and non-parseable URL strings safely.
 */
export function appendCacheBust(rawUrl: string, timestamp = Date.now()): string {
    try {
        const parsed = new URL(rawUrl);
        parsed.searchParams.set('t', String(timestamp));
        return parsed.toString();
    } catch {
        const separator = rawUrl.includes('?') ? '&' : '?';
        return `${rawUrl}${separator}t=${encodeURIComponent(String(timestamp))}`;
    }
}
