import { useState, useEffect, useCallback } from 'react';
import { getBattery, type BrowserBatteryManager } from '../lib/browserAdapters';
import { readBatterySnapshot } from '../lib/deviceDiagnostics';
import { EMPTY_VALUE, formatDurationFromSeconds } from '../lib/formatters';

interface BatteryInfo {
    charging: boolean;
    level: number;
    chargingTime: number;
    dischargingTime: number;
}

export default function BatteryTester() {
    const [isSupported, setIsSupported] = useState(true);
    const [battery, setBattery] = useState<BatteryInfo | null>(null);
    const [history, setHistory] = useState<{ time: string; level: number }[]>([]);

    const getLevelColor = useCallback((level: number): string => {
        if (level > 0.6) return 'var(--success)';
        if (level > 0.3) return 'var(--warning)';
        return 'var(--error)';
    }, []);

    const getHealthLabel = useCallback((level: number, charging: boolean): string => {
        if (charging) return 'Charging';
        if (level > 0.8) return 'Excellent';
        if (level > 0.5) return 'Good';
        if (level > 0.2) return 'Low';
        return 'Critical';
    }, []);

    useEffect(() => {
        let batteryRef: BrowserBatteryManager | null = null;
        let cancelled = false;

        const updateBattery = (batt: BrowserBatteryManager) => {
            if (cancelled) return;
            const info: BatteryInfo = readBatterySnapshot(batt);
            setBattery(info);
            setHistory(prev => {
                const now = new Date().toLocaleTimeString();
                return [...prev, { time: now, level: Math.round(info.level * 100) }].slice(-60);
            });
        };

        const handleBatteryChange = () => {
            if (cancelled || !batteryRef) return;
            updateBattery(batteryRef);
        };

        const init = async () => {
            try {
                const batt = await getBattery();
                if (!batt) throw new DOMException('Battery API is unavailable.', 'NotSupportedError');
                if (cancelled) return;
                batteryRef = batt;
                updateBattery(batt);
                batt.addEventListener('chargingchange', handleBatteryChange);
                batt.addEventListener('levelchange', handleBatteryChange);
                batt.addEventListener('chargingtimechange', handleBatteryChange);
                batt.addEventListener('dischargingtimechange', handleBatteryChange);
            } catch {
                if (!cancelled) setIsSupported(false);
            }
        };
        init();

        const interval = window.setInterval(() => {
            if (!cancelled && batteryRef) updateBattery(batteryRef);
        }, 30000);

        return () => {
            cancelled = true;
            clearInterval(interval);
            if (batteryRef) {
                batteryRef.removeEventListener('chargingchange', handleBatteryChange);
                batteryRef.removeEventListener('levelchange', handleBatteryChange);
                batteryRef.removeEventListener('chargingtimechange', handleBatteryChange);
                batteryRef.removeEventListener('dischargingtimechange', handleBatteryChange);
            }
        };
    }, []);

    const levelPct = battery ? Math.round(battery.level * 100) : 0;

    return (
        <section aria-labelledby="battery-title">
            <header className="tester-panel__header">
                <h2 id="battery-title">Battery Health</h2>
                <p>Monitor battery status, charging rate, and estimated time remaining.</p>
            </header>
            <div className="tester-panel__body">
                {!isSupported ? (
                    <div className="status-display" style={{ color: 'var(--error)' }}>
                        Battery API not available on this device/browser.
                    </div>
                ) : !battery ? (
                    <div className="status-display">Loading battery information...</div>
                ) : (
                    <>
                        <div className="batt-gauge-row">
                            <div className="batt-gauge">
                                <div className="batt-gauge__ring">
                                    <svg viewBox="0 0 120 120" width="160" height="160">
                                        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--surface-3)" strokeWidth="10" />
                                        <circle
                                            cx="60" cy="60" r="52" fill="none"
                                            stroke={getLevelColor(battery.level)}
                                            strokeWidth="10" strokeLinecap="round"
                                            strokeDasharray={`${2 * Math.PI * 52}`}
                                            strokeDashoffset={`${2 * Math.PI * 52 * (1 - battery.level)}`}
                                            transform="rotate(-90 60 60)"
                                            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
                                        />
                                    </svg>
                                    <div className="batt-gauge__center">
                                        <span className="batt-gauge__pct" style={{ color: getLevelColor(battery.level) }}>{levelPct}%</span>
                                        <span className="batt-gauge__label">{getHealthLabel(battery.level, battery.charging)}</span>
                                    </div>
                                </div>
                                {battery.charging && (
                                    <div className="batt-charging-badge">
                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M11 21h-1l1-7H7.5c-.88 0-.33-.75-.31-.78C8.48 10.94 10.42 7.54 13.01 3h1l-1 7h3.51c.4 0 .62.19.4.66C12.97 17.55 11 21 11 21z" /></svg>
                                        Charging
                                    </div>
                                )}
                            </div>
                            <div className="info-grid info-grid--2-col" style={{ flex: 1 }}>
                                <div className="info-card"><h4>Level</h4><p>{levelPct}%</p></div>
                                <div className="info-card"><h4>Status</h4><p>{battery.charging ? 'Charging' : 'Discharging'}</p></div>
                                <div className="info-card"><h4>Time to Full</h4><p>{formatDurationFromSeconds(battery.chargingTime, { zeroLabel: EMPTY_VALUE, unavailableLabel: EMPTY_VALUE })}</p></div>
                                <div className="info-card"><h4>Time to Empty</h4><p>{formatDurationFromSeconds(battery.dischargingTime, { zeroLabel: EMPTY_VALUE, unavailableLabel: EMPTY_VALUE })}</p></div>
                            </div>
                        </div>

                        {history.length > 1 && (
                            <div className="batt-history">
                                <h3 className="section-title">Level History</h3>
                                <div className="batt-chart">
                                    <svg viewBox={`0 0 ${history.length * 10} 100`} preserveAspectRatio="none" className="batt-chart__svg">
                                        <defs>
                                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                                                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <polygon
                                            points={`0,100 ${history.map((h, i) => `${i * 10},${100 - h.level}`).join(' ')} ${(history.length - 1) * 10},100`}
                                            fill="url(#chartGrad)"
                                        />
                                        <polyline
                                            points={history.map((h, i) => `${i * 10},${100 - h.level}`).join(' ')}
                                            fill="none" stroke="var(--primary)" strokeWidth="2"
                                        />
                                    </svg>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            <style>{`
        .batt-gauge-row { display: flex; gap: 2rem; align-items: center; flex-wrap: wrap; }
        .batt-gauge { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
        .batt-gauge__ring { position: relative; display: flex; align-items: center; justify-content: center; }
        .batt-gauge__center { position: absolute; display: flex; flex-direction: column; align-items: center; }
        .batt-gauge__pct { font-size: 2.5rem; font-weight: 800; font-family: var(--font-mono); line-height: 1; }
        .batt-gauge__label { font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0.25rem; }
        .batt-charging-badge {
          display: flex; align-items: center; gap: 0.35rem;
          background: rgba(34, 197, 94, 0.15); color: var(--success);
          padding: 0.25rem 0.75rem; border-radius: 999px;
          font-size: var(--text-xs); font-weight: 600;
        }
        .batt-history { margin-top: 0.5rem; }
        .batt-chart {
          width: 100%; height: 100px;
          background: var(--surface-1); border: 1px solid var(--border);
          border-radius: var(--radius-sm); overflow: hidden; padding: 0.5rem;
        }
        .batt-chart__svg { width: 100%; height: 100%; }
      `}</style>
        </section>
    );
}
