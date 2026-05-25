import { describe, expect, it, vi } from 'vitest';
import {
    detectBrowserFromUserAgent,
    detectDeviceTypeFromUserAgent,
    getGpuInfo,
    getRamInfoFromDeviceMemory,
    readBatterySnapshot,
} from '../deviceDiagnostics';
import type { BrowserBatteryManager } from '../browserAdapters';

describe('deviceDiagnostics', () => {
    it('detects Edge before Chromium from user agent strings', () => {
        expect(detectBrowserFromUserAgent('Mozilla/5.0 Chrome/120.0 Safari/537.36 Edg/120.0')).toBe('Edge 120');
    });

    it('classifies mobile, tablet, and desktop user agents', () => {
        expect(detectDeviceTypeFromUserAgent('Mozilla/5.0 iPhone Mobile')).toBe('Mobile');
        expect(detectDeviceTypeFromUserAgent('Mozilla/5.0 iPad Safari')).toBe('Tablet');
        expect(detectDeviceTypeFromUserAgent('Mozilla/5.0 Windows NT 10.0 Chrome')).toBe('Desktop');
    });

    it('labels unavailable and capped memory buckets', () => {
        expect(getRamInfoFromDeviceMemory(null)).toEqual({ ram: 'N/A (API not available)', note: '' });
        expect(getRamInfoFromDeviceMemory(8)).toEqual({
            ram: '≥ 8 GB',
            note: 'Browser caps at 8 GB. Actual RAM may be higher.',
        });
    });

    it('normalizes browser battery manager values', () => {
        const battery = {
            charging: true,
            level: 0.42,
            chargingTime: 120,
            dischargingTime: Infinity,
        } as BrowserBatteryManager;

        expect(readBatterySnapshot(battery)).toEqual({
            charging: true,
            level: 0.42,
            chargingTime: 120,
            dischargingTime: Infinity,
        });
    });

    it('does not cache transient GPU detection failures', () => {
        const loseContext = vi.fn();
        const webglContext = {
            RENDERER: 0x1f01,
            getExtension: vi.fn((name: string) => (name === 'WEBGL_lose_context' ? { loseContext } : null)),
            getParameter: vi.fn(() => 'Recovered GPU'),
        } as unknown as WebGLRenderingContext;
        let attempts = 0;
        const documentRef = {
            createElement: vi.fn(() => ({
                getContext: vi.fn(() => {
                    attempts += 1;
                    if (attempts === 1) throw new Error('transient context allocation failure');
                    return webglContext;
                }),
            })),
        } as unknown as Document;

        expect(getGpuInfo(documentRef)).toBe('Detection failed');
        expect(getGpuInfo(documentRef)).toBe('Recovered GPU');
        expect(loseContext).toHaveBeenCalledTimes(1);
    });
});
