import { useState, useEffect, useCallback, useRef } from 'react';
import { getUserSafeError, isAbortError } from '../lib/userSafeErrors';
import { computeLayoutRects, type ScreenInfo } from '../lib/displayLayout';

interface MonitorDisplayState {
    screens: ScreenInfo[];
    loading: boolean;
    error: string | null;
    permissionDenied: boolean;
}

export default function MultiMonitorTester() {
    const [isSupported, setIsSupported] = useState(true);
    const [state, setState] = useState<MonitorDisplayState>({
        screens: [],
        loading: true,
        error: null,
        permissionDenied: false,
    });
    const screenDetailsRef = useRef<unknown>(null);

    const parseScreens = useCallback((screenDetails: unknown): ScreenInfo[] => {
        const details = screenDetails as { screens: Array<{
            label: string;
            width: number;
            height: number;
            left: number;
            top: number;
            devicePixelRatio: number;
            isPrimary: boolean;
        }> };
        return details.screens.map(s => ({
            label: s.label || 'Unknown Display',
            width: s.width,
            height: s.height,
            left: s.left,
            top: s.top,
            devicePixelRatio: s.devicePixelRatio,
            isPrimary: s.isPrimary,
        }));
    }, []);

    const requestScreenDetails = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true, error: null, permissionDenied: false }));
        try {
            const getScreenDetails = (window as unknown as { getScreenDetails?: () => Promise<unknown> }).getScreenDetails;
            if (!getScreenDetails) {
                setIsSupported(false);
                setState(prev => ({ ...prev, loading: false }));
                return;
            }
            const screenDetails = await getScreenDetails.call(window);
            screenDetailsRef.current = screenDetails;
            const screens = parseScreens(screenDetails);
            setState({
                screens,
                loading: false,
                error: null,
                permissionDenied: false,
            });
        } catch (err: unknown) {
            if (isAbortError(err)) return;
            // Check for permission denial
            if (err instanceof DOMException && err.name === 'NotAllowedError') {
                setState(prev => ({
                    ...prev,
                    loading: false,
                    permissionDenied: true,
                    error: null,
                }));
                return;
            }
            const safeError = getUserSafeError(err);
            setState(prev => ({
                ...prev,
                loading: false,
                error: `${safeError.message} ${safeError.detail}`,
            }));
        }
    }, [parseScreens]);

    useEffect(() => {
        const getScreenDetails = (window as unknown as { getScreenDetails?: () => Promise<unknown> }).getScreenDetails;
        if (!getScreenDetails) {
            setIsSupported(false);
            setState(prev => ({ ...prev, loading: false }));
            return;
        }
        requestScreenDetails();
    }, [requestScreenDetails]);

    // Listen for screenschange event
    useEffect(() => {
        const details = screenDetailsRef.current as { addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void } | null;
        if (!details || !details.addEventListener) return;

        const handleScreensChange = () => {
            const screens = parseScreens(screenDetailsRef.current);
            setState(prev => ({
                ...prev,
                screens,
            }));
        };

        details.addEventListener('screenschange', handleScreensChange);
        return () => {
            details.removeEventListener?.('screenschange', handleScreensChange);
        };
    }, [state.screens.length, parseScreens]);

    const layoutRects = computeLayoutRects(state.screens, 500, 300);

    return (
        <section aria-labelledby="multi-monitor-title">
            <header className="tester-panel__header">
                <h2 id="multi-monitor-title">Multi-Monitor</h2>
                <p>Detect and view information about all connected screens.</p>
            </header>
            <div className="tester-panel__body">
                {!isSupported ? (
                    <div className="status-display" style={{ color: 'var(--error)' }}>
                        Window Management API is not available in this browser.
                        <p>Try Chrome or Edge on desktop for full support.</p>
                    </div>
                ) : state.loading ? (
                    <div className="status-display">Requesting screen information...</div>
                ) : state.permissionDenied ? (
                    <div className="status-display" style={{ color: 'var(--error)' }}>
                        <p>Window management permission is required to detect connected screens.</p>
                        <p style={{ marginTop: '0.5rem' }}>
                            To grant permission: click the lock/site-settings icon in the address bar,
                            find "Window management" or "Window placement", and set it to "Allow".
                            Then refresh this page.
                        </p>
                    </div>
                ) : state.error ? (
                    <div className="status-display" style={{ color: 'var(--error)' }}>
                        {state.error}
                    </div>
                ) : (
                    <>
                        <h3 className="section-title">Connected Screens ({state.screens.length})</h3>
                        <div className="info-grid">
                            {state.screens.map((screen, idx) => (
                                <div key={idx} className="info-card">
                                    <h4>
                                        {screen.label}
                                        {screen.isPrimary && (
                                            <span
                                                style={{
                                                    marginLeft: '0.5rem',
                                                    fontSize: 'var(--text-xs)',
                                                    background: 'var(--primary)',
                                                    color: 'var(--bg)',
                                                    padding: '0.125rem 0.5rem',
                                                    borderRadius: '999px',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Primary
                                            </span>
                                        )}
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', fontSize: 'var(--text-sm)', marginTop: '0.5rem' }}>
                                        <span>Resolution:</span>
                                        <span>{screen.width} × {screen.height}</span>
                                        <span>Position:</span>
                                        <span>({screen.left}, {screen.top})</span>
                                        <span>Pixel Ratio:</span>
                                        <span>{screen.devicePixelRatio}x</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {state.screens.length > 0 && (
                            <>
                                <h3 className="section-title" style={{ marginTop: '1.5rem' }}>Layout Diagram</h3>
                                <div
                                    className="monitor-layout-diagram"
                                    style={{
                                        position: 'relative',
                                        width: '100%',
                                        maxWidth: '500px',
                                        height: '300px',
                                        background: 'var(--surface-1)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        overflow: 'hidden',
                                    }}
                                    aria-label="Visual layout diagram of connected screens"
                                >
                                    {layoutRects.map(rect => {
                                        const screen = state.screens[rect.index];
                                        return (
                                            <div
                                                key={rect.index}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${rect.left}px`,
                                                    top: `${rect.top}px`,
                                                    width: `${rect.width}px`,
                                                    height: `${rect.height}px`,
                                                    border: `2px solid ${screen.isPrimary ? 'var(--primary)' : 'var(--border)'}`,
                                                    borderRadius: 'var(--radius-sm)',
                                                    background: screen.isPrimary
                                                        ? 'rgba(99, 102, 241, 0.1)'
                                                        : 'rgba(148, 163, 184, 0.08)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 'var(--text-xs)',
                                                    color: 'var(--text-muted)',
                                                    overflow: 'hidden',
                                                    padding: '0.25rem',
                                                    textAlign: 'center',
                                                }}
                                                title={`${screen.label} - ${screen.width}×${screen.height}`}
                                            >
                                                <span style={{ fontWeight: 600, fontSize: '0.65rem' }}>
                                                    {screen.label || `Screen ${rect.index + 1}`}
                                                </span>
                                                <span style={{ fontSize: '0.6rem' }}>
                                                    {screen.width}×{screen.height}
                                                </span>
                                                {screen.isPrimary && (
                                                    <span style={{ fontSize: '0.55rem', color: 'var(--primary)', fontWeight: 700 }}>
                                                        Primary
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
