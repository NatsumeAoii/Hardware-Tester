import type { TesterId } from './testerRegistry';

export type CapabilityStatus = 'available' | 'permission' | 'partial' | 'blocked' | 'unsupported';
export type CapabilityPlatform = 'all' | 'desktop' | 'mobile';
export type DeviceFormFactor = 'desktop' | 'tablet' | 'mobile';

type NavigatorWithHardware = Navigator & {
    bluetooth?: unknown;
    connection?: unknown;
    getBattery?: () => Promise<unknown>;
    hid?: unknown;
    serial?: unknown;
    wakeLock?: unknown;
    storage?: { estimate?: () => Promise<unknown> };
    clipboard?: unknown;
    userAgentData?: {
        mobile?: boolean;
        platform?: string;
    };
};

interface HardwareGlobal extends Window {
    AmbientLightSensor?: unknown;
    AudioContext?: unknown;
    DeviceMotionEvent?: unknown;
    DeviceOrientationEvent?: unknown;
    KeyboardEvent?: unknown;
    MIDIInput?: unknown;
    NDEFReader?: unknown;
    webkitAudioContext?: unknown;
    getScreenDetails?: () => Promise<unknown>;
}

export interface DeviceProfile {
    formFactor: DeviceFormFactor;
    viewportWidth: number;
    viewportHeight: number;
    maxTouchPoints: number;
    coarsePointer: boolean;
    finePointer: boolean;
    secureContext: boolean;
    standalone: boolean;
    platform: string;
}

export interface HardwareCapabilityDescriptor {
    id: string;
    label: string;
    testerId?: TesterId;
    platform: CapabilityPlatform;
    secureContextRequired?: boolean;
    permissionRequired?: boolean;
    fallback: string;
    isSupported: (scope: HardwareGlobal, navigatorRef: NavigatorWithHardware, profile: DeviceProfile) => boolean;
    isPartial?: (scope: HardwareGlobal, navigatorRef: NavigatorWithHardware, profile: DeviceProfile) => boolean;
}

export interface HardwareCapabilityResult extends Omit<HardwareCapabilityDescriptor, 'isSupported' | 'isPartial'> {
    status: CapabilityStatus;
    reason: string;
}

const fallbackNavigator = {
    maxTouchPoints: 0,
    platform: 'Unknown',
    userAgent: '',
} as NavigatorWithHardware;

const getScope = (scope?: HardwareGlobal) => (scope ?? globalThis) as unknown as HardwareGlobal;

const getNavigator = (scope: HardwareGlobal): NavigatorWithHardware =>
    (scope.navigator ?? (globalThis as unknown as Partial<Window>).navigator ?? fallbackNavigator) as NavigatorWithHardware;

const canUseDom = (scope: HardwareGlobal) => typeof scope.document !== 'undefined';
const isCallable = (value: unknown): value is (...args: never[]) => unknown => typeof value === 'function';
const canvasContextSupportCache = new WeakMap<object, Map<'webgl' | 'webgl2', boolean>>();

const canCreateCanvasContext = (scope: HardwareGlobal, contextId: 'webgl' | 'webgl2') => {
    if (!canUseDom(scope)) return false;
    const cacheKey = scope.document ?? scope;
    let cache = canvasContextSupportCache.get(cacheKey);
    if (!cache) {
        cache = new Map();
        canvasContextSupportCache.set(cacheKey, cache);
    }
    const cached = cache.get(contextId);
    if (cached !== undefined) return cached;

    try {
        const canvas = scope.document.createElement('canvas');
        const context = canvas.getContext(contextId) as WebGLRenderingContext | WebGL2RenderingContext | null;
        context?.getExtension('WEBGL_lose_context')?.loseContext();
        const supported = !!context;
        cache.set(contextId, supported);
        return supported;
    } catch {
        return false;
    }
};

const getCapabilitySupport = (
    capability: HardwareCapabilityDescriptor,
    scope: HardwareGlobal,
    navigatorRef: NavigatorWithHardware,
    profile: DeviceProfile,
) => {
    try {
        return capability.isSupported(scope, navigatorRef, profile);
    } catch {
        return false;
    }
};

const getCapabilityPartial = (
    capability: HardwareCapabilityDescriptor,
    scope: HardwareGlobal,
    navigatorRef: NavigatorWithHardware,
    profile: DeviceProfile,
) => {
    try {
        return capability.isPartial?.(scope, navigatorRef, profile) ?? false;
    } catch {
        return false;
    }
};

export const getDeviceProfile = (scope?: HardwareGlobal): DeviceProfile => {
    const runtimeScope = getScope(scope);
    const navigatorRef = getNavigator(runtimeScope);
    const viewportWidth = runtimeScope.innerWidth || runtimeScope.screen?.width || 0;
    const viewportHeight = runtimeScope.innerHeight || runtimeScope.screen?.height || 0;
    const maxTouchPoints = navigatorRef.maxTouchPoints || 0;
    const coarsePointer = runtimeScope.matchMedia?.('(pointer: coarse)').matches ?? maxTouchPoints > 0;
    const finePointer = runtimeScope.matchMedia?.('(pointer: fine)').matches ?? !coarsePointer;
    const mobileHint = navigatorRef.userAgentData?.mobile === true || /Android|iPhone|iPod|Mobile/i.test(navigatorRef.userAgent);
    const tabletHint = /iPad|Tablet/i.test(navigatorRef.userAgent) || (maxTouchPoints > 1 && viewportWidth >= 768 && viewportWidth <= 1366);
    const formFactor: DeviceFormFactor = tabletHint ? 'tablet' : mobileHint || (coarsePointer && viewportWidth < 768) ? 'mobile' : 'desktop';
    const standalone = runtimeScope.matchMedia?.('(display-mode: standalone)').matches ?? false;

    return {
        formFactor,
        viewportWidth,
        viewportHeight,
        maxTouchPoints,
        coarsePointer,
        finePointer,
        secureContext: runtimeScope.isSecureContext === true || runtimeScope.location?.hostname === 'localhost' || runtimeScope.location?.hostname === '127.0.0.1',
        standalone,
        platform: navigatorRef.userAgentData?.platform || navigatorRef.platform || 'Unknown',
    };
};

export const hardwareCapabilities: HardwareCapabilityDescriptor[] = [
    {
        id: 'keyboard',
        label: 'Keyboard input',
        testerId: 'keyboard',
        platform: 'all',
        fallback: 'Use an external keyboard or the operating system keyboard viewer.',
        isSupported: scope => isCallable(scope.KeyboardEvent),
    },
    {
        id: 'pointer',
        label: 'Mouse and pointer',
        testerId: 'mouse',
        platform: 'desktop',
        fallback: 'Use touch or pen tests on devices without a precision pointer.',
        isSupported: (scope, _navigatorRef, profile) => 'PointerEvent' in scope || profile.finePointer,
        isPartial: (_scope, _navigatorRef, profile) => profile.coarsePointer && !profile.finePointer,
    },
    {
        id: 'touch',
        label: 'Touch and pen',
        testerId: 'touch',
        platform: 'mobile',
        fallback: 'Use mouse and keyboard tests when touch hardware is unavailable.',
        isSupported: (scope, _navigatorRef, profile) => profile.maxTouchPoints > 0 || 'ontouchstart' in scope,
    },
    {
        id: 'screen',
        label: 'Display and pixels',
        testerId: 'screen',
        platform: 'all',
        fallback: 'Use the browser zoom reset and operating system display settings for deeper inspection.',
        isSupported: scope => !!scope.screen,
    },
    {
        id: 'microphone',
        label: 'Microphone',
        testerId: 'mic',
        platform: 'all',
        secureContextRequired: true,
        permissionRequired: true,
        fallback: 'Check microphone permissions in browser settings or test with an external recorder.',
        isSupported: (_scope, navigatorRef) => isCallable(navigatorRef.mediaDevices?.getUserMedia),
    },
    {
        id: 'camera',
        label: 'Camera',
        testerId: 'webcam',
        platform: 'all',
        secureContextRequired: true,
        permissionRequired: true,
        fallback: 'Check camera permissions in browser settings or test with the operating system camera app.',
        isSupported: (_scope, navigatorRef) => isCallable(navigatorRef.mediaDevices?.getUserMedia),
    },
    {
        id: 'speaker',
        label: 'Audio output',
        testerId: 'sound',
        platform: 'all',
        fallback: 'Use operating system sound settings if browser audio output is muted or routed elsewhere.',
        isSupported: scope => isCallable(scope.AudioContext) || isCallable(scope.webkitAudioContext),
    },
    {
        id: 'printer',
        label: 'Printer',
        testerId: 'printer',
        platform: 'desktop',
        fallback: 'Save to PDF first on devices that do not expose native printing.',
        isSupported: scope => isCallable(scope.print),
    },
    {
        id: 'network',
        label: 'Network diagnostics',
        testerId: 'network',
        platform: 'all',
        fallback: 'Run the network test from a browser with Fetch and Performance APIs enabled.',
        isSupported: scope => isCallable(scope.fetch) && !!scope.performance,
        isPartial: (_scope, navigatorRef) => !navigatorRef.connection,
    },
    {
        id: 'gamepad',
        label: 'Gamepad',
        testerId: 'gamepad',
        platform: 'desktop',
        fallback: 'Connect the controller before opening the tester, then press any button to wake it.',
        isSupported: (_scope, navigatorRef) => typeof navigatorRef.getGamepads === 'function',
    },
    {
        id: 'vibration',
        label: 'Vibration',
        testerId: 'vibration',
        platform: 'mobile',
        fallback: 'Most desktop browsers and iOS browsers do not expose vibration control.',
        isSupported: (_scope, navigatorRef) => typeof navigatorRef.vibrate === 'function',
    },
    {
        id: 'battery',
        label: 'Battery status',
        testerId: 'battery',
        platform: 'mobile',
        fallback: 'Use operating system battery settings when the browser hides Battery Status API.',
        isSupported: (_scope, navigatorRef) => typeof navigatorRef.getBattery === 'function',
    },
    {
        id: 'gpu',
        label: 'GPU and WebGL',
        testerId: 'gpu',
        platform: 'all',
        fallback: 'Enable hardware acceleration in browser settings or try a Chromium-based browser.',
        isSupported: scope => canCreateCanvasContext(scope, 'webgl') || canCreateCanvasContext(scope, 'webgl2'),
        isPartial: scope => canCreateCanvasContext(scope, 'webgl') && !canCreateCanvasContext(scope, 'webgl2'),
    },
    {
        id: 'motion',
        label: 'Motion sensors',
        testerId: 'motion',
        platform: 'mobile',
        secureContextRequired: true,
        permissionRequired: true,
        fallback: 'Use a mobile browser with motion permission enabled.',
        isSupported: scope => 'DeviceMotionEvent' in scope || 'DeviceOrientationEvent' in scope,
    },
    {
        id: 'geolocation',
        label: 'Geolocation',
        testerId: 'geolocation',
        platform: 'mobile',
        secureContextRequired: true,
        permissionRequired: true,
        fallback: 'Enable location permission or use operating system location services.',
        isSupported: (_scope, navigatorRef) => !!navigatorRef.geolocation,
    },
    {
        id: 'ambient-light',
        label: 'Ambient light',
        testerId: 'ambient-light',
        platform: 'mobile',
        secureContextRequired: true,
        permissionRequired: true,
        fallback: 'Many browsers removed this API; use device brightness or camera exposure as a rough proxy.',
        isSupported: scope => isCallable(scope.AmbientLightSensor),
    },
    {
        id: 'bluetooth',
        label: 'Bluetooth LE',
        testerId: 'bluetooth',
        platform: 'mobile',
        secureContextRequired: true,
        permissionRequired: true,
        fallback: 'Use Chrome or Edge with Bluetooth enabled, or verify devices in OS Bluetooth settings.',
        isSupported: (_scope, navigatorRef) => !!navigatorRef.bluetooth,
    },
    {
        id: 'midi',
        label: 'MIDI input',
        testerId: 'midi',
        platform: 'desktop',
        secureContextRequired: true,
        permissionRequired: true,
        fallback: 'Use Chromium with MIDI permission enabled, then reconnect the MIDI device.',
        isSupported: (_scope, navigatorRef) => typeof navigatorRef.requestMIDIAccess === 'function',
    },
    {
        id: 'storage',
        label: 'Storage estimate',
        testerId: 'report',
        platform: 'all',
        fallback: 'Storage quota can still be inspected through browser developer tools.',
        isSupported: (_scope, navigatorRef) => typeof navigatorRef.storage?.estimate === 'function',
    },
    {
        id: 'storage-api',
        label: 'Storage API',
        testerId: 'usb-storage',
        platform: 'all',
        fallback: 'Use browser developer tools to inspect storage quota and usage.',
        isSupported: (_scope, navigatorRef) => typeof navigatorRef.storage?.estimate === 'function',
    },
    {
        id: 'window-management',
        label: 'Window Management',
        testerId: 'multi-monitor',
        platform: 'desktop',
        secureContextRequired: true,
        permissionRequired: true,
        fallback: 'Use Chrome or Edge on desktop with the Window Management permission enabled.',
        isSupported: scope => isCallable(scope.getScreenDetails),
    },
    {
        id: 'web-nfc',
        label: 'Web NFC',
        testerId: 'nfc',
        platform: 'mobile',
        secureContextRequired: true,
        permissionRequired: true,
        fallback: 'Use Chrome for Android over HTTPS to access NFC hardware.',
        isSupported: scope => isCallable(scope.NDEFReader),
    },
    {
        id: 'web-hid',
        label: 'WebHID',
        testerId: 'serial-hid',
        platform: 'desktop',
        secureContextRequired: true,
        permissionRequired: true,
        fallback: 'Use Chrome or Edge on desktop with WebHID permission enabled.',
        isSupported: (_scope, navigatorRef) => !!navigatorRef.hid,
    },
    {
        id: 'clipboard',
        label: 'Clipboard',
        testerId: 'clipboard',
        platform: 'all',
        secureContextRequired: true,
        permissionRequired: true,
        fallback: 'Check clipboard permissions in browser settings or use keyboard shortcuts.',
        isSupported: (_scope, navigatorRef) => !!navigatorRef.clipboard,
    },
    {
        id: 'wake-lock',
        label: 'Wake Lock',
        testerId: 'wake-lock',
        platform: 'all',
        secureContextRequired: true,
        fallback: 'Use operating system power settings to prevent screen dimming.',
        isSupported: (_scope, navigatorRef) => !!navigatorRef.wakeLock,
    },
    {
        id: 'perf-timing',
        label: 'High-res timing',
        testerId: 'benchmark',
        platform: 'all',
        fallback: 'High-resolution timing may be limited by browser privacy mitigations.',
        isSupported: scope => typeof scope.performance?.now === 'function',
    },
];

export const detectHardwareCapabilities = (scope?: HardwareGlobal): { results: HardwareCapabilityResult[]; profile: DeviceProfile } => {
    const runtimeScope = getScope(scope);
    const navigatorRef = getNavigator(runtimeScope);
    const profile = getDeviceProfile(runtimeScope);

    const results = hardwareCapabilities.map(capability => {
        if (capability.secureContextRequired && !profile.secureContext) {
            return {
                ...capability,
                status: 'blocked' as const,
                reason: 'Requires HTTPS or localhost before the browser exposes this hardware API.',
            };
        }

        if (!getCapabilitySupport(capability, runtimeScope, navigatorRef, profile)) {
            return {
                ...capability,
                status: 'unsupported' as const,
                reason: capability.fallback,
            };
        }

        if (getCapabilityPartial(capability, runtimeScope, navigatorRef, profile)) {
            return {
                ...capability,
                status: 'partial' as const,
                reason: capability.fallback,
            };
        }

        if (capability.permissionRequired) {
            return {
                ...capability,
                status: 'permission' as const,
                reason: 'Available after browser permission is granted.',
            };
        }

        return {
            ...capability,
            status: 'available' as const,
            reason: 'Ready in this browser profile.',
        };
    });

    return { results, profile };
};

export const getCompatibilityScore = (results: HardwareCapabilityResult[]) => {
    if (results.length === 0) return 0;

    const weighted = results.reduce((total, result) => {
        if (result.status === 'available') return total + 1;
        if (result.status === 'permission') return total + 0.85;
        if (result.status === 'partial') return total + 0.55;
        return total;
    }, 0);

    return Math.round((weighted / results.length) * 100);
};
