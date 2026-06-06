import { useState, useEffect, useRef } from 'react';
import {
    attachStreamToVideo,
    clearVideoSource,
    downloadDataUrl,
    getVideoTrackSettings,
    requestUserMedia,
    stopMediaStream,
} from '../lib/mediaDiagnostics';
import { cancelAnimationFrameIfSet } from '../lib/lifecycle';
import { throwIfPermissionDenied } from '../lib/permissions';
import { formatUserSafeError } from '../lib/userSafeErrors';

export default function WebcamTester() {
    const [isActive, setIsActive] = useState(false);
    const [cameraStatus, setCameraStatus] = useState('Off');
    const [resolution, setResolution] = useState('—');
    const [fps, setFps] = useState('—');
    const [facingMode, setFacingMode] = useState('—');
    const [capturedImage, setCapturedImage] = useState('');
    const [showCapture, setShowCapture] = useState(false);
    const [isMirrored, setIsMirrored] = useState(true);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const requestRef = useRef<number>(0);
    const lastFrameTimeRef = useRef<number>(0);
    const frameCountRef = useRef<number>(0);
    const isActiveRef = useRef(false);

    const startWebcam = async () => {
        if (isActiveRef.current) return;
        isActiveRef.current = true;
        setIsActive(true);
        let stream: MediaStream | null = null;
        try {
            setCameraStatus('Starting...');
            await throwIfPermissionDenied('camera', 'Camera');

            if (!isActiveRef.current) {
                return;
            }

            stream = await requestUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 } }
            });

            if (!isActiveRef.current) {
                stopMediaStream(stream);
                return;
            }

            streamRef.current = stream;
            if (videoRef.current) {
                await attachStreamToVideo(videoRef.current, stream);
            }

            if (!isActiveRef.current) {
                stopMediaStream(stream);
                streamRef.current = null;
                clearVideoSource(videoRef.current);
                return;
            }

            setCameraStatus('Active');

            const settings = getVideoTrackSettings(stream);
            setResolution(settings?.width && settings.height ? `${settings.width} × ${settings.height}` : '—');
            setFacingMode(settings?.facingMode || 'user');

            frameCountRef.current = 0;
            lastFrameTimeRef.current = performance.now();
            requestRef.current = requestAnimationFrame(updateFPS);
        } catch (err: unknown) {
            stopMediaStream(stream);
            streamRef.current = null;
            isActiveRef.current = false;
            setIsActive(false);
            setResolution('—');
            setFps('—');
            setFacingMode('—');
            setCameraStatus(formatUserSafeError(err, {
                stableCode: 'CAMERA_START_FAILED',
                message: 'Camera test could not start.',
            }));
        }
    };

    const stopWebcam = () => {
        if (!isActiveRef.current) return;
        cancelAnimationFrameIfSet(requestRef.current);
        stopMediaStream(streamRef.current);
        clearVideoSource(videoRef.current);
        streamRef.current = null;
        isActiveRef.current = false;
        setIsActive(false);
        setCameraStatus('Off');
        setResolution('—');
        setFps('—');
        setFacingMode('—');
    };

    const updateFPS = () => {
        if (!isActiveRef.current) return;
        frameCountRef.current++;
        const now = performance.now();
        if (now - lastFrameTimeRef.current >= 1000) {
            setFps(String(frameCountRef.current));
            frameCountRef.current = 0;
            lastFrameTimeRef.current = now;
        }
        requestRef.current = requestAnimationFrame(updateFPS);
    };

    const capturePhoto = () => {
        if (!isActiveRef.current || !videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            if (isMirrored) {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.92));
        setShowCapture(true);
    };

    const downloadPhoto = () => {
        if (!capturedImage) return;
        downloadDataUrl(capturedImage, `webcam-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`);
    };

    useEffect(() => {
        return () => {
            stopWebcam();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <section aria-labelledby="webcam-title">
            <header className="tester-panel__header">
                <h2 id="webcam-title">Webcam Tester</h2>
                <p>Check your camera feed, resolution, and FPS. Capture and download snapshots.</p>
            </header>
            <div className="tester-panel__body">
                <div className="controls-bar">
                    <button className="btn btn--primary" disabled={isActive} onClick={startWebcam}>Start Camera</button>
                    <button className="btn" disabled={!isActive} onClick={stopWebcam}>Stop</button>
                    <button className="btn" disabled={!isActive} onClick={capturePhoto}>Capture</button>
                    <button className="btn" disabled={!showCapture} onClick={downloadPhoto}>Download</button>
                    <label className="mirror-toggle">
                        <input type="checkbox" checked={isMirrored} onChange={(e) => setIsMirrored(e.target.checked)} />
                        <span>Mirror</span>
                    </label>
                </div>
                <div className="webcam-container" role="region" aria-label="Webcam Feed">
                    <video
                        ref={videoRef}
                        autoPlay playsInline muted
                        style={{ display: isActive ? 'block' : 'none', transform: isMirrored ? 'scaleX(-1)' : 'none' }}
                    ></video>
                    <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                    {!isActive && (
                        <div className="webcam-placeholder">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
                                <circle cx="12" cy="13" r="3"></circle>
                            </svg>
                            <span>Camera is off</span>
                        </div>
                    )}
                </div>
                <div className="info-grid">
                    <div className="info-card"><h4>Status</h4><p>{cameraStatus}</p></div>
                    <div className="info-card"><h4>Resolution</h4><p>{resolution}</p></div>
                    <div className="info-card"><h4>FPS</h4><p>{fps}</p></div>
                    <div className="info-card"><h4>Facing</h4><p>{facingMode}</p></div>
                </div>
                {showCapture && (
                    <div role="region" aria-label="Captured Image">
                        <h3 className="section-title">Captured Image</h3>
                        <div className="capture-result"><img src={capturedImage} alt="Webcam snapshot" /></div>
                    </div>
                )}
            </div>
            <style>{`
        .webcam-container {
          position: relative; width: 100%; aspect-ratio: 16/9;
          background: linear-gradient(135deg, var(--surface-1), var(--bg));
          border-radius: var(--radius); overflow: hidden; display: flex; align-items: center;
          justify-content: center; border: 1px solid var(--border);
        }
        video { width: 100%; height: 100%; object-fit: cover; }
        .webcam-placeholder {
          color: var(--text-muted); text-align: center; padding: 1rem;
          display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
        }
        .webcam-placeholder svg { opacity: 0.3; }
        .capture-result img { max-width: 100%; border-radius: var(--radius); display: block; margin: 1rem auto; border: 1px solid var(--border); }
        .mirror-toggle { display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: var(--text-sm); cursor: pointer; }
        .mirror-toggle input { accent-color: var(--primary); cursor: pointer; }
      `}</style>
        </section>
    );
}
