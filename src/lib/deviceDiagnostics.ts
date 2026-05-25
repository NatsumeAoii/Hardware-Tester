import {
    getDeviceMemory,
    getJsHeapMemory,
    getNetworkConnection,
    type BrowserBatteryManager,
} from './browserAdapters';
import { NOT_AVAILABLE, formatBytes, formatResolution, formatSpeedMbps } from './formatters';

export interface BatterySnapshot {
    charging: boolean;
    level: number;
    chargingTime: number;
    dischargingTime: number;
}

const gpuInfoCache = new WeakMap<Document, string>();

export function detectBrowserFromUserAgent(userAgent: string): string {
    if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
        const version = userAgent.match(/(?:OPR|Opera)[/ ](\d+)/);
        return `Opera ${version?.[1] || ''}`;
    }
    if (userAgent.includes('Edg/')) {
        const version = userAgent.match(/Edg\/(\d+)/);
        return `Edge ${version?.[1] || ''}`;
    }
    if (userAgent.includes('Brave')) return 'Brave';
    if (userAgent.includes('Chrome')) {
        const version = userAgent.match(/Chrome\/(\d+)/);
        return `Chrome ${version?.[1] || ''}`;
    }
    if (userAgent.includes('Firefox')) {
        const version = userAgent.match(/Firefox\/(\d+)/);
        return `Firefox ${version?.[1] || ''}`;
    }
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        const version = userAgent.match(/Version\/(\d+)/);
        return `Safari ${version?.[1] || ''}`;
    }
    return 'Unknown Browser';
}

export function detectDeviceTypeFromUserAgent(userAgent: string): string {
    if (/Mobi|Android.*Mobile|iPhone|iPod/.test(userAgent)) return 'Mobile';
    if (/iPad|Android(?!.*Mobile)|Tablet/.test(userAgent)) return 'Tablet';
    return 'Desktop';
}

export function getGpuInfo(documentRef: Document = document): string {
    const cached = gpuInfoCache.get(documentRef);
    if (cached !== undefined) return cached;

    try {
        const canvas = documentRef.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) {
            gpuInfoCache.set(documentRef, 'WebGL not supported');
            return 'WebGL not supported';
        }
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        const loseCtx = gl.getExtension('WEBGL_lose_context');
        if (loseCtx) loseCtx.loseContext();
        const info = renderer || 'Unknown GPU';
        gpuInfoCache.set(documentRef, info);
        return info;
    } catch {
        return 'Detection failed';
    }
}

export function getRamInfoFromDeviceMemory(memory: number | null): { ram: string; note: string } {
    if (!memory) return { ram: 'N/A (API not available)', note: '' };
    if (memory >= 8) {
        return { ram: '≥ 8 GB', note: 'Browser caps at 8 GB. Actual RAM may be higher.' };
    }
    return { ram: `~ ${memory} GB`, note: 'Approximate — browsers bucket this value for privacy.' };
}

export function getRamInfo(navigatorRef: Navigator = navigator): { ram: string; note: string } {
    return getRamInfoFromDeviceMemory(getDeviceMemory(navigatorRef));
}

export function getJsHeapInfo(performanceRef: Performance = performance): string {
    const memory = getJsHeapMemory(performanceRef);
    if (!memory) return NOT_AVAILABLE;
    return `${formatBytes(memory.usedJSHeapSize)} / ${formatBytes(memory.jsHeapSizeLimit)}`;
}

export function getConnectionInfo(navigatorRef: Navigator = navigator): { type: string; downlink: string; rtt: string } {
    const conn = getNetworkConnection(navigatorRef);
    if (!conn) return { type: 'Unknown', downlink: NOT_AVAILABLE, rtt: NOT_AVAILABLE };
    return {
        type: conn.effectiveType?.toUpperCase() || 'Unknown',
        downlink: conn.downlink ? formatSpeedMbps(conn.downlink) : NOT_AVAILABLE,
        rtt: conn.rtt != null ? `${conn.rtt} ms` : NOT_AVAILABLE,
    };
}

export function getScreenResolution(screenRef: Screen = window.screen, dpr = window.devicePixelRatio): string {
    return `${formatResolution(screenRef.width, screenRef.height)} @ ${dpr}x`;
}

export function readBatterySnapshot(battery: BrowserBatteryManager): BatterySnapshot {
    return {
        charging: battery.charging,
        level: battery.level,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
    };
}
