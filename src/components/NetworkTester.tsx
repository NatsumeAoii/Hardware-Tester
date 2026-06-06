import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { EMPTY_VALUE, formatMilliseconds, formatSpeedMbps } from '../lib/formatters';
import { formatUserSafeError, isAbortError } from '../lib/userSafeErrors';
import { runNetworkDiagnostic } from '../lib/networkDiagnosticRunner';
import {
    DOWNLOAD_SIZES,
    NETWORK_TEST_SERVERS as SERVERS,
    appendCacheBust,
    fetchIpWithFallback,
    fetchWithTimeout,
    getNetworkGradeColor as getGradeColor,
    parseCloudflareTrace,
    type TestResult,
    type TraceInfo,
} from '../lib/networkDiagnostics';

// --- Gauge Component ---

function SpeedGauge({ value, max, label, unit }: { value: number; max: number; label: string; unit: string }) {
    const pct = Math.min(value / max, 1);
    const angle = pct * 240 - 120;
    const r = 70;
    const cx = 90, cy = 90;
    const startAngle = -120 * Math.PI / 180;
    const endAngle = angle * Math.PI / 180;
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
    const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
    const needleX = cx + (r - 15) * Math.cos(endAngle), needleY = cy + (r - 15) * Math.sin(endAngle);

    return (
        <div className="gauge-container">
            <svg viewBox="0 0 180 140" width="180" height="140">
                <path d={`M ${cx + r * Math.cos(-120 * Math.PI / 180)} ${cy + r * Math.sin(-120 * Math.PI / 180)} A ${r} ${r} 0 1 1 ${cx + r * Math.cos(120 * Math.PI / 180)} ${cy + r * Math.sin(120 * Math.PI / 180)}`}
                    fill="none" stroke="var(--surface-3)" strokeWidth="10" strokeLinecap="round" />
                {value > 0 && (
                    <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
                        fill="none" stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round" />
                )}
                <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
                <circle cx={cx} cy={cy} r="4" fill="var(--text)" />
                <defs>
                    <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="gauge-value">{value > 0 ? value.toFixed(1) : EMPTY_VALUE}</div>
            <div className="gauge-unit">{unit}</div>
            <div className="gauge-label">{label}</div>
        </div>
    );
}

// --- Main Component ---

export default function NetworkTester() {
    const [isTesting, setIsTesting] = useState(false);
    const [selectedServer, setSelectedServer] = useState('cloudflare');
    const [selectedSize, setSelectedSize] = useState(1);

    const [ping, setPing] = useState(0);
    const [jitter, setJitter] = useState(0);
    const [download, setDownload] = useState(0);
    const [upload, setUpload] = useState(0);
    const [packetLoss, setPacketLoss] = useState(0);
    const [grade, setGrade] = useState('');

    const [pingQuality, setPingQuality] = useState('');
    const [jitterQuality, setJitterQuality] = useState('');
    const [downloadQuality, setDownloadQuality] = useState('');
    const [uploadQuality, setUploadQuality] = useState('');

    const [publicIp, setPublicIp] = useState('...');
    const [isp, setIsp] = useState('...');
    const [location, setLocation] = useState('...');
    const [traceInfo, setTraceInfo] = useState<TraceInfo | null>(null);

    const [progressText, setProgressText] = useState('');
    const [progressPercent, setProgressPercent] = useState(0);
    const [showProgress, setShowProgress] = useState(false);
    const [networkError, setNetworkError] = useState('');

    const [history, setHistory] = useState<TestResult[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    const controllerRef = useRef<AbortController | null>(null);
    const isTestingRef = useRef(false);

    const server = useMemo(() => SERVERS.find(s => s.id === selectedServer) || SERVERS[0], [selectedServer]);
    const testSize = useMemo(() => DOWNLOAD_SIZES[selectedSize], [selectedSize]);

    const loadConnectionDetails = useCallback(async (signal?: AbortSignal) => {
        const info = await fetchIpWithFallback(signal);
        if (signal?.aborted) return;
        setPublicIp(info.ip);
        setIsp(info.isp);
        setLocation(info.location);
        try {
            const resp = await fetchWithTimeout(appendCacheBust('https://cloudflare.com/cdn-cgi/trace'), {
                cache: 'no-store',
                signal,
            });
            const text = await resp.text();
            if (signal?.aborted) return;
            setTraceInfo(parseCloudflareTrace(text));
        } catch {
            if (!signal?.aborted) setTraceInfo(null);
        }
    }, []);

    const isAborted = useCallback(() => controllerRef.current?.signal.aborted, []);

    const updateProgress = useCallback((text: string, percent: number) => {
        if (isAborted()) return;
        setProgressText(text);
        setProgressPercent(percent);
    }, [isAborted]);

    const resetResults = useCallback(() => {
        setPing(0); setJitter(0); setDownload(0); setUpload(0); setPacketLoss(0); setGrade('');
        setPingQuality(''); setJitterQuality(''); setDownloadQuality(''); setUploadQuality('');
        setNetworkError('');
    }, []);

    const stopTest = useCallback(() => {
        controllerRef.current?.abort();
        isTestingRef.current = false;
        setIsTesting(false);
        setShowProgress(false);
    }, []);

    const runFullTest = useCallback(async () => {
        if (isTestingRef.current) return;
        isTestingRef.current = true;
        setIsTesting(true);
        controllerRef.current = new AbortController();
        const signal = controllerRef.current.signal;
        setShowProgress(true);
        resetResults();

        try {
            const connectionDetailsPromise = loadConnectionDetails(signal);
            const result = await runNetworkDiagnostic({
                server,
                testSizeBytes: testSize.bytes,
                signal,
                onProgress: progress => updateProgress(progress.text, progress.percent),
            });
            await connectionDetailsPromise;
            if (!result || signal.aborted) return;

            setPing(result.ping);
            setJitter(result.jitter);
            setDownload(result.download);
            setUpload(result.upload);
            setPacketLoss(result.packetLoss);
            setPingQuality(result.pingQuality);
            setJitterQuality(result.jitterQuality);
            setDownloadQuality(result.downloadQuality);
            setUploadQuality(result.uploadQuality);
            setGrade(result.grade);

            if (result.grade) {
                setHistory(prev => [{
                    timestamp: Date.now(),
                    server: server.name,
                    ping: result.ping,
                    jitter: result.jitter,
                    download: parseFloat(result.download.toFixed(1)),
                    upload: parseFloat(result.upload.toFixed(1)),
                    packetLoss: result.packetLoss,
                    grade: result.grade,
                }, ...prev].slice(0, 10));
            }
        } catch (err: unknown) {
            if (!isAbortError(err)) {
                setNetworkError(formatUserSafeError(err, {
                    stableCode: 'NETWORK_TEST_FAILED',
                    message: 'Network test could not complete.',
                }));
            }
        } finally {
            if (isTestingRef.current) {
                stopTest();
            }
        }
    }, [loadConnectionDetails, server, testSize.bytes, resetResults, stopTest, updateProgress]);

    useEffect(() => {
        return () => { controllerRef.current?.abort(); };
    }, []);

    const maxGauge = Math.max(download, upload, 100);

    return (
        <section aria-labelledby="network-title">
            <header className="tester-panel__header">
                <h2 id="network-title">Network Diagnostic</h2>
                <p>Test your connection speed, latency, packet loss, and routing using multiple test servers.</p>
            </header>
            <div className="tester-panel__body">
                <div className="net-config">
                    <div className="net-config__group">
                        <label className="net-config__label">Test Server</label>
                        <div className="server-selector">
                            {SERVERS.map(s => (
                                <button key={s.id}
                                    type="button"
                                    className={`server-btn ${selectedServer === s.id ? 'active' : ''}`}
                                    aria-pressed={selectedServer === s.id}
                                    disabled={isTesting}
                                    onClick={() => setSelectedServer(s.id)}
                                >{s.name}</button>
                            ))}
                        </div>
                    </div>
                    <div className="net-config__group">
                        <label className="net-config__label">Test Size</label>
                        <div className="server-selector">
                            {DOWNLOAD_SIZES.map((s, i) => (
                                <button key={s.label}
                                    type="button"
                                    className={`server-btn ${selectedSize === i ? 'active' : ''}`}
                                    aria-pressed={selectedSize === i}
                                    disabled={isTesting}
                                    onClick={() => setSelectedSize(i)}
                                >{s.label}</button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="controls-bar">
                    <button className="btn btn--primary" disabled={isTesting} onClick={runFullTest}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        Run Full Test
                    </button>
                    <button className="btn" disabled={!isTesting} onClick={stopTest}>Stop</button>
                    {showProgress && <span className="status-inline" role="status">{progressText}</span>}
                </div>

                {showProgress && (
                    <div className="net-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
                        <div className="net-progress__bar">
                            <div className="net-progress__fill" style={{ width: `${progressPercent}%` }} />
                        </div>
                    </div>
                )}

                {networkError && (
                    <div className="network-alert" role="alert">
                        {networkError}
                    </div>
                )}

                {grade && (
                    <div className="net-grade-banner" style={{ borderColor: `${getGradeColor(grade)}33` }}>
                        <div className="net-grade-circle" style={{ background: getGradeColor(grade) }}>
                            <span>{grade}</span>
                        </div>
                        <div className="net-grade-text">
                            <strong>Connection Quality: {grade}</strong>
                            <span>Based on ping, jitter, speed, and packet loss.</span>
                        </div>
                    </div>
                )}

                <div className="net-gauges">
                    <SpeedGauge value={download} max={maxGauge} label="Download" unit="Mbps" />
                    <SpeedGauge value={upload} max={maxGauge} label="Upload" unit="Mbps" />
                </div>

                <div className="info-grid info-grid--large-text">
                    <div className="info-card"><h3>Ping <span className={`quality-dot ${pingQuality}`} /></h3><p>{formatMilliseconds(ping)}</p></div>
                    <div className="info-card"><h3>Jitter <span className={`quality-dot ${jitterQuality}`} /></h3><p>{formatMilliseconds(jitter)}</p></div>
                    <div className="info-card"><h3>Download <span className={`quality-dot ${downloadQuality}`} /></h3><p>{formatSpeedMbps(download)}</p></div>
                    <div className="info-card"><h3>Upload <span className={`quality-dot ${uploadQuality}`} /></h3><p>{formatSpeedMbps(upload)}</p></div>
                    <div className="info-card"><h3>Packet Loss</h3><p>{packetLoss > 0 ? <span style={{ color: 'var(--error)' }}>{packetLoss}%</span> : ping > 0 ? '0%' : EMPTY_VALUE}</p></div>
                    <div className="info-card"><h3>Server</h3><p>{server.name}</p></div>
                </div>

                <h3 className="section-title">Connection Details</h3>
                <div className="info-grid">
                    <div className="info-card"><h4>Public IP</h4><p>{publicIp}</p></div>
                    <div className="info-card"><h4>ISP</h4><p>{isp}</p></div>
                    <div className="info-card"><h4>Location</h4><p>{location}</p></div>
                </div>

                {traceInfo && (
                    <>
                        <h3 className="section-title">DNS & Routing (Cloudflare Trace)</h3>
                        <div className="info-grid">
                            <div className="info-card"><h4>Datacenter</h4><p>{traceInfo.datacenter}</p></div>
                            <div className="info-card"><h4>Country</h4><p>{traceInfo.country}</p></div>
                            <div className="info-card"><h4>HTTP</h4><p>{traceInfo.httpVersion}</p></div>
                            <div className="info-card"><h4>TLS</h4><p>{traceInfo.tls}</p></div>
                            <div className="info-card"><h4>WARP</h4><p>{traceInfo.warp}</p></div>
                            <div className="info-card"><h4>Gateway</h4><p>{traceInfo.gateway}</p></div>
                        </div>
                    </>
                )}

                {history.length > 0 && (
                    <>
                        <button className="btn" style={{ marginTop: '0.5rem' }} onClick={() => setShowHistory(v => !v)}>
                            {showHistory ? 'Hide' : 'Show'} Test History ({history.length})
                        </button>
                        {showHistory && (
                            <div className="net-history">
                                <table className="net-history-table">
                                    <thead>
                                        <tr><th>Time</th><th>Server</th><th>Ping</th><th>Jitter</th><th>Down</th><th>Up</th><th>Loss</th><th>Grade</th></tr>
                                    </thead>
                                    <tbody>
                                        {history.map((h, i) => (
                                            <tr key={i}>
                                                <td>{new Date(h.timestamp).toLocaleTimeString()}</td>
                                                <td>{h.server}</td>
                                                <td>{h.ping}ms</td>
                                                <td>{h.jitter}ms</td>
                                                <td>{h.download} Mbps</td>
                                                <td>{h.upload} Mbps</td>
                                                <td>{h.packetLoss}%</td>
                                                <td style={{ color: getGradeColor(h.grade), fontWeight: 700 }}>{h.grade}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
            <style>{`
        .net-config {
          display: flex; flex-direction: column; gap: 1rem;
          padding: 1rem; border-radius: var(--radius);
          background: linear-gradient(135deg, var(--surface-2), var(--surface-1));
          border: 1px solid var(--border); margin-bottom: 1rem;
        }
        .net-config__group { display: flex; flex-direction: column; gap: 0.5rem; }
        .net-config__label { font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
        .server-selector { display: flex; gap: 0.4rem; flex-wrap: wrap; }
        .server-btn {
          padding: 0.4rem 0.85rem; border-radius: var(--radius-sm);
          border: 1px solid var(--border); background: var(--surface-3);
          color: var(--text-muted); cursor: pointer; font-size: var(--text-xs);
          font-family: var(--font); font-weight: 500; transition: all var(--transition);
        }
        .server-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--text); }
        .server-btn.active { background: var(--primary); color: white; border-color: var(--primary); }
        .server-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .net-grade-banner {
          display: flex; align-items: center; gap: 1.25rem;
          padding: 1.25rem; border-radius: var(--radius);
          background: linear-gradient(135deg, var(--surface-2), var(--surface-1));
          border: 1px solid var(--border); margin-bottom: 1rem;
        }
        .net-grade-circle {
          width: 56px; height: 56px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .net-grade-circle span { font-size: 1.5rem; font-weight: 800; color: white; }
        .net-grade-text { display: flex; flex-direction: column; gap: 0.15rem; }
        .net-grade-text strong { font-size: 1rem; color: var(--text); }
        .net-grade-text span { font-size: var(--text-xs); color: var(--text-muted); }

        .net-gauges { display: flex; justify-content: center; gap: 2rem; margin: 1rem 0; flex-wrap: wrap; }
        .gauge-container { display: flex; flex-direction: column; align-items: center; }
        .gauge-value { font-size: 1.5rem; font-weight: 800; font-family: var(--font-mono); margin-top: -1rem; color: var(--text); }
        .gauge-unit { font-size: var(--text-xs); color: var(--text-muted); }
        .gauge-label { font-size: var(--text-sm); color: var(--text-muted); font-weight: 600; margin-top: 0.25rem; }

        .net-progress { width: 100%; }
        .net-progress__bar { width: 100%; height: 8px; background-color: var(--surface-2); border-radius: 4px; overflow: hidden; }
        .net-progress__fill { width: 0; height: 100%; border-radius: 4px; background: var(--accent); transition: width 0.4s ease; }
        .status-inline { color: var(--text-muted); font-size: var(--text-sm); font-family: var(--font-mono); }
        .network-alert {
          padding: 0.75rem 1rem; border-radius: var(--radius-sm);
          border: 1px solid rgba(239,68,68,0.35);
          background: rgba(239,68,68,0.08); color: var(--error);
          font-size: var(--text-sm);
        }

        .net-history { overflow-x: auto; margin-top: 0.5rem; }
        .net-history-table { width: 100%; border-collapse: collapse; font-size: var(--text-xs); font-family: var(--font-mono); }
        .net-history-table th { text-align: left; padding: 0.5rem; background: var(--surface-2); color: var(--text-muted); font-weight: 600; border-bottom: 1px solid var(--border); }
        .net-history-table td { padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--border); color: var(--text); }
        .net-history-table tr:hover td { background: var(--surface-2); }

        @media (max-width: 600px) {
          .net-gauges { flex-direction: column; align-items: center; }
          .server-selector { flex-direction: column; }
          .server-btn { width: 100%; text-align: center; }
        }
      `}</style>
        </section>
    );
}
