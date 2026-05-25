import { lazy, type ComponentType } from 'react';
import Dashboard from './components/Dashboard';
import type { TesterId } from './lib/testerRegistry';

// Dashboard is eagerly loaded as the default route.
// All other testers are lazy-loaded to reduce initial bundle parse time.
export const testerComponents: Record<TesterId, ComponentType> = {
    dashboard: Dashboard,
    report: lazy(() => import('./components/SystemReport')),
    keyboard: lazy(() => import('./components/KeyboardTester')),
    mouse: lazy(() => import('./components/MouseTester')),
    'double-click': lazy(() => import('./components/DoubleClickTester')),
    gamepad: lazy(() => import('./components/GamepadTester')),
    touch: lazy(() => import('./components/TouchTester')),
    screen: lazy(() => import('./components/ScreenTester')),
    mic: lazy(() => import('./components/MicTester')),
    sound: lazy(() => import('./components/SoundTester')),
    webcam: lazy(() => import('./components/WebcamTester')),
    vibration: lazy(() => import('./components/VibrationTester')),
    battery: lazy(() => import('./components/BatteryTester')),
    gpu: lazy(() => import('./components/GpuTester')),
    bluetooth: lazy(() => import('./components/BluetoothTester')),
    motion: lazy(() => import('./components/MotionTester')),
    geolocation: lazy(() => import('./components/GeolocationTester')),
    'ambient-light': lazy(() => import('./components/AmbientLightTester')),
    midi: lazy(() => import('./components/MidiTester')),
    network: lazy(() => import('./components/NetworkTester')),
    'burn-in': lazy(() => import('./components/BurnInFixer')),
    printer: lazy(() => import('./components/PrinterTester')),
    'usb-storage': lazy(() => import('./components/UsbStorageTester')),
    'multi-monitor': lazy(() => import('./components/MultiMonitorTester')),
    nfc: lazy(() => import('./components/NfcTester')),
    'serial-hid': lazy(() => import('./components/SerialHidTester')),
    clipboard: lazy(() => import('./components/ClipboardTester')),
    'wake-lock': lazy(() => import('./components/WakeLockTester')),
    benchmark: lazy(() => import('./components/BenchmarkTester')),
};
