import { useState, useEffect, useRef, useCallback } from 'react';
import { clearTimeoutIfSet } from '../lib/lifecycle';

export default function MouseTester() {
    const [mouseX, setMouseX] = useState(0);
    const [mouseY, setMouseY] = useState(0);
    const [scrollDir, setScrollDir] = useState('None');
    const [btnLeft, setBtnLeft] = useState(false);
    const [btnMiddle, setBtnMiddle] = useState(false);
    const [btnRight, setBtnRight] = useState(false);

    const panelRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<number | null>(null);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (panelRef.current) {
            const rect = panelRef.current.getBoundingClientRect();
            setMouseX(Math.round(e.clientX - rect.left));
            setMouseY(Math.round(e.clientY - rect.top));
        }
    }, []);

    const setBtn = useCallback((button: number, active: boolean) => {
        if (button === 0) setBtnLeft(active);
        else if (button === 1) setBtnMiddle(active);
        else if (button === 2) setBtnRight(active);
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => setBtn(e.button, true), [setBtn]);
    const handleMouseUp = useCallback((e: React.MouseEvent) => setBtn(e.button, false), [setBtn]);
    const handleContextMenu = useCallback((e: React.MouseEvent) => { e.preventDefault(); setBtn(2, false); }, [setBtn]);
    const handleMouseLeave = useCallback(() => { setBtnLeft(false); setBtnMiddle(false); setBtnRight(false); }, []);

    useEffect(() => {
        const el = panelRef.current;
        if (!el) return;
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            setScrollDir(e.deltaY > 0 ? 'Down' : 'Up');
            clearTimeoutIfSet(scrollTimeoutRef.current);
            scrollTimeoutRef.current = window.setTimeout(() => setScrollDir('None'), 1000);
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            el.removeEventListener('wheel', handleWheel);
            clearTimeoutIfSet(scrollTimeoutRef.current);
        };
    }, []);

    return (
        <section aria-labelledby="mouse-title">
            <header className="tester-panel__header">
                <h2 id="mouse-title">Mouse Tester</h2>
                <p>Move your mouse, click buttons, and scroll inside the test area below.</p>
            </header>
            <div className="tester-panel__body">
                <div
                    className="mouse-test-area"
                    ref={panelRef}
                    onMouseMove={handleMouseMove}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onContextMenu={handleContextMenu}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="mouse-diagram">
                        <div className="mouse-body">
                            <div className={`mouse-btn-vis left ${btnLeft ? 'active' : ''}`}></div>
                            <div className={`mouse-btn-vis right ${btnRight ? 'active' : ''}`}></div>
                            <div className={`mouse-scroll-vis ${btnMiddle ? 'active' : ''} ${scrollDir !== 'None' ? 'scrolling' : ''}`}></div>
                        </div>
                    </div>
                </div>
                <div className="info-grid">
                    <div className="info-card"><h3>Position</h3><p>{mouseX} , {mouseY}</p></div>
                    <div className="info-card"><h3>Scroll</h3><p>{scrollDir}</p></div>
                    <div className="info-card"><h3>Left</h3><p className={btnLeft ? 'active-text' : ''}>{btnLeft ? 'Pressed' : 'Idle'}</p></div>
                    <div className="info-card"><h3>Middle</h3><p className={btnMiddle ? 'active-text' : ''}>{btnMiddle ? 'Pressed' : 'Idle'}</p></div>
                    <div className="info-card"><h3>Right</h3><p className={btnRight ? 'active-text' : ''}>{btnRight ? 'Pressed' : 'Idle'}</p></div>
                </div>
            </div>
            <style>{`
        .mouse-test-area {
          display: flex; justify-content: center; align-items: center;
          min-height: 240px; cursor: crosshair; user-select: none;
          background: var(--surface-panel);
          border-radius: var(--radius); border: 1px solid var(--border);
          transition: border-color var(--transition);
        }
        .mouse-test-area:hover { border-color: var(--surface-accent-border); }
        .mouse-diagram { display: flex; justify-content: center; align-items: center; }
        .mouse-body {
          width: 110px; height: 180px;
          background: linear-gradient(180deg, var(--surface-3), var(--surface-2));
          border-radius: 55px 55px 20px 20px;
          border: 2px solid var(--border); position: relative;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }
        .mouse-body::before {
          content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          width: 2px; height: 85px; background-color: var(--border);
        }
        .mouse-btn-vis {
          position: absolute; width: 50%; height: 85px;
          transition: all 0.1s ease;
        }
        .mouse-btn-vis.left { left: 0; top: 0; border-radius: 55px 0 0 0; }
        .mouse-btn-vis.right { right: 0; top: 0; border-radius: 0 55px 0 0; }
        .mouse-btn-vis.active {
          background: var(--primary);
          box-shadow: inset 0 0 20px var(--primary-glow);
        }
        .mouse-scroll-vis {
          position: absolute; top: 35px; left: 50%; transform: translateX(-50%);
          width: 14px; height: 36px; background-color: var(--bg);
          border: 2px solid var(--border); border-radius: 7px;
          transition: all 0.15s ease;
        }
        .mouse-scroll-vis.active { background-color: var(--primary); border-color: var(--primary); }
        .mouse-scroll-vis.scrolling { background-color: var(--success); border-color: var(--success); box-shadow: 0 0 8px rgba(34, 197, 94, 0.4); }
        .active-text { color: var(--primary) !important; }
      `}</style>
        </section>
    );
}
