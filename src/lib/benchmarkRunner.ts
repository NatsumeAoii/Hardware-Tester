export interface BenchmarkResult {
    type: 'cpu' | 'memory';
    value: number;        // ops/sec or MB/s
    timestamp: number;
    durationMs: number;
}

const BENCHMARK_DURATION_MS = 3000;
const MAX_CHUNK_MS = 40; // Keep under 50ms to maintain UI responsiveness

/**
 * Yields control back to the browser event loop using setTimeout.
 * This ensures the main thread is not blocked for more than ~40ms at a time.
 */
function yieldToMain(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Computes the progress percentage from elapsed time and total duration.
 */
export function computeProgress(elapsedMs: number, totalMs: number): number {
    return Math.min(100, Math.round((elapsedMs / totalMs) * 100));
}

/**
 * Runs a CPU benchmark for 3 seconds using chunked execution.
 * Performs arithmetic operations in chunks of up to ~40ms, yielding between chunks
 * to keep the main thread responsive.
 *
 * @param onProgress - Callback reporting completion percentage (0–100)
 * @param signal - AbortSignal for cancellation
 * @returns BenchmarkResult with ops/sec
 */
export async function runCpuBenchmark(
    onProgress: (pct: number) => void,
    signal: AbortSignal,
): Promise<BenchmarkResult> {
    const startTime = performance.now();
    let totalOperations = 0;
    let lastProgressReport = 0;

    onProgress(0);

    while (true) {
        if (signal.aborted) {
            throw new DOMException('Benchmark aborted', 'AbortError');
        }

        const chunkStart = performance.now();
        let chunkOps = 0;

        // Run computation in a chunk limited to MAX_CHUNK_MS
        while (performance.now() - chunkStart < MAX_CHUNK_MS) {
            // Perform a mix of arithmetic operations as the workload
            let x = 0;
            for (let i = 0; i < 1000; i++) {
                x += Math.sqrt(i * 1.5) * Math.sin(i);
                x += Math.atan2(i, i + 1);
            }
            // Prevent dead-code elimination
            if (x === Infinity) break;
            chunkOps += 1000;
        }

        totalOperations += chunkOps;

        const elapsed = performance.now() - startTime;

        // Report progress at most every ~100ms to avoid excessive callbacks
        if (elapsed - lastProgressReport >= 100 || elapsed >= BENCHMARK_DURATION_MS) {
            const pct = computeProgress(elapsed, BENCHMARK_DURATION_MS);
            onProgress(pct);
            lastProgressReport = elapsed;
        }

        if (elapsed >= BENCHMARK_DURATION_MS) {
            break;
        }

        // Yield to the main thread between chunks
        await yieldToMain();
    }

    const endTime = performance.now();
    const durationMs = endTime - startTime;
    const opsPerSecond = totalOperations / (durationMs / 1000);

    onProgress(100);

    return {
        type: 'cpu',
        value: opsPerSecond,
        timestamp: Date.now(),
        durationMs,
    };
}

/**
 * Runs a memory benchmark for 3 seconds using chunked execution.
 * Allocates and fills typed arrays in chunks of up to ~40ms, yielding between chunks
 * to keep the main thread responsive.
 *
 * @param onProgress - Callback reporting completion percentage (0–100)
 * @param signal - AbortSignal for cancellation
 * @returns BenchmarkResult with MB/s throughput
 */
export async function runMemoryBenchmark(
    onProgress: (pct: number) => void,
    signal: AbortSignal,
): Promise<BenchmarkResult> {
    const startTime = performance.now();
    let totalBytes = 0;
    let lastProgressReport = 0;
    const ALLOC_SIZE = 1024 * 1024; // 1 MB per allocation

    onProgress(0);

    while (true) {
        if (signal.aborted) {
            throw new DOMException('Benchmark aborted', 'AbortError');
        }

        const chunkStart = performance.now();

        // Allocate and fill memory in a chunk limited to MAX_CHUNK_MS
        while (performance.now() - chunkStart < MAX_CHUNK_MS) {
            const buffer = new Uint8Array(ALLOC_SIZE);
            // Write to the buffer to ensure actual memory throughput measurement
            for (let i = 0; i < buffer.length; i += 64) {
                buffer[i] = (i & 0xFF);
            }
            // Read back to prevent optimization from eliminating the write
            let sum = 0;
            for (let i = 0; i < buffer.length; i += 256) {
                sum += buffer[i];
            }
            if (sum === -1) break; // Prevent dead-code elimination
            totalBytes += ALLOC_SIZE;
        }

        const elapsed = performance.now() - startTime;

        // Report progress at most every ~100ms
        if (elapsed - lastProgressReport >= 100 || elapsed >= BENCHMARK_DURATION_MS) {
            const pct = computeProgress(elapsed, BENCHMARK_DURATION_MS);
            onProgress(pct);
            lastProgressReport = elapsed;
        }

        if (elapsed >= BENCHMARK_DURATION_MS) {
            break;
        }

        // Yield to the main thread between chunks
        await yieldToMain();
    }

    const endTime = performance.now();
    const durationMs = endTime - startTime;
    const mbPerSecond = totalBytes / (durationMs / 1000) / 1_000_000;

    onProgress(100);

    return {
        type: 'memory',
        value: mbPerSecond,
        timestamp: Date.now(),
        durationMs,
    };
}
