import { useState, useEffect, useRef, useCallback } from 'react';
import {
    closeAudioContext,
    createAudioContext,
    getAudioTrackSettings,
    requestUserMedia,
    resizeCanvasToDisplaySize,
    stopMediaStream,
} from '../lib/mediaDiagnostics';
import { cancelAnimationFrameIfSet } from '../lib/lifecycle';
import { throwIfPermissionDenied } from '../lib/permissions';
import { formatUserSafeError } from '../lib/userSafeErrors';

export default function MicTester() {
    const [isTesting, setIsTesting] = useState(false);
    const [status, setStatus] = useState('Ready — click Start to begin');
    const [sampleRate, setSampleRate] = useState('—');
    const [latency, setLatency] = useState('—');
    const [channels, setChannels] = useState('—');
    const [noiseSuppression, setNoiseSuppression] = useState('—');
    const [levelWidth, setLevelWidth] = useState(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameIdRef = useRef<number>(0);
    const isTestingRef = useRef(false);

    const visualize = useCallback(() => {
        if (!analyserRef.current || !canvasRef.current) return;

        const analyser = analyserRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufLen = analyser.fftSize;
        const data = new Uint8Array(bufLen);
        analyser.getByteTimeDomainData(data);

        let sum = 0;
        for (const amp of data) sum += ((amp / 128) - 1) ** 2;
        const rms = Math.sqrt(sum / data.length);
        setLevelWidth(Math.min(100, rms * 400));

        const w = canvas.width;
        const h = canvas.height;
        const dpr = window.devicePixelRatio || 1;

        ctx.clearRect(0, 0, w, h);

        // Gradient waveform stroke
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, '#3b82f6');
        grad.addColorStop(0.5, '#8b5cf6');
        grad.addColorStop(1, '#3b82f6');

        ctx.lineWidth = 2 * dpr;
        ctx.strokeStyle = grad;
        ctx.beginPath();

        const displayW = w / dpr;
        const displayH = h / dpr;
        const sliceW = displayW / bufLen;
        let x = 0;
        for (let i = 0; i < bufLen; i++) {
            const y = (data[i] / 128) * displayH / 2;
            if (i === 0) ctx.moveTo(x * dpr, y * dpr);
            else ctx.lineTo(x * dpr, y * dpr);
            x += sliceW;
        }
        ctx.stroke();

        animFrameIdRef.current = requestAnimationFrame(visualize);
    }, []);

    const stopTest = useCallback(() => {
        if (!isTestingRef.current) return;
        cancelAnimationFrameIfSet(animFrameIdRef.current);

        stopMediaStream(streamRef.current);
        streamRef.current = null;
        void closeAudioContext(audioCtxRef.current).catch(() => { /* audio context cleanup is best-effort */ });
        audioCtxRef.current = null;
        analyserRef.current = null;

        isTestingRef.current = false;
        setIsTesting(false);
        setStatus('Stopped');
        setLevelWidth(0);
        setSampleRate('—');
        setLatency('—');
        setChannels('—');
        setNoiseSuppression('—');

        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }, []);

    const startTest = useCallback(async () => {
        if (isTestingRef.current) return;
        try {
            await throwIfPermissionDenied('microphone' as PermissionName, 'Microphone');
            const stream = await requestUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
            streamRef.current = stream;

            const audioCtx = createAudioContext();
            audioCtxRef.current = audioCtx;

            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);
            analyserRef.current = analyser;

            isTestingRef.current = true;
            setIsTesting(true);
            setStatus('Listening — speak into your microphone');

            const settings = getAudioTrackSettings(stream);
            setSampleRate(`${(audioCtx.sampleRate / 1000).toFixed(1)} kHz`);
            setLatency(`${((audioCtx.baseLatency || 0) * 1000).toFixed(0)} ms`);
            setChannels(String(source.channelCount));
            setNoiseSuppression(settings?.noiseSuppression ? 'Enabled' : 'Disabled');

            visualize();
        } catch (err: unknown) {
            stopMediaStream(streamRef.current);
            streamRef.current = null;
            void closeAudioContext(audioCtxRef.current).catch(() => { /* audio context cleanup is best-effort */ });
            audioCtxRef.current = null;
            analyserRef.current = null;
            isTestingRef.current = false;
            setIsTesting(false);
            setLevelWidth(0);
            setStatus(formatUserSafeError(err, {
                stableCode: 'MICROPHONE_START_FAILED',
                message: 'Microphone test could not start.',
            }));
        }
    }, [visualize]);

    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasRef.current) {
                resizeCanvasToDisplaySize(canvasRef.current);
            }
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        return () => {
            stopTest();
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [stopTest]);

    return (
        <section aria-labelledby="mic-title">
            <header className="tester-panel__header">
                <h2 id="mic-title">Microphone Tester</h2>
                <p>Allow microphone access to test your input device. No audio is recorded or sent anywhere.</p>
            </header>
            <div className="tester-panel__body">
                <div className="controls-bar">
                    <button className="btn btn--primary" disabled={isTesting} onClick={startTest}>Start Test</button>
                    <button className="btn" disabled={!isTesting} onClick={stopTest}>Stop Test</button>
                    <span className="status-inline" role="status">{status}</span>
                </div>
                <div className="mic-viz">
                    <div className="mic-viz__section">
                        <h4>Input Level</h4>
                        <div className="level-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={levelWidth}>
                            <div className="level-bar" style={{ width: `${levelWidth}%` }}></div>
                        </div>
                    </div>
                    <div className="mic-viz__section">
                        <h4>Waveform</h4>
                        <canvas ref={canvasRef} className="waveform-canvas" aria-label="Audio waveform visualization"></canvas>
                    </div>
                </div>
                <div className="info-grid">
                    <div className="info-card"><h4>Sample Rate</h4><p>{sampleRate}</p></div>
                    <div className="info-card"><h4>Latency</h4><p>{latency}</p></div>
                    <div className="info-card"><h4>Channels</h4><p>{channels}</p></div>
                    <div className="info-card"><h4>Noise Suppression</h4><p>{noiseSuppression}</p></div>
                </div>
            </div>
            <style>{`
        .mic-viz {
          background: linear-gradient(135deg, var(--surface-1), var(--surface-2));
          padding: 1.25rem; border-radius: var(--radius);
          display: flex; flex-direction: column; gap: 1rem; border: 1px solid var(--border);
        }
        .mic-viz__section { display: flex; flex-direction: column; gap: 0.5rem; }
        .mic-viz h4 { color: var(--text-muted); font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 500; }
        .level-meter { width: 100%; height: 16px; background-color: var(--bg); border-radius: 8px; overflow: hidden; }
        .level-bar {
          width: 0; height: 100%;
          background: linear-gradient(90deg, var(--success), var(--warning), var(--error));
          background-size: 300% 100%; background-position: left;
          transition: width 0.1s linear; border-radius: 8px;
        }
        .waveform-canvas { width: 100%; height: 100px; background-color: var(--bg); border-radius: var(--radius-sm); }
        .status-inline { color: var(--text-muted); font-size: var(--text-sm); font-family: var(--font-mono); }
      `}</style>
        </section>
    );
}
