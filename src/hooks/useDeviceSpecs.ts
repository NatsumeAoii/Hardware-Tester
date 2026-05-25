import { useState, useEffect, useMemo } from 'react';
import { getBattery, getUserAgentData, type BrowserBatteryManager } from '../lib/browserAdapters';
import {
    detectBrowserFromUserAgent,
    detectDeviceTypeFromUserAgent,
    getConnectionInfo,
    getGpuInfo,
    getJsHeapInfo,
    getRamInfo,
    getScreenResolution,
    readBatterySnapshot,
} from '../lib/deviceDiagnostics';
import { NOT_AVAILABLE, formatBytes, formatDurationFromSeconds } from '../lib/formatters';

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

async function detectOS(): Promise<string> {
    const userAgentData = getUserAgentData();

    if (userAgentData?.getHighEntropyValues) {
        try {
            const hev = await userAgentData.getHighEntropyValues(['platform', 'platformVersion', 'fullVersionList']);
            const platform = hev.platform || userAgentData.platform;
            const version = hev.platformVersion || '';

            if (platform === 'Windows') {
                const major = parseInt(version.split('.')[0], 10);
                if (major >= 13) return `Windows 11 (${version})`;
                return `Windows 10 (${version})`;
            }
            if (platform === 'macOS') return `macOS ${version}`;
            if (platform === 'Chrome OS') return `Chrome OS ${version}`;
            if (platform === 'Android') return `Android ${version}`;
            if (platform) return `${platform} ${version}`.trim();
        } catch { /* fall through to UA parsing */ }
    }

    const ua = navigator.userAgent;
    if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
    if (/Windows NT 6\.3/.test(ua)) return 'Windows 8.1';
    if (/Windows NT 6\.1/.test(ua)) return 'Windows 7';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac OS X/.test(ua)) {
        const version = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
        return version ? `macOS ${version[1].replace(/_/g, '.')}` : 'macOS';
    }
    if (/CrOS/.test(ua)) return 'Chrome OS';
    if (/Android/.test(ua)) {
        const version = ua.match(/Android (\d+(\.\d+)?)/);
        return version ? `Android ${version[1]}` : 'Android';
    }
    if (/iPhone|iPad|iPod/.test(ua)) {
        const version = ua.match(/OS (\d+_\d+)/);
        return version ? `iOS ${version[1].replace('_', '.')}` : 'iOS';
    }
    if (/Linux/.test(ua)) return 'Linux';
    return navigator.platform || 'Unknown OS';
}

const fmtTime = (seconds: number | null | undefined): string => formatDurationFromSeconds(seconds);

export function useDeviceSpecs() {
    const [os, setOs] = useState('Detecting...');
    const [battery, setBattery] = useState<BatteryInfo>({
        level: null,
        charging: false,
        chargingTime: NOT_AVAILABLE,
        dischargingTime: NOT_AVAILABLE,
    });
    const [storage, setStorage] = useState<StorageInfo | null>(null);

    const specs: DeviceSpecs = useMemo(() => {
        const ramInfo = getRamInfo();
        const connInfo = getConnectionInfo();

        return {
            deviceType: detectDeviceTypeFromUserAgent(navigator.userAgent),
            os,
            browser: detectBrowserFromUserAgent(navigator.userAgent),
            cpuThreads: navigator.hardwareConcurrency || '?',
            ram: ramInfo.ram,
            ramNote: ramInfo.note,
            gpu: getGpuInfo(),
            screenResolution: getScreenResolution(),
            colorDepth: `${window.screen.colorDepth}-bit`,
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

    useEffect(() => {
        let cancelled = false;
        detectOS().then(value => {
            if (!cancelled) setOs(value);
        }).catch(() => {
            if (!cancelled) setOs(navigator.platform || 'Unknown OS');
        });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let batt: BrowserBatteryManager | null = null;
        let cancelled = false;
        const update = () => {
            if (!batt || cancelled) return;
            const snapshot = readBatterySnapshot(batt);
            setBattery({
                level: Math.round(snapshot.level * 100),
                charging: snapshot.charging,
                chargingTime: fmtTime(snapshot.chargingTime),
                dischargingTime: fmtTime(snapshot.dischargingTime),
            });
        };

        (async () => {
            try {
                batt = await getBattery();
                if (!batt || cancelled) return;
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

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if ('storage' in navigator && 'estimate' in navigator.storage) {
                    const estimate = await navigator.storage.estimate();
                    const used = estimate.usage || 0;
                    const quota = estimate.quota || 0;
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
