import { useState, useRef, useEffect } from 'react';
import { appVersionLabel, changelogEntries, type ChangelogEntry } from '../lib/changelogVersion';

const INITIAL_VISIBLE_COUNT = 2;

function ChangelogSection({ entry }: { entry: ChangelogEntry }) {
    return (
        <div className="version-panel__entry">
            <h3 className="version-panel__entry-version">v{entry.version}</h3>
            <div className="version-panel__entry-content">
                <ChangelogContent content={entry.content} />
            </div>
        </div>
    );
}

function ChangelogContent({ content }: { content: string }) {
    // Parse markdown subsections (### Added, ### Fixed, ### Changed, etc.) into groups
    const sections: { heading: string; items: string[] }[] = [];
    let currentHeading = '';
    let currentItems: string[] = [];

    for (const line of content.split('\n')) {
        const headingMatch = line.match(/^### (.+)/);
        if (headingMatch) {
            if (currentHeading || currentItems.length > 0) {
                sections.push({ heading: currentHeading, items: currentItems });
            }
            currentHeading = headingMatch[1];
            currentItems = [];
        } else {
            const itemMatch = line.match(/^- (.+)/);
            if (itemMatch) {
                currentItems.push(itemMatch[1]);
            }
        }
    }
    if (currentHeading || currentItems.length > 0) {
        sections.push({ heading: currentHeading, items: currentItems });
    }

    if (sections.length === 0) {
        return <p className="version-panel__empty">No details recorded.</p>;
    }

    return (
        <>
            {sections.map((section, index) => (
                <div key={index} className="version-panel__section">
                    {section.heading && (
                        <span className={`version-panel__badge version-panel__badge--${section.heading.toLowerCase()}`}>
                            {section.heading}
                        </span>
                    )}
                    <ul>
                        {section.items.map((item, itemIndex) => (
                            <li key={itemIndex}>{item}</li>
                        ))}
                    </ul>
                </div>
            ))}
        </>
    );
}

export default function VersionPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const visibleEntries = showAll
        ? changelogEntries
        : changelogEntries.slice(0, INITIAL_VISIBLE_COUNT);
    const hiddenCount = changelogEntries.length - INITIAL_VISIBLE_COUNT;

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (
                panelRef.current &&
                !panelRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                buttonRef.current?.focus();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const togglePanel = () => {
        setIsOpen(prev => !prev);
        if (isOpen) setShowAll(false);
    };

    return (
        <div className="version-panel-wrapper">
            <button
                ref={buttonRef}
                type="button"
                className="version-btn"
                onClick={togglePanel}
                aria-expanded={isOpen}
                aria-label={`Version ${appVersionLabel}, view changelog`}
                title="View changelog"
            >
                {appVersionLabel}
            </button>

            {isOpen && (
                <div
                    ref={panelRef}
                    className="version-panel"
                    role="dialog"
                    aria-label="Changelog"
                >
                    <div className="version-panel__header">
                        <h2>Changelog</h2>
                        <button
                            type="button"
                            className="version-panel__close"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close changelog"
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="version-panel__body">
                        {visibleEntries.map(entry => (
                            <ChangelogSection key={entry.version} entry={entry} />
                        ))}

                        {!showAll && hiddenCount > 0 && (
                            <button
                                type="button"
                                className="version-panel__expand"
                                onClick={() => setShowAll(true)}
                            >
                                Show {hiddenCount} older {hiddenCount === 1 ? 'version' : 'versions'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            <style>{versionPanelStyles}</style>
        </div>
    );
}

const versionPanelStyles = `
.version-panel-wrapper {
    position: relative;
}

.version-btn {
    background: none;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--text-muted);
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    padding: 0.25rem 0.6rem;
    cursor: pointer;
    transition: all var(--transition);
    min-width: 44px;
    min-height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.version-btn:hover {
    color: var(--text);
    border-color: var(--primary);
    background: var(--primary-glow);
}

.version-panel {
    position: fixed;
    bottom: 4.5rem;
    left: 0.5rem;
    width: calc(var(--sidebar-w) - 1rem);
    max-height: min(420px, calc(100vh - 8rem));
    background: var(--surface-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 500;
    animation: versionPanelIn 0.2s ease-out;
}

@keyframes versionPanelIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}

.version-panel__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
}

.version-panel__header h2 {
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--text);
    margin: 0;
}

.version-panel__close {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    min-height: 28px;
    transition: all var(--transition);
}

.version-panel__close:hover {
    color: var(--text);
    background: var(--surface-3);
}

.version-panel__body {
    overflow-y: auto;
    padding: 0.75rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.version-panel__entry {
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border);
}

.version-panel__entry:last-of-type {
    border-bottom: none;
    padding-bottom: 0;
}

.version-panel__entry-version {
    font-size: 0.75rem;
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--primary);
    margin: 0 0 0.4rem 0;
    text-align: left;
}

.version-panel__entry-content {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    text-align: left;
}

.version-panel__section ul {
    list-style: none;
    padding: 0;
    margin: 0.25rem 0 0 0;
}

.version-panel__section li {
    font-size: 0.625rem;
    color: var(--text-muted);
    line-height: 1.4;
    padding: 0.15rem 0 0.15rem 0.6rem;
    position: relative;
    word-wrap: break-word;
    overflow-wrap: break-word;
    text-align: left;
}

.version-panel__section li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.55rem;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--text-muted);
    opacity: 0.4;
}

.version-panel__badge {
    display: inline-block;
    font-size: 0.5rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    color: var(--text-muted);
    background: var(--surface-3);
}

.version-panel__badge--added { color: var(--success); background: rgba(34, 197, 94, 0.1); }
.version-panel__badge--fixed { color: var(--primary); background: rgba(59, 130, 246, 0.1); }
.version-panel__badge--changed { color: var(--warning); background: rgba(245, 158, 11, 0.1); }
.version-panel__badge--security { color: var(--error); background: rgba(239, 68, 68, 0.1); }
.version-panel__badge--removed { color: var(--error); background: rgba(239, 68, 68, 0.1); }
.version-panel__badge--deprecated { color: var(--text-muted); background: var(--surface-3); }

.version-panel__empty {
    font-size: 0.6875rem;
    color: var(--text-muted);
    opacity: 0.6;
    margin: 0;
}

.version-panel__expand {
    background: none;
    border: 1px dashed var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.6875rem;
    padding: 0.5rem;
    cursor: pointer;
    transition: all var(--transition);
    width: 100%;
    min-height: 36px;
}

.version-panel__expand:hover {
    color: var(--primary);
    border-color: var(--primary);
    background: var(--primary-glow);
}

@media (max-width: 1024px) {
    .version-panel {
        left: 0.5rem;
        width: calc(var(--sidebar-w) - 1rem);
    }
}

@media (prefers-reduced-motion: reduce) {
    .version-panel {
        animation: none;
    }
}
`;
