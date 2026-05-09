export type PermissionProbeState = PermissionState | 'unsupported' | 'unknown';
export type MotionPermissionResult = 'granted' | 'denied' | 'prompt';

export interface PermissionCapableSensorEvent {
    requestPermission?: () => Promise<MotionPermissionResult>;
}

type WindowWithMotionPermissions = Window & {
    readonly DeviceMotionEvent?: PermissionCapableSensorEvent;
    readonly DeviceOrientationEvent?: PermissionCapableSensorEvent;
};

export async function queryPermissionState(
    name: PermissionName,
    navigatorRef: Navigator = navigator,
): Promise<PermissionProbeState> {
    if (typeof navigatorRef.permissions?.query !== 'function') return 'unsupported';

    try {
        const status = await navigatorRef.permissions.query({ name });
        return status.state;
    } catch {
        return 'unknown';
    }
}

export async function throwIfPermissionDenied(
    name: PermissionName,
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
