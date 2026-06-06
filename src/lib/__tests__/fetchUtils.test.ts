import { describe, expect, it, vi } from 'vitest';
import { appendCacheBust, createTimeoutError, DEFAULT_FETCH_TIMEOUT_MS, fetchWithTimeout } from '../fetchUtils';

describe('fetchUtils', () => {
    it('exports a default timeout constant', () => {
        expect(DEFAULT_FETCH_TIMEOUT_MS).toBe(5000);
    });

    it('createTimeoutError produces a TimeoutError DOMException', () => {
        const error = createTimeoutError(3000);
        expect(error).toBeInstanceOf(DOMException);
        expect(error.name).toBe('TimeoutError');
        expect(error.message).toContain('3000');
    });

    describe('appendCacheBust', () => {
        it('appends a t parameter to a valid URL', () => {
            const result = appendCacheBust('https://example.com/path', 12345);
            expect(result).toContain('t=12345');
            expect(result).toMatch(/^https:\/\/example\.com\/path\?t=12345$/);
        });

        it('appends with & when URL already has query params', () => {
            const result = appendCacheBust('https://example.com/path?foo=bar', 99);
            expect(result).toContain('foo=bar');
            expect(result).toContain('t=99');
        });

        it('handles non-parseable URLs gracefully', () => {
            const result = appendCacheBust('not-a-url', 1);
            expect(result).toBe('not-a-url?t=1');
        });

        it('uses & separator for non-parseable URLs that already have ?', () => {
            const result = appendCacheBust('not-a-url?x=1', 2);
            expect(result).toBe('not-a-url?x=1&t=2');
        });
    });

    describe('fetchWithTimeout', () => {
        it('throws immediately when signal is already aborted', async () => {
            const controller = new AbortController();
            controller.abort();
            await expect(fetchWithTimeout('https://example.com', { signal: controller.signal }))
                .rejects.toThrow(DOMException);
        });

        it('throws a TimeoutError when the timeout expires', async () => {
            let abortedViaSignal = false;
            const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
                (_input, init) => new Promise((_resolve, reject) => {
                    const signal = (init as RequestInit | undefined)?.signal;
                    if (signal) {
                        signal.addEventListener('abort', () => {
                            abortedViaSignal = true;
                            reject(signal.reason);
                        });
                    }
                }),
            );

            await expect(fetchWithTimeout('https://example.com', {}, 1))
                .rejects.toMatchObject({ name: 'TimeoutError' });
            expect(abortedViaSignal).toBe(true);
            fetchMock.mockRestore();
        });
    });
});
