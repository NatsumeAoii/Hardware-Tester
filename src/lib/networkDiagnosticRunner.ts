import { abortableDelay } from './lifecycle';
import {
    SPEED_FETCH_TIMEOUT_MS,
    appendCacheBust,
    averageSamples,
    calculateJitterMs,
    fetchWithTimeout,
    getNetworkGrade,
    getNetworkQualityClass,
    trimLatencySamples,
    type TestServer,
} from './networkDiagnostics';

export interface NetworkDiagnosticProgress {
    text: string;
    percent: number;
}

export interface NetworkDiagnosticResult {
    ping: number;
    jitter: number;
    download: number;
    upload: number;
    packetLoss: number;
    grade: string;
    pingQuality: string;
    jitterQuality: string;
    downloadQuality: string;
    uploadQuality: string;
}

export type NetworkDiagnosticFetcher = (
    input: RequestInfo | URL,
    init?: RequestInit,
    timeoutMs?: number,
) => Promise<Response>;

export interface NetworkDiagnosticRunnerOptions {
    server: TestServer;
    testSizeBytes: number;
    signal?: AbortSignal;
    fetcher?: NetworkDiagnosticFetcher;
    delay?: (ms: number, signal?: AbortSignal) => Promise<void>;
    now?: () => number;
    onProgress?: (progress: NetworkDiagnosticProgress) => void;
}

const defaultResult = (): NetworkDiagnosticResult => ({
    ping: 0,
    jitter: 0,
    download: 0,
    upload: 0,
    packetLoss: 0,
    grade: '',
    pingQuality: '',
    jitterQuality: '',
    downloadQuality: '',
    uploadQuality: '',
});

const isAborted = (signal?: AbortSignal) => signal?.aborted === true;

const reportProgress = (
    onProgress: NetworkDiagnosticRunnerOptions['onProgress'],
    text: string,
    percent: number,
    signal?: AbortSignal,
) => {
    if (!isAborted(signal)) onProgress?.({ text, percent });
};

async function runPingJitterTest(
    options: Required<Pick<NetworkDiagnosticRunnerOptions, 'server' | 'fetcher' | 'delay' | 'now'>> &
        Pick<NetworkDiagnosticRunnerOptions, 'signal' | 'onProgress'>,
    result: NetworkDiagnosticResult,
): Promise<boolean> {
    const { server, fetcher, delay, now, signal, onProgress } = options;
    reportProgress(onProgress, 'Testing latency...', 0, signal);

    const samples: number[] = [];
    let failures = 0;
    const count = 10;

    for (let index = 0; index < count; index += 1) {
        if (isAborted(signal)) return false;
        try {
            const start = now();
            await fetcher(appendCacheBust(server.pingUrl), {
                method: 'GET',
                cache: 'no-store',
                mode: 'no-cors',
                signal,
            });
            const elapsed = now() - start;
            if (Number.isFinite(elapsed) && elapsed >= 0) samples.push(elapsed);
        } catch {
            if (isAborted(signal)) return false;
            failures += 1;
        }

        reportProgress(onProgress, `Ping ${index + 1}/${count}`, ((index + 1) / count) * 20, signal);
        if (index < count - 1) {
            try {
                await delay(150, signal);
            } catch {
                if (isAborted(signal)) return false;
                throw new DOMException('Latency pacing failed.', 'NetworkError');
            }
        }
    }

    result.packetLoss = Math.round((failures / count) * 100);

    if (samples.length === 0) {
        result.ping = -1;
        result.jitter = -1;
        return true;
    }

    const trimmed = trimLatencySamples(samples);
    const average = averageSamples(trimmed);
    if (average === null) return true;

    result.ping = Math.round(average);
    result.pingQuality = getNetworkQualityClass(average, [30, 100, 250], true);

    const jitter = calculateJitterMs(trimmed);
    if (jitter !== null) {
        result.jitter = jitter;
        result.jitterQuality = getNetworkQualityClass(jitter, [10, 30, 50], true);
    }

    return true;
}

async function runSpeedTest(
    type: 'download' | 'upload',
    options: Required<Pick<NetworkDiagnosticRunnerOptions, 'server' | 'testSizeBytes' | 'fetcher' | 'now'>> &
        Pick<NetworkDiagnosticRunnerOptions, 'signal' | 'onProgress'>,
    result: NetworkDiagnosticResult,
): Promise<boolean> {
    const { server, testSizeBytes, fetcher, now, signal, onProgress } = options;
    const progressStart = type === 'download' ? 25 : 65;
    const progressEnd = type === 'download' ? 60 : 95;
    reportProgress(onProgress, `Testing ${type}...`, progressStart, signal);

    const sizes = type === 'download'
        ? [Math.floor(testSizeBytes * 0.25), Math.floor(testSizeBytes * 0.5), testSizeBytes]
        : [Math.floor(testSizeBytes * 0.1), Math.floor(testSizeBytes * 0.25), Math.floor(testSizeBytes * 0.5)];

    const speeds: number[] = [];
    for (let round = 0; round < sizes.length; round += 1) {
        if (isAborted(signal)) return false;
        const size = sizes[round];
        const url = type === 'download' ? server.downloadUrl(size) : server.uploadUrl(size);

        try {
            const start = now();
            const init: RequestInit = { cache: 'no-store', signal };
            if (type === 'upload') {
                init.method = 'POST';
                init.body = new Blob([new ArrayBuffer(size)]);
            }
            const response = await fetcher(appendCacheBust(url), init, SPEED_FETCH_TIMEOUT_MS);
            if (type === 'download') await response.blob();
            const duration = (now() - start) / 1000;
            if (duration > 0.01 && Number.isFinite(duration)) speeds.push((size * 8) / (duration * 1e6));
        } catch {
            if (isAborted(signal)) return false;
        }

        const percent = progressStart + ((round + 1) / sizes.length) * (progressEnd - progressStart);
        reportProgress(onProgress, `${type} round ${round + 1}/${sizes.length}`, percent, signal);
    }

    if (speeds.length === 0) {
        if (type === 'download') result.download = -1;
        else result.upload = -1;
        return true;
    }

    const best = Math.max(...speeds);
    const thresholds = type === 'download' ? [100, 50, 10] : [50, 20, 5];
    if (type === 'download') {
        result.download = best;
        result.downloadQuality = getNetworkQualityClass(best, thresholds, false);
    } else {
        result.upload = best;
        result.uploadQuality = getNetworkQualityClass(best, thresholds, false);
    }

    return true;
}

export async function runNetworkDiagnostic(options: NetworkDiagnosticRunnerOptions): Promise<NetworkDiagnosticResult | null> {
    if (isAborted(options.signal)) return null;

    const fetcher = options.fetcher ?? fetchWithTimeout;
    const delay = options.delay ?? abortableDelay;
    const now = options.now ?? (() => performance.now());
    const result = defaultResult();
    const sharedOptions = {
        server: options.server,
        testSizeBytes: options.testSizeBytes,
        signal: options.signal,
        fetcher,
        delay,
        now,
        onProgress: options.onProgress,
    };

    if (!await runPingJitterTest(sharedOptions, result)) return null;
    if (!await runSpeedTest('download', sharedOptions, result)) return null;
    if (!await runSpeedTest('upload', sharedOptions, result)) return null;

    if (result.ping > 0 && result.download > 0) {
        result.grade = getNetworkGrade(result.ping, result.jitter, result.download, result.upload, result.packetLoss);
    }

    reportProgress(options.onProgress, 'Complete', 100, options.signal);
    return isAborted(options.signal) ? null : result;
}
