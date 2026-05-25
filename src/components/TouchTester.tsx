import { useState, useRef, useCallback, useEffect } from 'react';

interface TouchPoint {
    id: number;
    x: number;
    y: number;
    force: number;
    radiusX: number;
    radiusY: number;
}

type TouchWithMetrics = React.Touch & {
    force?: number;
    radiusX?: number;
    radiusY?: number;
};

export default function TouchTester() {
    const [points, setPoints] = useState<TouchPoint[]>([]);
    const [maxTouches, setMaxTouches] = useState(0);
    const [totalTaps, setTotalTaps] = useState(0);
    const [trails, setTrails] = useState<{ x: number; y: number; id: number }[]>([]);
    const areaRef = useRef<HTMLDivElement>(null);

    const getRelativePoint = useCallback((touch: TouchWithMetrics): TouchPoint | null => {
        const area = areaRef.current;
        if (!area) return null;

        const rect = area.getBoundingClientRect();
        return {
            id: touch.identifier,
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
            force: touch.force || 0,
            radiusX: touch.radiusX || 0,
            radiusY: touch.radiusY || 0,
        };
    }, []);

    const getRelativePoints = useCallback((touches: React.TouchList) => {
        const points: TouchPoint[] = [];
        for (let index = 0; index < touches.length; index++) {
            const point = getRelativePoint(touches.item(index));
            if (point) points.push(point);
        }
        return points;
    }, [getRelativePoint]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        const pts = getRelativePoints(e.touches);
        setPoints(pts);
        setMaxTouches(prev => Math.max(prev, pts.length));
        setTotalTaps(prev => prev + (e.changedTouches.length));
    }, [getRelativePoints]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        const pts = getRelativePoints(e.touches);
        setPoints(pts);
        setTrails(prev => {
            const next = [...prev];
            for (const p of pts) next.push({ x: p.x, y: p.y, id: p.id });
            return next.slice(-500);
        });
    }, [getRelativePoints]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        const pts = getRelativePoints(e.touches);
        setPoints(pts);
    }, [getRelativePoints]);

    const clearTrails = useCallback(() => { setTrails([]); setTotalTaps(0); setMaxTouches(0); }, []);

    useEffect(() => {
        const el = areaRef.current;
        if (!el) return;
        const block = (e: TouchEvent) => e.preventDefault();
        el.addEventListener('touchmove', block, { passive: false });
        return () => el.removeEventListener('touchmove', block);
    }, []);

    const colorForId = (id: number) => {
        const hues = [210, 260, 150, 30, 350, 180, 50, 300, 100, 0];
        return `hsl(${hues[id % hues.length]}, 80%, 60%)`;
    };

    return (
        <section aria-labelledby="touch-title">
            <header className="tester-panel__header">
                <h2 id="touch-title">Touch &amp; Pen</h2>
                <p>Touch the area below with multiple fingers. Supports pressure, radius, and multi-touch tracking.</p>
            </header>
            <div className="tester-panel__body">
                <div className="info-grid info-grid--2-col">
                    <div className="info-card"><h4>Active Touches</h4><p>{points.length}</p></div>
                    <div className="info-card"><h4>Max Simultaneous</h4><p>{maxTouches}</p></div>
                    <div className="info-card"><h4>Total Taps</h4><p>{totalTaps}</p></div>
                    <div className="info-card">
                        <h4>Pressure</h4>
                        <p>{points.length > 0 ? points.map(p => p.force.toFixed(2)).join(', ') : '—'}</p>
                    </div>
                </div>
                <div className="controls-bar">
                    <button className="btn" onClick={clearTrails}>Clear Trails</button>
                    <span className="status-inline">
                        {points.length > 0 ? `${points.length} point${points.length > 1 ? 's' : ''} active` : 'Touch the area below'}
                    </span>
                </div>
                <div
                    className="touch-area"
                    ref={areaRef}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                >
                    <svg className="touch-svg" viewBox={`0 0 ${areaRef.current?.clientWidth || 600} ${areaRef.current?.clientHeight || 400}`} preserveAspectRatio="none">
                        {trails.map((t, i) => (
                            <circle key={i} cx={t.x} cy={t.y} r="3" fill={colorForId(t.id)} opacity="0.3" />
                        ))}
                    </svg>
                    {points.map(p => (
                        <div
                            key={p.id}
                            className="touch-point"
                            style={{
                                left: p.x, top: p.y,
                                width: Math.max(40, p.radiusX * 2),
                                height: Math.max(40, p.radiusY * 2),
                                borderColor: colorForId(p.id),
                                boxShadow: `0 0 20px ${colorForId(p.id)}`,
                            }}
                        >
                            <span className="touch-point__id">{p.id}</span>
                        </div>
                    ))}
                    {points.length === 0 && (
                        <div className="touch-placeholder">
                            <span>Touch here to start</span>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
        .touch-area {
          position: relative; width: 100%; min-height: 350px; touch-action: none;
          background: linear-gradient(135deg, var(--surface-1), var(--surface-2));
          border: 2px dashed var(--border); border-radius: var(--radius);
          overflow: hidden; cursor: crosshair; user-select: none;
        }
        .touch-svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
        .touch-point {
          position: absolute; border: 2px solid; border-radius: 50%;
          transform: translate(-50%, -50%); pointer-events: none;
          display: flex; align-items: center; justify-content: center;
          animation: fadeSlideIn 0.15s ease-out;
        }
        .touch-point__id { font-size: 0.6875rem; font-weight: 700; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.6); }
        .touch-placeholder { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: var(--text-sm); opacity: 0.5; }
        .status-inline { color: var(--text-muted); font-size: var(--text-sm); font-family: var(--font-mono); }
      `}</style>
        </section>
    );
}
