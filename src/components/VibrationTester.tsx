import { useState, useCallback, useEffect, useRef } from 'react';
import { canVibrate, vibrateDevice } from '../lib/browserAdapters';
import { clearTimeoutIfSet } from '../lib/lifecycle';

interface PatternDef {
    name: string;
    desc: string;
    pattern: number[];
}

const patterns: PatternDef[] = [
    { name: 'Single Pulse', desc: 'One short vibration', pattern: [200] },
    { name: 'Double Tap', desc: 'Two quick pulses', pattern: [100, 80, 100] },
    { name: 'Triple Tap', desc: 'Three rapid pulses', pattern: [80, 60, 80, 60, 80] },
    { name: 'Long Buzz', desc: 'Sustained vibration', pattern: [1000] },
    { name: 'SOS', desc: 'Morse code SOS', pattern: [100, 50, 100, 50, 100, 200, 300, 50, 300, 50, 300, 200, 100, 50, 100, 50, 100] },
    { name: 'Heartbeat', desc: 'Realistic heartbeat', pattern: [100, 100, 200, 600] },
    { name: 'Notification', desc: 'Like a phone ping', pattern: [50, 100, 50] },
    { name: 'Alarm', desc: 'Urgent repeated pulse', pattern: [200, 100, 200, 100, 200, 100, 200] },
    { name: 'Ramp Up', desc: 'Increasing duration', pattern: [50, 50, 100, 50, 200, 50, 400] },
    { name: 'Machine Gun', desc: 'Rapid-fire pulses', pattern: [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30] },
];

export default function VibrationTester() {
    const [activePattern, setActivePattern] = useState<string | null>(null);
    const [isSupported] = useState(() => canVibrate());
    const [customMs, setCustomMs] = useState(300);
    const [log, setLog] = useState<string[]>([]);
    const clearPatternRef = useRef<number | null>(null);

    const scheduleClearActive = useCallback((delay: number) => {
        if (clearPatternRef.current !== null) {
            clearTimeoutIfSet(clearPatternRef.current);
        }
        clearPatternRef.current = window.setTimeout(() => {
            setActivePattern(null);
            clearPatternRef.current = null;
        }, delay);
    }, []);

    const playPattern = useCallback((p: PatternDef) => {
        if (!isSupported) return;
        vibrateDevice(0);
        if (!vibrateDevice(p.pattern)) return;
        setActivePattern(p.name);
        setLog(prev => [`${p.name} — ${new Date().toLocaleTimeString()}`, ...prev].slice(0, 30));
        const totalDuration = p.pattern.reduce((a, b) => a + b, 0);
        scheduleClearActive(totalDuration + 100);
    }, [isSupported, scheduleClearActive]);

    const playCustom = useCallback(() => {
        if (!isSupported) return;
        vibrateDevice(0);
        if (!vibrateDevice(customMs)) return;
        setActivePattern('Custom');
        setLog(prev => [`Custom ${customMs}ms — ${new Date().toLocaleTimeString()}`, ...prev].slice(0, 30));
        scheduleClearActive(customMs + 100);
    }, [isSupported, customMs, scheduleClearActive]);

    const stopVibration = useCallback(() => {
        if (!isSupported) return;
        if (clearPatternRef.current !== null) {
            clearTimeoutIfSet(clearPatternRef.current);
            clearPatternRef.current = null;
        }
        vibrateDevice(0);
        setActivePattern(null);
    }, [isSupported]);

    useEffect(() => {
        return () => {
            if (clearPatternRef.current !== null) {
                clearTimeoutIfSet(clearPatternRef.current);
            }
            if (isSupported) vibrateDevice(0);
        };
    }, [isSupported]);

    return (
        <section aria-labelledby="vibration-title">
            <header className="tester-panel__header">
                <h2 id="vibration-title">Vibration Engine</h2>
                <p>
                    Test your device's haptic motor with preset patterns.
                    {!isSupported && <strong style={{ color: 'var(--error)' }}> Vibration API not supported on this device/browser.</strong>}
                </p>
            </header>
            <div className="tester-panel__body">
                <div className="controls-bar">
                    <button className="btn" onClick={stopVibration} disabled={!activePattern}>Stop All</button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label htmlFor="custom-ms" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Custom:</label>
                        <input
                            type="range"
                            id="custom-ms"
                            className="slider"
                            min="50"
                            max="2000"
                            step="50"
                            value={customMs}
                            onChange={(e) => {
                                const next = Number(e.target.value);
                                setCustomMs(Number.isFinite(next) ? Math.min(2000, Math.max(50, next)) : 300);
                            }}
                            style={{ width: '120px' }}
                        />
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontSize: 'var(--text-sm)', minWidth: '55px' }}>{customMs}ms</span>
                        <button className="btn btn--primary" onClick={playCustom} disabled={!isSupported}>Play</button>
                    </div>
                </div>
                <div className="vib-patterns">
                    {patterns.map(p => (
                        <button
                            type="button"
                            key={p.name}
                            className={`vib-card ${activePattern === p.name ? 'active' : ''}`}
                            aria-pressed={activePattern === p.name}
                            onClick={() => playPattern(p)}
                            disabled={!isSupported}
                        >
                            <div className="vib-card__vis">
                                {p.pattern.map((ms, i) => (
                                    <div key={i} className={`vib-bar ${i % 2 === 0 ? 'on' : 'off'}`} style={{ width: `${Math.max(3, ms / 15)}px` }} />
                                ))}
                            </div>
                            <h3>{p.name}</h3>
                            <p>{p.desc}</p>
                            <span className="vib-card__duration">{p.pattern.reduce((a, b) => a + b, 0)}ms</span>
                        </button>
                    ))}
                </div>
                {log.length > 0 && (
                    <div className="vib-log">
                        <h4>Play Log</h4>
                        <div className="vib-log__entries">
                            {log.map((entry, i) => <span key={i}>{entry}</span>)}
                        </div>
                    </div>
                )}
            </div>
            <style>{`
        .vib-patterns { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.75rem; }
        .vib-card {
          background: linear-gradient(135deg, var(--surface-2), var(--surface-1));
          border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem;
          cursor: pointer; text-align: left; transition: all var(--transition);
          display: flex; flex-direction: column; gap: 0.35rem; font-family: var(--font);
          color: var(--text); position: relative; overflow: hidden;
        }
        .vib-card:disabled { opacity: 0.4; cursor: not-allowed; }
        .vib-card:not(:disabled):hover { border-color: rgba(59,130,246,0.3); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
        .vib-card.active { border-color: var(--primary); background: var(--primary-glow); animation: vibPulse 0.3s ease; }
        .vib-card__vis { display: flex; align-items: flex-end; gap: 1px; height: 20px; margin-bottom: 0.25rem; }
        .vib-bar { height: 100%; border-radius: 1px; min-width: 2px; }
        .vib-bar.on { background: var(--primary); }
        .vib-bar.off { background: transparent; }
        .vib-card h3 { font-size: var(--text-sm); font-weight: 600; }
        .vib-card p { font-size: var(--text-xs); color: var(--text-muted); line-height: 1.4; }
        .vib-card__duration { font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); opacity: 0.6; }
        @keyframes vibPulse { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } }
        .vib-log { background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem; }
        .vib-log h4 { color: var(--text-muted); font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.5rem; }
        .vib-log__entries { display: flex; flex-wrap: wrap; gap: 0.4rem; max-height: 100px; overflow-y: auto; }
        .vib-log__entries span { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); background: var(--surface-3); padding: 0.2rem 0.5rem; border-radius: 4px; }
        .status-inline { color: var(--text-muted); font-size: var(--text-sm); font-family: var(--font-mono); }
      `}</style>
        </section>
    );
}
