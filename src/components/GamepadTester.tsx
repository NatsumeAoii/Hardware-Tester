import { useState, useEffect, useRef, useCallback } from 'react';
import { cancelAnimationFrameIfSet, clearTimeoutIfSet } from '../lib/lifecycle';

interface GamepadState {
    index: number;
    id: string;
    axes: number[];
    buttons: { pressed: boolean; value: number }[];
    timestamp: number;
}

type RumbleActuator = {
    playEffect?: (type: 'dual-rumble', options: {
        startDelay: number;
        duration: number;
        weakMagnitude: number;
        strongMagnitude: number;
    }) => Promise<unknown>;
};

export default function GamepadTester() {
    const [gamepads, setGamepads] = useState<GamepadState[]>([]);
    const [selectedPad, setSelectedPad] = useState(0);
    const [vibrating, setVibrating] = useState(false);
    const [isSupported] = useState(() => typeof navigator.getGamepads === 'function');
    const animRef = useRef<number>(0);
    const activeRef = useRef(true);
    const vibrationTimeoutRef = useRef<number | null>(null);

    const pollGamepads = useCallback(() => {
        if (!activeRef.current || !isSupported) return;
        const raw = navigator.getGamepads();
        const states: GamepadState[] = [];
        for (const gp of raw) {
            if (!gp) continue;
            states.push({
                index: gp.index,
                id: gp.id,
                axes: [...gp.axes],
                buttons: gp.buttons.map(b => ({ pressed: b.pressed, value: b.value })),
                timestamp: gp.timestamp,
            });
        }
        setGamepads(states);
        animRef.current = requestAnimationFrame(pollGamepads);
    }, [isSupported]);

    useEffect(() => {
        if (!isSupported) {
            activeRef.current = false;
            return;
        }

        activeRef.current = true;
        const onConnect = () => pollGamepads();
        window.addEventListener('gamepadconnected', onConnect);
        window.addEventListener('gamepaddisconnected', onConnect);
        animRef.current = requestAnimationFrame(pollGamepads);
        return () => {
            activeRef.current = false;
            cancelAnimationFrameIfSet(animRef.current);
            clearTimeoutIfSet(vibrationTimeoutRef.current);
            window.removeEventListener('gamepadconnected', onConnect);
            window.removeEventListener('gamepaddisconnected', onConnect);
        };
    }, [isSupported, pollGamepads]);

    const testVibration = useCallback(async () => {
        if (!isSupported) return;
        const gp = navigator.getGamepads()[selectedPad];
        const actuator = gp?.vibrationActuator as RumbleActuator | undefined;
        if (typeof actuator?.playEffect !== 'function') return;
        setVibrating(true);
        try {
            await actuator.playEffect('dual-rumble', {
                startDelay: 0, duration: 500, weakMagnitude: 0.5, strongMagnitude: 1.0,
            });
        } catch { /* not supported */ }
        if (vibrationTimeoutRef.current !== null) {
            clearTimeoutIfSet(vibrationTimeoutRef.current);
        }
        vibrationTimeoutRef.current = window.setTimeout(() => {
            vibrationTimeoutRef.current = null;
            if (!activeRef.current) return;
            setVibrating(false);
        }, 600);
    }, [isSupported, selectedPad]);

    const pad = gamepads.find(g => g.index === selectedPad) || null;

    const mapAxis = (val: number) => {
        const pct = ((val + 1) / 2) * 100;
        return Math.round(pct);
    };

    return (
        <section aria-labelledby="gamepad-title">
            <header className="tester-panel__header">
                <h2 id="gamepad-title">Gamepad Tester</h2>
                <p>Connect a controller (Xbox, PlayStation, generic) and press any button to activate it.</p>
            </header>
            <div className="tester-panel__body">
                {!isSupported ? (
                    <div className="status-display" style={{ color: 'var(--error)' }}>
                        Gamepad API is not available in this browser.
                    </div>
                ) : gamepads.length === 0 ? (
                    <div className="gp-empty">
                        <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
                            <path d="M6 12h4m4 0h4M14 8v8M10 8v8" strokeLinecap="round" />
                            <rect x="2" y="6" width="20" height="12" rx="4" />
                        </svg>
                        <p>No gamepad detected</p>
                        <span>Press a button on your controller to connect</span>
                    </div>
                ) : (
                    <>
                        <div className="controls-bar">
                            <select value={selectedPad} onChange={(e) => setSelectedPad(Number(e.target.value))}>
                                {gamepads.map(gp => (
                                    <option key={gp.index} value={gp.index}>
                                        #{gp.index}: {gp.id.slice(0, 40)}
                                    </option>
                                ))}
                            </select>
                            <button className="btn btn--primary" onClick={testVibration} disabled={vibrating}>
                                {vibrating ? 'Vibrating...' : 'Test Vibration'}
                            </button>
                        </div>

                        {pad && (
                            <>
                                <h3 className="section-title">Axes ({pad.axes.length})</h3>
                                <div className="gp-axes-grid">
                                    {pad.axes.map((val, i) => (
                                        <div key={i} className="gp-axis">
                                            <div className="gp-axis__label">Axis {i}</div>
                                            <div className="gp-axis__track">
                                                <div className="gp-axis__thumb" style={{ left: `${mapAxis(val)}%` }} />
                                                <div className="gp-axis__center" />
                                            </div>
                                            <div className="gp-axis__val">{val.toFixed(3)}</div>
                                        </div>
                                    ))}
                                </div>

                                {pad.axes.length >= 4 && (
                                    <div className="gp-sticks">
                                        {[0, 2].map(base => (
                                            <div key={base} className="gp-stick-container">
                                                <span className="gp-stick-label">{base === 0 ? 'Left Stick' : 'Right Stick'}</span>
                                                <div className="gp-stick-area">
                                                    <div className="gp-stick-crosshair" />
                                                    <div className="gp-stick-dot" style={{
                                                        left: `${mapAxis(pad.axes[base])}%`,
                                                        top: `${mapAxis(pad.axes[base + 1])}%`,
                                                    }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <h3 className="section-title">Buttons ({pad.buttons.length})</h3>
                                <div className="gp-buttons-grid">
                                    {pad.buttons.map((btn, i) => (
                                        <div key={i} className={`gp-btn ${btn.pressed ? 'pressed' : ''}`}>
                                            <span className="gp-btn__index">B{i}</span>
                                            <div className="gp-btn__bar">
                                                <div className="gp-btn__fill" style={{ height: `${btn.value * 100}%` }} />
                                            </div>
                                            <span className="gp-btn__val">{(btn.value * 100).toFixed(0)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
            <style>{`
        .gp-empty { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 4rem 2rem; color: var(--text-muted); text-align: center; }
        .gp-empty p { font-size: 1.25rem; font-weight: 600; }
        .gp-empty span { font-size: var(--text-sm); opacity: 0.6; }

        .gp-axes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; }
        .gp-axis { background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.75rem; }
        .gp-axis__label { font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.5rem; }
        .gp-axis__track { position: relative; height: 8px; background: var(--surface-3); border-radius: 4px; }
        .gp-axis__center { position: absolute; left: 50%; top: -2px; width: 2px; height: 12px; background: var(--text-muted); opacity: 0.3; transform: translateX(-50%); }
        .gp-axis__thumb { position: absolute; top: 50%; width: 14px; height: 14px; background: var(--primary); border-radius: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 8px var(--primary-glow); transition: left 16ms linear; }
        .gp-axis__val { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); text-align: right; margin-top: 0.35rem; }

        .gp-sticks { display: flex; gap: 1.5rem; justify-content: center; flex-wrap: wrap; }
        .gp-stick-container { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
        .gp-stick-label { font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .gp-stick-area {
          width: 140px; height: 140px; border-radius: 50%;
          background: var(--surface-1); border: 1px solid var(--border);
          position: relative; overflow: hidden;
        }
        .gp-stick-crosshair::before, .gp-stick-crosshair::after {
          content: ''; position: absolute; background: var(--border);
        }
        .gp-stick-crosshair::before { left: 50%; top: 0; width: 1px; height: 100%; transform: translateX(-50%); }
        .gp-stick-crosshair::after { top: 50%; left: 0; width: 100%; height: 1px; transform: translateY(-50%); }
        .gp-stick-dot {
          position: absolute; width: 16px; height: 16px; background: var(--primary);
          border-radius: 50%; transform: translate(-50%, -50%);
          box-shadow: 0 0 12px var(--primary-glow); transition: all 16ms linear;
        }

        .gp-buttons-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(65px, 1fr)); gap: 0.5rem; }
        .gp-btn {
          display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
          padding: 0.5rem; border-radius: var(--radius-sm);
          background: var(--surface-1); border: 1px solid var(--border);
          transition: all 0.08s ease;
        }
        .gp-btn.pressed { border-color: var(--primary); background: var(--primary-glow); }
        .gp-btn__index { font-size: var(--text-xs); font-weight: 600; color: var(--text-muted); }
        .gp-btn__bar { width: 24px; height: 32px; background: var(--surface-3); border-radius: 3px; overflow: hidden; display: flex; align-items: flex-end; }
        .gp-btn__fill { width: 100%; background: var(--primary); transition: height 16ms linear; border-radius: 3px; }
        .gp-btn__val { font-family: var(--font-mono); font-size: 0.625rem; color: var(--text-muted); }
      `}</style>
        </section>
    );
}
