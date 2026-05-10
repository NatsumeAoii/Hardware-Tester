import { useState, useEffect } from 'react';
import { keyboardLayout, getLocationName } from '../lib/keyboardLayout';

const browserManagedKeys = new Set([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End']);

const isEditableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;

    const tagName = target.tagName.toLowerCase();
    return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select' || tagName === 'button' || tagName === 'a';
};

const shouldPreventDefault = (event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) return false;
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    return browserManagedKeys.has(event.key);
};

export default function KeyboardTester() {
    const [layout, setLayout] = useState('full');
    const [keyValue, setKeyValue] = useState('—');
    const [keyCode, setKeyCode] = useState('—');
    const [keyLocation, setKeyLocation] = useState('—');
    const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
    const [activatedKeys, setActivatedKeys] = useState<Set<string>>(new Set());

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (shouldPreventDefault(e)) e.preventDefault();
            const code = e.code;
            setKeyValue(e.key === ' ' ? 'Space' : e.key);
            setKeyCode(code);
            setKeyLocation(getLocationName(e.location));
            setPressedKeys(prev => new Set(prev).add(code));
            setActivatedKeys(prev => new Set(prev).add(code));
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (shouldPreventDefault(e)) e.preventDefault();
            setPressedKeys(prev => {
                const next = new Set(prev);
                next.delete(e.code);
                return next;
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const totalKeys = keyboardLayout.reduce((sum, row) => sum + row.keys.filter(k => k.code).length, 0);
    const testedCount = activatedKeys.size;

    const reset = () => {
        setPressedKeys(new Set());
        setActivatedKeys(new Set());
        setKeyValue('—');
        setKeyCode('—');
        setKeyLocation('—');
    };

    const getKeyClass = (code: string, extra: string = '') => {
        let cls = `key ${extra}`;
        if (pressedKeys.has(code)) cls += ' pressed';
        if (activatedKeys.has(code)) cls += ' activated';
        return cls;
    };

    const groups = ['main-keys', 'edit-keys', 'numpad'];

    return (
        <section aria-labelledby="keyboard-title">
            <header className="tester-panel__header">
                <h2 id="keyboard-title">Keyboard Tester</h2>
                <p>Press any key to test. Keys turn amber when activated, blue when pressed. Switch layouts to match your keyboard.</p>
            </header>
            <div className="tester-panel__body">
                <div className="info-grid">
                    <div className="info-card"><h3>Key</h3><p>{keyValue}</p></div>
                    <div className="info-card"><h3>Code</h3><p>{keyCode}</p></div>
                    <div className="info-card"><h3>Location</h3><p>{keyLocation}</p></div>
                    <div className="info-card"><h3>Tested</h3><p>{testedCount} / {totalKeys}</p></div>
                </div>
                <div className="controls-bar">
                    <label htmlFor="kbd-layout" className="visually-hidden">Keyboard Layout</label>
                    <select id="kbd-layout" value={layout} onChange={(e) => setLayout(e.target.value)}>
                        <option value="full">100% (Full)</option>
                        <option value="tkl">TKL (87%)</option>
                        <option value="seventy-five">75%</option>
                        <option value="sixty-five">65%</option>
                        <option value="sixty">60%</option>
                    </select>
                    <button className="btn" onClick={reset}>Reset</button>
                </div>
                <div className="keyboard-wrapper" role="region" aria-label="Keyboard Visualizer">
                    <div id="keyboard-ui" className={`keyboard-grid layout-${layout}`}>
                        {groups.map(group => (
                            <div key={group} className={group}>
                                {keyboardLayout.filter(r => r.group === group).map((row, i) => (
                                    <div
                                        key={i}
                                        className={`key-row ${row.type === 'f-keys' ? 'f-keys' : ''} ${row.type === 'arrow-keys' ? 'arrow-keys' : ''} ${row.type === 'hidden-in-75' ? 'hidden-in-75' : ''}`}
                                    >
                                        {row.keys.map((key, j) => (
                                            key.code ? (
                                                <div key={`${key.code}-${j}`} className={getKeyClass(key.code, key.classes)}>
                                                    {key.label}
                                                </div>
                                            ) : (
                                                <div key={`spacer-${j}`} className="key spacer" style={{ visibility: 'hidden' }}>&nbsp;</div>
                                            )
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <style>{`
        .keyboard-wrapper {
          display: flex; justify-content: center; padding: 1.25rem; overflow-x: auto;
          background: var(--surface-panel);
          border-radius: var(--radius); border: 1px solid var(--border);
        }
        .keyboard-grid { display: grid; grid-template-areas: "main edit numpad"; grid-template-columns: auto auto auto; gap: 24px; }
        .main-keys { grid-area: main; } .edit-keys { grid-area: edit; } .numpad { grid-area: numpad; }
        .main-keys, .edit-keys { display: flex; flex-direction: column; gap: 5px; }
        .numpad { display: grid; grid-template-columns: repeat(4, 50px); gap: 5px; }
        .numpad .key-row { display: contents; }
        .numpad .key.h-2 { grid-row: span 2; height: auto; }
        .numpad .key.w-2 { grid-column: span 2; min-width: unset; }
        .key-row { display: flex; gap: 5px; justify-content: center; }
        .key {
          min-width: 50px; height: 50px; background: linear-gradient(180deg, var(--surface-3), var(--surface-2));
          border: 1px solid var(--border); border-bottom: 3px solid rgba(0,0,0,0.3);
          border-radius: 7px; color: var(--text-muted);
          font-size: 0.8rem; font-weight: 500; display: flex; align-items: center;
          justify-content: center; user-select: none; transition: all 0.08s ease-out;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        .key:hover { border-color: var(--secondary); color: var(--text); }
        .key.pressed {
          transform: translateY(2px); border-bottom-width: 1px;
          background: var(--primary); border-color: var(--primary-hover); color: white;
          box-shadow: 0 0 12px var(--primary-glow);
        }
        .key.activated {
          background: linear-gradient(180deg, var(--activated), #d97706);
          color: var(--bg); border-color: #b45309;
        }
        .key.activated.pressed { background: var(--primary); color: white; border-color: var(--primary-hover); }
        .key.w-1-25 { min-width: 64px; } .key.w-1-5 { min-width: 78px; } .key.w-1-75 { min-width: 90px; }
        .key.w-2 { flex-grow: 1; min-width: 103px; } .key.w-2-25 { flex-grow: 1; min-width: 115px; }
        .key.w-2-75 { flex-grow: 1; min-width: 140px; } .key.w-space { flex-grow: 3; min-width: 280px; }
        .key.h-1 { height: 50px; } .key.h-2 { height: 105px; }

        .layout-tkl .numpad, .layout-seventy-five .numpad,
        .layout-sixty-five .numpad, .layout-sixty .numpad { display: none; }
        .layout-sixty .edit-keys { display: none; }
        .hidden-in-75 { display: flex; }
        .layout-seventy-five .hidden-in-75, .layout-sixty-five .hidden-in-75 { display: none; }
        .layout-seventy-five .f-keys, .layout-sixty-five .f-keys, .layout-sixty .f-keys { display: none; }

        @media (max-width: 768px) {
          .keyboard-grid { grid-template-areas: "main" "edit" "numpad"; grid-template-columns: 1fr; }
          .key-row { justify-content: flex-start; }
          .key { min-width: 38px; height: 38px; font-size: 0.7rem; }
          .numpad { grid-template-columns: repeat(4, 38px); }
        }
      `}</style>
        </section>
    );
}
