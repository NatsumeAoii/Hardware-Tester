import { describe, expect, it } from 'vitest';
import {
    appendCacheBust,
    averageSamples,
    calculateJitterMs,
    parseCloudflareTrace,
    trimLatencySamples,
} from '../networkDiagnostics';

describe('networkDiagnostics', () => {
    it('parses trace values without truncating values that contain equals signs', () => {
        const trace = parseCloudflareTrace('colo=SIN\nloc=ID\nhttp=http/3=tuned\ntls=TLSv1.3\nwarp=off\ngateway=off\n');
        expect(trace).toEqual({
            datacenter: 'SIN',
            country: 'ID',
            httpVersion: 'http/3=tuned',
            tls: 'TLSv1.3',
            warp: 'off',
            gateway: 'off',
        });
    });

    it('appends cache-busting query params safely', () => {
        expect(appendCacheBust('https://example.com/path', 123)).toBe('https://example.com/path?t=123');
        expect(appendCacheBust('https://example.com/path?bytes=10', 123)).toBe('https://example.com/path?bytes=10&t=123');
        expect(appendCacheBust('/relative?bytes=10', 123)).toBe('/relative?bytes=10&t=123');
    });

    it('calculates latency sample summaries', () => {
        expect(trimLatencySamples([100, 10, 20, 30, 1000])).toEqual([20, 30, 100]);
        expect(averageSamples([20, 30, 100])).toBe(50);
        expect(calculateJitterMs([10, 20, 10])).toBe(10);
    });
});
