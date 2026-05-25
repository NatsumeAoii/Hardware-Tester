import { useState, useEffect, useRef, useCallback } from 'react';
import { runCpuBenchmark, runMemoryBenchmark, type BenchmarkResult } from '../lib/benchmarkRunner';
import { formatOpsPerSecond, formatMbPerSecond } from '../lib/formatters';
import { getUserSafeError, isAbortError } from '../lib/userSafeErrors';

/**
 * Formats a benchmark result using the standard formatters.
 * Reconstructs raw values from the rate and duration stored in the result.
 */
function formatResult(result: BenchmarkResult): string {
    if (result.type === 'cpu') {
        // value is ops/sec, reconstruct total operations
        const totalOps = result.value * (result.durationMs / 1000);
        return formatOpsPerSecond(totalOps, result.durationMs);
    }
    // value is MB/s, reconstruct total bytes
    const totalBytes = result.value * (result.durationMs / 1000) * 1_000_000;
    return formatMbPerSecond(totalBytes, result.durationMs);
}

const MAX_HISTORY = 10;
const RESOLUTION_SAMPLES = 20;
const RESOLUTION_THRESHOLD_US = 5;

/**
 * Checks whether performance.now() has sufficient resolution (< 5μs).
 * Takes multiple samples and checks if all differences are multiples of
 * a value greater than 5μs, indicating reduced precision.
 */
function checkTimerResolution(): boolean {
    const samples: number[] = [];
    for (let i = 0; i < RESOLUTION_SAMPLES; i++) {
        samples.push(performance.now());
    }

    const diffs: number[] = [];
    for (let i = 1; i < samples.length; i++) {
        const diff = samples[i] - samples[i - 1];
        if (diff > 0) {
            diffs.push(diff);
        }
    }

    // If we got no positive differences, timer is too coarse
    if (diffs.length === 0) return false;

    // Find the minimum non-zero difference (in ms)
    const minDiff = Math.min(...diffs);

    // If the minimum difference is greater than 5μs (0.005ms), precision is reduced
    return minDiff < RESOLUTION_THRESHOLD_US / 1000;
}

export default function BenchmarkTester() {
    const [isSupported, setIsSupported] = useState(true);
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [history, setHistory] = useState<BenchmarkResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const hardwareConcurrency = navigator.hardwareConcurrency ?? 0;
    const deviceMemory = (navigator as { deviceMemory?: number }).deviceMemory ?? null;

    useEffect(() => {
        const supported = checkTimerResolution();
        setIsSupported(supported);
    }, []);

    // Abort on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const handleProgress = useCallback((pct: number) => {
        setProgress(pct);
    }, []);

    const runBenchmark = useCallback(async (type: 'cpu' | 'memory') => {
        setRunning(true);
        setProgress(0);
        setError(null);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const result = type === 'cpu'
                ? await runCpuBenchmark(handleProgress, controller.signal)
                : await runMemoryBenchmark(handleProgress, controller.signal);

            setHistory(prev => [result, ...prev].slice(0, MAX_HISTORY));
        } catch (err: unknown) {
            if (isAbortError(err)) return;
            const safeError = getUserSafeError(err);
            setError(`${safeError.message} ${safeError.detail}`);
        } finally {
            setRunning(false);
            setProgress(0);
            abortControllerRef.current = null;
        }
    }, [handleProgress]);

    return (
        <section aria-labelledby="benchmark-title">
            <header className="tester-panel__header">
                <h2 id="benchmark-title">Performance Benchmark</h2>
                <p>Run CPU and memory benchmarks to gauge device processing performance.</p>
            </header>
            <div className="tester-panel__body">
                {!isSupported ? (
                    <div className="status-display" style={{ color: 'var(--error)' }}>
                        High-resolution timing is not available in this browser.
                        <p>performance.now() precision is coarser than 5μs. Try Chrome or Edge with site isolation enabled.</p>
                    </div>
                ) : (
                    <>
                        <div className="info-grid info-grid--2-col">
                            <div className="info-card">
                                <h4>Hardware Concurrency</h4>
                                <p>{hardwareConcurrency} logical cores</p>
                            </div>
                            <div className="info-card">
                                <h4>Device Memory</h4>
                                <p>{deviceMemory !== null ? `${deviceMemory} GB` : 'N/A'}</p>
                            </div>
                        </div>

                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={() => runBenchmark('cpu')}
                                disabled={running}
                                style={{ minWidth: '44px', minHeight: '44px' }}
                            >
                                Run CPU Benchmark
                            </button>
                            <button
                                type="button"
                                onClick={() => runBenchmark('memory')}
                                disabled={running}
                                style={{ minWidth: '44px', minHeight: '44px' }}
                            >
                                Run Memory Benchmark
                            </button>
                        </div>

                        {running && (
                            <div style={{ marginTop: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <span>Running benchmark...</span>
                                    <span>{progress}%</span>
                                </div>
                                <div
                                    style={{
                                        width: '100%',
                                        height: '8px',
                                        background: 'var(--surface-3)',
                                        borderRadius: 'var(--radius-sm)',
                                        overflow: 'hidden',
                                    }}
                                    role="progressbar"
                                    aria-valuenow={progress}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label="Benchmark progress"
                                >
                                    <div
                                        style={{
                                            width: `${progress}%`,
                                            height: '100%',
                                            background: 'var(--primary)',
                                            transition: 'width 0.2s ease',
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="status-display" style={{ color: 'var(--error)', marginTop: '1rem' }}>
                                {error}
                            </div>
                        )}

                        {history.length > 0 && (
                            <div style={{ marginTop: '1.5rem' }}>
                                <h3 className="section-title">Results History</h3>
                                <div className="info-grid" style={{ gap: '0.5rem' }}>
                                    {history.map((result, index) => (
                                        <div key={`${result.timestamp}-${index}`} className="info-card">
                                            <h4>{result.type === 'cpu' ? 'CPU' : 'Memory'}</h4>
                                            <p>{formatResult(result)}</p>
                                            <small style={{ color: 'var(--text-muted)' }}>
                                                {new Date(result.timestamp).toLocaleTimeString()}
                                            </small>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
