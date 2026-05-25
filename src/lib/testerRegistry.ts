export type TesterId =
    | 'dashboard'
    | 'keyboard'
    | 'mouse'
    | 'double-click'
    | 'screen'
    | 'mic'
    | 'sound'
    | 'webcam'
    | 'network'
    | 'gamepad'
    | 'touch'
    | 'vibration'
    | 'midi'
    | 'battery'
    | 'gpu'
    | 'motion'
    | 'geolocation'
    | 'ambient-light'
    | 'bluetooth'
    | 'burn-in'
    | 'printer'
    | 'report'
    | 'usb-storage'
    | 'multi-monitor'
    | 'nfc'
    | 'serial-hid'
    | 'clipboard'
    | 'wake-lock'
    | 'benchmark';

export type TesterGroupKey = 'main' | 'input' | 'media' | 'system' | 'sensors' | 'advanced' | 'tools';

export interface TesterMeta {
    id: TesterId;
    label: string;
    group: TesterGroupKey;
    dashboardDescription?: string;
}

export interface ReportGroup {
    name: string;
    testerIds: TesterId[];
}

export const DEFAULT_TESTER: TesterId = 'dashboard';

export const testerGroups: { key: TesterGroupKey; label: string }[] = [
    { key: 'main', label: '' },
    { key: 'input', label: 'Input' },
    { key: 'media', label: 'Output & Media' },
    { key: 'system', label: 'System' },
    { key: 'sensors', label: 'Sensors' },
    { key: 'advanced', label: 'Advanced' },
    { key: 'tools', label: 'Utilities' },
];

export const testers: TesterMeta[] = [
    { id: 'dashboard', label: 'Dashboard', group: 'main' },
    { id: 'report', label: 'System Report', group: 'main' },
    { id: 'keyboard', label: 'Keyboard', group: 'input', dashboardDescription: 'Test every key with visual feedback' },
    { id: 'mouse', label: 'Mouse', group: 'input', dashboardDescription: 'Track position, buttons and scroll' },
    { id: 'double-click', label: 'Double Click', group: 'input', dashboardDescription: 'Detect faulty switches' },
    { id: 'gamepad', label: 'Gamepad', group: 'input', dashboardDescription: 'Controller axes, buttons and haptics' },
    { id: 'touch', label: 'Touch & Pen', group: 'input', dashboardDescription: 'Multi-touch and pressure tracking' },
    { id: 'screen', label: 'Screen', group: 'media', dashboardDescription: 'Dead pixel test and display info' },
    { id: 'mic', label: 'Microphone', group: 'media', dashboardDescription: 'Waveform and level monitoring' },
    { id: 'sound', label: 'Sound', group: 'media', dashboardDescription: 'Tone generator with waveforms' },
    { id: 'webcam', label: 'Webcam', group: 'media', dashboardDescription: 'Feed, FPS and photo capture' },
    { id: 'vibration', label: 'Vibration', group: 'media', dashboardDescription: 'Haptic pattern testing' },
    { id: 'multi-monitor', label: 'Multi-Monitor', group: 'media', dashboardDescription: 'Detect and map connected displays' },
    { id: 'battery', label: 'Battery', group: 'system', dashboardDescription: 'Health, charging and discharge time' },
    { id: 'gpu', label: 'GPU', group: 'system', dashboardDescription: 'WebGL info and 3D stress test' },
    { id: 'bluetooth', label: 'Bluetooth', group: 'system', dashboardDescription: 'Scan nearby BLE devices' },
    { id: 'usb-storage', label: 'USB/Storage', group: 'system', dashboardDescription: 'Storage quota and usage info' },
    { id: 'wake-lock', label: 'Wake Lock', group: 'system', dashboardDescription: 'Prevent screen dimming' },
    { id: 'benchmark', label: 'Benchmark', group: 'system', dashboardDescription: 'CPU and memory performance test' },
    { id: 'motion', label: 'Motion', group: 'sensors', dashboardDescription: 'Gyroscope and accelerometer' },
    { id: 'geolocation', label: 'Geolocation', group: 'sensors', dashboardDescription: 'GPS accuracy and coordinates' },
    { id: 'ambient-light', label: 'Light Sensor', group: 'sensors', dashboardDescription: 'Ambient light and proximity' },
    { id: 'midi', label: 'MIDI', group: 'advanced', dashboardDescription: 'Musical instrument input monitor' },
    { id: 'network', label: 'Network', group: 'advanced', dashboardDescription: 'Speed, ping and jitter analysis' },
    { id: 'nfc', label: 'NFC', group: 'advanced', dashboardDescription: 'Read NFC tags and NDEF records' },
    { id: 'serial-hid', label: 'Serial/HID', group: 'advanced', dashboardDescription: 'Raw device communication' },
    { id: 'burn-in', label: 'Burn-in Fix', group: 'tools', dashboardDescription: 'Stuck pixel recovery tool' },
    { id: 'printer', label: 'Print Test', group: 'tools', dashboardDescription: 'Calibration print page' },
    { id: 'clipboard', label: 'Clipboard', group: 'tools', dashboardDescription: 'Test clipboard read and write' },
];

const testerIdSet = new Set<TesterId>(testers.map(tester => tester.id));

export const isTesterId = (value: string): value is TesterId => testerIdSet.has(value as TesterId);

export const dashboardTesters = testers.filter(tester => tester.dashboardDescription);

export const reportGroups: ReportGroup[] = [
    { name: 'Input Devices', testerIds: ['keyboard', 'mouse', 'double-click', 'gamepad', 'touch', 'midi'] },
    { name: 'Output & Media', testerIds: ['screen', 'mic', 'sound', 'webcam', 'vibration', 'multi-monitor'] },
    { name: 'System & Sensors', testerIds: ['battery', 'gpu', 'motion', 'geolocation', 'ambient-light', 'bluetooth', 'usb-storage', 'wake-lock', 'benchmark'] },
    { name: 'Network & Connectivity', testerIds: ['network'] },
    { name: 'Advanced', testerIds: ['nfc', 'serial-hid'] },
    { name: 'Utilities', testerIds: ['burn-in', 'printer', 'clipboard'] },
];

export const reportTesterIds = reportGroups.flatMap(group => group.testerIds);

export const testerById = new Map<TesterId, TesterMeta>(testers.map(tester => [tester.id, tester]));

export const navIconPaths: Record<TesterId, string> = {
    dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
    keyboard: 'M20 5H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z',
    mouse: 'M13 1.07V9h7c0-4.08-3.05-7.44-7-7.93zM4 15c0 4.42 3.58 8 8 8s8-3.58 8-8v-4H4v4zm7-13.93C7.05 1.56 4 4.92 4 9h7V1.07z',
    'double-click': 'M18 1l-6 4-6-4-6 5v2l6-4 6 4 6-4 6 4V6l-6-5zm0 8l-6 4-6-4-6 5v2l6-4 6 4 6-4 6 4v-2l-6-5z',
    screen: 'M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H3V4h18v10z',
    mic: 'M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z',
    sound: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
    webcam: 'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z',
    network: 'M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z',
    gamepad: 'M15 7.5V2H9v5.5l3 3 3-3zM7.5 9H2v6h5.5l3-3-3-3zM9 16.5V22h6v-5.5l-3-3-3 3zM16.5 9l-3 3 3 3H22V9h-5.5z',
    touch: 'M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z',
    vibration: 'M0 15h2V9H0v6zm3 2h2V7H3v10zm4-12v14h2V5H7zm4-2v18h2V3h-2zm4 2v14h2V5h-2zm4 2v10h2V7h-2zm3 2v6h2V9h-2z',
    midi: 'M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15h2v2H5v-2zm4 0h2v2H9v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-12-4h2v2H5v-2zm4 0h6v2H9v-2zm8 0h2v2h-2v-2z',
    battery: 'M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4zM13 18h-2v-2h2v2zm0-4h-2V9h2v5z',
    gpu: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    motion: 'M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z',
    geolocation: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    'ambient-light': 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.42 0-.39.39-.39 1.03 0 1.42l1.06 1.06c.39.39 1.03.39 1.42 0 .38-.39.38-1.03 0-1.42L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.42 0-.39.39-.39 1.03 0 1.42l1.06 1.06c.39.39 1.03.39 1.42 0 .39-.39.39-1.03 0-1.42l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.42-.39-.39-1.03-.39-1.42 0l-1.06 1.06c-.39.39-.39 1.03 0 1.42.39.39 1.03.39 1.42 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.42-.39-.39-1.03-.39-1.42 0l-1.06 1.06c-.39.39-.39 1.03 0 1.42.39.39 1.03.39 1.42 0l1.06-1.06z',
    bluetooth: 'M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z',
    'burn-in': 'M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14z',
    printer: 'M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z',
    report: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z',
    'usb-storage': 'M15 7v4h1v2h-3V5h2l-3-4-3 4h2v8H8v-2.07c.7-.37 1.2-1.08 1.2-1.93 0-1.21-.99-2.2-2.2-2.2-1.21 0-2.2.99-2.2 2.2 0 .85.5 1.56 1.2 1.93V13c0 1.11.89 2 2 2h3v3.05c-.71.37-1.2 1.1-1.2 1.95 0 1.22.99 2.2 2.2 2.2 1.21 0 2.2-.98 2.2-2.2 0-.85-.49-1.58-1.2-1.95V15h3c1.11 0 2-.89 2-2v-2h1V7h-4z',
    'multi-monitor': 'M20 3H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h6v2H8v2h8v-2h-2v-2h6c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12H4V5h16v10zm-7-5h5v4h-5V10zm-2 0v4H4v-4h7z',
    nfc: 'M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H4V4h16v16zM18 6h-5c-1.1 0-2 .9-2 2v2.28c-.6.35-1 .98-1 1.72 0 1.1.9 2 2 2s2-.9 2-2c0-.74-.4-1.37-1-1.72V8h3v8H8V8h2V6H6v12h12V6z',
    'serial-hid': 'M15 7.5V2H9v5.5l3 3 3-3zM7.5 9H2v6h5.5l3-3-3-3zM9 16.5V22h6v-5.5l-3-3-3 3zM16.5 9l-3 3 3 3H22V9h-5.5z',
    clipboard: 'M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z',
    'wake-lock': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z',
    benchmark: 'M19.8 18.4L14 10.67V6.5l1.35-1.69c.26-.33.03-.81-.39-.81H9.04c-.42 0-.65.48-.39.81L10 6.5v4.17L4.2 18.4c-.49.66-.02 1.6.8 1.6h14c.82 0 1.29-.94.8-1.6z',
};
