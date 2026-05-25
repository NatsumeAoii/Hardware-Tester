import { describe, expect, it } from 'vitest';
import {
    EMPTY_VALUE,
    NOT_AVAILABLE,
    formatBytes,
    formatClockDuration,
    formatCoordinateDms,
    formatDurationFromSeconds,
    formatHhMmSs,
    formatMbPerSecond,
    formatMilliseconds,
    formatOpsPerSecond,
    formatResolution,
    formatSpeedMbps,
} from '../formatters';

describe('formatters', () => {
    it('formats unavailable and empty values consistently', () => {
        expect(EMPTY_VALUE).toBe('—');
        expect(NOT_AVAILABLE).toBe('N/A');
        expect(formatMilliseconds(0)).toBe(EMPTY_VALUE);
        expect(formatSpeedMbps(0)).toBe(EMPTY_VALUE);
    });

    it('formats numbers without leaking invalid values into the UI', () => {
        expect(formatBytes(-1)).toBe(NOT_AVAILABLE);
        expect(formatBytes(1536)).toBe('2 KB');
        expect(formatBytes(4_500_000)).toBe('5 MB');
        expect(formatResolution(undefined, 720)).toBe(NOT_AVAILABLE);
        expect(formatResolution(1280, 720)).toBe('1280 × 720');
    });

    it('formats durations and coordinates', () => {
        expect(formatClockDuration(65)).toBe('1:05');
        expect(formatDurationFromSeconds(Number.POSITIVE_INFINITY)).toBe(NOT_AVAILABLE);
        expect(formatDurationFromSeconds(0)).toBe('Fully charged');
        expect(formatDurationFromSeconds(3660)).toBe('1h 1m');
        expect(formatCoordinateDms(-6.2, 'lat')).toBe('6° 12\' 0.0" S');
    });

    it('formats HH:MM:SS duration correctly', () => {
        expect(formatHhMmSs(0)).toBe('00:00:00');
        expect(formatHhMmSs(59)).toBe('00:00:59');
        expect(formatHhMmSs(60)).toBe('00:01:00');
        expect(formatHhMmSs(3599)).toBe('00:59:59');
        expect(formatHhMmSs(3600)).toBe('01:00:00');
        expect(formatHhMmSs(3661)).toBe('01:01:01');
        expect(formatHhMmSs(86399)).toBe('23:59:59');
        expect(formatHhMmSs(86400)).toBe('24:00:00');
        expect(formatHhMmSs(-5)).toBe('00:00:00');
        expect(formatHhMmSs(NaN)).toBe('00:00:00');
        expect(formatHhMmSs(Infinity)).toBe('00:00:00');
    });

    it('formats ops/sec correctly', () => {
        expect(formatOpsPerSecond(1000, 1000)).toBe('1,000 ops/s');
        expect(formatOpsPerSecond(5000, 2000)).toBe('2,500 ops/s');
        expect(formatOpsPerSecond(1_000_000, 1000)).toBe('1,000,000 ops/s');
        expect(formatOpsPerSecond(0, 1000)).toBe('0 ops/s');
        expect(formatOpsPerSecond(100, 0)).toBe(NOT_AVAILABLE);
        expect(formatOpsPerSecond(100, -1)).toBe(NOT_AVAILABLE);
        expect(formatOpsPerSecond(-1, 1000)).toBe(NOT_AVAILABLE);
        expect(formatOpsPerSecond(NaN, 1000)).toBe(NOT_AVAILABLE);
    });

    it('formats MB/s correctly', () => {
        expect(formatMbPerSecond(1_000_000, 1000)).toBe('1.00 MB/s');
        expect(formatMbPerSecond(5_000_000, 2000)).toBe('2.50 MB/s');
        expect(formatMbPerSecond(0, 1000)).toBe('0.00 MB/s');
        expect(formatMbPerSecond(100, 0)).toBe(NOT_AVAILABLE);
        expect(formatMbPerSecond(100, -1)).toBe(NOT_AVAILABLE);
        expect(formatMbPerSecond(-1, 1000)).toBe(NOT_AVAILABLE);
        expect(formatMbPerSecond(NaN, 1000)).toBe(NOT_AVAILABLE);
    });
});
