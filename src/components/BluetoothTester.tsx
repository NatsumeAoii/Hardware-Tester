import { useState, useCallback } from 'react';
import { createDiagnosticState, getDiagnosticMessage, readyDiagnosticState, type DiagnosticState } from '../lib/diagnosticState';
import { getBluetooth } from '../lib/browserAdapters';
import { formatUserSafeError, isAbortError } from '../lib/userSafeErrors';

interface BleDevice {
    name: string;
    id: string;
    connected: boolean;
    rssi?: number;
    services: string[];
}

const knownServices: Record<string, string> = {
    '00001800-0000-1000-8000-00805f9b34fb': 'Generic Access',
    '00001801-0000-1000-8000-00805f9b34fb': 'Generic Attribute',
    '0000180a-0000-1000-8000-00805f9b34fb': 'Device Information',
    '0000180f-0000-1000-8000-00805f9b34fb': 'Battery Service',
    '00001812-0000-1000-8000-00805f9b34fb': 'HID (Keyboard/Mouse)',
    '0000180d-0000-1000-8000-00805f9b34fb': 'Heart Rate',
    '00001802-0000-1000-8000-00805f9b34fb': 'Immediate Alert',
    '00001803-0000-1000-8000-00805f9b34fb': 'Link Loss',
};

export default function BluetoothTester() {
    const [isSupported] = useState(() => !!getBluetooth());
    const [status, setStatus] = useState<DiagnosticState>(() => readyDiagnosticState());
    const [devices, setDevices] = useState<BleDevice[]>([]);
    const [scanning, setScanning] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<BleDevice | null>(null);
    const [deviceInfo, setDeviceInfo] = useState<Record<string, string>>({});

    const scanForDevices = useCallback(async () => {
        const bluetooth = getBluetooth();
        if (!isSupported || !bluetooth) return;
        setScanning(true);
        setStatus(createDiagnosticState('loading', 'Opening device picker...'));
        try {
            const device = await bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: Object.keys(knownServices),
            });

            const newDev: BleDevice = {
                name: device.name || 'Unknown Device',
                id: device.id,
                connected: false,
                services: [],
            };

            setDevices(prev => {
                if (prev.some(d => d.id === newDev.id)) return prev;
                return [...prev, newDev];
            });
            setStatus(createDiagnosticState('success', `Found: ${newDev.name}`));

            try {
                setStatus(createDiagnosticState('running', `Connecting to ${newDev.name}...`));
                const server = await device.gatt?.connect();
                if (server) {
                    newDev.connected = true;
                    try {
                        const svcs = await server.getPrimaryServices();
                        newDev.services = svcs.map(service => knownServices[service.uuid] || service.uuid);
                    } catch { /* services not readable */ }

                    try {
                        const devInfoSvc = await server.getPrimaryService('device_information');
                        const chars = await devInfoSvc.getCharacteristics();
                        const info: Record<string, string> = {};
                        for (const c of chars) {
                            try {
                                const val = await c.readValue();
                                const text = new TextDecoder().decode(val);
                                const names: Record<string, string> = {
                                    '00002a29-0000-1000-8000-00805f9b34fb': 'Manufacturer',
                                    '00002a24-0000-1000-8000-00805f9b34fb': 'Model',
                                    '00002a25-0000-1000-8000-00805f9b34fb': 'Serial',
                                    '00002a26-0000-1000-8000-00805f9b34fb': 'Firmware',
                                    '00002a27-0000-1000-8000-00805f9b34fb': 'Hardware Rev',
                                    '00002a28-0000-1000-8000-00805f9b34fb': 'Software Rev',
                                };
                                info[names[c.uuid] || c.uuid] = text;
                            } catch { /* char not readable */ }
                        }
                        setDeviceInfo(info);
                    } catch { /* no device info service */ }

                    setSelectedDevice(newDev);
                    setDevices(prev => prev.map(d => d.id === newDev.id ? newDev : d));
                    setStatus(createDiagnosticState('success', `Connected to ${newDev.name}`));
                }
            } catch {
                setStatus(createDiagnosticState('success', `Found ${newDev.name} (not connectable)`));
            }
        } catch (err: unknown) {
            if (isAbortError(err) || (err instanceof DOMException && err.name === 'NotFoundError')) {
                setStatus(createDiagnosticState('stopped', 'Scan cancelled'));
            } else {
                setStatus(createDiagnosticState('error', formatUserSafeError(err, {
                    stableCode: 'BLUETOOTH_SCAN_FAILED',
                    message: 'Bluetooth scan could not complete.',
                })));
            }
        }
        setScanning(false);
    }, [isSupported]);

    const clearDevices = useCallback(() => {
        setDevices([]);
        setSelectedDevice(null);
        setDeviceInfo({});
        setStatus(readyDiagnosticState());
    }, []);

    return (
        <section aria-labelledby="bluetooth-title">
            <header className="tester-panel__header">
                <h2 id="bluetooth-title">Bluetooth Scanner</h2>
                <p>
                    Scan for nearby Bluetooth Low Energy (BLE) devices.
                    {!isSupported && <strong style={{ color: 'var(--error)' }}> Web Bluetooth API not supported (requires Chrome/Edge with HTTPS).</strong>}
                </p>
            </header>
            <div className="tester-panel__body">
                <div className="controls-bar">
                    <button className="btn btn--primary" onClick={scanForDevices} disabled={!isSupported || scanning}>
                        {scanning ? 'Scanning...' : 'Scan for Devices'}
                    </button>
                    <button className="btn" onClick={clearDevices} disabled={devices.length === 0}>Clear</button>
                    <span className="status-inline" role="status">{getDiagnosticMessage(status)}</span>
                </div>

                {devices.length === 0 ? (
                    <div className="bt-empty">
                        <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" opacity="0.15">
                            <path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z" />
                        </svg>
                        <p>No devices found yet</p>
                        <span>Click Scan to search for BLE devices nearby</span>
                    </div>
                ) : (
                    <div className="bt-devices">
                        {devices.map(d => (
                            <button type="button" key={d.id} className={`bt-device ${selectedDevice?.id === d.id ? 'selected' : ''}`} onClick={() => setSelectedDevice(d)} aria-pressed={selectedDevice?.id === d.id}>
                                <div className="bt-device__header">
                                    <span className={`bt-device__status ${d.connected ? 'connected' : ''}`} />
                                    <strong>{d.name}</strong>
                                    <span className="bt-device__id">{d.id.slice(0, 8)}…</span>
                                </div>
                                {d.services.length > 0 && (
                                    <div className="bt-device__services">
                                        {d.services.map((s, i) => <span key={i} className="bt-service-tag">{s}</span>)}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {Object.keys(deviceInfo).length > 0 && (
                    <div className="bt-info">
                        <h3 className="section-title">Device Information</h3>
                        <div className="info-grid info-grid--2-col">
                            {Object.entries(deviceInfo).map(([key, val]) => (
                                <div key={key} className="info-card"><h4>{key}</h4><p style={{ fontSize: 'var(--text-sm)' }}>{val}</p></div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <style>{`
        .bt-empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 3rem; color: var(--text-muted); text-align: center; }
        .bt-empty p { font-size: 1.1rem; font-weight: 600; }
        .bt-empty span { font-size: var(--text-sm); opacity: 0.6; }
        .bt-devices { display: flex; flex-direction: column; gap: 0.5rem; }
        .bt-device {
          background: var(--surface-1); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 1rem; cursor: pointer;
          transition: all var(--transition); color: var(--text); text-align: left;
        }
        .bt-device:hover, .bt-device:focus-visible { border-color: var(--primary-glow); }
        .bt-device.selected { border-color: var(--primary); background: var(--primary-glow); }
        .bt-device__header { display: flex; align-items: center; gap: 0.5rem; }
        .bt-device__status { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); flex-shrink: 0; }
        .bt-device__status.connected { background: var(--success); box-shadow: 0 0 6px var(--success); }
        .bt-device__id { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin-left: auto; }
        .bt-device__services { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.5rem; }
        .bt-service-tag {
          font-size: 10px; background: var(--surface-3); color: var(--text-muted);
          padding: 0.15rem 0.5rem; border-radius: 4px; font-family: var(--font-mono);
        }
        .bt-info { margin-top: 0.5rem; }
      `}</style>
        </section>
    );
}
