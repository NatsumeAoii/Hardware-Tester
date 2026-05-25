import { useState, useEffect, useRef, useCallback } from 'react';
import { formatHhMmSs } from '../lib/formatters';
import { getUserSafeError, isAbortError } from '../lib/userSafeErrors';

type WakeLockStatus = 'inactive' | 'active' | 'released';

export default function WakeLockTester() {
    const [isSupported] = useState(() => 'wakeLock' in navigator);
    const [status, setStatus] = useState<WakeLockStatus>('inactive');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [releaseReason, setReleaseReason] = useState<string | null>(null);
    const [canReacquire, setCanReacquire] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sentinelRef = useRef<WakeLockSentinel | null>(null);
    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const wasVisibilityReleaseRef = useRef(false);

    const stopTimer = useCallback(() => {
        if (timerRef.current !== null) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const startTimer = useCallback(() => {
        stopTimer();
        startTimeRef.current = Date.now();
        setElapsedSeconds(0);
        timerRef.current = window.setInterval(() => {
            if (startTimeRef.current !== null) {
                const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                setElapsedSeconds(elapsed);
            }
        }, 1000);
    }, [stopTimer]);

    const handleRelease = useCallback(() => {
        stopTimer();
        sentinelRef.current = null;

        if (document.visibilityState === 'hidden') {
            setStatus('released');
            setReleaseReason('tab hidden');
            wasVisibilityReleaseRef.current = true;
        } else {
            setStatus('released');
            setReleaseReason('system released');
            wasVisibilityReleaseRef.current = false;
        }
    }, [stopTimer]);

    const activate = useCallback(async () => {
        if (!isSupported) return;
        setError(null);
        setCanReacquire(false);
        setReleaseReason(null);

        try {
            const sentinel = await navigator.wakeLock.request('screen');
            sentinelRef.current = sentinel;
            setStatus('active');
            startTimer();

            sentinel.addEventListener('release', handleRelease);
        } catch (err: unknown) {
            if (isAbortError(err)) return;
            const safeError = getUserSafeError(err);
            setError(`${safeError.message} ${safeError.detail}`);
            setStatus('inactive');
        }
    }, [isSupported, startTimer, handleRelease]);

    const deactivate = useCallback(async () => {
        if (sentinelRef.current) {
            try {
                await sentinelRef.current.release();
            } catch {
                // Already released
            }
            sentinelRef.current = null;
        }
        stopTimer();
        setStatus('inactive');
        setReleaseReason(null);
        setCanReacquire(false);
    }, [stopTimer]);

    // Handle visibility change for re-acquire
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && wasVisibilityReleaseRef.current) {
                setCanReacquire(true);
                wasVisibilityReleaseRef.current = false;
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (sentinelRef.current) {
                sentinelRef.current.release().catch(() => {});
                sentinelRef.current = null;
            }
            if (timerRef.current !== null) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, []);

    const getStatusColor = () => {
        switch (status) {
            case 'active': return 'var(--success)';
            case 'released': return 'var(--warning)';
            default: return 'var(--text-muted)';
        }
    };

    const getStatusLabel = () => {
        switch (status) {
            case 'active': return 'Active';
            case 'released': return 'Released';
            default: return 'Inactive';
        }
    };

    return (
        <section aria-labelledby="wake-lock-title">
            <header className="tester-panel__header">
                <h2 id="wake-lock-title">Wake Lock</h2>
                <p>
                    Test screen wake lock capability to prevent the screen from dimming or locking.
                    {!isSupported && (
                        <strong style={{ color: 'var(--error)' }}> Wake Lock API is not available in this browser. Try Chrome or Edge.</strong>
                    )}
                </p>
            </header>
            <div className="tester-panel__body">
                {!isSupported ? (
                    <div className="status-display" style={{ color: 'var(--error)' }}>
                        Wake Lock API is not available in this browser.
                    </div>
                ) : (
                    <>
                        <div className="wl-status-row">
                            <div className="wl-status-indicator">
                                <div className="wl-status-dot" style={{ background: getStatusColor() }} />
                                <span className="wl-status-label" style={{ color: getStatusColor() }}>
                                    {getStatusLabel()}
                                </span>
                            </div>
                            <div className="wl-timer" aria-live="polite" aria-atomic="true">
                                {formatHhMmSs(elapsedSeconds)}
                            </div>
                        </div>

                        {releaseReason && (
                            <div className="wl-release-reason">
                                Release reason: <strong>{releaseReason}</strong>
                            </div>
                        )}

                        {error && (
                            <div className="wl-error" role="alert">
                                {error}
                            </div>
                        )}

                        <div className="controls-bar">
                            {status !== 'active' && (
                                <button
                                    className="btn btn--primary"
                                    onClick={activate}
                                    disabled={!isSupported}
                                >
                                    {canReacquire ? 'Re-acquire Wake Lock' : 'Activate Wake Lock'}
                                </button>
                            )}
                            {status === 'active' && (
                                <button
                                    className="btn"
                                    onClick={deactivate}
                                >
                                    Deactivate Wake Lock
                                </button>
                            )}
                        </div>

                        {canReacquire && status === 'released' && (
                            <div className="wl-reacquire-hint">
                                The wake lock was released because the tab was hidden. You can re-acquire it now.
                            </div>
                        )}
                    </>
                )}
            </div>
            <style>{`
        .wl-status-row {
          display: flex; align-items: center; justify-content: space-between;
          background: var(--surface-1); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 1.25rem 1.5rem;
        }
        .wl-status-indicator { display: flex; align-items: center; gap: 0.75rem; }
        .wl-status-dot {
          width: 12px; height: 12px; border-radius: 50%;
          transition: background 0.3s ease;
        }
        .wl-status-label {
          font-size: 1.125rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.05em;
          transition: color 0.3s ease;
        }
        .wl-timer {
          font-family: var(--font-mono); font-size: 1.5rem; font-weight: 700;
          color: var(--text); letter-spacing: 0.05em;
        }
        .wl-release-reason {
          margin-top: 0.75rem; padding: 0.5rem 1rem;
          background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3);
          border-radius: var(--radius-sm); color: var(--warning);
          font-size: var(--text-sm);
        }
        .wl-error {
          margin-top: 0.75rem; padding: 0.5rem 1rem;
          background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-sm); color: var(--error);
          font-size: var(--text-sm);
        }
        .wl-reacquire-hint {
          margin-top: 0.5rem; font-size: var(--text-sm); color: var(--text-muted);
          font-style: italic;
        }
      `}</style>
        </section>
    );
}
