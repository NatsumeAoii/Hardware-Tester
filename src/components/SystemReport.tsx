import { useState, useMemo, useCallback } from 'react';
import { printWhenFontsReady } from '../lib/browserAdapters';
import { useDeviceSpecs } from '../hooks/useDeviceSpecs';

type TestStatus = 'pending' | 'pass' | 'fail' | 'skip';

const ALL_TESTS = ['Keyboard', 'Mouse', 'Double Click', 'Gamepad', 'Touch', 'MIDI',
    'Screen', 'Microphone', 'Sound', 'Webcam', 'Vibration',
    'Battery', 'GPU', 'Motion', 'Geolocation', 'Light Sensor', 'Bluetooth',
    'Network', 'Burn-in Fix', 'Print Test'];

const TEST_GROUPS = [
    { name: 'Input Devices', tests: ['Keyboard', 'Mouse', 'Double Click', 'Gamepad', 'Touch', 'MIDI'] },
    { name: 'Output & Media', tests: ['Screen', 'Microphone', 'Sound', 'Webcam', 'Vibration'] },
    { name: 'System & Sensors', tests: ['Battery', 'GPU', 'Motion', 'Geolocation', 'Light Sensor', 'Bluetooth'] },
    { name: 'Network & Connectivity', tests: ['Network'] },
    { name: 'Utilities', tests: ['Burn-in Fix', 'Print Test'] },
];

export default function SystemReport() {
    const { specs, battery, storage } = useDeviceSpecs();
    const [results, setResults] = useState<Record<string, TestStatus>>({});
    const [technicianName, setTechnicianName] = useState('');
    const [notes, setNotes] = useState('');
    const [reportDate] = useState(() => new Date().toLocaleString());
    const [refId] = useState(() => Math.random().toString(36).substr(2, 9).toUpperCase());

    const setStatus = (testName: string, status: TestStatus) => {
        setResults(prev => ({ ...prev, [testName]: status }));
    };

    const markAll = (status: TestStatus) => {
        const next: Record<string, TestStatus> = {};
        ALL_TESTS.forEach(t => next[t] = status);
        setResults(next);
    };

    const resetAll = () => setResults({});

    const summary = useMemo(() => {
        const counts = { pass: 0, fail: 0, skip: 0, pending: 0 };
        ALL_TESTS.forEach(t => {
            const s = results[t] || 'pending';
            counts[s]++;
        });
        return counts;
    }, [results]);

    const handlePrint = useCallback(() => {
        printWhenFontsReady();
    }, []);

    const getStatusIcon = (status: TestStatus) => {
        switch (status) {
            case 'pass': return <span className="rpt-status-icon rpt-pass">✓</span>;
            case 'fail': return <span className="rpt-status-icon rpt-fail">✗</span>;
            case 'skip': return <span className="rpt-status-icon rpt-skip">−</span>;
            default: return <span className="rpt-status-icon rpt-pending">○</span>;
        }
    };

    const getStatusLabel = (status: TestStatus) => {
        switch (status) {
            case 'pass': return 'PASS';
            case 'fail': return 'FAIL';
            case 'skip': return 'SKIP';
            default: return 'PENDING';
        }
    };

    return (
        <section className="rpt-container">
            <div className="rpt-controls no-print">
                <header>
                    <h2>System Diagnostic Report</h2>
                    <p>Manually mark tests as you verify them, then generate a PDF report.</p>
                </header>
                <div className="rpt-actions">
                    <button className="btn btn--primary" onClick={handlePrint}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" /></svg>
                        Print Report
                    </button>
                    <div className="rpt-input-group">
                        <label>Technician:</label>
                        <input type="text" value={technicianName} onChange={e => setTechnicianName(e.target.value)} placeholder="Name..." />
                    </div>
                </div>
            </div>

            <div className="rpt-summary-bar no-print">
                <div className="rpt-summary-item rpt-s-pass"><strong>{summary.pass}</strong> Pass</div>
                <div className="rpt-summary-item rpt-s-fail"><strong>{summary.fail}</strong> Fail</div>
                <div className="rpt-summary-item rpt-s-skip"><strong>{summary.skip}</strong> Skip</div>
                <div className="rpt-summary-item rpt-s-pending"><strong>{summary.pending}</strong> Pending</div>
                <div className="rpt-batch-actions">
                    <button className="btn-sm rpt-b-pass" onClick={() => markAll('pass')}>All Pass</button>
                    <button className="btn-sm rpt-b-fail" onClick={() => markAll('fail')}>All Fail</button>
                    <button className="btn-sm rpt-b-reset" onClick={resetAll}>Reset</button>
                </div>
            </div>

            <div className="rpt-paper">
                <div className="rpt-header">
                    <div className="rpt-title">
                        <h1>Hardware Diagnostic Report</h1>
                        <div className="rpt-meta">
                            <p><strong>Date:</strong> {reportDate}</p>
                            <p><strong>Technician:</strong> {technicianName || '________________'}</p>
                            <p><strong>Ref ID:</strong> {refId}</p>
                        </div>
                    </div>
                    <div className="rpt-logo">
                        <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><path d="M22 6H2v12h20V6zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm8 0h-3v-2h3v2zm0-4h-3V9h3v2z" /></svg>
                    </div>
                </div>

                <div className="rpt-section">
                    <h3>Device Specifications</h3>
                    <table className="rpt-specs-table">
                        <tbody>
                            <tr><th>Device Type</th><td>{specs.deviceType}</td><th>OS</th><td>{specs.os}</td></tr>
                            <tr><th>Browser</th><td>{specs.browser}</td><th>CPU</th><td>{specs.cpuThreads} logical threads</td></tr>
                            <tr><th>RAM</th><td>{specs.ram}</td><th>GPU</th><td>{specs.gpu}</td></tr>
                            <tr><th>Screen</th><td>{specs.screenResolution} - {specs.colorDepth}</td><th>Touch</th><td>{specs.maxTouchPoints} points</td></tr>
                            <tr>
                                <th>Battery</th>
                                <td>{battery.level !== null ? `${battery.level}% ${battery.charging ? '⚡ Charging' : ''}` : 'N/A'}</td>
                                <th>Browser Storage</th>
                                <td>{storage ? `${storage.used} / ${storage.quota}` : 'N/A'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="rpt-section">
                    <h3>Diagnostic Summary</h3>
                    <div className="rpt-print-summary">
                        <span className="rpt-ps-pass">{summary.pass} Passed</span>
                        <span className="rpt-ps-fail">{summary.fail} Failed</span>
                        <span className="rpt-ps-skip">{summary.skip} Skipped</span>
                        <span className="rpt-ps-pending">{summary.pending} Pending</span>
                    </div>
                </div>

                <div className="rpt-section">
                    <h3>Diagnostic Results</h3>
                    <div className="rpt-results-grid">
                        {TEST_GROUPS.map(group => (
                            <div key={group.name} className="rpt-result-group">
                                <h4>{group.name}</h4>
                                <table className="rpt-results-table">
                                    <thead><tr><th>Test Component</th><th>Status</th><th className="no-print">Action</th></tr></thead>
                                    <tbody>
                                        {group.tests.map(test => (
                                            <tr key={test} className={`rpt-row-${results[test] || 'pending'}`}>
                                                <td className="rpt-test-name">{test}</td>
                                                <td className="rpt-test-status">
                                                    {getStatusIcon(results[test] || 'pending')}
                                                    {getStatusLabel(results[test] || 'pending')}
                                                </td>
                                                <td className="rpt-test-actions no-print">
                                                    <button type="button" className={`rpt-btn-status rpt-bst-pass ${results[test] === 'pass' ? 'active' : ''}`} onClick={() => setStatus(test, 'pass')} aria-label={`Mark ${test} as pass`} aria-pressed={results[test] === 'pass'} title="Pass">✓</button>
                                                    <button type="button" className={`rpt-btn-status rpt-bst-fail ${results[test] === 'fail' ? 'active' : ''}`} onClick={() => setStatus(test, 'fail')} aria-label={`Mark ${test} as fail`} aria-pressed={results[test] === 'fail'} title="Fail">✗</button>
                                                    <button type="button" className={`rpt-btn-status rpt-bst-skip ${results[test] === 'skip' ? 'active' : ''}`} onClick={() => setStatus(test, 'skip')} aria-label={`Mark ${test} as skip`} aria-pressed={results[test] === 'skip'} title="Skip">−</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rpt-section">
                    <h3>Technician Notes</h3>
                    <textarea className="rpt-notes-area" value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="Enter any additional observations, repairs needed, or hardware issues found..." />
                    <div className="rpt-print-notes">{notes || 'No notes provided.'}</div>
                </div>

                <footer className="rpt-footer">
                    <p>Generated by Hardware Diagnostic Suite &middot; https://github.com/wardana/hardware-diagnostic-suite</p>
                </footer>
            </div>

            <style>{`
                .rpt-paper,
                .rpt-paper * {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }

                .rpt-container { max-width: 900px; margin: 0 auto; padding-bottom: 4rem; }
                .rpt-controls {
                    background: var(--surface-2); border: 1px solid var(--border);
                    padding: 1.5rem; border-radius: var(--radius); margin-bottom: 1rem;
                    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;
                }
                .rpt-actions { display: flex; gap: 1.5rem; align-items: center; }
                .rpt-input-group { display: flex; align-items: center; gap: 0.5rem; }
                .rpt-input-group input {
                    background: var(--surface-1); border: 1px solid var(--border);
                    padding: 0.5rem; border-radius: var(--radius-sm); color: var(--text);
                }

                .rpt-summary-bar {
                    display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
                    padding: 0.75rem 1rem; border-radius: var(--radius);
                    background: var(--surface-2); border: 1px solid var(--border); margin-bottom: 1.5rem;
                }
                .rpt-summary-item { font-size: var(--text-sm); color: var(--text-muted); }
                .rpt-summary-item strong { font-family: var(--font-mono); margin-right: 0.25rem; }
                .rpt-s-pass strong { color: #16a34a; }
                .rpt-s-fail strong { color: #dc2626; }
                .rpt-s-skip strong { color: #9ca3af; }
                .rpt-s-pending strong { color: #f59e0b; }
                .rpt-batch-actions { display: flex; gap: 0.5rem; margin-left: auto; }
                .btn-sm {
                    padding: 0.3rem 0.65rem; border-radius: var(--radius-sm); font-size: var(--text-xs);
                    border: 1px solid var(--border); background: var(--surface-3); color: var(--text-muted);
                    cursor: pointer; font-family: var(--font); transition: all var(--transition);
                }
                .btn-sm:hover { border-color: var(--primary); color: var(--text); }
                .rpt-b-pass:hover { background: #16a34a; color: white; border-color: #16a34a; }
                .rpt-b-fail:hover { background: #dc2626; color: white; border-color: #dc2626; }

                .rpt-paper {
                    background: white; color: black; padding: 2.5rem;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1); border-radius: 2px;
                }

                .rpt-header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 1.5rem; margin-bottom: 2rem; }
                .rpt-title h1 { margin: 0; font-size: 1.8rem; color: #111; }
                .rpt-meta { margin-top: 0.5rem; font-size: 0.9rem; color: #555; }
                .rpt-logo { color: #333; }

                .rpt-section { margin-bottom: 2rem; }
                .rpt-section h3 {
                    font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.05em;
                    color: #444; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; margin-bottom: 1rem;
                }

                .rpt-print-summary { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; font-size: 0.95rem; }
                .rpt-ps-pass { color: #16a34a; font-weight: 600; }
                .rpt-ps-fail { color: #dc2626; font-weight: 600; }
                .rpt-ps-skip { color: #9ca3af; font-weight: 600; }
                .rpt-ps-pending { color: #f59e0b; font-weight: 600; }

                .rpt-specs-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
                .rpt-specs-table th { text-align: left; padding: 0.4rem; color: #666; width: 15%; border-bottom: 1px solid #eee; }
                .rpt-specs-table td { padding: 0.4rem; color: #111; font-weight: 500; width: 35%; border-bottom: 1px solid #eee; }

                .rpt-results-grid { display: grid; gap: 2rem; }
                .rpt-result-group h4 { margin: 0 0 0.5rem 0; font-size: 1rem; color: #333; }

                .rpt-results-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
                .rpt-results-table th { text-align: left; padding: 0.5rem; background: #f5f5f5; color: #555; font-weight: 600; }
                .rpt-results-table td { padding: 0.4rem 0.5rem; border-bottom: 1px solid #eee; }

                .rpt-status-icon { display: inline-block; width: 1.2rem; text-align: center; margin-right: 0.4rem; font-weight: bold; }
                .rpt-row-pass .rpt-status-icon { color: #16a34a; } .rpt-row-pass .rpt-test-status { color: #16a34a; font-weight: 600; }
                .rpt-row-fail .rpt-status-icon { color: #dc2626; } .rpt-row-fail .rpt-test-status { color: #dc2626; font-weight: 600; }
                .rpt-row-skip .rpt-status-icon { color: #9ca3af; } .rpt-row-skip .rpt-test-status { color: #9ca3af; }
                .rpt-row-pending .rpt-status-icon { color: #ccc; } .rpt-row-pending .rpt-test-status { color: #999; }

                .rpt-test-actions { display: flex; gap: 0.25rem; justify-content: flex-end; }
                .rpt-btn-status {
                    width: 24px; height: 24px; border: 1px solid #ddd; background: white;
                    border-radius: 4px; cursor: pointer; color: #999; display: flex; align-items: center; justify-content: center;
                    font-size: 14px;
                }
                .rpt-btn-status:hover { background: #f5f5f5; }
                .rpt-bst-pass.active { background: #16a34a; color: white; border-color: #16a34a; }
                .rpt-bst-fail.active { background: #dc2626; color: white; border-color: #dc2626; }
                .rpt-bst-skip.active { background: #9ca3af; color: white; border-color: #9ca3af; }

                .rpt-notes-area {
                    width: 100%; min-height: 100px; padding: 0.75rem;
                    border: 1px solid var(--border); background: var(--surface-1); color: var(--text);
                    border-radius: var(--radius-sm); resize: vertical; display: block;
                }
                .rpt-print-notes { display: none; white-space: pre-wrap; font-family: sans-serif; line-height: 1.5; color: #333; }
                .rpt-footer { text-align: center; font-size: 0.8rem; color: #888; margin-top: 2rem; border-top: 1px solid #eee; padding-top: 1rem; }

                @media print {
                    @page { margin: 0.5cm; }
                    body { background: white; color: black; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .sidebar, .a11y-controls, .skip-link, .no-print { display: none !important; }
                    .content { padding: 0 !important; margin: 0 !important; width: 100% !important; height: auto !important; overflow: visible !important; }
                    .rpt-container { max-width: 100%; padding: 0; }
                    .rpt-paper { box-shadow: none; padding: 0; }
                    .rpt-notes-area { display: none; }
                    .rpt-print-notes { display: block; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; min-height: 80px; }
                    .rpt-specs-table th, .rpt-specs-table td, .rpt-results-table td { border-bottom-color: #ccc; }
                    .rpt-results-table th { background: #eee !important; color: #333 !important; }
                    .rpt-result-group { break-inside: avoid; }
                    tr { break-inside: avoid; }
                }
            `}</style>
        </section>
    );
}
