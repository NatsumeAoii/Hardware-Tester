import { useEffect, useMemo, useState } from 'react';
import { detectHardwareCapabilities, getCompatibilityScore, getDeviceProfile } from '../lib/hardwareCapabilities';

const readHardwareCompatibility = () => {
    const capabilities = detectHardwareCapabilities();
    const profile = getDeviceProfile();

    return {
        capabilities,
        profile,
        score: getCompatibilityScore(capabilities),
        availableCount: capabilities.filter(capability => capability.status === 'available' || capability.status === 'permission').length,
        totalCount: capabilities.length,
    };
};

export function useHardwareCapabilities() {
    const [snapshot, setSnapshot] = useState(readHardwareCompatibility);

    useEffect(() => {
        const refresh = () => setSnapshot(readHardwareCompatibility());
        const refreshOnVisible = () => {
            if (document.visibilityState === 'visible') refresh();
        };

        window.addEventListener('resize', refresh);
        window.addEventListener('orientationchange', refresh);
        window.addEventListener('online', refresh);
        window.addEventListener('offline', refresh);
        document.addEventListener('visibilitychange', refreshOnVisible);

        return () => {
            window.removeEventListener('resize', refresh);
            window.removeEventListener('orientationchange', refresh);
            window.removeEventListener('online', refresh);
            window.removeEventListener('offline', refresh);
            document.removeEventListener('visibilitychange', refreshOnVisible);
        };
    }, []);

    return useMemo(() => snapshot, [snapshot]);
}
