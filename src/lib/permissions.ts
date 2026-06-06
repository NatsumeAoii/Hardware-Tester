export type PermissionProbeState = PermissionState | 'unsupported' | 'unknown';
export type MotionPermissionResult = 'granted' | 'denied' | 'prompt';

/**
 * Extended permission names that include browser-specific names not in the TS lib.
 * Centralizes the PermissionName cast so components don't need `as PermissionName`.
 */
export type HardwarePermissionName =
    | PermissionName
    | 'camera'
    | 'microphone'
    | 'clipboard-read'
    | 'clipboard-write'
    | 'geolocation'
    | 'accelerometer'
    | 'gyroscope'
    | 'magnetometer'
    | 'ambient-light-sensor';

export interface PermissionCapableSensorEvent {
    requestPermission?: () => Promise<MotionPermissionResult>;
}

type WindowWithMotionPermissions = Window & {
    readonly DeviceMotionEvent?: PermissionCapableSensorEvent;
    readonly DeviceOrientationEvent?: PermissionCapableSensorEvent;
};

export async function queryPermissionState(
    name: HardwarePermissionName,
    navigatorRef: Navigator = navigator,
): Promise<PermissionProbeState> {
    if (typeof navigatorRef.permissions?.query !== 'function') return 'unsupported';

    try {
        const status = await navigatorRef.permissions.query({ name: name as PermissionName });
        return status.state;
    } catch {
        return 'unknown';
    }
}

export async function throwIfPermissionDenied(
    name: HardwarePermissionName,
    featureLabel: string,
    navigatorRef: Navigator = navigator,
): Promise<PermissionProbeState> {
    const state = await queryPermissionState(name, navigatorRef);
    if (state === 'denied') {
        throw new DOMException(`${featureLabel} permission is denied.`, 'NotAllowedError');
    }
    return state;
}

export function getMotionPermissionApis(scope: Window = window): PermissionCapableSensorEvent[] {
    const scopedWindow = scope as WindowWithMotionPermissions;
    return [
        scopedWindow.DeviceMotionEvent,
        scopedWindow.DeviceOrientationEvent,
    ].filter((api): api is PermissionCapableSensorEvent => typeof api?.requestPermission === 'function');
}

export async function requestMotionPermissions(
    apis: PermissionCapableSensorEvent[] = getMotionPermissionApis(),
): Promise<MotionPermissionResult[]> {
    return Promise.all(apis.map(api => api.requestPermission?.() ?? Promise.resolve<MotionPermissionResult>('granted')));
}

export function allPermissionsGranted(results: MotionPermissionResult[]): boolean {
    return results.every(result => result === 'granted');
}
