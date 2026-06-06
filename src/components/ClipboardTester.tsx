import { useState, useEffect, useCallback } from 'react';
import { getUserSafeError } from '../lib/userSafeErrors';
import { queryPermissionState } from '../lib/permissions';

type PermissionState = 'granted' | 'denied' | 'prompt';

const SAMPLE_TEXT = 'Hello from Hardware Tester! 🖥️ Clipboard write test succeeded.';

export default function ClipboardTester() {
    const [isSupported] = useState(() => typeof navigator.clipboard !== 'undefined');
    const [readPermission, setReadPermission] = useState<PermissionState | null>(null);
    const [writePermission, setWritePermission] = useState<PermissionState | null>(null);
    const [clipboardContent, setClipboardContent] = useState<string | null>(null);
    const [lastWriteStatus, setLastWriteStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const queryPermissions = useCallback(async () => {
        if (!isSupported) return;
        try {
            const readState = await queryPermissionState('clipboard-read');
            if (readState !== 'unsupported' && readState !== 'unknown') {
                setReadPermission(readState as PermissionState);
            }
        } catch {
            setReadPermission(null);
        }
        try {
            const writeState = await queryPermissionState('clipboard-write');
            if (writeState !== 'unsupported' && writeState !== 'unknown') {
                setWritePermission(writeState as PermissionState);
            }
        } catch {
            setWritePermission(null);
        }
    }, [isSupported]);

    useEffect(() => {
        queryPermissions();
    }, [queryPermissions]);

    // Clear clipboard content from UI on unmount/navigation away
    useEffect(() => {
        return () => {
            setClipboardContent(null);
        };
    }, []);

    const handleWrite = useCallback(async () => {
        setError(null);
        setLastWriteStatus(null);
        try {
            await navigator.clipboard.writeText(SAMPLE_TEXT);
            setLastWriteStatus('Text written to clipboard successfully.');
            queryPermissions();
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === 'NotAllowedError') {
                setError('Clipboard write permission was denied. Allow clipboard access in your browser site settings, then try again.');
            } else {
                const safeErr = getUserSafeError(err);
                setError(`${safeErr.message} ${safeErr.detail}`);
            }
        }
    }, [queryPermissions]);

    const handleRead = useCallback(async () => {
        setError(null);
        try {
            const text = await navigator.clipboard.readText();
            setClipboardContent(text);
            queryPermissions();
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === 'NotAllowedError') {
                setError('Clipboard read permission was denied. Allow clipboard access in your browser site settings, then try again.');
            } else {
                const safeErr = getUserSafeError(err);
                setError(`${safeErr.message} ${safeErr.detail}`);
            }
        }
    }, [queryPermissions]);

    const renderPermissionBadge = (label: string, state: PermissionState | null) => {
        const color = state === 'granted' ? 'var(--success, #22c55e)' :
            state === 'denied' ? 'var(--error, #ef4444)' :
                state === 'prompt' ? 'var(--warning, #f59e0b)' :
                    'var(--text-muted)';
        return (
            <div className="clipboard-perm-badge">
                <span className="clipboard-perm-label">{label}</span>
                <span className="clipboard-perm-state" style={{ color }}>
                    {state ?? 'unknown'}
                </span>
            </div>
        );
    };

    return (
        <section aria-labelledby="clipboard-title">
            <header className="tester-panel__header">
                <h2 id="clipboard-title">Clipboard</h2>
                <p>
                    Test clipboard read and write permissions and behavior.
                    {!isSupported && <strong style={{ color: 'var(--error)' }}> Clipboard API is not available in this browser.</strong>}
                </p>
            </header>
            <div className="tester-panel__body">
                {!isSupported ? (
                    <div className="status-display" style={{ color: 'var(--error)' }}>
                        Clipboard API is not available in this browser. Try Chrome or Edge.
                    </div>
                ) : (
                    <>
                        {/* Permission States */}
                        <div className="clipboard-permissions">
                            <h3 className="clipboard-section-title">Permission States</h3>
                            <div className="clipboard-perm-row">
                                {renderPermissionBadge('clipboard-read', readPermission)}
                                {renderPermissionBadge('clipboard-write', writePermission)}
                            </div>
                        </div>

                        {/* Write Test */}
                        <div className="clipboard-section">
                            <h3 className="clipboard-section-title">Write Test</h3>
                            <p className="clipboard-section-desc">
                                Writes sample text to the system clipboard.
                            </p>
                            <div className="clipboard-sample-text">
                                <code>{SAMPLE_TEXT}</code>
                            </div>
                            <button className="btn btn--primary" onClick={handleWrite}>
                                Write to Clipboard
                            </button>
                            {lastWriteStatus && (
                                <div className="clipboard-status clipboard-status--success" role="status">
                                    {lastWriteStatus}
                                </div>
                            )}
                        </div>

                        {/* Read Test */}
                        <div className="clipboard-section">
                            <h3 className="clipboard-section-title">Read Test</h3>
                            <p className="clipboard-section-desc">
                                Reads the current clipboard contents and displays them below.
                            </p>
                            <button className="btn btn--primary" onClick={handleRead}>
                                Read from Clipboard
                            </button>
                            {clipboardContent !== null && (
                                <textarea
                                    className="clipboard-read-area"
                                    readOnly
                                    value={clipboardContent}
                                    aria-label="Clipboard contents"
                                    rows={4}
                                />
                            )}
                        </div>

                        {/* Error Display */}
                        {error && (
                            <div className="clipboard-status clipboard-status--error" role="alert">
                                {error}
                            </div>
                        )}
                    </>
                )}
            </div>
            <style>{`
                .clipboard-permissions { margin-bottom: 1.5rem; }
                .clipboard-section-title {
                    font-size: var(--text-sm);
                    font-weight: 600;
                    color: var(--text);
                    margin-bottom: 0.5rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .clipboard-perm-row {
                    display: flex;
                    gap: 1.5rem;
                    flex-wrap: wrap;
                }
                .clipboard-perm-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    padding: 0.5rem 1rem;
                }
                .clipboard-perm-label {
                    font-family: var(--font-mono);
                    font-size: var(--text-xs);
                    color: var(--text-muted);
                }
                .clipboard-perm-state {
                    font-family: var(--font-mono);
                    font-size: var(--text-sm);
                    font-weight: 600;
                }
                .clipboard-section {
                    margin-bottom: 1.5rem;
                    padding: 1rem;
                    background: var(--surface-1);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                }
                .clipboard-section-desc {
                    font-size: var(--text-sm);
                    color: var(--text-muted);
                    margin-bottom: 0.75rem;
                }
                .clipboard-sample-text {
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    padding: 0.5rem 0.75rem;
                    margin-bottom: 0.75rem;
                    font-family: var(--font-mono);
                    font-size: var(--text-xs);
                    color: var(--text-muted);
                    word-break: break-all;
                }
                .clipboard-read-area {
                    width: 100%;
                    margin-top: 0.75rem;
                    padding: 0.75rem;
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    font-family: var(--font-mono);
                    font-size: var(--text-sm);
                    color: var(--text);
                    resize: vertical;
                    min-height: 80px;
                }
                .clipboard-status {
                    margin-top: 0.75rem;
                    padding: 0.5rem 0.75rem;
                    border-radius: var(--radius);
                    font-size: var(--text-sm);
                    font-family: var(--font-mono);
                }
                .clipboard-status--success {
                    background: rgba(34, 197, 94, 0.1);
                    color: var(--success, #22c55e);
                    border: 1px solid rgba(34, 197, 94, 0.2);
                }
                .clipboard-status--error {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--error, #ef4444);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
            `}</style>
        </section>
    );
}
