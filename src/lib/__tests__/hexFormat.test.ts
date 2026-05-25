import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { formatBytesAsHex, formatLogEntry } from '../hexFormat';

describe('hexFormat', () => {
    describe('formatBytesAsHex', () => {
        it('returns empty string for empty Uint8Array', () => {
            expect(formatBytesAsHex(new Uint8Array([]))).toBe('');
        });

        it('returns empty string for empty ArrayBuffer', () => {
            expect(formatBytesAsHex(new ArrayBuffer(0))).toBe('');
        });

        it('formats a single byte correctly', () => {
            expect(formatBytesAsHex(new Uint8Array([0]))).toBe('00');
            expect(formatBytesAsHex(new Uint8Array([15]))).toBe('0F');
            expect(formatBytesAsHex(new Uint8Array([255]))).toBe('FF');
        });

        it('formats multiple bytes as space-separated uppercase hex', () => {
            expect(formatBytesAsHex(new Uint8Array([10, 255, 60]))).toBe('0A FF 3C');
        });

        it('pads single-digit hex values with leading zero', () => {
            expect(formatBytesAsHex(new Uint8Array([0, 1, 2, 9, 10, 15]))).toBe(
                '00 01 02 09 0A 0F',
            );
        });

        it('handles all-255 byte array', () => {
            const data = new Uint8Array([255, 255, 255, 255]);
            expect(formatBytesAsHex(data)).toBe('FF FF FF FF');
        });

        it('accepts ArrayBuffer input', () => {
            const buffer = new ArrayBuffer(3);
            const view = new Uint8Array(buffer);
            view[0] = 0xde;
            view[1] = 0xad;
            view[2] = 0xbe;
            expect(formatBytesAsHex(buffer)).toBe('DE AD BE');
        });

        it('handles larger arrays', () => {
            const data = new Uint8Array(16);
            for (let i = 0; i < 16; i++) data[i] = i * 16;
            const result = formatBytesAsHex(data);
            const parts = result.split(' ');
            expect(parts).toHaveLength(16);
            expect(parts[0]).toBe('00');
            expect(parts[15]).toBe('F0');
        });
    });

    describe('formatLogEntry', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2024-06-15T12:30:00.000Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('returns hex and ISO timestamp', () => {
            const data = new Uint8Array([0x01, 0x02, 0x03]);
            const entry = formatLogEntry(data);
            expect(entry.hex).toBe('01 02 03');
            expect(entry.timestamp).toBe('2024-06-15T12:30:00.000Z');
        });

        it('includes reportId when provided', () => {
            const data = new Uint8Array([0xaa, 0xbb]);
            const entry = formatLogEntry(data, 5);
            expect(entry.hex).toBe('AA BB');
            expect(entry.timestamp).toBe('2024-06-15T12:30:00.000Z');
            expect(entry.reportId).toBe(5);
        });

        it('omits reportId when not provided', () => {
            const data = new Uint8Array([0xff]);
            const entry = formatLogEntry(data);
            expect(entry.hex).toBe('FF');
            expect(entry.reportId).toBeUndefined();
        });

        it('handles empty data', () => {
            const entry = formatLogEntry(new Uint8Array([]));
            expect(entry.hex).toBe('');
            expect(entry.timestamp).toBe('2024-06-15T12:30:00.000Z');
        });

        it('includes reportId of 0', () => {
            const data = new Uint8Array([0x10]);
            const entry = formatLogEntry(data, 0);
            expect(entry.reportId).toBe(0);
        });
    });
});
