import { useState, useEffect, useMemo, useCallback, type ComponentType } from 'react';
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

function NavStatusDot({ status }: { status: CapabilityStatus }) {
    return (
        <span
            className={`nav-status ${status}`}
            aria-hidden="true"
            title={navStatusLabels[status]}
        />
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
    const themeModeLabel = themeMode === 'system' ? `System (${effectiveTheme})` : themeMode;

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
                    <p>&copy; {year} Diagnostic Suite</p>
                    <div className="version-info">v4.0.0 &middot; React 19</div>
                </footer>
            </aside>

            <main id="main-content" className="content" tabIndex={-1}>
                <ActiveComponent key={activeTester} />
            </main>

            <div className="a11y-controls" aria-label="Display preferences">
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

            <style>{`
        .sidebar {
          width: var(--sidebar-w); background: var(--sidebar-bg); backdrop-filter: blur(20px);
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
        .sidebar__header h1 { font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em; }
        .sidebar__header h1 span { background: var(--accent); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .menu-toggle { background: none; border: none; color: var(--text-muted); cursor: pointer; min-width: 44px; min-height: 44px; padding: 0.4rem; transition: all var(--transition); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; }
        .menu-toggle:hover { color: var(--text); background-color: var(--surface-2); }
        .sidebar__nav { flex-grow: 1; padding: 0.75rem 0; overflow-y: auto; }
        .sidebar__nav ul { list-style: none; padding: 0 0.5rem; }
        .nav-group-label {
          font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;
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
        .nav-status.permission { background: var(--primary); box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
        .nav-status.partial { background: var(--warning); box-shadow: 0 0 0 3px rgba(245,158,11,0.12); }
        .nav-status.blocked, .nav-status.unsupported { background: var(--text-muted); box-shadow: none; opacity: 0.7; }
        .sidebar__footer { padding: 1rem 1.5rem; font-size: var(--text-xs); color: var(--text-muted); text-align: center; border-top: 1px solid var(--border); }
        .version-info { opacity: 0.5; margin-top: 0.25rem; }
        .content { flex-grow: 1; padding: var(--content-pad); overflow-y: auto; max-width: 1400px; margin: 0 auto; width: 100%; height: 100vh; }
        .a11y-controls {
          position: fixed; bottom: 1rem; right: 1rem; display: flex; align-items: center; gap: 0.35rem; z-index: 1000;
          background: var(--overlay-bg); backdrop-filter: blur(12px);
          border: 1px solid var(--border); border-radius: 999px; padding: 0.35rem; box-shadow: var(--shadow);
        }
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
        }
        @media (max-width: 560px) {
          .a11y-controls { left: 1rem; right: 1rem; justify-content: center; }
        }
      `}</style>
        </>
    );
}

export default App;
