import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { getDecodedHash, getHashTester, isNarrowViewport, repairInvalidHash, TESTER_NAV_MEDIA_QUERY } from './lib/routeUtils';
import { DEFAULT_TESTER, isTesterId, type TesterId } from './lib/testerRegistry';
import { testerComponents } from './testerComponents';
import Sidebar from './components/Sidebar';
import A11yControls from './components/A11yControls';
import TesterErrorBoundary from './components/TesterErrorBoundary';
import './styles/App.css';

function App() {
    const [activeTester, setActiveTester] = useState<TesterId>(getHashTester);
    const [sidebarOpen, setSidebarOpen] = useState(() => !isNarrowViewport());
    const [isMobile, setIsMobile] = useState(isNarrowViewport);

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

    const handleSidebarClose = useCallback(() => setSidebarOpen(false), []);
    const handleSidebarOpen = useCallback(() => setSidebarOpen(true), []);

    const ActiveComponent = useMemo(() => testerComponents[activeTester] ?? testerComponents.dashboard, [activeTester]);

    return (
        <>
            <a href="#main-content" className="skip-link">Skip to main content</a>

            <Sidebar
                activeTester={activeTester}
                sidebarOpen={sidebarOpen}
                isMobile={isMobile}
                onNavClick={handleNavClick}
                onClose={handleSidebarClose}
                onOpen={handleSidebarOpen}
            />

            <main id="main-content" className="content" tabIndex={-1}>
                <TesterErrorBoundary testerId={activeTester}>
                    <Suspense fallback={<div className="tester-loading">Loading...</div>}>
                        <ActiveComponent key={activeTester} />
                    </Suspense>
                </TesterErrorBoundary>
            </main>

            <A11yControls />
        </>
    );
}

export default App;
