export interface BrowserBatteryManager extends EventTarget {
    readonly charging: boolean;
    readonly level: number;
    readonly chargingTime: number;
    readonly dischargingTime: number;
}

export interface BrowserUserAgentData {
    readonly mobile?: boolean;
    readonly platform?: string;
    getHighEntropyValues?: (hints: string[]) => Promise<{
        readonly platform?: string;
        readonly platformVersion?: string;
        readonly fullVersionList?: unknown;
    }>;
}

export interface BrowserNetworkInformation extends EventTarget {
    readonly effectiveType?: string;
    readonly downlink?: number;
    readonly rtt?: number;
}

export interface BrowserJsHeapMemory {
    readonly usedJSHeapSize: number;
    readonly jsHeapSizeLimit: number;
}

export interface BluetoothRemoteGATTCharacteristic {
    readonly uuid: string;
    readValue(): Promise<DataView>;
}

export interface BluetoothRemoteGATTService {
    readonly uuid: string;
    getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

export interface BluetoothRemoteGATTServer {
    readonly connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
}

export interface BluetoothDeviceLike {
    readonly id: string;
    readonly name?: string;
    readonly gatt?: BluetoothRemoteGATTServer;
}

export interface BluetoothLike {
    requestDevice(options: {
        acceptAllDevices?: boolean;
        optionalServices?: string[];
    }): Promise<BluetoothDeviceLike>;
}

export interface MidiAccessOptions {
    readonly sysex?: boolean;
    readonly software?: boolean;
}

export interface SensorLike extends EventTarget {
    start(): void;
    stop(): void;
}

export interface AmbientLightSensorLike extends SensorLike {
    readonly illuminance: number;
}

export interface ProximitySensorLike extends SensorLike {
    readonly near?: boolean;
    readonly max?: number;
    readonly distance?: number;
}

export type SensorConstructor<T extends SensorLike> = new () => T;

type NavigatorWithBrowserApis = Navigator & {
    readonly bluetooth?: BluetoothLike;
    readonly connection?: BrowserNetworkInformation;
    readonly deviceMemory?: number;
    readonly getBattery?: () => Promise<BrowserBatteryManager>;
    readonly mozConnection?: BrowserNetworkInformation;
    readonly requestMIDIAccess?: (options?: MidiAccessOptions) => Promise<MIDIAccess>;
    readonly userAgentData?: BrowserUserAgentData;
    readonly webkitConnection?: BrowserNetworkInformation;
};

type WindowWithSensors = Window & {
    readonly AmbientLightSensor?: SensorConstructor<AmbientLightSensorLike>;
    readonly ProximitySensor?: SensorConstructor<ProximitySensorLike>;
};

type PerformanceWithMemory = Performance & {
    readonly memory?: BrowserJsHeapMemory;
};

const getNavigatorWithApis = (navigatorRef: Navigator = navigator) => navigatorRef as NavigatorWithBrowserApis;

export function getUserAgentData(navigatorRef: Navigator = navigator): BrowserUserAgentData | null {
    return getNavigatorWithApis(navigatorRef).userAgentData ?? null;
}

export function getDeviceMemory(navigatorRef: Navigator = navigator): number | null {
    const memory = getNavigatorWithApis(navigatorRef).deviceMemory;
    return typeof memory === 'number' && Number.isFinite(memory) && memory > 0 ? memory : null;
}

export function getNetworkConnection(navigatorRef: Navigator = navigator): BrowserNetworkInformation | null {
    const nav = getNavigatorWithApis(navigatorRef);
    return nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? null;
}

export function getJsHeapMemory(performanceRef: Performance = performance): BrowserJsHeapMemory | null {
    const memory = (performanceRef as PerformanceWithMemory).memory;
    if (!memory) return null;
    if (!Number.isFinite(memory.usedJSHeapSize) || !Number.isFinite(memory.jsHeapSizeLimit)) return null;
    return memory;
}

export function getBattery(navigatorRef: Navigator = navigator): Promise<BrowserBatteryManager | null> | null {
    const batteryGetter = getNavigatorWithApis(navigatorRef).getBattery;
    return typeof batteryGetter === 'function' ? batteryGetter.call(navigatorRef) : null;
}

export function getBluetooth(navigatorRef: Navigator = navigator): BluetoothLike | null {
    const bluetooth = getNavigatorWithApis(navigatorRef).bluetooth;
    return typeof bluetooth?.requestDevice === 'function' ? bluetooth : null;
}

export function requestMidiAccess(
    options?: MidiAccessOptions,
    navigatorRef: Navigator = navigator,
): Promise<MIDIAccess | null> | null {
    const requestAccess = getNavigatorWithApis(navigatorRef).requestMIDIAccess;
    return typeof requestAccess === 'function' ? requestAccess.call(navigatorRef, options) : null;
}

export function canRequestMidiAccess(navigatorRef: Navigator = navigator): boolean {
    return typeof getNavigatorWithApis(navigatorRef).requestMIDIAccess === 'function';
}

export function getAmbientLightSensorConstructor(
    scope: Window = window,
): SensorConstructor<AmbientLightSensorLike> | null {
    const ctor = (scope as WindowWithSensors).AmbientLightSensor;
    return typeof ctor === 'function' ? ctor : null;
}

export function getProximitySensorConstructor(
    scope: Window = window,
): SensorConstructor<ProximitySensorLike> | null {
    const ctor = (scope as WindowWithSensors).ProximitySensor;
    return typeof ctor === 'function' ? ctor : null;
}

export function canVibrate(navigatorRef: Navigator = navigator): boolean {
    return typeof navigatorRef.vibrate === 'function';
}

export function vibrateDevice(pattern: VibratePattern, navigatorRef: Navigator = navigator): boolean {
    if (!canVibrate(navigatorRef)) return false;
    try {
        return navigatorRef.vibrate(pattern);
    } catch {
        return false;
    }
}

export function printWhenFontsReady(
    documentRef: Document = document,
    print: () => void = () => window.print(),
): void {
    const printNow = () => print();

    if ('fonts' in documentRef) {
        documentRef.fonts.ready.then(printNow).catch(printNow);
        return;
    }

    printNow();
}

export async function requestElementFullscreen(element: Element): Promise<void> {
    const requestFullscreen = element.requestFullscreen;
    if (typeof requestFullscreen !== 'function') {
        throw new DOMException('Fullscreen API not available.', 'NotSupportedError');
    }
    await requestFullscreen.call(element);
}

export function exitDocumentFullscreen(documentRef: Document = document): Promise<void> | void {
    if (!documentRef.fullscreenElement) return;
    return documentRef.exitFullscreen();
}
