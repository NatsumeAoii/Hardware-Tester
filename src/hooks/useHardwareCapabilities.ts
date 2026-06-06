import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    detectHardwareCapabilities,
    getCompatibilityScore,
    type DeviceProfile,
    type HardwareCapabilityResult,
} from '../lib/hardwareCapabilities';

interface HardwareCompatibilitySnapshot {
    capabilities: HardwareCapabilityResult[];
    profile: DeviceProfile;
    score: number;
    availableCount: number;
    totalCount: number;
}

const HardwareCapabilitiesContext = createContext<HardwareCompatibilitySnapshot | null>(null);
let cachedSnapshot: HardwareCompatibilitySnapshot | null = null;

const readHardwareCompatibility = (force = false): HardwareCompatibilitySnapshot => {
    if (!force && cachedSnapshot) return cachedSnapshot;

    const { results: capabilities, profile } = detectHardwareCapabilities();

    let availableCount = 0;
    for (let i = 0; i < capabilities.length; i++) {
        const status = capabilities[i].status;
        if (status === 'available' || status === 'permission') availableCount++;
    }

    cachedSnapshot = {
        capabilities,
        profile,
        score: getCompatibilityScore(capabilities),
        availableCount,
        totalCount: capabilities.length,
    };

    return cachedSnapshot;
};

function useHardwareCapabilitiesSnapshot(shouldSubscribe = true) {
    const [snapshot, setSnapshot] = useState(readHardwareCompatibility);

    useEffect(() => {
        if (!shouldSubscribe) return undefined;

        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        const debouncedRefresh = () => {
            if (debounceTimer !== null) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                debounceTimer = null;
                setSnapshot(readHardwareCompatibility(true));
            }, 500);
        };
        const refreshOnVisible = () => {
            if (document.visibilityState === 'visible') debouncedRefresh();
        };

        window.addEventListener('resize', debouncedRefresh);
        window.addEventListener('orientationchange', debouncedRefresh);
        window.addEventListener('online', debouncedRefresh);
        window.addEventListener('offline', debouncedRefresh);
        document.addEventListener('visibilitychange', refreshOnVisible);

        return () => {
            if (debounceTimer !== null) clearTimeout(debounceTimer);
            window.removeEventListener('resize', debouncedRefresh);
            window.removeEventListener('orientationchange', debouncedRefresh);
            window.removeEventListener('online', debouncedRefresh);
            window.removeEventListener('offline', debouncedRefresh);
            document.removeEventListener('visibilitychange', refreshOnVisible);
        };
    }, [shouldSubscribe]);

    return useMemo(() => snapshot, [snapshot]);
}

export function HardwareCapabilitiesProvider({ children }: { children: ReactNode }) {
    const snapshot = useHardwareCapabilitiesSnapshot();

    return createElement(HardwareCapabilitiesContext.Provider, { value: snapshot }, children);
}

export function useHardwareCapabilities() {
    const contextSnapshot = useContext(HardwareCapabilitiesContext);
    const fallbackSnapshot = useHardwareCapabilitiesSnapshot(contextSnapshot === null);

    return contextSnapshot ?? fallbackSnapshot;
}
