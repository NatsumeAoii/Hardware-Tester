export const EMPTY_VALUE = '—';
export const NOT_AVAILABLE = 'N/A';

export function formatInteger(value: number, locale = 'en-US'): string {
    return new Intl.NumberFormat(locale).format(value);
}

export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) return NOT_AVAILABLE;
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)} KB`;
    return `${Math.round(bytes)} B`;
}

export function formatClockDuration(seconds: number): string {
    const safeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
    return `${Math.floor(safeSeconds / 60)}:${(safeSeconds % 60).toString().padStart(2, '0')}`;
}

export function formatCoordinateDms(value: number, type: 'lat' | 'lon'): string {
    const absolute = Math.abs(value);
    const direction = type === 'lat' ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
    const degrees = Math.floor(absolute);
    const minutes = Math.floor((absolute - degrees) * 60);
    const seconds = ((absolute - degrees - minutes / 60) * 3600).toFixed(1);
    return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

export function formatDurationFromSeconds(
    seconds: number | null | undefined,
    options: { zeroLabel?: string; unavailableLabel?: string } = {},
): string {
    if (seconds == null || !Number.isFinite(seconds)) return options.unavailableLabel ?? NOT_AVAILABLE;
    if (seconds === 0) return options.zeroLabel ?? 'Fully charged';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function formatMilliseconds(value: number): string {
    if (!Number.isFinite(value) || value < 0) return 'Error';
    if (value === 0) return EMPTY_VALUE;
    return `${value} ms`;
}

export function formatResolution(width: number | undefined, height: number | undefined): string {
    if (!width || !height) return NOT_AVAILABLE;
    return `${width} × ${height}`;
}

export function formatSpeedMbps(value: number): string {
    if (!Number.isFinite(value) || value < 0) return 'Error';
    if (value === 0) return EMPTY_VALUE;
    return `${value.toFixed(1)} Mbps`;
}

export function formatSignedDegrees(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return EMPTY_VALUE;
    return `${value.toFixed(0)}°`;
}

export function formatHhMmSs(totalSeconds: number): string {
    const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
    const hh = Math.floor(safe / 3600).toString().padStart(2, '0');
    const mm = Math.floor((safe % 3600) / 60).toString().padStart(2, '0');
    const ss = (safe % 60).toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

export function formatOpsPerSecond(operations: number, durationMs: number): string {
    if (durationMs <= 0 || !Number.isFinite(durationMs) || !Number.isFinite(operations) || operations < 0) {
        return NOT_AVAILABLE;
    }
    const opsPerSec = operations / (durationMs / 1000);
    return new Intl.NumberFormat('en-US').format(Math.round(opsPerSec)) + ' ops/s';
}

export function formatMbPerSecond(bytes: number, durationMs: number): string {
    if (durationMs <= 0 || !Number.isFinite(durationMs) || !Number.isFinite(bytes) || bytes < 0) {
        return NOT_AVAILABLE;
    }
    const mbPerSec = bytes / (durationMs / 1000) / 1_000_000;
    return mbPerSec.toFixed(2) + ' MB/s';
}
