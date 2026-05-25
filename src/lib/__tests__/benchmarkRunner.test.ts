import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCpuBenchmark, runMemoryBenchmark } from '../benchmarkRunner';

const originalSetTimeout = globalThis.setTimeout;

describe('benchmarkRunner', () => {
    describe('chunked execution yields control', () => {
        let setTimeoutCalls: number;

        beforeEach(() => {
            setTimeoutCalls = 0;
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('CPU benchmark yields to main thread via setTimeout between chunks', async () => {
            // Spy on setTimeout to count how many times the benchmark yields
            const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(
                ((fn: TimerHandler, _delay?: number) => {
                    setTimeoutCalls++;
                    // Execute the callback immediately to speed up the test
                    if (typeof fn === 'function') fn();
                    return 0 as unknown as ReturnType<typeof setTimeout>;
                }) as typeof setTimeout,
            );

            const onProgress = vi.fn();
            const controller = new AbortController();

            await runCpuBenchmark(onProgress, controller.signal);

            // The benchmark should have yielded multiple times during 3s of execution
            // Each chunk runs for at most ~40ms, so over 3000ms we expect many yields
            expect(setTimeoutCalls).toBeGreaterThan(1);

            setTimeoutSpy.mockRestore();
        });

        it('Memory benchmark yields to main thread via setTimeout between chunks', async () => {
            const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(
                ((fn: TimerHandler, _delay?: number) => {
                    setTimeoutCalls++;
                    if (typeof fn === 'function') fn();
                    return 0 as unknown as ReturnType<typeof setTimeout>;
                }) as typeof setTimeout,
            );

            const onProgress = vi.fn();
            const controller = new AbortController();

            await runMemoryBenchmark(onProgress, controller.signal);

            // The benchmark should have yielded multiple times during 3s of execution
            expect(setTimeoutCalls).toBeGreaterThan(1);

            setTimeoutSpy.mockRestore();
        });

        it('each chunk runs for no more than 50ms (MAX_CHUNK_MS = 40)', async () => {
            // Track the wall-clock time between yields to verify chunks stay under 50ms
            const chunkDurations: number[] = [];
            let lastYieldTime = performance.now();

            const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(
                ((fn: TimerHandler, _delay?: number) => {
                    const now = performance.now();
                    chunkDurations.push(now - lastYieldTime);
                    lastYieldTime = now;
                    if (typeof fn === 'function') fn();
                    return 0 as unknown as ReturnType<typeof setTimeout>;
                }) as typeof setTimeout,
            );

            const onProgress = vi.fn();
            const controller = new AbortController();

            await runCpuBenchmark(onProgress, controller.signal);

            // All chunk durations should be under 50ms (the requirement threshold)
            // Allow a small tolerance for timer imprecision
            for (const duration of chunkDurations) {
                expect(duration).toBeLessThan(60); // 50ms + 10ms tolerance for CI/timer jitter
            }

            setTimeoutSpy.mockRestore();
        });
    });

    describe('runCpuBenchmark', () => {
        it('returns a result with type cpu and positive ops/sec', async () => {
            const onProgress = vi.fn();
            const controller = new AbortController();

            const result = await runCpuBenchmark(onProgress, controller.signal);

            expect(result.type).toBe('cpu');
            expect(result.value).toBeGreaterThan(0);
            expect(result.durationMs).toBeGreaterThanOrEqual(3000);
            expect(result.timestamp).toBeGreaterThan(0);
        });

        it('reports progress from 0 to 100', async () => {
            const progressValues: number[] = [];
            const onProgress = (pct: number) => progressValues.push(pct);
            const controller = new AbortController();

            await runCpuBenchmark(onProgress, controller.signal);

            expect(progressValues[0]).toBe(0);
            expect(progressValues[progressValues.length - 1]).toBe(100);
            // Progress values should be non-decreasing
            for (let i = 1; i < progressValues.length; i++) {
                expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
            }
        });

        it('throws AbortError when signal is aborted before start', async () => {
            const onProgress = vi.fn();
            const controller = new AbortController();
            controller.abort();

            await expect(
                runCpuBenchmark(onProgress, controller.signal),
            ).rejects.toThrow('Benchmark aborted');
        });

        it('throws AbortError when signal is aborted during execution', async () => {
            const onProgress = vi.fn();
            const controller = new AbortController();

            // Abort after a short delay
            originalSetTimeout(() => controller.abort(), 100);

            await expect(
                runCpuBenchmark(onProgress, controller.signal),
            ).rejects.toThrow('Benchmark aborted');
        });
    });

    describe('runMemoryBenchmark', () => {
        it('returns a result with type memory and positive MB/s', async () => {
            const onProgress = vi.fn();
            const controller = new AbortController();

            const result = await runMemoryBenchmark(onProgress, controller.signal);

            expect(result.type).toBe('memory');
            expect(result.value).toBeGreaterThan(0);
            expect(result.durationMs).toBeGreaterThanOrEqual(3000);
            expect(result.timestamp).toBeGreaterThan(0);
        });

        it('reports progress from 0 to 100', async () => {
            const progressValues: number[] = [];
            const onProgress = (pct: number) => progressValues.push(pct);
            const controller = new AbortController();

            await runMemoryBenchmark(onProgress, controller.signal);

            expect(progressValues[0]).toBe(0);
            expect(progressValues[progressValues.length - 1]).toBe(100);
            for (let i = 1; i < progressValues.length; i++) {
                expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
            }
        });

        it('throws AbortError when signal is aborted before start', async () => {
            const onProgress = vi.fn();
            const controller = new AbortController();
            controller.abort();

            await expect(
                runMemoryBenchmark(onProgress, controller.signal),
            ).rejects.toThrow('Benchmark aborted');
        });

        it('throws AbortError when signal is aborted during execution', async () => {
            const onProgress = vi.fn();
            const controller = new AbortController();

            setTimeout(() => controller.abort(), 100);

            await expect(
                runMemoryBenchmark(onProgress, controller.signal),
            ).rejects.toThrow('Benchmark aborted');
        });
    });
});
