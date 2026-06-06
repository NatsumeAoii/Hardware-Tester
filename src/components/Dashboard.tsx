import { useMemo } from 'react';
import { useDeviceSpecs } from '../hooks/useDeviceSpecs';
import { dashboardTesters, navIconPaths } from '../lib/testerRegistry';
import CompatibilityMatrix from './dashboard/CompatibilityMatrix';
import '../styles/Dashboard.css';

const specSvgPaths: Record<string, string> = {
    Device: 'M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H3V4h18v10z',
    OS: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z',
    Browser: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
    'CPU Threads': 'M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2zm14 14H7V7h10v12zm-4-2h2v-2h-2v2zM3 9h2V7H3v2zm0 4h2v-2H3v2zM3 17h2v-2H3v2zm16 0h2v-2h-2v2zm0-4h2v-2h-2v2z',
    RAM: 'M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zM2 14h20v-4H2v4zm2-3h2v2H4v-2z',
    GPU: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    Screen: 'M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H3V4h18v10z',
    'Color Depth': 'M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-1 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z',
    Language: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93z',
    Connection: 'M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z',
    Downlink: 'M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z',
    RTT: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
    'JS Heap': 'M13 2.05v2.02c3.95.49 7 3.85 7 7.93 0 1.62-.48 3.12-1.3 4.38l1.46 1.46A9.955 9.955 0 0022 12c0-5.18-3.95-9.45-9-9.95zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V3.03c-5.06.5-9 4.76-9 9.97 0 5.52 4.47 10 9.99 10 3.31 0 6.24-1.61 8.06-4.09l-1.46-1.46A7.963 7.963 0 0112 19z',
    'Max Touch': 'M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74z',
    Cookies: 'M21.95 10.99c-1.79-.03-3.7-1.95-2.68-4.22-2.97 1-5.78-1.59-5.19-4.56C7.11.74 2 6.27 2 12c0 5.52 4.48 10 10 10 5.89 0 10.54-5.08 9.95-11.01z',
    Battery: 'M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z',
    Storage: 'M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zM2 14h20v-4H2v4zm2-3h2v2H4v-2z',
};

const infoSvgPaths: Record<string, string> = {
    License: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z',
    Privacy: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z',
    Compatibility: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
};

const SpecIcon = ({ label }: { label: string }) => {
    const path = specSvgPaths[label];
    if (!path) return null;
    return <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="spec-card__svg"><path d={path} /></svg>;
};

const CURRENT_YEAR = new Date().getFullYear();

export default function Dashboard() {
    const { specs, battery, storage } = useDeviceSpecs();

    const deviceSpecs = useMemo(() => {
        const batteryVal = battery.level !== null
            ? `${battery.level}%${battery.charging ? ' charging' : ''}${battery.charging && battery.chargingTime !== 'N/A' ? ` (${battery.chargingTime})` : ''}${!battery.charging && battery.dischargingTime !== 'N/A' ? ` (${battery.dischargingTime} left)` : ''}`
            : 'N/A';
        const storageVal = storage ? `${storage.used} / ${storage.quota}` : 'N/A';

        return [
            { label: 'Device', value: specs.deviceType },
            { label: 'OS', value: specs.os },
            { label: 'Browser', value: specs.browser },
            { label: 'CPU Threads', value: `${specs.cpuThreads} logical processors` },
            { label: 'RAM', value: specs.ram, note: specs.ramNote },
            { label: 'GPU', value: specs.gpu.length > 40 ? specs.gpu.slice(0, 40) + '...' : specs.gpu },
            { label: 'Screen', value: specs.screenResolution },
            { label: 'Color Depth', value: specs.colorDepth },
            { label: 'Language', value: specs.language },
            { label: 'Connection', value: `${specs.connectionType}${specs.downlink !== 'N/A' ? ` - ${specs.downlink}` : ''}` },
            { label: 'Downlink', value: specs.downlink },
            { label: 'RTT', value: specs.rtt },
            { label: 'JS Heap', value: specs.jsHeap },
            { label: 'Max Touch', value: `${specs.maxTouchPoints} points` },
            { label: 'Cookies', value: specs.cookiesEnabled ? 'Enabled' : 'Disabled' },
            { label: 'Battery', value: batteryVal },
            { label: 'Storage', value: storageVal, note: storage?.label },
        ];
    }, [specs, battery, storage]);

    return (
        <section className="dashboard">
            <div className="dash-hero">
                <div className="dash-hero__text">
                    <h1>Hardware <span>Diagnostic Suite</span></h1>
                    <p className="dash-hero__tagline">
                        A comprehensive, browser-based toolkit for testing every piece of hardware on your device.
                        Hardware and media checks run locally in your browser. Network diagnostics contact public test endpoints only when you run them.
                    </p>
                    <div className="dash-hero__actions">
                        <a href="#keyboard" className="btn btn--primary">Start Testing</a>
                        <a href="#report" className="btn dash-hero__secondary">Generate Report</a>
                    </div>
                </div>
            </div>

            <h2 className="dash-section-title">Device Specifications</h2>
            <div className="dash-specs">
                {deviceSpecs.map(s => (
                    <div key={s.label} className="spec-card" title={s.note || undefined}>
                        <SpecIcon label={s.label} />
                        <div className="spec-card__text">
                            <span className="spec-card__label">{s.label} {s.note && <span className="spec-note-badge" title={s.note}>i</span>}</span>
                            <span className="spec-card__value">{s.value}</span>
                        </div>
                    </div>
                ))}
            </div>

            <CompatibilityMatrix />

            <h2 className="dash-section-title">Available Tests ({dashboardTesters.length})</h2>
            <div className="dash-features">
                {dashboardTesters.map(test => (
                    <a key={test.id} href={`#${test.id}`} className="dash-feature">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="dash-feature__svg">
                            <path d={navIconPaths[test.id]} />
                        </svg>
                        <h3>{test.label}</h3>
                        <p>{test.dashboardDescription}</p>
                    </a>
                ))}
            </div>

            <div className="dash-info-row">
                {(['License', 'Privacy', 'Compatibility'] as const).map(key => (
                    <div key={key} className="dash-info-card">
                        <h3>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="info-card__svg"><path d={infoSvgPaths[key]} /></svg>
                            {key}
                        </h3>
                        <p>
                            {key === 'License' && <>Released under the <strong>MIT License</strong>. Free to use, modify, and distribute for personal or commercial purposes with attribution.</>}
                            {key === 'Privacy' && <>Hardware, camera, microphone, and sensor tests run <strong>client-side</strong>. Network diagnostics send test requests to public endpoints only after you start them.</>}
                            {key === 'Compatibility' && <>Optimized for <strong>Chromium-based browsers</strong> (Chrome, Edge, Brave). Firefox and Safari support most features. Some APIs (MIDI, Bluetooth) are Chrome-only.</>}
                        </p>
                    </div>
                ))}
            </div>

            <footer className="dash-footer">
                <p>&copy; {CURRENT_YEAR} Hardware Diagnostic Suite. All rights reserved.</p>
            </footer>
        </section>
    );
}
