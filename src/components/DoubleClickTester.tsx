import { useState, useRef, useCallback, useEffect } from 'react';
import { clearTimeoutIfSet } from '../lib/lifecycle';

interface ClickPoint {
    clientX: number;
    clientY: number;
}

export default function DoubleClickTester() {
    const [totalClicks, setTotalClicks] = useState(0);
    const [doubleClickCount, setDoubleClickCount] = useState(0);
    const [avgInterval, setAvgInterval] = useState(0);
    const [lastInterval, setLastInterval] = useState<number | null>(null);
    const [isDouble, setIsDouble] = useState(false);
    const [clicksLog, setClicksLog] = useState<string[]>([]);

    const clickAreaRef = useRef<HTMLDivElement>(null);
    const lastClickTimeRef = useRef(0);
    const intervalsRef = useRef<number[]>([]);
    const indicatorTimeoutsRef = useRef<number[]>([]);

    const [threshold, setThreshold] = useState(250);
    const logLimit = 50;

    const recordClick = useCallback(({ clientX, clientY }: ClickPoint) => {
        setTotalClicks(prev => prev + 1);
        const now = performance.now();
        const lastTime = lastClickTimeRef.current;

        if (lastTime > 0) {
            const diff = Math.round(now - lastTime);
            intervalsRef.current.push(diff);
            const avg = Math.round(intervalsRef.current.reduce((a, b) => a + b, 0) / intervalsRef.current.length);
            setAvgInterval(avg);
            setLastInterval(diff);

            if (diff < threshold) {
                setDoubleClickCount(prev => prev + 1);
                setIsDouble(true);
            } else {
                setIsDouble(false);
            }
        } else {
            setLastInterval(null);
            setIsDouble(false);
        }
        lastClickTimeRef.current = now;

        if (clickAreaRef.current) {
            const rect = clickAreaRef.current.getBoundingClientRect();
            const x = Math.round(clientX - rect.left);
            const y = Math.round(clientY - rect.top);
            setClicksLog(prev => [`(${x}, ${y})`, ...prev].slice(0, logLimit));

            const indicator = document.createElement('div');
            indicator.className = 'click-indicator';
            indicator.style.left = `${x}px`;
            indicator.style.top = `${y}px`;
            clickAreaRef.current.appendChild(indicator);
            const timeoutId = window.setTimeout(() => {
                indicator.remove();
                indicatorTimeoutsRef.current = indicatorTimeoutsRef.current.filter(id => id !== timeoutId);
            }, 600);
            indicatorTimeoutsRef.current.push(timeoutId);
        }
    }, [threshold]);

    const handleClick = useCallback((event: React.MouseEvent) => {
        recordClick({ clientX: event.clientX, clientY: event.clientY });
    }, [recordClick]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (clickAreaRef.current) {
                const rect = clickAreaRef.current.getBoundingClientRect();
                recordClick({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
            }
        }
    }, [recordClick]);

    const reset = useCallback(() => {
        lastClickTimeRef.current = 0;
        setTotalClicks(0);
        setDoubleClickCount(0);
        setAvgInterval(0);
        setLastInterval(null);
        setIsDouble(false);
        intervalsRef.current = [];
        setClicksLog([]);
        indicatorTimeoutsRef.current.forEach(clearTimeoutIfSet);
        indicatorTimeoutsRef.current = [];
        clickAreaRef.current?.querySelectorAll('.click-indicator').forEach(indicator => indicator.remove());
    }, []);

    useEffect(() => {
        return () => {
            indicatorTimeoutsRef.current.forEach(clearTimeoutIfSet);
        };
    }, []);

    return (
        <section aria-labelledby="dc-title">
            <header className="tester-panel__header">
                <h2 id="dc-title">Double Click Tester</h2>
                <p>Click rapidly inside the box. Double click detected when two clicks occur within {threshold}ms.</p>
            </header>
            <div className="tester-panel__body">
                <div className="dc-layout">
                    <div
                        className="click-area"
                        ref={clickAreaRef}
                        tabIndex={0}
                        role="button"
                        aria-label="Double click test area"
                        onClick={handleClick}
                        onKeyDown={handleKeyDown}
                    >
                        <span>Click Here</span>
                    </div>
                    <div className="dc-sidebar">
                        <div className={`status-display ${isDouble ? 'status--error' : lastInterval !== null ? 'status--ok' : ''}`} role="status" aria-live="polite">
                            {lastInterval !== null ? (
                                <>{lastInterval}ms — {isDouble ? <strong style={{ color: 'var(--error)' }}>DOUBLE CLICK!</strong> : <strong style={{ color: 'var(--success)' }}>OK</strong>}</>
                            ) : 'Click to start test...'}
                        </div>
                        <div className="info-grid info-grid--2-col">
                            <div className="info-card"><h4>Clicks</h4><p>{totalClicks}</p></div>
                            <div className="info-card"><h4>Double Clicks</h4><p>{doubleClickCount}</p></div>
                            <div className="info-card"><h4>Avg Interval</h4><p>{avgInterval ? `${avgInterval}ms` : '—'}</p></div>
                            <div className="info-card"><h4>Last Interval</h4><p>{lastInterval !== null ? `${lastInterval}ms` : '—'}</p></div>
                        </div>
                        <div className="dc-threshold">
                            <label htmlFor="dc-thresh">Threshold <span style={{ color: 'var(--primary)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{threshold}ms</span></label>
                            <input type="range" id="dc-thresh" className="slider" value={threshold} min={50} max={500} step={10} onChange={e => setThreshold(parseInt(e.target.value))} />
                        </div>
                        <button className="btn dc-reset" onClick={reset}>Reset Stats</button>
                    </div>
                </div>
                {clicksLog.length > 0 && (
                    <div className="click-log-container">
                        <h4>Click Log</h4>
                        <div className="click-log">{clicksLog.map((log, i) => <span key={i}>{log}</span>)}</div>
                    </div>
                )}
            </div>
            <style>{`
        .dc-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; align-items: stretch; }
        .click-area {
          width: 100%; min-height: 280px;
          background: var(--surface-panel);
          border: 2px dashed var(--border); border-radius: var(--radius);
          display: flex; justify-content: center; align-items: center;
          font-size: 1.25rem; color: var(--text-muted); cursor: pointer;
          user-select: none; transition: all var(--transition); position: relative; overflow: hidden;
        }
        .click-area:hover, .click-area:focus-visible { border-color: var(--primary); color: var(--primary); }
        .click-indicator {
          position: absolute; width: 10px; height: 10px; border-radius: 50%;
          background-color: var(--primary); pointer-events: none;
          animation: pulse 0.6s ease-out forwards;
        }
        .dc-sidebar { display: flex; flex-direction: column; gap: 1rem; }
        .dc-threshold { display: flex; flex-direction: column; gap: 0.5rem; width: 100%; }
        .dc-reset { width: 100%; }
        .status--ok { border-color: rgba(34, 197, 94, 0.3); }
        .status--error { border-color: rgba(239, 68, 68, 0.3); }
        .click-log-container {
          background: var(--surface-panel);
          border-radius: var(--radius); padding: 1rem; border: 1px solid var(--border);
        }
        .click-log-container h4 { color: var(--text-muted); font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0; margin-bottom: 0.5rem; }
        .click-log {
          display: flex; flex-wrap: wrap; gap: 0.5rem; max-height: 120px; overflow-y: auto;
          font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted);
        }
        .click-log span { background: var(--surface-3); padding: 0.2rem 0.5rem; border-radius: 4px; }
        @media (max-width: 1200px) { .dc-layout { grid-template-columns: 1fr; } }
      `}</style>
        </section>
    );
}
