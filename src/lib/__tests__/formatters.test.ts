import { describe, expect, it } from 'vitest';
import {
    EMPTY_VALUE,
    NOT_AVAILABLE,
    formatBytes,
    formatClockDuration,
    formatCoordinateDms,
    formatDurationFromSeconds,
    formatMilliseconds,
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
});
