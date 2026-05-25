import { EMPTY_VALUE, NOT_AVAILABLE } from './formatters';

export interface TestServer {
    id: string;
    name: string;
    pingUrl: string;
    downloadUrl: (bytes: number) => string;
    uploadUrl: (bytes: number) => string;
}

export interface TestResult {
    timestamp: number;
    server: string;
    ping: number;
    jitter: number;
    download: number;
    upload: number;
    packetLoss: number;
    grade: string;
}

export interface TraceInfo {
    datacenter: string;
    country: string;
    httpVersion: string;
    tls: string;
    warp: string;
    gateway: string;
}

export interface IpInfo {
    ip: string;
    isp: string;
    location: string;
}

type IpApi = {
    url: string;
    parse: (data: unknown) => IpInfo;
};

const FALLBACK_LABEL = NOT_AVAILABLE;

export const DEFAULT_FETCH_TIMEOUT_MS = 5000;
export const SPEED_FETCH_TIMEOUT_MS = 15000;

export const NETWORK_TEST_SERVERS: TestServer[] = [
    {
        id: 'cloudflare',
        name: 'Cloudflare',
        pingUrl: 'https://cloudflare.com/cdn-cgi/trace',
        downloadUrl: bytes => `https://speed.cloudflare.com/__down?bytes=${bytes}`,
        uploadUrl: bytes => `https://speed.cloudflare.com/__up?bytes=${bytes}`,
    },
    {
        id: 'google',
        name: 'Google',
        pingUrl: 'https://www.google.com/generate_204',
        downloadUrl: bytes => `https://speed.cloudflare.com/__down?bytes=${bytes}`,
        uploadUrl: bytes => `https://speed.cloudflare.com/__up?bytes=${bytes}`,
    },
    {
        id: 'apple',
        name: 'Apple',
        pingUrl: 'https://captive.apple.com/hotspot-detect.html',
        downloadUrl: bytes => `https://speed.cloudflare.com/__down?bytes=${bytes}`,
        uploadUrl: bytes => `https://speed.cloudflare.com/__up?bytes=${bytes}`,
    },
    {
        id: 'mozilla',
        name: 'Mozilla',
        pingUrl: 'https://detectportal.firefox.com/canonical.html',
        downloadUrl: bytes => `https://speed.cloudflare.com/__down?bytes=${bytes}`,
        uploadUrl: bytes => `https://speed.cloudflare.com/__up?bytes=${bytes}`,
    },
];

export const DOWNLOAD_SIZES = [
    { label: 'Small (1 MB)', bytes: 1 * 1024 * 1024 },
    { label: 'Medium (5 MB)', bytes: 5 * 1024 * 1024 },
    { label: 'Large (10 MB)', bytes: 10 * 1024 * 1024 },
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const getString = (record: Record<string, unknown>, key: string): string | null => {
    const value = record[key];
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const firstString = (...values: Array<string | null | undefined>) => values.find(value => !!value) ?? null;

const joinLocation = (...parts: Array<string | null>) => parts.filter(Boolean).join(', ') || FALLBACK_LABEL;

const parseIpWhoIs = (data: unknown): IpInfo => {
    if (!isRecord(data)) return { ip: FALLBACK_LABEL, isp: FALLBACK_LABEL, location: FALLBACK_LABEL };
    const connection = isRecord(data.connection) ? data.connection : {};
    return {
        ip: getString(data, 'ip') ?? FALLBACK_LABEL,
        isp: firstString(getString(connection, 'org'), getString(connection, 'isp')) ?? FALLBACK_LABEL,
        location: joinLocation(getString(data, 'city'), getString(data, 'region'), getString(data, 'country')),
    };
};

const parseIpApiCo = (data: unknown): IpInfo => {
    if (!isRecord(data)) return { ip: FALLBACK_LABEL, isp: FALLBACK_LABEL, location: FALLBACK_LABEL };
    return {
        ip: getString(data, 'ip') ?? FALLBACK_LABEL,
        isp: getString(data, 'org') ?? FALLBACK_LABEL,
        location: joinLocation(getString(data, 'city'), getString(data, 'region'), getString(data, 'country_name')),
    };
};

const parseIpify = (data: unknown): IpInfo => {
    if (!isRecord(data)) return { ip: FALLBACK_LABEL, isp: FALLBACK_LABEL, location: FALLBACK_LABEL };
    return {
        ip: getString(data, 'ip') ?? FALLBACK_LABEL,
        isp: FALLBACK_LABEL,
        location: FALLBACK_LABEL,
    };
};

const ipApis: IpApi[] = [
    { url: 'https://ipwho.is/', parse: parseIpWhoIs },
    { url: 'https://ipapi.co/json/', parse: parseIpApiCo },
    { url: 'https://api.ipify.org?format=json', parse: parseIpify },
];

const toAbortError = (reason: unknown) =>
    reason instanceof DOMException
        ? reason
        : new DOMException('The operation was cancelled.', 'AbortError');

export const createTimeoutError = (timeoutMs: number) =>
    new DOMException(`Request timed out after ${timeoutMs}ms.`, 'TimeoutError');

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

const parseTraceMap = (text: string) => {
    const values = new Map<string, string>();
    for (const line of text.split('\n')) {
        const separatorIndex = line.indexOf('=');
        if (separatorIndex <= 0) continue;
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        if (key && value) values.set(key, value);
    }
    return values;
};

export function parseCloudflareTrace(text: string): TraceInfo {
    const values = parseTraceMap(text);
    const get = (key: string) => values.get(key) ?? EMPTY_VALUE;
    return {
        datacenter: get('colo'),
        country: get('loc'),
        httpVersion: get('http'),
        tls: get('tls'),
        warp: get('warp'),
        gateway: get('gateway'),
    };
}

export async function fetchIpWithFallback(signal?: AbortSignal): Promise<IpInfo> {
    for (const api of ipApis) {
        if (signal?.aborted) return { ip: 'Unavailable', isp: 'Unavailable', location: 'Unavailable' };
        try {
            const response = await fetchWithTimeout(api.url, { cache: 'no-store', signal });
            if (!response.ok) continue;
            const data = await response.json() as unknown;
            const info = api.parse(data);
            if (info.ip && info.ip !== FALLBACK_LABEL) return info;
        } catch {
            continue;
        }
    }

    if (signal?.aborted) return { ip: 'Unavailable', isp: 'Unavailable', location: 'Unavailable' };

    try {
        const response = await fetchWithTimeout('https://cloudflare.com/cdn-cgi/trace', { cache: 'no-store', signal });
        if (response.ok) {
            const values = parseTraceMap(await response.text());
            const ip = values.get('ip');
            if (ip) return { ip, isp: FALLBACK_LABEL, location: FALLBACK_LABEL };
        }
    } catch {
        // Final fallback intentionally returns a user-facing unavailable state below.
    }

    return { ip: 'Unavailable', isp: 'Unavailable', location: 'Unavailable' };
}

export function getNetworkGrade(ping: number, jitter: number, download: number, upload: number, loss: number): string {
    let score = 0;
    if (ping < 20) score += 30;
    else if (ping < 50) score += 25;
    else if (ping < 100) score += 15;
    else if (ping < 200) score += 5;

    if (jitter < 5) score += 15;
    else if (jitter < 15) score += 10;
    else if (jitter < 30) score += 5;

    if (download > 100) score += 25;
    else if (download > 50) score += 20;
    else if (download > 20) score += 15;
    else if (download > 5) score += 8;
    else score += 2;

    if (upload > 50) score += 20;
    else if (upload > 20) score += 15;
    else if (upload > 10) score += 10;
    else if (upload > 2) score += 5;

    if (loss === 0) score += 10;
    else if (loss <= 5) score += 5;

    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 35) return 'D';
    return 'F';
}

export function getNetworkGradeColor(grade: string): string {
    if (grade.startsWith('A')) return '#22c55e';
    if (grade.startsWith('B')) return '#3b82f6';
    if (grade === 'C') return '#f59e0b';
    if (grade === 'D') return '#f97316';
    return '#ef4444';
}

export function getNetworkQualityClass(value: number, thresholds: number[], inverse: boolean): string {
    const levels = ['excellent', 'good', 'fair', 'poor'];
    for (let i = 0; i < thresholds.length; i++) {
        if (inverse ? value < thresholds[i] : value > thresholds[i]) return levels[i];
    }
    return levels[3];
}

export function trimLatencySamples(samples: number[]): number[] {
    const sorted = [...samples].sort((a, b) => a - b);
    return sorted.length > 4 ? sorted.slice(1, -1) : sorted;
}

export function averageSamples(samples: number[]): number | null {
    if (samples.length === 0) return null;
    return samples.reduce((total, sample) => total + sample, 0) / samples.length;
}

export function calculateJitterMs(samples: number[]): number | null {
    if (samples.length < 2) return null;
    const diffs = samples.slice(1).map((value, index) => Math.abs(value - samples[index]));
    return Math.round(Math.sqrt(diffs.reduce((total, diff) => total + diff * diff, 0) / diffs.length));
}

