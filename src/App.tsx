import { useState, useEffect, useMemo, useCallback, type ComponentType, type Dispatch, type SetStateAction } from 'react';
import Dashboard from './components/Dashboard';
import KeyboardTester from './components/KeyboardTester';
import MouseTester from './components/MouseTester';
import DoubleClickTester from './components/DoubleClickTester';
import ScreenTester from './components/ScreenTester';
import MicTester from './components/MicTester';
import SoundTester from './components/SoundTester';
import WebcamTester from './components/WebcamTester';
import NetworkTester from './components/NetworkTester';
import GamepadTester from './components/GamepadTester';
import TouchTester from './components/TouchTester';
import VibrationTester from './components/VibrationTester';
import MidiTester from './components/MidiTester';
import BatteryTester from './components/BatteryTester';
import GpuTester from './components/GpuTester';
import MotionTester from './components/MotionTester';
import GeolocationTester from './components/GeolocationTester';
import AmbientLightTester from './components/AmbientLightTester';
import BluetoothTester from './components/BluetoothTester';
import BurnInFixer from './components/BurnInFixer';
import PrinterTest from './components/PrinterTest';
import SystemReport from './components/SystemReport';
import { useAppearancePreferences, type ThemeMode } from './hooks/useAppearancePreferences';
import { useHardwareCapabilities } from './hooks/useHardwareCapabilities';
import type { CapabilityStatus } from './lib/hardwareCapabilities';
import { getDecodedHash, getHashTester, isNarrowViewport, repairInvalidHash, TESTER_NAV_MEDIA_QUERY } from './lib/routeUtils';
import { siteMeta } from './lib/siteMeta';
import { DEFAULT_TESTER, isTesterId, navIconPaths, testerGroups, testers, type TesterId } from './lib/testerRegistry';

const testerComponents: Record<TesterId, ComponentType> = {
    dashboard: Dashboard,
    report: SystemReport,
    keyboard: KeyboardTester,
    mouse: MouseTester,
    'double-click': DoubleClickTester,
    gamepad: GamepadTester,
    touch: TouchTester,
    screen: ScreenTester,
    mic: MicTester,
    sound: SoundTester,
    webcam: WebcamTester,
    vibration: VibrationTester,
    battery: BatteryTester,
    gpu: GpuTester,
    bluetooth: BluetoothTester,
    motion: MotionTester,
    geolocation: GeolocationTester,
    'ambient-light': AmbientLightTester,
    midi: MidiTester,
    network: NetworkTester,
    'burn-in': BurnInFixer,
    printer: PrinterTest,
};

const themeOptions: { id: ThemeMode; label: string; path: string }[] = [
    {
        id: 'system',
        label: 'System',
        path: 'M3 4h18v12H3V4zm2 2v8h14V6H5zm4 13h6v2H9v-2z',
    },
    {
        id: 'dark',
        label: 'Dark',
        path: 'M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z',
    },
    {
        id: 'light',
        label: 'Light',
        path: 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z',
    },
];

const navStatusLabels: Record<CapabilityStatus, string> = {
    available: 'ready',
    permission: 'permission required',
    partial: 'partial support',
    blocked: 'secure context required',
    unsupported: 'fallback available',
};

const navStatusLegend: { status: CapabilityStatus; label: string }[] = [
    { status: 'available', label: 'Ready' },
    { status: 'permission', label: 'Permission' },
    { status: 'partial', label: 'Partial' },
    { status: 'blocked', label: 'Blocked' },
    { status: 'unsupported', label: 'Fallback' },
];

function NavStatusDot({ status }: { status: CapabilityStatus }) {
    return (
        <span
            className={`nav-status ${status}`}
            aria-hidden="true"
            title={navStatusLabels[status]}
        />
    );
}

interface DisplayPreferenceControlsProps {
    className: string;
    themeMode: ThemeMode;
    effectiveTheme: string;
    setThemeMode: (mode: ThemeMode) => void;
    highContrast: boolean;
    setHighContrast: Dispatch<SetStateAction<boolean>>;
    largeText: boolean;
    setLargeText: Dispatch<SetStateAction<boolean>>;
}

function DisplayPreferenceControls({
    className,
    themeMode,
    effectiveTheme,
    setThemeMode,
    highContrast,
    setHighContrast,
    largeText,
    setLargeText,
}: DisplayPreferenceControlsProps) {
    const themeModeLabel = themeMode === 'system' ? `System (${effectiveTheme})` : themeMode;

    return (
        <div className={`a11y-controls ${className}`} aria-label="Display preferences">
            <div className="theme-mode-group" role="group" aria-label={`Theme mode: ${themeModeLabel}`}>
                {themeOptions.map(option => (
                    <button
                        key={option.id}
                        type="button"
                        className={`a11y-btn ${themeMode === option.id ? 'active' : ''}`}
                        aria-label={`Use ${option.label.toLowerCase()} theme`}
                        aria-pressed={themeMode === option.id}
                        title={`${option.label} theme`}
                        onClick={() => setThemeMode(option.id)}
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d={option.path} />
                        </svg>
                    </button>
                ))}
            </div>
            <button
                type="button"
                className={`a11y-btn ${highContrast ? 'active' : ''}`}
                aria-label="Toggle high contrast"
                aria-pressed={highContrast}
                title="High contrast"
                onClick={() => setHighContrast(value => !value)}
            >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 22C17.52 22 22 17.52 22 12S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm0-2V4c4.42 0 8 3.58 8 8s-3.58 8-8 8z" /></svg>
            </button>
            <button
                type="button"
                className={`a11y-btn ${largeText ? 'active' : ''}`}
                aria-label="Toggle larger text"
                aria-pressed={largeText}
                title="Larger text"
                onClick={() => setLargeText(value => !value)}
            >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z" /></svg>
            </button>
        </div>
    );
}

function QuickActionsMenu() {
    const [open, setOpen] = useState(false);

    return (
        <div className={`quick-actions ${open ? 'quick-actions--open' : ''}`}>
            <button
                type="button"
                className="quick-actions__trigger"
                aria-label="Open quick actions"
                aria-expanded={open}
                title="Quick actions"
                onClick={() => setOpen(value => !value)}
            >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                    <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
                </svg>
            </button>
            {open && (
                <div className="quick-actions__menu" role="group" aria-label="Quick actions">
                    <a href="#report" className="quick-actions__item" onClick={() => setOpen(false)}>
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
                            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm2-7h8v2H8v-2zm0 4h8v1H8v-1zm0-8h4v2H8V9z" />
                        </svg>
                        <span>Report</span>
                    </a>
                    <a href={siteMeta.repositoryUrl} target="_blank" rel="noreferrer" className="quick-actions__item" onClick={() => setOpen(false)}>
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
                            <path d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-1.04-.01-1.88-2.51.47-3.16-.63-3.36-1.21-.11-.3-.6-1.21-1.03-1.45-.35-.19-.85-.67-.01-.68.79-.01 1.35.74 1.54 1.05.9 1.55 2.34 1.11 2.91.85.09-.67.35-1.11.64-1.37-2.22-.26-4.55-1.14-4.55-5.05 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.71 0 0 .84-.28 2.75 1.05A9.24 9.24 0 0112 6.99c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.92-2.34 4.79-4.57 5.05.36.32.68.93.68 1.89 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.49A10.12 10.12 0 0022 12.25C22 6.59 17.52 2 12 2z" />
                        </svg>
                        <span>GitHub</span>
                    </a>
                </div>
            )}
        </div>
    );
}

function App() {
    const [activeTester, setActiveTester] = useState<TesterId>(getHashTester);
    const [sidebarOpen, setSidebarOpen] = useState(() => !isNarrowViewport());
    const [isMobile, setIsMobile] = useState(isNarrowViewport);
    const {
        themeMode,
        effectiveTheme,
        setThemeMode,
        highContrast,
        setHighContrast,
        largeText,
        setLargeText,
    } = useAppearancePreferences();
    const { capabilities } = useHardwareCapabilities();

    useEffect(() => {
        const handleHashChange = () => {
            const hash = getDecodedHash();
            const nextTester = isTesterId(hash) ? hash : DEFAULT_TESTER;
            setActiveTester(nextTester);
            repairInvalidHash(hash, nextTester);
        };
        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    useEffect(() => {
        const media = window.matchMedia(TESTER_NAV_MEDIA_QUERY);
        const update = (event: MediaQueryList | MediaQueryListEvent) => {
            setIsMobile(event.matches);
            setSidebarOpen(!event.matches);
        };
        update(media);
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);

    const handleNavClick = useCallback((id: TesterId) => {
        setActiveTester(id);
        if (isMobile) setSidebarOpen(false);
    }, [isMobile]);

    const groupedNav = useMemo(() => testerGroups.map(group => ({
        ...group,
        items: testers.filter(tester => tester.group === group.key),
    })), []);
    const capabilityByTesterId = useMemo(() => new Map(
        capabilities
            .filter(capability => capability.testerId)
            .map(capability => [capability.testerId as TesterId, capability.status]),
    ), [capabilities]);

    const ActiveComponent = useMemo(() => testerComponents[activeTester] ?? Dashboard, [activeTester]);
    const year = new Date().getFullYear();
    const displayPreferenceProps = {
        themeMode,
        effectiveTheme,
        setThemeMode,
        highContrast,
        setHighContrast,
        largeText,
        setLargeText,
    };
    const showMobileDisplayControls = !(sidebarOpen && isMobile);
    const showQuickActions = !(sidebarOpen && isMobile);

    return (
        <>
            <a href="#main-content" className="skip-link">Skip to main content</a>

            {!sidebarOpen && (
                <button type="button" className="sidebar-open-btn" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
            )}

            {sidebarOpen && isMobile && (
                <button type="button" className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />
            )}

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Test navigation">
                <header className="sidebar__header">
                    <h1>Hardware <span>Suite</span></h1>
                    <button type="button" className="menu-toggle" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}>
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
                                            onClick={() => handleNavClick(tester.id)}
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
                </nav>

                <footer className="sidebar__footer">
                    <DisplayPreferenceControls className="a11y-controls--sidebar" {...displayPreferenceProps} />
                    <div className="nav-status-legend" aria-label="Navigation status legend">
                        {navStatusLegend.map(item => (
                            <span key={item.status} className="nav-status-legend__item">
                                <span className={`nav-status ${item.status}`} aria-hidden="true" />
                                <span>{item.label}</span>
                            </span>
                        ))}
                    </div>
                    <p>&copy; {year} Diagnostic Suite</p>
                    <div className="version-info">v4.0.0 &middot; React 19</div>
                </footer>
            </aside>

            <main id="main-content" className="content" tabIndex={-1}>
                <ActiveComponent key={activeTester} />
            </main>

            {showQuickActions && <QuickActionsMenu />}

            {showMobileDisplayControls && (
                <DisplayPreferenceControls className="a11y-controls--mobile" {...displayPreferenceProps} />
            )}

            <style>{`
        .sidebar {
          width: min(var(--sidebar-w), 100vw); background: var(--sidebar-bg); backdrop-filter: blur(20px);
          border-right: 1px solid var(--border); flex-shrink: 0; display: flex;
          flex-direction: column; transition: margin-left 0.3s ease, transform 0.3s ease;
          z-index: 100; height: 100vh;
        }
        @media (min-width: 1025px) {
          .sidebar { margin-left: 0; }
          .sidebar:not(.open) { margin-left: calc(-1 * var(--sidebar-w)); }
        }
        @media (max-width: 1024px) {
          .sidebar { position: fixed; top: 0; left: 0; height: 100%; transform: translateX(-100%); box-shadow: var(--shadow-lg); }
          .sidebar.open { transform: translateX(0); }
          .sidebar-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99; border: none; cursor: pointer; backdrop-filter: blur(4px); }
        }
        .sidebar-open-btn {
          position: fixed; top: 1rem; left: 1rem; z-index: 101;
          background: var(--overlay-bg); backdrop-filter: blur(12px);
          border: 1px solid var(--border); border-radius: var(--radius-sm);
          min-width: 44px; min-height: 44px; padding: 0.5rem; cursor: pointer; color: var(--text);
          display: flex; align-items: center; justify-content: center;
          transition: all var(--transition); box-shadow: var(--shadow);
        }
        .sidebar-open-btn:hover { background-color: var(--surface-3); transform: scale(1.05); }
        .sidebar__header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .sidebar__header h1 { font-size: 1.35rem; font-weight: 700; letter-spacing: 0; }
        .sidebar__header h1 span { background: var(--accent); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .menu-toggle { background: none; border: none; color: var(--text-muted); cursor: pointer; min-width: 44px; min-height: 44px; padding: 0.4rem; transition: all var(--transition); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; }
        .menu-toggle:hover { color: var(--text); background-color: var(--surface-2); }
        .sidebar__nav { flex-grow: 1; padding: 0.75rem 0; overflow-y: auto; }
        .sidebar__nav ul { list-style: none; padding: 0 0.5rem; }
        .nav-group-label {
          font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0;
          color: var(--text-muted); opacity: 0.5; padding: 0.75rem 1.25rem 0.35rem; margin-top: 0.25rem;
        }
        .sidebar__nav a {
          display: flex; align-items: center; gap: 0.75rem;
          min-height: 44px; padding: 0.5rem 1rem; text-decoration: none; color: var(--text-muted);
          font-weight: 500; font-size: var(--text-sm);
          border-left: 3px solid transparent;
          transition: all var(--transition); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; margin-bottom: 1px;
        }
        .nav-link__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
        .sidebar__nav a:hover { background-color: var(--surface-2); color: var(--text); }
        .sidebar__nav a.active {
          color: var(--primary); font-weight: 600;
          border-left-color: var(--primary); background-color: var(--primary-glow);
        }
        .nav-icon { opacity: 0.6; flex-shrink: 0; transition: opacity var(--transition); }
        .sidebar__nav a:hover .nav-icon, .sidebar__nav a.active .nav-icon { opacity: 1; }
        .nav-status {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-left: auto;
          background: var(--success); box-shadow: 0 0 0 3px rgba(34,197,94,0.12);
        }
        .nav-status.permission { background: var(--primary); box-shadow: 0 0 0 3px var(--primary-glow); }
        .nav-status.partial { background: var(--warning); box-shadow: 0 0 0 3px rgba(245,158,11,0.12); }
        .nav-status.blocked, .nav-status.unsupported { background: var(--text-muted); box-shadow: none; opacity: 0.7; }
        .sidebar__footer {
          padding: 0.9rem 1rem 1rem; font-size: var(--text-xs); color: var(--text-muted);
          border-top: 1px solid var(--border); background: var(--sidebar-bg);
        }
        .sidebar__footer p, .version-info { text-align: center; }
        .nav-status-legend {
          display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.35rem 0.65rem;
          padding: 0.75rem; margin-bottom: 0.75rem; border: 1px solid var(--border);
          border-radius: var(--radius-sm); background: var(--surface-1);
        }
        .nav-status-legend__item {
          display: flex; align-items: center; gap: 0.4rem; min-width: 0;
          color: var(--text-muted); font-size: 10px; line-height: 1.2;
        }
        .nav-status-legend__item .nav-status { margin-left: 0; width: 7px; height: 7px; }
        .version-info { opacity: 0.5; margin-top: 0.25rem; }
        .content {
          flex-grow: 1; padding: var(--content-pad); padding-bottom: calc(var(--content-pad) + 4.75rem);
          overflow-y: auto; max-width: 1400px; margin: 0 auto; width: 100%; height: 100vh;
        }
        .quick-actions {
          position: fixed; top: 1rem; right: 1rem; z-index: 1000;
          color: var(--text);
        }
        .quick-actions__trigger {
          width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
          border-radius: 50%; border: 1px solid var(--border);
          background: var(--overlay-bg); backdrop-filter: blur(12px);
          color: var(--text-muted); box-shadow: var(--shadow); cursor: pointer;
          transition: all var(--transition); list-style: none;
        }
        .quick-actions__trigger:hover,
        .quick-actions--open .quick-actions__trigger {
          background: var(--surface-3); color: var(--text); transform: translateY(-1px);
        }
        .quick-actions__menu {
          position: absolute; top: calc(100% + 0.5rem); right: 0;
          min-width: 9.5rem; padding: 0.35rem; display: flex; flex-direction: column; gap: 0.2rem;
          border: 1px solid var(--border); border-radius: var(--radius);
          background: var(--overlay-bg); backdrop-filter: blur(12px); box-shadow: var(--shadow);
        }
        .quick-actions__item {
          display: flex; align-items: center; gap: 0.65rem; min-height: 44px;
          padding: 0.55rem 0.75rem; border-radius: var(--radius-sm);
          color: var(--text-muted); text-decoration: none; font-size: var(--text-sm);
          font-weight: 600; white-space: nowrap; transition: all var(--transition);
        }
        .quick-actions__item:hover,
        .quick-actions__item:focus-visible {
          color: var(--text); background: var(--surface-2);
        }
        .a11y-controls {
          display: flex; align-items: center; gap: 0.35rem; z-index: 1000;
          background: var(--overlay-bg); backdrop-filter: blur(12px);
          border: 1px solid var(--border); border-radius: 999px; padding: 0.35rem; box-shadow: var(--shadow);
        }
        .a11y-controls--sidebar {
          position: static; justify-content: center; flex-wrap: nowrap; gap: 0; margin-bottom: 0.75rem;
          border-radius: var(--radius); background: var(--surface-1); box-shadow: none;
        }
        .a11y-controls--sidebar .theme-mode-group { gap: 0; padding-right: 0; margin-right: 0; border-right: 0; }
        .a11y-controls--mobile { display: none; }
        .theme-mode-group { display: flex; gap: 0.25rem; padding-right: 0.35rem; margin-right: 0.1rem; border-right: 1px solid var(--border); }
        .a11y-btn {
          background: transparent; border: 1px solid transparent; border-radius: 50%; padding: 0.55rem;
          cursor: pointer; transition: all var(--transition); display: flex;
          align-items: center; justify-content: center; width: 44px; height: 44px; color: var(--text-muted);
        }
        .a11y-btn:hover { background-color: var(--surface-3); color: var(--text); transform: translateY(-1px); }
        .a11y-btn.active { background: var(--accent); color: white; border-color: transparent; }
        @media (max-width: 1024px) {
          .content { padding-top: calc(var(--content-pad) + 3rem); }
          .quick-actions { top: auto; right: 1rem; bottom: 1rem; }
          .quick-actions__menu { top: auto; bottom: calc(100% + 0.5rem); }
          .a11y-controls--sidebar { display: none; }
          .a11y-controls--mobile {
            position: fixed; top: 1rem; right: 1rem; bottom: auto;
            display: flex; justify-content: center; border-radius: 999px;
          }
        }
        @media (max-width: 560px) {
          .content { padding-top: calc(var(--content-pad) + 4.5rem); }
          .a11y-controls--mobile {
            top: 1rem; left: 4.75rem; right: 1rem; bottom: auto;
            justify-content: center;
          }
        }
      `}</style>
        </>
    );
}

export default App;
