import { useState, useEffect, useRef, useCallback } from 'react';
import { closeAudioContext, createAudioContext } from '../lib/mediaDiagnostics';
import { formatUserSafeError } from '../lib/userSafeErrors';

type WaveType = 'sine' | 'square' | 'triangle' | 'sawtooth';

export default function SoundTester() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [status, setStatus] = useState('Ready');
    const [volume, setVolume] = useState(0.5);
    const [frequency, setFrequency] = useState(440);
    const [waveType, setWaveType] = useState<WaveType>('sine');

    const audioCtxRef = useRef<AudioContext | null>(null);
    const oscillatorRef = useRef<OscillatorNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const isPlayingRef = useRef(false);

    const stop = useCallback(() => {
        if (!isPlayingRef.current) return;
        if (oscillatorRef.current) {
            try { oscillatorRef.current.stop(); } catch { /* already stopped */ }
            oscillatorRef.current = null;
        }
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            void closeAudioContext(audioCtxRef.current).then(() => { audioCtxRef.current = null; });
        }
        gainNodeRef.current = null;
        isPlayingRef.current = false;
        setIsPlaying(false);
        setStatus('Ready');
    }, []);

    const play = useCallback(async () => {
        if (isPlayingRef.current) return;
        try {
            if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
                audioCtxRef.current = createAudioContext();
            }
            if (audioCtxRef.current.state === 'suspended') {
                await audioCtxRef.current.resume();
            }

            const audioCtx = audioCtxRef.current;
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode).connect(audioCtx.destination);
            gainNode.gain.value = volume;
            oscillator.frequency.value = frequency;
            oscillator.type = waveType;
            oscillator.start();
            oscillator.onended = () => stop();

            oscillatorRef.current = oscillator;
            gainNodeRef.current = gainNode;

            isPlayingRef.current = true;
            setIsPlaying(true);
            setStatus(`Playing ${waveType} @ ${frequency} Hz`);
        } catch (err: unknown) {
            setStatus(formatUserSafeError(err, {
                stableCode: 'AUDIO_OUTPUT_FAILED',
                message: 'Audio output test could not start.',
            }));
        }
    }, [volume, frequency, waveType, stop]);

    useEffect(() => {
        if (isPlayingRef.current && audioCtxRef.current && gainNodeRef.current && oscillatorRef.current) {
            const now = audioCtxRef.current.currentTime;
            gainNodeRef.current.gain.linearRampToValueAtTime(volume, now + 0.05);
            oscillatorRef.current.frequency.linearRampToValueAtTime(frequency, now + 0.05);
        }
    }, [volume, frequency]);

    useEffect(() => {
        return () => { stop(); };
    }, [stop]);

    const waveTypes: { id: WaveType; label: string }[] = [
        { id: 'sine', label: 'Sine' },
        { id: 'square', label: 'Square' },
        { id: 'triangle', label: 'Triangle' },
        { id: 'sawtooth', label: 'Sawtooth' },
    ];

    const getNoteName = (freq: number): string => {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const semitones = 12 * Math.log2(freq / 440);
        const noteIndex = Math.round(semitones) + 9; // A4 = index 9
        const octave = Math.floor((noteIndex + 3) / 12) + 4;
        const name = noteNames[((noteIndex % 12) + 12) % 12];
        return `${name}${octave}`;
    };

    return (
        <section aria-labelledby="sound-title">
            <header className="tester-panel__header">
                <h2 id="sound-title">Sound Output</h2>
                <p>Test your speakers or headphones with a customizable tone generator.</p>
            </header>
            <div className="tester-panel__body">
                <div className="controls-bar">
                    <button className="btn btn--primary" disabled={isPlaying} onClick={play}>Play Tone</button>
                    <button className="btn" disabled={!isPlaying} onClick={stop}>Stop</button>
                    <span className="status-inline" role="status">{status}</span>
                </div>
                <div className="sound-controls">
                    <div className="control-group">
                        <label htmlFor="vol-slider">Volume <span>{Math.round(volume * 100)}%</span></label>
                        <input type="range" id="vol-slider" className="slider" value={volume} min="0" max="1" step="0.01" onChange={(e) => setVolume(parseFloat(e.target.value))} />
                    </div>
                    <div className="control-group">
                        <label htmlFor="freq-slider">Frequency <span>{frequency} Hz</span> <small>({getNoteName(frequency)})</small></label>
                        <input type="range" id="freq-slider" className="slider" value={frequency} min="20" max="8000" step="1" onChange={(e) => setFrequency(parseInt(e.target.value))} />
                    </div>
                    <div className="control-group">
                        <label>Waveform</label>
                        <div className="wave-selector">
                            {waveTypes.map(w => (
                                <button
                                    type="button"
                                    key={w.id}
                                    className={`wave-btn ${waveType === w.id ? 'active' : ''}`}
                                    aria-pressed={waveType === w.id}
                                    onClick={() => setWaveType(w.id)}
                                >{w.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
        .sound-controls {
          display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.25rem;
          background: linear-gradient(135deg, var(--surface-2), var(--surface-1));
          padding: 1.25rem; border-radius: var(--radius); border: 1px solid var(--border);
        }
        .control-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .control-group label { color: var(--text-muted); font-size: var(--text-sm); }
        .control-group label span { color: var(--primary); font-weight: 600; font-family: var(--font-mono); }
        .control-group label small { color: var(--text-muted); font-size: var(--text-xs); opacity: 0.7; }
        .wave-selector { display: flex; gap: 0.4rem; flex-wrap: wrap; }
        .wave-btn {
          padding: 0.4rem 0.75rem; border-radius: var(--radius-sm);
          border: 1px solid var(--border); background: var(--surface-3);
          color: var(--text-muted); cursor: pointer; font-size: var(--text-xs);
          font-family: var(--font); font-weight: 500;
          transition: all var(--transition);
        }
        .wave-btn:hover { border-color: var(--primary); color: var(--text); }
        .wave-btn.active { background: var(--primary); color: white; border-color: var(--primary); }
        .status-inline { color: var(--text-muted); font-size: var(--text-sm); font-family: var(--font-mono); }
        @media (max-width: 1024px) { .sound-controls { grid-template-columns: 1fr; } }
      `}</style>
        </section>
    );
}
