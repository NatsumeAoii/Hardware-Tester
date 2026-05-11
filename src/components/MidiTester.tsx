import { useState, useEffect, useRef, useCallback } from 'react';
import { canRequestMidiAccess, requestMidiAccess } from '../lib/browserAdapters';
import { createDiagnosticState, getDiagnosticMessage, type DiagnosticState } from '../lib/diagnosticState';
import { formatUserSafeError } from '../lib/userSafeErrors';

interface MidiMessage {
    timestamp: number;
    type: string;
    channel: number;
    note: number;
    noteName: string;
    velocity: number;
    raw: string;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToNote(midi: number): string {
    const name = NOTE_NAMES[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${name}${octave}`;
}

function getMessageType(status: number): string {
    const type = status & 0xf0;
    switch (type) {
        case 0x80: return 'Note Off';
        case 0x90: return 'Note On';
        case 0xa0: return 'Aftertouch';
        case 0xb0: return 'CC';
        case 0xc0: return 'Program';
        case 0xd0: return 'Ch Pressure';
        case 0xe0: return 'Pitch Bend';
        default: return `0x${type.toString(16)}`;
    }
}

export default function MidiTester() {
    const [isSupported] = useState(() => canRequestMidiAccess());
    const [status, setStatus] = useState<DiagnosticState>(() => createDiagnosticState('idle', 'Waiting for MIDI access...'));
    const [inputs, setInputs] = useState<string[]>([]);
    const [messages, setMessages] = useState<MidiMessage[]>([]);
    const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
    const [lastNote, setLastNote] = useState('—');
    const [lastVelocity, setLastVelocity] = useState('—');
    const [msgCount, setMsgCount] = useState(0);
    const accessRef = useRef<MIDIAccess | null>(null);
    const logLimit = 100;

    const handleMidiMessage = useCallback((e: MIDIMessageEvent) => {
        const data = e.data;
        if (!data || data.length < 2) return;

        const statusByte = data[0];
        const channel = (statusByte & 0x0f) + 1;
        const type = getMessageType(statusByte);
        const note = data[1];
        const velocity = data.length > 2 ? data[2] : 0;
        const rawHex = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');

        const msg: MidiMessage = {
            timestamp: performance.now(),
            type,
            channel,
            note,
            noteName: midiToNote(note),
            velocity,
            raw: rawHex,
        };

        setMessages(prev => [msg, ...prev].slice(0, logLimit));
        setMsgCount(prev => prev + 1);

        if (type === 'Note On' && velocity > 0) {
            setActiveNotes(prev => new Set(prev).add(note));
            setLastNote(msg.noteName);
            setLastVelocity(String(velocity));
        } else if (type === 'Note Off' || (type === 'Note On' && velocity === 0)) {
            setActiveNotes(prev => { const n = new Set(prev); n.delete(note); return n; });
        }
    }, []);

    const connectMidi = useCallback(async () => {
        if (!isSupported) { setStatus(createDiagnosticState('unsupported', 'Web MIDI API not supported')); return; }
        try {
            setStatus(createDiagnosticState('loading', 'Requesting MIDI access...'));
            const access = await requestMidiAccess({ sysex: false });
            if (!access) throw new DOMException('Web MIDI API is unavailable.', 'NotSupportedError');
            accessRef.current = access;

            const updateInputs = () => {
                const names: string[] = [];
                access.inputs.forEach((input: MIDIInput) => {
                    names.push(input.name || 'Unknown Device');
                    input.onmidimessage = handleMidiMessage;
                });
                setInputs(names);
                setStatus(createDiagnosticState(
                    names.length > 0 ? 'success' : 'idle',
                    names.length > 0 ? `${names.length} device${names.length > 1 ? 's' : ''} connected` : 'No MIDI devices found',
                ));
            };

            updateInputs();
            access.onstatechange = updateInputs;
        } catch (err: unknown) {
            setStatus(createDiagnosticState('error', formatUserSafeError(err, {
                stableCode: 'MIDI_ACCESS_FAILED',
                message: 'MIDI access could not start.',
            })));
        }
    }, [isSupported, handleMidiMessage]);

    useEffect(() => {
        connectMidi();
        return () => {
            if (accessRef.current) {
                accessRef.current.onstatechange = null;
                accessRef.current.inputs.forEach((input: MIDIInput) => {
                    input.onmidimessage = null;
                });
            }
        };
    }, [connectMidi]);

    const clearLog = useCallback(() => { setMessages([]); setMsgCount(0); }, []);

    const pianoKeys = Array.from({ length: 25 }, (_, i) => i + 48); // C3 to C5

    return (
        <section aria-labelledby="midi-title">
            <header className="tester-panel__header">
                <h2 id="midi-title">MIDI Monitor</h2>
                <p>
                    Connect a MIDI controller to see real-time input.
                    {!isSupported && <strong style={{ color: 'var(--error)' }}> Web MIDI API not supported (try Chrome).</strong>}
                </p>
            </header>
            <div className="tester-panel__body">
                <div className="info-grid info-grid--2-col">
                    <div className="info-card"><h4>Devices</h4><p>{inputs.length}</p></div>
                    <div className="info-card"><h4>Messages</h4><p>{msgCount}</p></div>
                    <div className="info-card"><h4>Last Note</h4><p>{lastNote}</p></div>
                    <div className="info-card"><h4>Velocity</h4><p>{lastVelocity}</p></div>
                </div>

                <div className="controls-bar">
                    <span className="status-inline" role="status">{getDiagnosticMessage(status)}</span>
                    <button className="btn" onClick={clearLog} disabled={messages.length === 0}>Clear Log</button>
                </div>

                {inputs.length > 0 && (
                    <div className="midi-devices">
                        {inputs.map((name, i) => (
                            <div key={i} className="midi-device">
                                <span className="midi-device__dot" />
                                {name}
                            </div>
                        ))}
                    </div>
                )}

                <div className="midi-piano" role="img" aria-label="Piano keyboard visualization">
                    {pianoKeys.map(note => {
                        const name = NOTE_NAMES[note % 12];
                        const isBlack = name.includes('#');
                        return (
                            <div
                                key={note}
                                className={`piano-key ${isBlack ? 'black' : 'white'} ${activeNotes.has(note) ? 'active' : ''}`}
                                title={midiToNote(note)}
                            />
                        );
                    })}
                </div>

                {messages.length > 0 && (
                    <div className="midi-log">
                        <h4>Message Log</h4>
                        <div className="midi-log__table">
                            <div className="midi-log__header">
                                <span>Type</span><span>Ch</span><span>Note</span><span>Vel</span><span>Raw</span>
                            </div>
                            {messages.slice(0, 30).map((msg, i) => (
                                <div key={i} className={`midi-log__row ${msg.type.includes('Note On') ? 'on' : msg.type.includes('Note Off') ? 'off' : ''}`}>
                                    <span>{msg.type}</span>
                                    <span>{msg.channel}</span>
                                    <span>{msg.noteName}</span>
                                    <span>{msg.velocity}</span>
                                    <span className="raw">{msg.raw}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <style>{`
        .midi-devices { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .midi-device {
          display: flex; align-items: center; gap: 0.5rem;
          background: var(--surface-2); border: 1px solid var(--border);
          border-radius: var(--radius-sm); padding: 0.4rem 0.75rem;
          font-size: var(--text-sm); color: var(--text);
        }
        .midi-device__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success); box-shadow: 0 0 6px var(--success); }

        .midi-piano {
          display: flex; height: 80px; gap: 1px; position: relative;
          background: var(--surface-1); border-radius: var(--radius-sm);
          padding: 0.5rem; border: 1px solid var(--border); overflow: hidden;
        }
        .piano-key { flex: 1; border-radius: 0 0 4px 4px; transition: all 0.08s ease; min-width: 0; }
        .piano-key.white { background: linear-gradient(180deg, #f0f0f0, #d8d8d8); }
        .piano-key.black { background: linear-gradient(180deg, #333, #111); height: 55%; z-index: 1; margin: 0 -2px; }
        .piano-key.active.white { background: var(--primary); box-shadow: 0 0 12px var(--primary-glow); }
        .piano-key.active.black { background: var(--primary-hover); box-shadow: 0 0 12px var(--primary-glow); }

        .midi-log { background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem; overflow: hidden; }
        .midi-log h4 { color: var(--text-muted); font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.5rem; }
        .midi-log__table { overflow-x: auto; }
        .midi-log__header, .midi-log__row {
          display: grid; grid-template-columns: 100px 40px 60px 40px 1fr;
          gap: 0.5rem; padding: 0.3rem 0; font-size: var(--text-xs); font-family: var(--font-mono);
        }
        .midi-log__header { color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); padding-bottom: 0.4rem; margin-bottom: 0.25rem; }
        .midi-log__row { color: var(--text-muted); }
        .midi-log__row.on { color: var(--success); }
        .midi-log__row.off { color: var(--text-muted); opacity: 0.5; }
        .midi-log__row .raw { opacity: 0.4; }
        .status-inline { color: var(--text-muted); font-size: var(--text-sm); font-family: var(--font-mono); }
      `}</style>
        </section>
    );
}
