import { useCallback } from 'react';
import { printWhenFontsReady } from '../lib/browserAdapters';

const colorBars = [
    { color: '#00ffff', label: 'Cyan' },
    { color: '#ff00ff', label: 'Magenta' },
    { color: '#ffff00', label: 'Yellow' },
    { color: '#000000', label: 'Black (K)' },
    { color: '#ff0000', label: 'Red' },
    { color: '#00ff00', label: 'Green' },
    { color: '#0000ff', label: 'Blue' },
    { color: '#ffffff', label: 'White' },
];

export default function PrinterTest() {
    const printedDate = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    }).format(new Date());

    const handlePrint = useCallback(() => {
        printWhenFontsReady();
    }, []);

    return (
        <section aria-labelledby="print-title">
            <header className="tester-panel__header">
                <h2 id="print-title">Printer Test Page</h2>
                <p>Generate a calibrated test page for verifying printer color accuracy, alignment, and text rendering. Click the button to print.</p>
            </header>
            <div className="tester-panel__body">
                <div className="controls-bar no-print">
                    <button type="button" className="btn btn--primary" onClick={handlePrint}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginRight: '6px' }}>
                            <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
                        </svg>
                        Print Test Page
                    </button>
                </div>

                <div className="print-page" id="printable-area">
                    <div className="print-header">
                        <h2>Printer Calibration Test Sheet</h2>
                        <p>Hardware Diagnostic Suite - Printed: {printedDate}</p>
                    </div>

                    <div className="print-section">
                        <h3>1. Color Bars (CMYK + RGB)</h3>
                        <div className="color-bars">
                            {colorBars.map(c => (
                                <div
                                    key={c.label}
                                    className="color-bar"
                                    style={{
                                        backgroundColor: c.color,
                                        color: ['#000000', '#0000ff'].includes(c.color) ? '#fff' : '#000',
                                        border: c.color === '#ffffff' ? '1px solid #ccc' : 'none',
                                    }}
                                >
                                    {c.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="print-section">
                        <h3>2. Grayscale Gradient</h3>
                        <div className="gray-gradient">
                            {Array.from({ length: 20 }, (_, i) => {
                                const v = Math.round((i / 19) * 255);
                                return (
                                    <div key={i} className="gray-step" style={{ backgroundColor: `rgb(${v},${v},${v})` }}>
                                        <span style={{ color: v > 128 ? '#000' : '#fff', fontSize: '8px' }}>{Math.round((v / 255) * 100)}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="print-section">
                        <h3>3. Text Rendering</h3>
                        <div className="text-samples">
                            <p style={{ fontSize: '24px', fontWeight: 700 }}>Bold 24px - The quick brown fox</p>
                            <p style={{ fontSize: '16px' }}>Regular 16px - The quick brown fox jumps over the lazy dog</p>
                            <p style={{ fontSize: '12px' }}>Small 12px - The quick brown fox jumps over the lazy dog 0123456789</p>
                            <p style={{ fontSize: '10px' }}>Tiny 10px - The quick brown fox jumps over the lazy dog 0123456789!@#$%</p>
                            <p style={{ fontSize: '8px' }}>Micro 8px - The quick brown fox jumps over the lazy dog 0123456789!@#$%^&*()</p>
                            <p style={{ fontSize: '14px', fontFamily: 'monospace' }}>Monospace - 0O oO lI1| ASCII arrows: -&gt; &lt;- up down</p>
                        </div>
                    </div>

                    <div className="print-section print-two-col">
                        <div>
                            <h3>4. Alignment Grid</h3>
                            <div className="alignment-grid">
                                {Array.from({ length: 64 }, (_, i) => (
                                    <div key={i} className="grid-cell" style={{ background: (Math.floor(i / 8) + i % 8) % 2 === 0 ? '#000' : '#fff' }} />
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3>5. Fine Lines</h3>
                            <div className="fine-lines">
                                {[0.5, 1, 1.5, 2, 3, 4].map(w => (
                                    <div key={w} className="fine-line-row">
                                        <span>{w}px</span>
                                        <div className="fine-line" style={{ height: `${w}px` }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="print-section">
                        <h3>6. Color Saturation</h3>
                        <div className="saturation-row">
                            {['red', 'green', 'blue'].map(hue => (
                                <div key={hue} className="saturation-strip">
                                    <span>{hue}</span>
                                    <div className="sat-cells">
                                        {Array.from({ length: 10 }, (_, i) => {
                                            const pct = ((i + 1) / 10) * 100;
                                            const bg = hue === 'red'
                                                ? `rgb(${Math.round(pct * 2.55)},0,0)`
                                                : hue === 'green'
                                                    ? `rgb(0,${Math.round(pct * 2.55)},0)`
                                                    : `rgb(0,0,${Math.round(pct * 2.55)})`;
                                            return (
                                                <div key={i} className="sat-cell" style={{ background: bg }}>
                                                    <span style={{ color: pct > 50 ? '#fff' : '#111', fontSize: '7px' }}>{pct}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="print-footer">
                        <p>If all sections render clearly, your printer is functioning correctly.</p>
                        <p>Missing colors - ink/toner issue &middot; Blurry text - alignment issue &middot; Banding - printhead issue</p>
                    </div>
                </div>
            </div>
            <style>{`
        .print-page,
        .print-page * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-page {
          background: white; color: #000; border-radius: var(--radius); padding: 2rem;
          border: 1px solid var(--border); font-family: Arial, sans-serif;
        }
        .print-header { text-align: center; margin-bottom: 1.5rem; border-bottom: 2px solid #000; padding-bottom: 1rem; }
        .print-header h2 { color: #000; font-size: 1.5rem; margin-bottom: 0.25rem; }
        .print-header p { color: #666; font-size: 12px; }
        .print-section { margin-bottom: 1.5rem; break-inside: avoid; }
        .print-section h3 { font-size: 14px; color: #000; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0; }
        .color-bars { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; }
        .color-bar { padding: 1rem 0.5rem; text-align: center; font-size: 11px; font-weight: 600; }
        .gray-gradient { display: flex; }
        .gray-step { flex: 1; height: 40px; display: flex; align-items: center; justify-content: center; }
        .text-samples p { margin: 0.35rem 0; color: #000; }
        .print-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        .alignment-grid { display: grid; grid-template-columns: repeat(8, 1fr); width: 160px; border: 1px solid #000; }
        .grid-cell { aspect-ratio: 1; }
        .fine-lines { display: flex; flex-direction: column; gap: 0.75rem; }
        .fine-line-row { display: flex; align-items: center; gap: 0.5rem; }
        .fine-line-row span { font-size: 11px; color: #000; width: 30px; }
        .fine-line { background: #000; width: 100%; }
        .saturation-row { display: flex; flex-direction: column; gap: 0.5rem; }
        .saturation-strip { display: flex; align-items: center; gap: 0.5rem; }
        .saturation-strip > span { font-size: 11px; text-transform: uppercase; width: 40px; color: #000; font-weight: 600; }
        .sat-cells { display: flex; flex: 1; }
        .sat-cell { flex: 1; height: 28px; display: flex; align-items: center; justify-content: center; }
        .print-footer { text-align: center; border-top: 1px solid #ccc; padding-top: 1rem; }
        .print-footer p { font-size: 11px; color: #666; margin: 0.15rem 0; }
        @page { size: A4; margin: 10mm; }
        @media print {
          .no-print, .sidebar, .a11y-controls, .sidebar-open-btn, .tester-panel__header, .sidebar-backdrop { display: none !important; }
          html, body { height: auto !important; overflow: visible !important; background: white !important; color: #000 !important; }
          #root { display: block !important; height: auto !important; overflow: visible !important; }
          .content { padding: 0 !important; height: auto !important; overflow: visible !important; max-width: none !important; }
          .tester-panel__body { animation: none !important; display: block !important; }
          .print-page {
            border: none !important; border-radius: 0 !important; padding: 0 !important;
            box-shadow: none !important; width: 100% !important; max-width: none !important;
          }
          .color-bar, .gray-step, .sat-cell, .grid-cell, .fine-line {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
        </section>
    );
}
