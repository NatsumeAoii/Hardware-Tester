import { useState, useEffect, useRef, useCallback } from 'react';
import { exitDocumentFullscreen, requestElementFullscreen } from '../lib/browserAdapters';
import { cancelAnimationFrameIfSet } from '../lib/lifecycle';
import { formatUserSafeError } from '../lib/userSafeErrors';

const colors = [
    { name: 'Red', hex: '#ff0000', text: '#fff' }, { name: 'Green', hex: '#00ff00', text: '#000' },
    { name: 'Blue', hex: '#0000ff', text: '#fff' }, { name: 'White', hex: '#ffffff', text: '#000' },
    { name: 'Black', hex: '#000000', text: '#fff' }, { name: 'Yellow', hex: '#ffff00', text: '#000' },
    { name: 'Cyan', hex: '#00ffff', text: '#000' }, { name: 'Magenta', hex: '#ff00ff', text: '#fff' },
    { name: 'Gray', hex: '#808080', text: '#fff' },
];

export default function ScreenTester() {
    const [currentColorName, setCurrentColorName] = useState('');
    const [fullscreenError, setFullscreenError] = useState('');
    const [screenInfo, setScreenInfo] = useState<{ title: string; value: string }[]>([]);
    const overlayRef = useRef<HTMLDivElement>(null);
    const colorRef = useRef<HTMLDivElement>(null);

    const enterFullscreen = useCallback(async (hex: string, name: string) => {
        setFullscreenError('');
        const overlay = overlayRef.current;
        if (!overlay) return;
        if (colorRef.current) colorRef.current.style.backgroundColor = hex;
        overlay.style.display = 'flex';
        setCurrentColorName(name);
        document.documentElement.style.overflow = 'hidden';

        try {
            await requestElementFullscreen(overlay);
        } catch (err: unknown) {
            overlay.style.display = 'none';
            setCurrentColorName('');
            document.documentElement.style.overflow = '';
            setFullscreenError(formatUserSafeError(err, {
                stableCode: 'FULLSCREEN_START_FAILED',
                message: 'Fullscreen display test could not start.',
            }));
        }
    }, []);

    const exitFullscreen = useCallback(() => {
        const exit = exitDocumentFullscreen();
        if (exit) exit.catch(() => { /* fullscreen exit can be rejected after manual escape */ });
        document.documentElement.style.overflow = '';
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && overlayRef.current) {
                overlayRef.current.style.display = 'none';
                setCurrentColorName('');
                document.documentElement.style.overflow = '';
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        const basicInfo = [
            { title: 'Resolution', value: `${window.screen.width} × ${window.screen.height}` },
            { title: 'Color Depth', value: `${window.screen.colorDepth}-bit` },
            { title: 'Pixel Ratio', value: `${window.devicePixelRatio.toFixed(2)}x` },
            { title: 'Orientation', value: window.screen.orientation?.type.replace('-primary', '') || 'N/A' },
            { title: 'Available', value: `${window.screen.availWidth} × ${window.screen.availHeight}` },
            { title: 'Refresh Rate', value: 'Measuring...' },
        ];
        setScreenInfo(basicInfo);

        let cancelled = false;
        let last = 0;
        let frameId = 0;
        const times: number[] = [];
        const loop = (now: number) => {
            if (cancelled) return;
            if (last) {
                times.push(now - last);
                if (times.length > 60) {
                    const avg = times.reduce((a, b) => a + b, 0) / times.length;
                    const rate = Math.round(1000 / avg);
                    setScreenInfo(prev => prev.map(p => p.title === 'Refresh Rate' ? { ...p, value: `${rate} Hz` } : p));
                    return;
                }
            }
            last = now;
            frameId = requestAnimationFrame(loop);
        };
        frameId = requestAnimationFrame(loop);

        return () => {
            cancelled = true;
            cancelAnimationFrameIfSet(frameId);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            const exit = exitDocumentFullscreen();
            if (exit) exit.catch(() => { /* fullscreen exit can be rejected during unmount */ });
        };
    }, []);

    return (
        <section aria-labelledby="screen-title">
            <header className="tester-panel__header">
                <h2 id="screen-title">Screen & Display</h2>
                <p>Test for dead or stuck pixels with fullscreen colors. View your display specifications.</p>
            </header>
            <div className="tester-panel__body">
                <h3 className="section-title">Dead Pixel Test Patterns</h3>
                <div className="color-buttons" role="group" aria-label="Color Test Patterns">
                    {colors.map(color => (
                        <button
                            key={color.name}
                            className="color-btn"
                            style={{ backgroundColor: color.hex, color: color.text, borderColor: color.hex === '#000000' ? 'var(--border)' : color.hex }}
                            aria-label={`Test ${color.name} color`}
                            onClick={() => enterFullscreen(color.hex, color.name)}
                        >
                            {color.name}
                        </button>
                    ))}
                </div>
                {fullscreenError && <div className="screen-alert" role="alert">{fullscreenError}</div>}
                <h3 className="section-title">Display Information</h3>
                <div className="info-grid">
                    {screenInfo.map(item => (
                        <div key={item.title} className="info-card"><h4>{item.title}</h4><p>{item.value}</p></div>
                    ))}
                </div>
            </div>

            <div className="fullscreen-overlay" ref={overlayRef} role="dialog" aria-modal="true" onClick={exitFullscreen}>
                <div className="fullscreen-color" ref={colorRef}></div>
                <div className="fs-hint">
                    {currentColorName && <span className="fs-name">{currentColorName}</span>}
                    <span>Press ESC or click to exit</span>
                </div>
            </div>

            <style>{`
        .color-buttons { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.75rem; }
        .color-btn {
          height: 72px; border: 2px solid transparent; border-radius: var(--radius);
          cursor: pointer; font-weight: 700; font-size: var(--text-sm);
          text-shadow: 0 1px 3px rgba(0,0,0,0.5);
          transition: all var(--transition); font-family: var(--font);
        }
        .color-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .screen-alert {
          border: 1px solid rgba(239,68,68,0.35);
          background: rgba(239,68,68,0.08); color: var(--error);
          border-radius: var(--radius-sm); padding: 0.75rem 1rem;
          font-size: var(--text-sm);
        }
        .fullscreen-overlay {
          position: fixed; inset: 0; display: none; justify-content: center; align-items: flex-end;
          z-index: 9999; cursor: pointer;
        }
        .fullscreen-color { position: absolute; inset: 0; transition: background-color 0.3s ease; }
        .fs-hint {
          z-index: 1; margin-bottom: 2rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
          color: rgba(255,255,255,0.7); font-size: var(--text-sm);
        }
        .fs-name { font-size: 1.25rem; font-weight: 700; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
      `}</style>
        </section>
    );
}
