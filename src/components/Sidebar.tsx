import { useMemo } from 'react';
import { useHardwareCapabilities } from '../hooks/useHardwareCapabilities';
import { appVersionLabel } from '../lib/changelogVersion';
import type { CapabilityStatus } from '../lib/hardwareCapabilities';
import { navIconPaths, testerGroups, testers, type TesterId } from '../lib/testerRegistry';
import '../styles/Sidebar.css';

const navStatusLabels: Record<CapabilityStatus, string> = {
    available: 'ready',
    permission: 'permission required',
    partial: 'partial support',
    blocked: 'secure context required',
    unsupported: 'fallback available',
};

const repositoryUrl = 'https://github.com/NatsumeAoii/Hardware-Tester';
const bugReportUrl = 'https://github.com/NatsumeAoii/Hardware-Tester/issues';
const currentYear = new Date().getFullYear();

function NavStatusDot({ status }: { status: CapabilityStatus }) {
    return (
        <span
            className={`nav-status ${status}`}
            aria-hidden="true"
            title={navStatusLabels[status]}
        />
    );
}

interface SidebarProps {
    activeTester: TesterId;
    sidebarOpen: boolean;
    isMobile: boolean;
    onNavClick: (id: TesterId) => void;
    onClose: () => void;
    onOpen: () => void;
}

export default function Sidebar({ activeTester, sidebarOpen, isMobile, onNavClick, onClose, onOpen }: SidebarProps) {
    const { capabilities } = useHardwareCapabilities();

    const groupedNav = useMemo(() => testerGroups.map(group => ({
        ...group,
        items: testers.filter(tester => tester.group === group.key),
    })), []);

    const capabilityByTesterId = useMemo(() => new Map(
        capabilities
            .filter(capability => capability.testerId)
            .map(capability => [capability.testerId as TesterId, capability.status]),
    ), [capabilities]);

    return (
        <>
            {!sidebarOpen && (
                <button type="button" className="sidebar-open-btn" onClick={onOpen} aria-label="Open navigation">
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
            )}

            {sidebarOpen && isMobile && (
                <button type="button" className="sidebar-backdrop" onClick={onClose} aria-label="Close navigation" />
            )}

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Test navigation">
                <header className="sidebar__header">
                    <h1>Hardware <span>Suite</span></h1>
                    <button type="button" className="menu-toggle" aria-label="Close navigation" onClick={onClose}>
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </header>

                <nav className="sidebar__nav" aria-label="Hardware tests">
                    {groupedNav.map(group => (
                        <div key={group.key}>
                            {group.label && <div className="nav-group-label">{group.label}</div>}
                            <ul>
                                {group.items.map(tester => {
                                    const navStatus = capabilityByTesterId.get(tester.id) ?? 'available';
                                    return (
                                        <li key={tester.id}>
                                            <a
                                                href={`#${tester.id}`}
                                                className={`nav-link ${activeTester === tester.id ? 'active' : ''}`}
                                                aria-current={activeTester === tester.id ? 'page' : undefined}
                                                onClick={() => onNavClick(tester.id)}
                                            >
                                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="nav-icon">
                                                    <path d={navIconPaths[tester.id]} />
                                                </svg>
                                                <span className="nav-link__label">{tester.label}</span>
                                                <NavStatusDot status={navStatus} />
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                    <div className="sidebar__support">
                        <div className="nav-group-label">Project</div>
                        <ul aria-label="Project links">
                            <li>
                                <a href={repositoryUrl} target="_blank" rel="noreferrer">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="nav-icon" aria-hidden="true">
                                        <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.36 6.84 9.71.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.88-2.78.62-3.37-1.22-3.37-1.22-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.05 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.99c.85 0 1.7.12 2.5.36 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.92-2.34 4.78-4.57 5.04.36.32.68.94.68 1.9 0 1.38-.01 2.49-.01 2.83 0 .27.18.59.69.49A10.1 10.1 0 0 0 22 12.26C22 6.58 17.52 2 12 2z" />
                                    </svg>
                                    <span className="nav-link__label">GitHub repo</span>
                                </a>
                            </li>
                            <li>
                                <a href={bugReportUrl} target="_blank" rel="noreferrer">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="nav-icon" aria-hidden="true">
                                        <path d="M20 8h-2.81a5.94 5.94 0 0 0-1.12-1.52l1.44-1.44a1 1 0 1 0-1.42-1.42l-1.78 1.79A6.04 6.04 0 0 0 12 5c-.82 0-1.6.16-2.31.45L7.91 3.66a1 1 0 0 0-1.42 1.42l1.44 1.44A5.94 5.94 0 0 0 6.81 8H4a1 1 0 0 0 0 2h2v2H4a1 1 0 1 0 0 2h2v.5c0 .52.08 1.03.22 1.5H4a1 1 0 1 0 0 2h3.23A6 6 0 0 0 18 14.5V14h2a1 1 0 1 0 0-2h-2v-2h2a1 1 0 1 0 0-2zM8 10a4 4 0 0 1 8 0v4.5a4 4 0 0 1-8 0V10zm2 0v4.5a2 2 0 0 0 4 0V10a2 2 0 0 0-4 0z" />
                                    </svg>
                                    <span className="nav-link__label">Report a bug</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </nav>

                <footer className="sidebar__footer">
                    <p>&copy; {currentYear} Diagnostic Suite</p>
                    <div className="version-info">{appVersionLabel}</div>
                </footer>
            </aside>
        </>
    );
}
