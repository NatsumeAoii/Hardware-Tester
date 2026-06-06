import { useState, useRef, useCallback, useEffect } from 'react';
import { exitDocumentFullscreen, requestElementFullscreen } from '../lib/browserAdapters';
import { cancelAnimationFrameIfSet } from '../lib/lifecycle';

type FixMode = 'flash-rgb' | 'flash-bw' | 'noise' | 'solid-cycle';

const modes: { id: FixMode; label: string; desc: string }[] = [
    { id: 'flash-rgb', label: 'RGB Flash', desc: 'Rapidly cycle red, green, blue to stimulate stuck sub-pixels' },
    { id: 'flash-bw', label: 'B/W Flash', desc: 'Alternate black and white at maximum contrast' },
    { id: 'noise', label: 'Random Noise', desc: 'Randomized pixel noise to exercise all sub-pixels' },
    { id: 'solid-cycle', label: 'Solid Cycle', desc: 'Cycle through solid colors with smooth transitions' },
];

const solidColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000'];

export default function BurnInFixer() {
    const [isActive, setIsActive] = useState(false);
    const [selectedMode, setSelectedMode] = useState<FixMode>('flash-rgb');
    const [speed, setSpeed] = useState(100);
    const [duration, setDuration] = useState(60);
    const [elapsed, setElapsed] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const activeRef = useRef(false);
    const overlayRef = useRef<HTMLDivElement>(null);

    const startFix = useCallback(() => {
        const overlay = overlayRef.current;
        if (!overlay) return;
        requestElementFullscreen(overlay).catch(() => { /* fullscreen is best-effort for the pixel fixer */ });
        activeRef.current = true;
        setIsActive(true);
        setElapsed(0);

        // Resize the noise canvas to cover the screen for effective pixel stimulation
        const canvas = canvasRef.current;
        if (canvas) {
            const displayWidth = Math.min(window.screen.width, 1920);
            const displayHeight = Math.min(window.screen.height, 1080);
            canvas.width = displayWidth;
            canvas.height = displayHeight;
        }

        let frameCount = 0;
        let lastSwitch = 0;
        let colorIdx = 0;
        const startTime = performance.now();

        const ctx = canvas?.getContext('2d');

        const render = (now: number) => {
            if (!activeRef.current) return;

            const sec = Math.floor((now - startTime) / 1000);
            setElapsed(sec);
            if (duration > 0 && sec >= duration) { stopFix(); return; }

            if (now - lastSwitch < speed) {
                animRef.current = requestAnimationFrame(render);
                return;
            }
            lastSwitch = now;

            if ((selectedMode === 'flash-rgb' || selectedMode === 'flash-bw' || selectedMode === 'solid-cycle') && overlay) {
                if (selectedMode === 'flash-rgb') {
                    const colors = ['#ff0000', '#00ff00', '#0000ff'];
                    overlay.style.backgroundColor = colors[frameCount % 3];
                } else if (selectedMode === 'flash-bw') {
                    overlay.style.backgroundColor = frameCount % 2 === 0 ? '#ffffff' : '#000000';
                } else {
                    overlay.style.backgroundColor = solidColors[colorIdx % solidColors.length];
                    colorIdx++;
                }
            }

            if (selectedMode === 'noise' && canvas && ctx) {
                const w = canvas.width;
                const h = canvas.height;
                const imageData = ctx.createImageData(w, h);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = (Math.random() * 256) | 0;
                    data[i + 1] = (Math.random() * 256) | 0;
                    data[i + 2] = (Math.random() * 256) | 0;
                    data[i + 3] = 255;
                }
                ctx.putImageData(imageData, 0, 0);
            }

            frameCount++;
            animRef.current = requestAnimationFrame(render);
        };

        animRef.current = requestAnimationFrame(render);
    }, [selectedMode, speed, duration]);

    const stopFix = useCallback(() => {
        activeRef.current = false;
        cancelAnimationFrameIfSet(animRef.current);
        setIsActive(false);
        const exit = exitDocumentFullscreen();
        if (exit) exit.catch(() => { /* fullscreen exit can be rejected after manual escape */ });
    }, []);

    useEffect(() => {
        const handleEsc = () => {
            if (!document.fullscreenElement && activeRef.current) stopFix();
        };
        document.addEventListener('fullscreenchange', handleEsc);
        return () => {
            document.removeEventListener('fullscreenchange', handleEsc);
            activeRef.current = false;
            cancelAnimationFrameIfSet(animRef.current);
        };
    }, [stopFix]);

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <section aria-labelledby="burnin-title">
            <header className="tester-panel__header">
                <h2 id="burnin-title">Burn-in / Stuck Pixel Fixer</h2>
                <p>Rapidly flash colors or noise on your screen to attempt unsticking dead/stuck pixels. Run for 10–30 minutes for best results.</p>
            </header>
            <div className="tester-panel__body">
                <div className="bi-warning">
                    <strong>Warning:</strong> This tool uses rapid flashing colors. Do not use if you have photosensitive epilepsy.
                </div>

                <h3 className="section-title">Fix Mode</h3>
                <div className="bi-modes">
                    {modes.map(m => (
                        <button
                            type="button"
                            key={m.id}
                            className={`bi-mode ${selectedMode === m.id ? 'active' : ''}`}
                            aria-pressed={selectedMode === m.id}
                            onClick={() => setSelectedMode(m.id)}
                            disabled={isActive}
                        >
                            <h4>{m.label}</h4>
                            <p>{m.desc}</p>
                        </button>
                    ))}
                </div>

                <div className="bi-controls">
                    <div className="bi-control">
                        <label>Speed: <strong>{speed}ms</strong></label>
                        <input type="range" className="slider" min="16" max="500" step="1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} disabled={isActive} />
                    </div>
                    <div className="bi-control">
                        <label>Duration: <strong>{duration === 0 ? 'Unlimited' : `${duration}s`}</strong></label>
                        <input type="range" className="slider" min="0" max="1800" step="30" value={duration} onChange={(e) => setDuration(Number(e.target.value))} disabled={isActive} />
                    </div>
                </div>

                <div className="controls-bar">
                    {!isActive ? (
                        <button className="btn btn--primary" onClick={startFix}>Start Fix (Fullscreen)</button>
                    ) : (
                        <>
                            <button className="btn" onClick={stopFix}>Stop</button>
                            <span className="status-inline">Running: {formatTime(elapsed)} / {duration > 0 ? formatTime(duration) : '∞'}</span>
                        </>
                    )}
                </div>
            </div>

            <div ref={overlayRef} className="bi-overlay" style={{ display: isActive ? 'flex' : 'none' }}>
                <canvas ref={canvasRef} width={320} height={240} className="bi-canvas" style={{ display: selectedMode === 'noise' ? 'block' : 'none' }} />
                <button className="bi-overlay__stop" onClick={stopFix}>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 6h12v12H6z" /></svg>
                    Stop ({formatTime(elapsed)})
                </button>
            </div>

            <style>{`
        .bi-warning {
          background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius); padding: 0.75rem 1rem; color: var(--text);
          font-size: var(--text-sm); margin-bottom: 1rem;
        }
        .bi-modes { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem; }
        .bi-mode {
          background: var(--surface-1); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 1rem; text-align: left;
          cursor: pointer; transition: all var(--transition); color: var(--text);
          font-family: var(--font);
        }
        .bi-mode:disabled { opacity: 0.5; cursor: not-allowed; }
        .bi-mode:not(:disabled):hover { border-color: rgba(59,130,246,0.3); }
        .bi-mode.active { border-color: var(--primary); background: var(--primary-glow); }
        .bi-mode h4 { font-size: var(--text-sm); font-weight: 600; margin-bottom: 0.25rem; }
        .bi-mode p { font-size: var(--text-xs); color: var(--text-muted); line-height: 1.4; }
        .bi-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
        .bi-control label { display: block; font-size: var(--text-sm); color: var(--text-muted); margin-bottom: 0.5rem; }
        .bi-control strong { color: var(--primary); font-family: var(--font-mono); }
        .bi-overlay {
          position: fixed; inset: 0; z-index: 10000;
          background: #000; align-items: center; justify-content: center;
        }
        .bi-canvas { width: 100vw; height: 100vh; object-fit: cover; image-rendering: pixelated; }
        .bi-overlay__stop {
          position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
          background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.2); border-radius: 999px;
          padding: 0.75rem 2rem; color: white; cursor: pointer;
          display: flex; align-items: center; gap: 0.5rem;
          font-family: var(--font); font-size: var(--text-sm);
          transition: all var(--transition); z-index: 10001;
        }
        .bi-overlay__stop:hover { background: rgba(239,68,68,0.6); }
        .status-inline { color: var(--text-muted); font-size: var(--text-sm); font-family: var(--font-mono); }
        @media (max-width: 600px) { .bi-controls { grid-template-columns: 1fr; } }
      `}</style>
        </section>
    );
}
