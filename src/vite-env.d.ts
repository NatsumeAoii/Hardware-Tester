/// <reference types="vite/client" />

interface Window {
    __hardwarePerfCounters?: {
        canvasCreates: number;
        webglContextRequests: number;
    };
}

// Web NFC API type declarations
interface NDEFRecord {
    readonly recordType: string;
    readonly mediaType?: string;
    readonly id?: string;
    readonly data?: DataView;
    readonly encoding?: string;
    readonly lang?: string;
}

interface NDEFMessage {
    readonly records: ReadonlyArray<NDEFRecord>;
}

interface NDEFReadingEvent extends Event {
    readonly serialNumber: string;
    readonly message: NDEFMessage;
}

interface NDEFReader extends EventTarget {
    scan(options?: { signal?: AbortSignal }): Promise<void>;
    onreading: ((event: NDEFReadingEvent) => void) | null;
    onreadingerror: ((event: Event) => void) | null;
}

declare var NDEFReader: {
    prototype: NDEFReader;
    new(): NDEFReader;
};

// WebHID API type declarations
interface HIDDeviceFilter {
    vendorId?: number;
    productId?: number;
    usagePage?: number;
    usage?: number;
}

interface HIDDeviceRequestOptions {
    filters: HIDDeviceFilter[];
}

interface HIDCollectionInfo {
    usagePage?: number;
    usage?: number;
    type?: number;
    children?: HIDCollectionInfo[];
    inputReports?: HIDReportInfo[];
    outputReports?: HIDReportInfo[];
    featureReports?: HIDReportInfo[];
}

interface HIDReportInfo {
    reportId?: number;
    items?: HIDReportItem[];
}

interface HIDReportItem {
    isAbsolute?: boolean;
    isArray?: boolean;
    isRange?: boolean;
    hasNull?: boolean;
    usages?: number[];
    usageMinimum?: number;
    usageMaximum?: number;
    reportSize?: number;
    reportCount?: number;
    logicalMinimum?: number;
    logicalMaximum?: number;
}

interface HIDInputReportEvent extends Event {
    device: HIDDevice;
    reportId: number;
    data: DataView;
}

interface HIDDevice {
    opened: boolean;
    vendorId: number;
    productId: number;
    productName: string;
    collections: HIDCollectionInfo[];
    open(): Promise<void>;
    close(): Promise<void>;
    sendReport(reportId: number, data: BufferSource): Promise<void>;
    sendFeatureReport(reportId: number, data: BufferSource): Promise<void>;
    receiveFeatureReport(reportId: number): Promise<DataView>;
    addEventListener(type: 'inputreport', listener: (event: HIDInputReportEvent) => void): void;
    removeEventListener(type: 'inputreport', listener: (event: HIDInputReportEvent) => void): void;
}

interface HID extends EventTarget {
    getDevices(): Promise<HIDDevice[]>;
    requestDevice(options: HIDDeviceRequestOptions): Promise<HIDDevice[]>;
}

// Web Serial API type declarations
interface SerialPortRequestOptions {
    filters?: SerialPortFilter[];
}

interface SerialPortFilter {
    usbVendorId?: number;
    usbProductId?: number;
}

interface SerialOptions {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: 'none' | 'even' | 'odd';
    bufferSize?: number;
    flowControl?: 'none' | 'hardware';
}

interface SerialPort extends EventTarget {
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
    open(options: SerialOptions): Promise<void>;
    close(): Promise<void>;
    getInfo(): SerialPortInfo;
}

interface SerialPortInfo {
    usbVendorId?: number;
    usbProductId?: number;
}

interface Serial extends EventTarget {
    getPorts(): Promise<SerialPort[]>;
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
}

interface Navigator {
    hid: HID;
    serial: Serial;
}
