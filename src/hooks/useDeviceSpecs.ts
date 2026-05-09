import { useState, useEffect, useMemo } from 'react';
import {
    getBattery,
    getDeviceMemory,
    getJsHeapMemory,
    getNetworkConnection,
    getUserAgentData,
    type BrowserBatteryManager,
} from '../lib/browserAdapters';
import { NOT_AVAILABLE, formatBytes, formatDurationFromSeconds, formatResolution, formatSpeedMbps } from '../lib/formatters';

export interface DeviceSpecs {
    deviceType: string;
    os: string;
    browser: string;
    cpuThreads: number | string;
    ram: string;
    ramNote: string;
    gpu: string;
    screenResolution: string;
    colorDepth: string;
    language: string;
    connectionType: string;
    downlink: string;
    rtt: string;
    maxTouchPoints: number;
    cookiesEnabled: boolean;
    jsHeap: string;
    platform: string;
}

export interface BatteryInfo {
    level: number | null;
    charging: boolean;
    chargingTime: string;
    dischargingTime: string;
}

export interface StorageInfo {
    used: string;
    quota: string;
    percent: number;
    label: string;
}

// --- OS Detection (with High-Entropy UA fallback) ---

async function detectOS(): Promise<string> {
    const userAgentData = getUserAgentData();

    // Try modern API first: getHighEntropyValues gives real OS version
    if (userAgentData?.getHighEntropyValues) {
        try {
            const hev = await userAgentData.getHighEntropyValues(['platform', 'platformVersion', 'fullVersionList']);
            const platform = hev.platform || userAgentData.platform;
            const ver = hev.platformVersion || '';

            if (platform === 'Windows') {
                // Windows 11 reports platformVersion >= 13.0.0
                const major = parseInt(ver.split('.')[0], 10);
                if (major >= 13) return `Windows 11 (${ver})`;
                return `Windows 10 (${ver})`;
            }
            if (platform === 'macOS') return `macOS ${ver}`;
            if (platform === 'Chrome OS') return `Chrome OS ${ver}`;
            if (platform === 'Android') return `Android ${ver}`;
            if (platform) return `${platform} ${ver}`.trim();
        } catch { /* fall through to UA parsing */ }
    }

    // Fallback: parse User-Agent string
    const ua = navigator.userAgent;
    if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
    if (/Windows NT 6\.3/.test(ua)) return 'Windows 8.1';
    if (/Windows NT 6\.1/.test(ua)) return 'Windows 7';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac OS X/.test(ua)) {
        const ver = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
        return ver ? `macOS ${ver[1].replace(/_/g, '.')}` : 'macOS';
    }
    if (/CrOS/.test(ua)) return 'Chrome OS';
    if (/Android/.test(ua)) {
        const ver = ua.match(/Android (\d+(\.\d+)?)/);
        return ver ? `Android ${ver[1]}` : 'Android';
    }
    if (/iPhone|iPad|iPod/.test(ua)) {
        const ver = ua.match(/OS (\d+_\d+)/);
        return ver ? `iOS ${ver[1].replace('_', '.')}` : 'iOS';
    }
    if (/Linux/.test(ua)) return 'Linux';
    return navigator.platform || 'Unknown OS';
}

function detectBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Opera') || ua.includes('OPR')) {
        const v = ua.match(/(?:OPR|Opera)[/ ](\d+)/);
        return `Opera ${v?.[1] || ''}`;
    }
    if (ua.includes('Edg/')) {
        const v = ua.match(/Edg\/(\d+)/);
        return `Edge ${v?.[1] || ''}`;
    }
    if (ua.includes('Brave')) return 'Brave';
    if (ua.includes('Chrome')) {
        const v = ua.match(/Chrome\/(\d+)/);
        return `Chrome ${v?.[1] || ''}`;
    }
    if (ua.includes('Firefox')) {
        const v = ua.match(/Firefox\/(\d+)/);
        return `Firefox ${v?.[1] || ''}`;
    }
    if (ua.includes('Safari') && !ua.includes('Chrome')) {
        const v = ua.match(/Version\/(\d+)/);
        return `Safari ${v?.[1] || ''}`;
    }
    return 'Unknown Browser';
}

function detectDeviceType(): string {
    const ua = navigator.userAgent;
    if (/Mobi|Android.*Mobile|iPhone|iPod/.test(ua)) return 'Mobile';
    if (/iPad|Android(?!.*Mobile)|Tablet/.test(ua)) return 'Tablet';
    return 'Desktop';
}

function getGpuInfo(): string {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) return 'WebGL not supported';
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        const loseCtx = gl.getExtension('WEBGL_lose_context');
        if (loseCtx) loseCtx.loseContext();
        return renderer || 'Unknown GPU';
    } catch {
        return 'Detection failed';
    }
}

function getRamInfo(): { ram: string; note: string } {
    const mem = getDeviceMemory();
    if (!mem) return { ram: 'N/A (API not available)', note: '' };

    // deviceMemory is always a power-of-2 approximation, capped at 8 GB by the spec
    if (mem >= 8) {
        return { ram: `≥ 8 GB`, note: 'Browser caps at 8 GB. Actual RAM may be higher.' };
    }
    return { ram: `~ ${mem} GB`, note: 'Approximate — browsers bucket this value for privacy.' };
}

function getJsHeapInfo(): string {
    const memory = getJsHeapMemory();
    if (!memory) return NOT_AVAILABLE;
    const used = memory.usedJSHeapSize;
    const total = memory.jsHeapSizeLimit;
    return `${formatBytes(used)} / ${formatBytes(total)}`;
}

function getConnectionInfo(): { type: string; downlink: string; rtt: string } {
    const conn = getNetworkConnection();
    if (!conn) return { type: 'Unknown', downlink: NOT_AVAILABLE, rtt: NOT_AVAILABLE };
    return {
        type: conn.effectiveType?.toUpperCase() || 'Unknown',
        downlink: conn.downlink ? formatSpeedMbps(conn.downlink) : NOT_AVAILABLE,
        rtt: conn.rtt != null ? `${conn.rtt} ms` : NOT_AVAILABLE,
    };
}

function fmtTime(seconds: number | null | undefined): string {
    return formatDurationFromSeconds(seconds);
}

// --- Hook ---

export function useDeviceSpecs() {
    const [os, setOs] = useState('Detecting...');
    const [battery, setBattery] = useState<BatteryInfo>({ level: null, charging: false, chargingTime: NOT_AVAILABLE, dischargingTime: NOT_AVAILABLE });
    const [storage, setStorage] = useState<StorageInfo | null>(null);

    const specs: DeviceSpecs = useMemo(() => {
        const ramInfo = getRamInfo();
        const connInfo = getConnectionInfo();
        const scr = window.screen;

        return {
            deviceType: detectDeviceType(),
            os, // populated async
            browser: detectBrowser(),
            cpuThreads: navigator.hardwareConcurrency || '?',
            ram: ramInfo.ram,
            ramNote: ramInfo.note,
            gpu: getGpuInfo(),
            screenResolution: `${formatResolution(scr.width, scr.height)} @ ${window.devicePixelRatio}x`,
            colorDepth: `${scr.colorDepth}-bit`,
            language: navigator.language,
            connectionType: connInfo.type,
            downlink: connInfo.downlink,
            rtt: connInfo.rtt,
            maxTouchPoints: navigator.maxTouchPoints,
            cookiesEnabled: navigator.cookieEnabled,
            jsHeap: getJsHeapInfo(),
            platform: getUserAgentData()?.platform || navigator.platform || 'Unknown',
        };
    }, [os]);

    // Async OS detection (getHighEntropyValues is a promise)
    useEffect(() => {
        let cancelled = false;
        detectOS().then(value => {
            if (!cancelled) setOs(value);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    // Battery with charge/discharge time
    useEffect(() => {
        let batt: BrowserBatteryManager | null = null;
        let cancelled = false;
        const update = () => {
            if (!batt || cancelled) return;
            setBattery({
                level: Math.round(batt.level * 100),
                charging: batt.charging,
                chargingTime: fmtTime(batt.chargingTime),
                dischargingTime: fmtTime(batt.dischargingTime),
            });
        };

        (async () => {
            try {
                batt = await getBattery();
                if (!batt) return;
                if (cancelled) return;
                update();
                batt.addEventListener('levelchange', update);
                batt.addEventListener('chargingchange', update);
                batt.addEventListener('chargingtimechange', update);
                batt.addEventListener('dischargingtimechange', update);
            } catch { /* not supported */ }
        })();

        return () => {
            cancelled = true;
            if (batt) {
                batt.removeEventListener('levelchange', update);
                batt.removeEventListener('chargingchange', update);
                batt.removeEventListener('chargingtimechange', update);
                batt.removeEventListener('dischargingtimechange', update);
            }
        };
    }, []);

    // Browser storage quota (NOT disk storage)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if ('storage' in navigator && 'estimate' in navigator.storage) {
                    const est = await navigator.storage.estimate();
                    const used = est.usage || 0;
                    const quota = est.quota || 0;
                    if (cancelled) return;
                    setStorage({
                        used: formatBytes(used),
                        quota: formatBytes(quota),
                        percent: quota > 0 ? Math.round((used / quota) * 100) : 0,
                        label: 'Browser Storage (not disk)',
                    });
                }
            } catch { /* not supported */ }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return { specs, battery, storage };
}
