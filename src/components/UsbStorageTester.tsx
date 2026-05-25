import { useState, useEffect, useCallback } from 'react';
import { formatBytes } from '../lib/formatters';
import { getUserSafeError, isAbortError } from '../lib/userSafeErrors';

interface StorageDisplayState {
    quota: number;
    usage: number;
    loading: boolean;
    error: string | null;
}

function computePercentage(usage: number, quota: number): number {
    if (quota === 0) return 0;
    return Math.min(100, Math.max(0, Math.round((usage / quota) * 100)));
}

export default function UsbStorageTester() {
    const [isSupported, setIsSupported] = useState(true);
    const [state, setState] = useState<StorageDisplayState>({
        quota: 0,
        usage: 0,
        loading: true,
        error: null,
    });

    const queryStorage = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const estimate = await navigator.storage.estimate();
            setState({
                quota: estimate.quota ?? 0,
                usage: estimate.usage ?? 0,
                loading: false,
                error: null,
            });
        } catch (err: unknown) {
            if (isAbortError(err)) return;
            const safeError = getUserSafeError(err);
            setState(prev => ({
                ...prev,
                loading: false,
                error: `${safeError.message} ${safeError.detail}`,
            }));
        }
    }, []);

    useEffect(() => {
        if (!navigator.storage || !navigator.storage.estimate) {
            setIsSupported(false);
            setState(prev => ({ ...prev, loading: false }));
            return;
        }
        queryStorage();
    }, [queryStorage]);

    const percentage = computePercentage(state.usage, state.quota);

    return (
        <section aria-labelledby="usb-storage-title">
            <header className="tester-panel__header">
                <h2 id="usb-storage-title">USB/Storage</h2>
                <p>View storage capacity and usage information via the browser Storage API.</p>
            </header>
            <div className="tester-panel__body">
                {!isSupported ? (
                    <div className="status-display" style={{ color: 'var(--error)' }}>
                        Storage API is not available in this browser.
                        <p>Try Chrome or Edge for full support.</p>
                    </div>
                ) : state.loading ? (
                    <div className="status-display">Loading storage information...</div>
                ) : state.error ? (
                    <div className="status-display" style={{ color: 'var(--error)' }}>
                        {state.error}
                    </div>
                ) : (
                    <>
                        <div className="info-grid info-grid--2-col">
                            <div className="info-card">
                                <h4>Quota</h4>
                                <p>{formatBytes(state.quota)}</p>
                            </div>
                            <div className="info-card">
                                <h4>Usage</h4>
                                <p>{formatBytes(state.usage)}</p>
                            </div>
                            <div className="info-card">
                                <h4>Used</h4>
                                <p>{percentage}%</p>
                            </div>
                        </div>
                        <div style={{ marginTop: '1rem' }}>
                            <button
                                type="button"
                                onClick={queryStorage}
                                style={{ minWidth: '44px', minHeight: '44px' }}
                            >
                                Refresh
                            </button>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}

export { computePercentage };
