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

// Re-export icon paths from the dedicated icon module for backward compatibility.
export { navIconPaths } from './testerIcons';
