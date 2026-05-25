import { useState, useEffect, useRef, useCallback } from 'react';
import {
    getAmbientLightSensorConstructor,
    getProximitySensorConstructor,
    type AmbientLightSensorLike,
    type ProximitySensorLike,
} from '../lib/browserAdapters';

export default function AmbientLightTester() {
    const [isSupported, setIsSupported] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [lux, setLux] = useState<number | null>(null);
    const [maxLux, setMaxLux] = useState(0);
    const [minLux, setMinLux] = useState(Infinity);
    const [luxHistory, setLuxHistory] = useState<number[]>([]);
    const [proxNear, setProxNear] = useState<boolean | null>(null);
    const [proxMax, setProxMax] = useState<number | null>(null);
    const [proxDistance, setProxDistance] = useState<number | null>(null);

    const sensorRef = useRef<AmbientLightSensorLike | null>(null);
    const proxRef = useRef<ProximitySensorLike | null>(null);

    const getLightLevel = useCallback((lux: number): { label: string; color: string } => {
        if (lux < 10) return { label: 'Very Dark', color: '#6366f1' };
        if (lux < 50) return { label: 'Dark', color: '#818cf8' };
        if (lux < 200) return { label: 'Dim', color: '#a78bfa' };
        if (lux < 500) return { label: 'Indoor', color: '#f59e0b' };
        if (lux < 10000) return { label: 'Overcast', color: '#fb923c' };
        if (lux < 40000) return { label: 'Daylight', color: '#f97316' };
        return { label: 'Direct Sun', color: '#ef4444' };
    }, []);

    const stopSensors = useCallback(() => {
        if (sensorRef.current) try { sensorRef.current.stop(); } catch { /* sensor already stopped */ }
        if (proxRef.current) try { proxRef.current.stop(); } catch { /* sensor already stopped */ }
        sensorRef.current = null;
        proxRef.current = null;
        setIsRunning(false);
    }, []);

    const startSensors = useCallback(() => {
        stopSensors();
        setIsSupported(true);
        setLux(null);
        setMaxLux(0);
        setMinLux(Infinity);
        setLuxHistory([]);
        setProxNear(null);
        setProxMax(null);
        setProxDistance(null);

        try {
            const ALS = getAmbientLightSensorConstructor();
            if (!ALS) {
                setIsSupported(false);
                return;
            }

            const als = new ALS();
            als.addEventListener('reading', () => {
                const val = Number.isFinite(als.illuminance) ? als.illuminance : 0;
                setLux(val);
                setMaxLux(p => Math.max(p, val));
                setMinLux(p => Math.min(p, val));
                setLuxHistory(prev => [...prev, val].slice(-100));
            });
            als.addEventListener('error', () => {
                setIsSupported(false);
                stopSensors();
            });
            als.start();
            sensorRef.current = als;
            setIsRunning(true);
        } catch {
            setIsSupported(false);
            stopSensors();
            return;
        }

        try {
            const PS = getProximitySensorConstructor();
            if (PS) {
                const prox = new PS();
                prox.addEventListener('reading', () => {
                    setProxNear(typeof prox.near === 'boolean' ? prox.near : null);
                    setProxMax(typeof prox.max === 'number' && Number.isFinite(prox.max) ? prox.max : null);
                    setProxDistance(typeof prox.distance === 'number' && Number.isFinite(prox.distance) ? prox.distance : null);
                });
                prox.start();
                proxRef.current = prox;
            }
        } catch { /* optional proximity sensor not available */ }
    }, [stopSensors]);

    useEffect(() => stopSensors, [stopSensors]);

    const lightInfo = lux !== null ? getLightLevel(lux) : null;

    return (
        <section aria-labelledby="light-title">
            <header className="tester-panel__header">
                <h2 id="light-title">Light &amp; Proximity</h2>
                <p>Read ambient light sensor data and proximity detection. Requires a compatible device and browser (Chrome with flags enabled).</p>
            </header>
            <div className="tester-panel__body">
                <div className="controls-bar">
                    <button className="btn btn--primary" onClick={startSensors} disabled={isRunning}>Start Sensors</button>
                    <button className="btn" onClick={stopSensors} disabled={!isRunning}>Stop</button>
                    <span className="status-inline" role="status">{isRunning ? 'Reading sensors...' : 'Idle'}</span>
                </div>
                {!isSupported ? (
                    <div className="als-not-supported">
                        <div className="status-display" style={{ color: 'var(--warning)' }}>
                            Ambient Light Sensor not available.
                        </div>
                        <div className="als-help">
                            <h4>How to enable</h4>
                            <ol>
                                <li>Open <code>chrome://flags</code> in Chrome</li>
                                <li>Search for <code>Generic Sensor Extra Classes</code></li>
                                <li>Set it to <strong>Enabled</strong></li>
                                <li>Restart browser</li>
                            </ol>
                            <p>This sensor is also only available on devices with a physical light sensor (most laptops and all phones).</p>
                        </div>
                    </div>
                ) : !isRunning ? (
                    <div className="status-display">Start sensors to read ambient light and proximity data.</div>
                ) : (
                    <>
                        {lightInfo && lux !== null && (
                            <div className="als-hero" style={{ borderColor: `${lightInfo.color}33` }}>
                                <span className="als-hero__bar" style={{ background: lightInfo.color }} />
                                <div className="als-hero__data">
                                    <span className="als-hero__lux" style={{ color: lightInfo.color }}>{Math.round(lux)} lux</span>
                                    <span className="als-hero__label">{lightInfo.label}</span>
                                </div>
                            </div>
                        )}

                        <div className="info-grid info-grid--2-col">
                            <div className="info-card"><h4>Current</h4><p>{lux !== null ? `${Math.round(lux)} lux` : '—'}</p></div>
                            <div className="info-card"><h4>Min</h4><p>{minLux < Infinity ? `${Math.round(minLux)} lux` : '—'}</p></div>
                            <div className="info-card"><h4>Max</h4><p>{maxLux > 0 ? `${Math.round(maxLux)} lux` : '—'}</p></div>
                            <div className="info-card"><h4>Samples</h4><p>{luxHistory.length}</p></div>
                        </div>

                        {luxHistory.length > 1 && (
                            <div className="als-chart-container">
                                <h3 className="section-title">Light Level History</h3>
                                <div className="als-chart">
                                    <svg viewBox={`0 0 ${luxHistory.length} 100`} preserveAspectRatio="none" className="als-chart__svg">
                                        <defs>
                                            <linearGradient id="alsGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                                                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <polygon
                                            points={`0,100 ${luxHistory.map((v, i) => {
                                                const norm = maxLux > 0 ? Math.min(100, (v / maxLux) * 100) : 0;
                                                return `${i},${100 - norm}`;
                                            }).join(' ')} ${luxHistory.length - 1},100`}
                                            fill="url(#alsGrad)"
                                        />
                                        <polyline
                                            points={luxHistory.map((v, i) => {
                                                const norm = maxLux > 0 ? Math.min(100, (v / maxLux) * 100) : 0;
                                                return `${i},${100 - norm}`;
                                            }).join(' ')}
                                            fill="none" stroke="#f59e0b" strokeWidth="1.5"
                                        />
                                    </svg>
                                </div>
                            </div>
                        )}

                        <h3 className="section-title">Proximity Sensor</h3>
                        <div className="info-grid info-grid--2-col">
                            <div className="info-card"><h4>Near</h4><p>{proxNear !== null ? (proxNear ? 'Yes' : 'No') : 'N/A'}</p></div>
                            <div className="info-card"><h4>Distance</h4><p>{proxDistance !== null ? `${proxDistance.toFixed(1)} cm` : 'N/A'}</p></div>
                            <div className="info-card"><h4>Max Range</h4><p>{proxMax !== null ? `${proxMax} cm` : 'N/A'}</p></div>
                        </div>
                    </>
                )}
            </div>
            <style>{`
        .als-not-supported { display: flex; flex-direction: column; gap: 1rem; }
        .als-help { background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem; }
        .als-help h4 { font-size: var(--text-sm); margin-bottom: 0.75rem; }
        .als-help ol { padding-left: 1.5rem; color: var(--text-muted); font-size: var(--text-sm); line-height: 1.8; }
        .als-help code { background: var(--surface-3); padding: 0.15rem 0.4rem; border-radius: 4px; font-family: var(--font-mono); font-size: var(--text-xs); }
        .als-help p { color: var(--text-muted); font-size: var(--text-xs); margin-top: 0.75rem; opacity: 0.7; }
        .als-hero {
          display: flex; align-items: center; gap: 1.5rem;
          background: linear-gradient(135deg, var(--surface-2), var(--surface-1));
          border: 1px solid var(--border); border-radius: var(--radius); padding: 1.5rem 2rem;
        }
        .als-hero__bar { width: 6px; height: 48px; border-radius: 3px; flex-shrink: 0; }
        .als-hero__data { display: flex; flex-direction: column; }
        .als-hero__lux { font-size: 2.5rem; font-weight: 800; font-family: var(--font-mono); line-height: 1; }
        .als-hero__label { font-size: var(--text-sm); color: var(--text-muted); margin-top: 0.25rem; }
        .als-chart-container { margin-top: 0.5rem; }
        .als-chart {
          width: 100%; height: 100px; background: var(--surface-1);
          border: 1px solid var(--border); border-radius: var(--radius-sm);
          overflow: hidden; padding: 0.5rem;
        }
        .als-chart__svg { width: 100%; height: 100%; }
        .status-inline { color: var(--text-muted); font-size: var(--text-sm); font-family: var(--font-mono); }
      `}</style>
        </section>
    );
}
