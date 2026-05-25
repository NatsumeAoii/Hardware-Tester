import { useState, useEffect, useRef, useCallback } from 'react';
import { formatUserSafeError, isAbortError } from '../lib/userSafeErrors';

type NfcScanStatus = 'idle' | 'active' | 'detected';

interface NdefRecordInfo {
    recordType: string;
    payload: string;
}

interface NfcTagInfo {
    serialNumber: string;
    records: NdefRecordInfo[];
}

export default function NfcTester() {
    const [isSupported] = useState(() => typeof window !== 'undefined' && 'NDEFReader' in window);
    const [scanStatus, setScanStatus] = useState<NfcScanStatus>('idle');
    const [tag, setTag] = useState<NfcTagInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);

    const startScan = useCallback(async () => {
        if (!isSupported) return;

        setError(null);
        setTag(null);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const reader = new NDEFReader();

            await reader.scan({ signal: controller.signal });
            setScanStatus('active');

            reader.onreading = (event: NDEFReadingEvent) => {
                const records: NdefRecordInfo[] = [];

                if (event.message && event.message.records) {
                    for (const record of event.message.records) {
                        const recordType = record.recordType ?? 'unknown';
                        let payload = '';
                        if (record.data) {
                            try {
                                const decoder = new TextDecoder('utf-8');
                                payload = decoder.decode(record.data);
                            } catch {
                                payload = '(unable to decode)';
                            }
                        }
                        records.push({ recordType, payload });
                    }
                }

                setTag({
                    serialNumber: event.serialNumber || 'unknown',
                    records,
                });
                setScanStatus('detected');
            };

            reader.onreadingerror = () => {
                setError('Failed to read NFC tag. Ensure the tag is held steady near the reader.');
                setScanStatus('idle');
            };
        } catch (err: unknown) {
            if (isAbortError(err)) {
                setScanStatus('idle');
                return;
            }

            if (err instanceof DOMException && err.name === 'NotAllowedError') {
                setError('NFC permission was denied. Enable NFC access in your browser site settings, then try again.');
            } else {
                setError(formatUserSafeError(err, {
                    stableCode: 'NFC_SCAN_FAILED',
                    message: 'NFC scan could not start.',
                }));
            }
            setScanStatus('idle');
        }
    }, [isSupported]);

    const stopScan = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setScanStatus('idle');
    }, []);

    // Clean up AbortController on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, []);

    const statusLabel = scanStatus === 'idle' ? 'Idle' : scanStatus === 'active' ? 'Scanning…' : 'Tag Detected';
    const statusClass = scanStatus === 'idle' ? 'nfc-status--idle' : scanStatus === 'active' ? 'nfc-status--active' : 'nfc-status--detected';

    return (
        <section aria-labelledby="nfc-title">
            <header className="tester-panel__header">
                <h2 id="nfc-title">NFC Reader</h2>
                <p>
                    Read NFC tags and view NDEF records.
                    {!isSupported && (
                        <strong style={{ color: 'var(--error)' }}>
                            {' '}Web NFC is not available in this browser. Chrome for Android with HTTPS is required.
                        </strong>
                    )}
                </p>
            </header>
            <div className="tester-panel__body">
                <div className="controls-bar">
                    <button
                        className="btn btn--primary"
                        onClick={startScan}
                        disabled={!isSupported || scanStatus === 'active'}
                    >
                        Start Scan
                    </button>
                    <button
                        className="btn"
                        onClick={stopScan}
                        disabled={!isSupported || scanStatus === 'idle'}
                    >
                        Stop Scan
                    </button>
                    <span className={`nfc-status ${statusClass}`} role="status" aria-live="polite">
                        {statusLabel}
                    </span>
                </div>

                {error && (
                    <div className="nfc-error" role="alert">
                        <p>{error}</p>
                    </div>
                )}

                {tag && (
                    <div className="nfc-tag-info">
                        <div className="info-grid info-grid--2-col">
                            <div className="info-card">
                                <h4>Serial Number</h4>
                                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
                                    {tag.serialNumber}
                                </p>
                            </div>
                            <div className="info-card">
                                <h4>Records</h4>
                                <p>{tag.records.length}</p>
                            </div>
                        </div>

                        {tag.records.length === 0 ? (
                            <div className="nfc-no-data">
                                <p>This tag contains no NDEF data.</p>
                            </div>
                        ) : (
                            <div className="nfc-records">
                                <h3 className="section-title">NDEF Records</h3>
                                {tag.records.map((record, index) => (
                                    <div key={index} className="nfc-record">
                                        <div className="nfc-record__header">
                                            <span className="nfc-record__type">
                                                {record.recordType}
                                            </span>
                                            <span className="nfc-record__index">
                                                Record {index + 1}
                                            </span>
                                        </div>
                                        <div className="nfc-record__payload">
                                            {record.payload || '(empty)'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {!tag && !error && scanStatus === 'idle' && isSupported && (
                    <div className="nfc-empty">
                        <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" opacity="0.15">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H4V4h16v16zM18 6h-5c-1.1 0-2 .9-2 2v2.28c-.6.35-1 .98-1 1.72 0 1.1.9 2 2 2s2-.9 2-2c0-.74-.4-1.37-1-1.72V8h3v8H8V6h10v12H6V6z" />
                        </svg>
                        <p>No tag scanned yet</p>
                        <span>Tap Start Scan and hold an NFC tag near your device</span>
                    </div>
                )}
            </div>
            <style>{`
        .nfc-status {
          font-size: var(--text-sm);
          font-family: var(--font-mono);
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-sm);
          font-weight: 500;
        }
        .nfc-status--idle { color: var(--text-muted); }
        .nfc-status--active { color: var(--warning); }
        .nfc-status--detected { color: var(--success); }
        .nfc-error {
          background: color-mix(in srgb, var(--error) 10%, transparent);
          border: 1px solid var(--error);
          border-radius: var(--radius);
          padding: 0.75rem 1rem;
          color: var(--error);
          font-size: var(--text-sm);
        }
        .nfc-tag-info { display: flex; flex-direction: column; gap: 1rem; }
        .nfc-no-data {
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 1.5rem;
          text-align: center;
          color: var(--text-muted);
          font-size: var(--text-sm);
        }
        .nfc-records { display: flex; flex-direction: column; gap: 0.5rem; }
        .nfc-record {
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 0.75rem 1rem;
        }
        .nfc-record__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .nfc-record__type {
          font-family: var(--font-mono);
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--primary);
        }
        .nfc-record__index {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        .nfc-record__payload {
          font-family: var(--font-mono);
          font-size: var(--text-sm);
          color: var(--text);
          word-break: break-all;
          background: var(--surface-2);
          border-radius: var(--radius-sm);
          padding: 0.5rem 0.75rem;
        }
        .nfc-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 3rem;
          color: var(--text-muted);
          text-align: center;
        }
        .nfc-empty p { font-size: 1.1rem; font-weight: 600; }
        .nfc-empty span { font-size: var(--text-sm); opacity: 0.6; }
        .section-title {
          font-size: var(--text-xs);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }
      `}</style>
        </section>
    );
}
