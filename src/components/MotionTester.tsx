import { useState, useEffect, useRef, useCallback } from 'react';
import { allPermissionsGranted, getMotionPermissionApis, requestMotionPermissions } from '../lib/permissions';
import { formatUserSafeError } from '../lib/userSafeErrors';

export default function MotionTester() {
    const [isSupported, setIsSupported] = useState(true);
    const [permissionNeeded, setPermissionNeeded] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [accel, setAccel] = useState({ x: 0, y: 0, z: 0 });
    const [gyro, setGyro] = useState({ alpha: 0, beta: 0, gamma: 0 });
    const [isListening, setIsListening] = useState(false);

    const cubeRef = useRef<HTMLDivElement>(null);
    const listeningRef = useRef(false);

    const handleMotion = useCallback((e: DeviceMotionEvent) => {
        const a = e.accelerationIncludingGravity;
        if (a) setAccel({ x: a.x || 0, y: a.y || 0, z: a.z || 0 });
    }, []);

    const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
        setGyro({ alpha: e.alpha || 0, beta: e.beta || 0, gamma: e.gamma || 0 });
    }, []);

    const startListening = useCallback(() => {
        if (listeningRef.current) return;
        setErrorMessage('');
        listeningRef.current = true;
        setIsListening(true);

        window.addEventListener('devicemotion', handleMotion);
        window.addEventListener('deviceorientation', handleOrientation);
    }, [handleMotion, handleOrientation]);

    const stopListening = useCallback(() => {
        listeningRef.current = false;
        setIsListening(false);
        window.removeEventListener('devicemotion', handleMotion);
        window.removeEventListener('deviceorientation', handleOrientation);
        setAccel({ x: 0, y: 0, z: 0 });
        setGyro({ alpha: 0, beta: 0, gamma: 0 });
    }, [handleMotion, handleOrientation]);

    const requestPermission = useCallback(async () => {
        const permissionApis = getMotionPermissionApis();
        if (permissionApis.length === 0) {
            startListening();
            return;
        }

        try {
            const results = await requestMotionPermissions(permissionApis);
            if (allPermissionsGranted(results)) {
                setPermissionNeeded(false);
                startListening();
                return;
            }

            setErrorMessage(formatUserSafeError(new DOMException('Motion permission denied.', 'NotAllowedError'), {
                stableCode: 'MOTION_PERMISSION_DENIED',
                message: 'Motion sensor permission was denied.',
            }));
        } catch (err: unknown) {
            setErrorMessage(formatUserSafeError(err, {
                stableCode: 'MOTION_PERMISSION_FAILED',
                message: 'Motion sensor permission could not be requested.',
            }));
        }
    }, [startListening]);

    useEffect(() => {
        if (!('DeviceMotionEvent' in window) && !('DeviceOrientationEvent' in window)) {
            setIsSupported(false);
            return;
        }
        setPermissionNeeded(getMotionPermissionApis().length > 0);
        return () => { stopListening(); };
    }, [stopListening]);

    useEffect(() => {
        if (cubeRef.current) {
            cubeRef.current.style.transform = `rotateX(${gyro.beta}deg) rotateY(${gyro.gamma}deg) rotateZ(${gyro.alpha}deg)`;
        }
    }, [gyro]);

    const fmt = (n: number) => n.toFixed(2);

    return (
        <section aria-labelledby="motion-title">
            <header className="tester-panel__header">
                <h2 id="motion-title">Motion &amp; Orientation</h2>
                <p>Visualize real-time data from your device's gyroscope and accelerometer. Works best on mobile devices.</p>
            </header>
            <div className="tester-panel__body">
                {!isSupported ? (
                    <div className="status-display" style={{ color: 'var(--error)' }}>
                        Motion sensors not available on this device.
                    </div>
                ) : permissionNeeded ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>iOS requires explicit permission for motion sensors.</p>
                        <button className="btn btn--primary" onClick={requestPermission}>Grant Motion Access</button>
                        {errorMessage && <div className="motion-alert" role="alert">{errorMessage}</div>}
                    </div>
                ) : (
                    <>
                        {errorMessage && <div className="motion-alert" role="alert">{errorMessage}</div>}
                        <div className="controls-bar">
                            {isListening ? (
                                <button className="btn" onClick={stopListening}>Stop</button>
                            ) : (
                                <button className="btn btn--primary" onClick={startListening}>Start</button>
                            )}
                            <span className="status-inline" role="status">
                                {isListening ? 'Listening to sensors...' : 'Paused'}
                            </span>
                        </div>

                        <div className="motion-layout">
                            <div className="motion-cube-container">
                                <div className="motion-cube-scene">
                                    <div className="motion-cube" ref={cubeRef}>
                                        <div className="cube-face front">Front</div>
                                        <div className="cube-face back">Back</div>
                                        <div className="cube-face right">Right</div>
                                        <div className="cube-face left">Left</div>
                                        <div className="cube-face top">Top</div>
                                        <div className="cube-face bottom">Bottom</div>
                                    </div>
                                </div>
                            </div>
                            <div className="motion-data">
                                <h3 className="section-title">Accelerometer (m/s²)</h3>
                                <div className="info-grid info-grid--2-col">
                                    <div className="info-card"><h4>X</h4><p style={{ color: '#ef4444' }}>{fmt(accel.x)}</p></div>
                                    <div className="info-card"><h4>Y</h4><p style={{ color: '#22c55e' }}>{fmt(accel.y)}</p></div>
                                    <div className="info-card"><h4>Z</h4><p style={{ color: '#3b82f6' }}>{fmt(accel.z)}</p></div>
                                    <div className="info-card"><h4>Magnitude</h4><p>{fmt(Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2))}</p></div>
                                </div>
                                <h3 className="section-title">Gyroscope (degrees)</h3>
                                <div className="info-grid info-grid--2-col">
                                    <div className="info-card"><h4>Alpha (Z)</h4><p>{fmt(gyro.alpha)}°</p></div>
                                    <div className="info-card"><h4>Beta (X)</h4><p>{fmt(gyro.beta)}°</p></div>
                                    <div className="info-card"><h4>Gamma (Y)</h4><p>{fmt(gyro.gamma)}°</p></div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
            <style>{`
        .motion-layout { display: grid; grid-template-columns: auto 1fr; gap: 2rem; align-items: start; }
        .motion-cube-container { display: flex; justify-content: center; align-items: center; background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--radius); padding: 2rem; }
        .motion-cube-scene { width: 140px; height: 140px; perspective: 400px; }
        .motion-cube {
          width: 100%; height: 100%; position: relative;
          transform-style: preserve-3d; transition: transform 0.05s linear;
        }
        .cube-face {
          position: absolute; width: 140px; height: 140px;
          display: flex; align-items: center; justify-content: center;
          font-size: var(--text-xs); font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.08em; border: 1px solid rgba(59,130,246,0.3);
          background: rgba(59, 130, 246, 0.1); backdrop-filter: blur(4px); color: var(--primary);
        }
        .cube-face.front  { transform: translateZ(70px); }
        .cube-face.back   { transform: rotateY(180deg) translateZ(70px); }
        .cube-face.right  { transform: rotateY(90deg) translateZ(70px); }
        .cube-face.left   { transform: rotateY(-90deg) translateZ(70px); }
        .cube-face.top    { transform: rotateX(90deg) translateZ(70px); }
        .cube-face.bottom { transform: rotateX(-90deg) translateZ(70px); }
        .motion-data { display: flex; flex-direction: column; gap: 1rem; }
        .motion-alert {
          margin-top: 1rem; border: 1px solid rgba(239,68,68,0.35);
          background: rgba(239,68,68,0.08); color: var(--error);
          border-radius: var(--radius-sm); padding: 0.75rem 1rem;
          font-size: var(--text-sm); text-align: left;
        }
        .status-inline { color: var(--text-muted); font-size: var(--text-sm); font-family: var(--font-mono); }
        @media (max-width: 768px) { .motion-layout { grid-template-columns: 1fr; } .motion-cube-container { justify-self: center; } }
      `}</style>
        </section>
    );
}
