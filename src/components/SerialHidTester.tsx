import { useState, useEffect, useRef, useCallback } from 'react';
import { formatLogEntry } from '../lib/hexFormat';
import { formatUserSafeError, isAbortError } from '../lib/userSafeErrors';

interface LogEntry {
    timestamp: string;
    hex: string;
    reportId?: number;
}

interface HidDeviceInfo {
    productName: string;
    vendorId: number;
    productId: number;
    collections: { usagePage: number; usage: number }[];
}

const MAX_LOG_ENTRIES = 200;

const BAUD_RATES = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];

export default function SerialHidTester() {
    const [hidSupported] = useState(() => 'hid' in navigator);
    const [serialSupported] = useState(() => 'serial' in navigator);
    const isSupported = hidSupported || serialSupported;

    // HID state
    const [hidDevice, setHidDevice] = useState<HidDeviceInfo | null>(null);
    const [hidConnected, setHidConnected] = useState(false);
    const [hidLog, setHidLog] = useState<LogEntry[]>([]);
    const [hidError, setHidError] = useState<string | null>(null);
    const [hidConnecting, setHidConnecting] = useState(false);
    const hidDeviceRef = useRef<HIDDevice | null>(null);

    // Serial state
    const [serialConnected, setSerialConnected] = useState(false);
    const [serialLog, setSerialLog] = useState<LogEntry[]>([]);
    const [serialError, setSerialError] = useState<string | null>(null);
    const [serialConnecting, setSerialConnecting] = useState(false);
    const [baudRate, setBaudRate] = useState(9600);
    const serialPortRef = useRef<SerialPort | null>(null);
    const serialReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    const serialReadingRef = useRef(false);

    // HID input report handler
    const handleHidInputReport = useCallback((event: HIDInputReportEvent) => {
        const data = new Uint8Array(event.data.buffer);
        const entry = formatLogEntry(data, event.reportId);
        setHidLog(prev => [entry, ...prev].slice(0, MAX_LOG_ENTRIES));
    }, []);

    // Connect HID device
    const connectHid = useCallback(async () => {
        if (!hidSupported) return;
        setHidError(null);
        setHidConnecting(true);
        try {
            const devices = await navigator.hid.requestDevice({ filters: [] });
            if (!devices || devices.length === 0) {
                setHidConnecting(false);
                return;
            }
            const device = devices[0];
            if (!device.opened) {
                await device.open();
            }
            hidDeviceRef.current = device;

            const info: HidDeviceInfo = {
                productName: device.productName || 'Unknown Device',
                vendorId: device.vendorId,
                productId: device.productId,
                collections: device.collections.map(c => ({
                    usagePage: c.usagePage ?? 0,
                    usage: c.usage ?? 0,
                })),
            };

            setHidDevice(info);
            setHidConnected(true);
            device.addEventListener('inputreport', handleHidInputReport);
        } catch (err: unknown) {
            if (!isAbortError(err)) {
                setHidError(formatUserSafeError(err, {
                    stableCode: 'HID_CONNECTION_FAILED',
                    message: 'Could not connect to HID device.',
                }));
            }
        } finally {
            setHidConnecting(false);
        }
    }, [hidSupported, handleHidInputReport]);

    // Disconnect HID device
    const disconnectHid = useCallback(async () => {
        try {
            const device = hidDeviceRef.current;
            if (device) {
                device.removeEventListener('inputreport', handleHidInputReport);
                await device.close();
            }
        } catch {
            // Ignore close errors
        } finally {
            hidDeviceRef.current = null;
            setHidConnected(false);
            setHidDevice(null);
            setHidLog([]);
        }
    }, [handleHidInputReport]);

    // Read serial data loop
    const readSerialData = useCallback(async (port: SerialPort) => {
        serialReadingRef.current = true;
        try {
            while (port.readable && serialReadingRef.current) {
                const reader = port.readable.getReader();
                serialReaderRef.current = reader;
                try {
                    while (serialReadingRef.current) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        if (value) {
                            const entry = formatLogEntry(value);
                            setSerialLog(prev => [entry, ...prev].slice(0, MAX_LOG_ENTRIES));
                        }
                    }
                } finally {
                    reader.releaseLock();
                    serialReaderRef.current = null;
                }
            }
        } catch (err: unknown) {
            if (serialReadingRef.current && !isAbortError(err)) {
                setSerialError(formatUserSafeError(err, {
                    stableCode: 'SERIAL_READ_FAILED',
                    message: 'Serial connection lost unexpectedly.',
                }));
                setSerialConnected(false);
            }
        }
    }, []);

    // Connect serial port
    const connectSerial = useCallback(async () => {
        if (!serialSupported) return;
        setSerialError(null);
        setSerialConnecting(true);
        try {
            const port = await navigator.serial.requestPort({ filters: [] });
            await port.open({ baudRate });
            serialPortRef.current = port;
            setSerialConnected(true);
            readSerialData(port);
        } catch (err: unknown) {
            if (!isAbortError(err)) {
                setSerialError(formatUserSafeError(err, {
                    stableCode: 'SERIAL_CONNECTION_FAILED',
                    message: 'Could not connect to serial port.',
                }));
            }
        } finally {
            setSerialConnecting(false);
        }
    }, [serialSupported, baudRate, readSerialData]);

    // Disconnect serial port
    const disconnectSerial = useCallback(async () => {
        serialReadingRef.current = false;
        try {
            if (serialReaderRef.current) {
                await serialReaderRef.current.cancel();
                serialReaderRef.current = null;
            }
            const port = serialPortRef.current;
            if (port) {
                await port.close();
            }
        } catch {
            // Ignore close errors
        } finally {
            serialPortRef.current = null;
            setSerialConnected(false);
            setSerialLog([]);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Close HID device
            const hidDevice = hidDeviceRef.current;
            if (hidDevice) {
                hidDevice.removeEventListener('inputreport', handleHidInputReport);
                hidDevice.close().catch(() => {});
            }
            // Close serial port
            serialReadingRef.current = false;
            const reader = serialReaderRef.current;
            if (reader) {
                reader.cancel().catch(() => {});
            }
            const port = serialPortRef.current;
            if (port) {
                port.close().catch(() => {});
            }
        };
    }, [handleHidInputReport]);

    return (
        <section aria-labelledby="serial-hid-title">
            <header className="tester-panel__header">
                <h2 id="serial-hid-title">Serial / HID Tester</h2>
                <p>Connect to HID devices or serial ports for raw device communication.</p>
            </header>
            <div className="tester-panel__body">
                {!isSupported ? (
                    <div className="status-display" style={{ color: 'var(--error)' }}>
                        Neither WebHID nor Web Serial API is available in this browser. Try Chrome or Edge on desktop.
                    </div>
                ) : (
                    <>
                        {/* HID Section */}
                        <div className="serial-hid-section">
                            <h3 className="section-title">WebHID</h3>
                            {!hidSupported ? (
                                <div className="status-display" style={{ color: 'var(--warning, var(--text-muted))' }}>
                                    WebHID API is not available in this browser.
                                </div>
                            ) : (
                                <>
                                    <div className="controls-bar">
                                        {!hidConnected ? (
                                            <button
                                                className="btn btn--primary"
                                                onClick={connectHid}
                                                disabled={hidConnecting}
                                            >
                                                {hidConnecting ? 'Connecting...' : 'Connect HID Device'}
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn--danger"
                                                onClick={disconnectHid}
                                            >
                                                Disconnect HID
                                            </button>
                                        )}
                                    </div>

                                    {hidError && (
                                        <div className="status-display" style={{ color: 'var(--error)' }} role="alert">
                                            {hidError}
                                        </div>
                                    )}

                                    {hidDevice && hidConnected && (
                                        <div className="info-grid info-grid--2-col">
                                            <div className="info-card">
                                                <h4>Product Name</h4>
                                                <p>{hidDevice.productName}</p>
                                            </div>
                                            <div className="info-card">
                                                <h4>Vendor ID</h4>
                                                <p>0x{hidDevice.vendorId.toString(16).toUpperCase().padStart(4, '0')}</p>
                                            </div>
                                            <div className="info-card">
                                                <h4>Product ID</h4>
                                                <p>0x{hidDevice.productId.toString(16).toUpperCase().padStart(4, '0')}</p>
                                            </div>
                                            <div className="info-card">
                                                <h4>Collections</h4>
                                                <div>
                                                    {hidDevice.collections.length === 0 ? (
                                                        <p>No collections</p>
                                                    ) : (
                                                        <ul className="serial-hid-collections">
                                                            {hidDevice.collections.map((c, i) => (
                                                                <li key={i}>
                                                                    Usage Page: 0x{c.usagePage.toString(16).toUpperCase().padStart(4, '0')},
                                                                    Usage: 0x{c.usage.toString(16).toUpperCase().padStart(4, '0')}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {hidConnected && hidLog.length > 0 && (
                                        <div className="serial-hid-log">
                                            <h4>HID Input Reports ({hidLog.length})</h4>
                                            <div className="serial-hid-log__entries">
                                                {hidLog.slice(0, 50).map((entry, i) => (
                                                    <div key={i} className="serial-hid-log__entry">
                                                        <span className="serial-hid-log__time">{entry.timestamp.split('T')[1]?.slice(0, 12) ?? entry.timestamp}</span>
                                                        {entry.reportId !== undefined && (
                                                            <span className="serial-hid-log__report-id">ID:{entry.reportId}</span>
                                                        )}
                                                        <span className="serial-hid-log__hex">{entry.hex}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Serial Section */}
                        <div className="serial-hid-section">
                            <h3 className="section-title">Web Serial</h3>
                            {!serialSupported ? (
                                <div className="status-display" style={{ color: 'var(--warning, var(--text-muted))' }}>
                                    Web Serial API is not available in this browser.
                                </div>
                            ) : (
                                <>
                                    <div className="controls-bar">
                                        {!serialConnected ? (
                                            <>
                                                <label className="serial-hid-baud-label">
                                                    Baud Rate:
                                                    <select
                                                        value={baudRate}
                                                        onChange={(e) => setBaudRate(Number(e.target.value))}
                                                        className="serial-hid-baud-select"
                                                    >
                                                        {BAUD_RATES.map(rate => (
                                                            <option key={rate} value={rate}>{rate}</option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <button
                                                    className="btn btn--primary"
                                                    onClick={connectSerial}
                                                    disabled={serialConnecting}
                                                >
                                                    {serialConnecting ? 'Connecting...' : 'Connect Serial Port'}
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                className="btn btn--danger"
                                                onClick={disconnectSerial}
                                            >
                                                Disconnect Serial
                                            </button>
                                        )}
                                    </div>

                                    {serialError && (
                                        <div className="status-display" style={{ color: 'var(--error)' }} role="alert">
                                            {serialError}
                                        </div>
                                    )}

                                    {serialConnected && (
                                        <div className="serial-hid-log">
                                            <h4>Serial Data ({serialLog.length} entries)</h4>
                                            <div className="serial-hid-log__entries">
                                                {serialLog.length === 0 ? (
                                                    <p className="serial-hid-log__empty">Waiting for data...</p>
                                                ) : (
                                                    serialLog.slice(0, 50).map((entry, i) => (
                                                        <div key={i} className="serial-hid-log__entry">
                                                            <span className="serial-hid-log__time">{entry.timestamp.split('T')[1]?.slice(0, 12) ?? entry.timestamp}</span>
                                                            <span className="serial-hid-log__hex">{entry.hex}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
            <style>{`
                .serial-hid-section {
                    margin-bottom: 1.5rem;
                    padding: 1rem;
                    background: var(--surface-1);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                }
                .serial-hid-section:last-child { margin-bottom: 0; }
                .serial-hid-collections {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    font-family: var(--font-mono);
                    font-size: var(--text-xs);
                }
                .serial-hid-collections li {
                    padding: 0.2rem 0;
                    color: var(--text-muted);
                }
                .serial-hid-baud-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: var(--text-sm);
                    color: var(--text-muted);
                }
                .serial-hid-baud-select {
                    padding: 0.3rem 0.5rem;
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--border);
                    background: var(--surface-2);
                    color: var(--text);
                    font-family: var(--font-mono);
                    font-size: var(--text-sm);
                }
                .serial-hid-log {
                    margin-top: 1rem;
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-sm);
                    padding: 0.75rem;
                    max-height: 300px;
                    overflow-y: auto;
                }
                .serial-hid-log h4 {
                    color: var(--text-muted);
                    font-size: var(--text-xs);
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    margin-bottom: 0.5rem;
                }
                .serial-hid-log__entries {
                    font-family: var(--font-mono);
                    font-size: var(--text-xs);
                }
                .serial-hid-log__entry {
                    display: flex;
                    gap: 0.75rem;
                    padding: 0.2rem 0;
                    border-bottom: 1px solid var(--border);
                }
                .serial-hid-log__entry:last-child { border-bottom: none; }
                .serial-hid-log__time {
                    color: var(--text-muted);
                    white-space: nowrap;
                    min-width: 90px;
                }
                .serial-hid-log__report-id {
                    color: var(--primary);
                    white-space: nowrap;
                    min-width: 40px;
                }
                .serial-hid-log__hex {
                    color: var(--text);
                    word-break: break-all;
                }
                .serial-hid-log__empty {
                    color: var(--text-muted);
                    font-style: italic;
                }
            `}</style>
        </section>
    );
}
