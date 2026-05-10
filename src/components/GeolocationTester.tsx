import { useState, useEffect, useCallback, useRef } from 'react';
import { EMPTY_VALUE, formatCoordinateDms, formatSignedDegrees } from '../lib/formatters';
import { throwIfPermissionDenied } from '../lib/permissions';
import { formatUserSafeError } from '../lib/userSafeErrors';

interface GeoData {
    lat: number;
    lon: number;
    accuracy: number;
    altitude: number | null;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
    timestamp: number;
}

export default function GeolocationTester() {
    const [isSupported] = useState(() => 'geolocation' in navigator);
    const [status, setStatus] = useState('Ready');
    const [position, setPosition] = useState<GeoData | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [history, setHistory] = useState<GeoData[]>([]);
    const watchIdRef = useRef<number | null>(null);

    const getAccuracyLabel = (m: number): string => {
        if (m < 10) return 'Excellent';
        if (m < 50) return 'Good';
        if (m < 200) return 'Fair';
        return 'Poor';
    };

    const handlePosition = useCallback((pos: GeolocationPosition) => {
        const data: GeoData = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
        };
        setPosition(data);
        setStatus('Position acquired');
        setHistory(prev => [...prev, data].slice(-50));
    }, []);

    const handleError = useCallback((err: GeolocationPositionError) => {
        const codeMap: Record<number, string> = {
            [err.PERMISSION_DENIED]: 'GEOLOCATION_PERMISSION_DENIED',
            [err.POSITION_UNAVAILABLE]: 'GEOLOCATION_POSITION_UNAVAILABLE',
            [err.TIMEOUT]: 'GEOLOCATION_TIMEOUT',
        };
        if (err.code === err.PERMISSION_DENIED) {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            setIsTracking(false);
        }
        setStatus(formatUserSafeError(err, {
            stableCode: codeMap[err.code] ?? 'GEOLOCATION_FAILED',
            message: 'Location lookup could not complete.',
            detail: err.message || 'Check location services and browser permission, then try again.',
        }));
    }, []);

    const getSinglePosition = useCallback(async () => {
        if (!isSupported) return;
        setStatus('Acquiring position...');
        try {
            await throwIfPermissionDenied('geolocation', 'Location');
            navigator.geolocation.getCurrentPosition(handlePosition, handleError, {
                enableHighAccuracy: true, timeout: 15000, maximumAge: 0,
            });
        } catch (err: unknown) {
            setStatus(formatUserSafeError(err, {
                stableCode: 'GEOLOCATION_START_FAILED',
                message: 'Location lookup could not start.',
            }));
        }
    }, [isSupported, handlePosition, handleError]);

    const startTracking = useCallback(async () => {
        if (!isSupported || watchIdRef.current !== null) return;
        setStatus('Tracking...');
        setIsTracking(true);
        try {
            await throwIfPermissionDenied('geolocation', 'Location');
            watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
                enableHighAccuracy: true, maximumAge: 0,
            });
        } catch (err: unknown) {
            setIsTracking(false);
            setStatus(formatUserSafeError(err, {
                stableCode: 'GEOLOCATION_TRACKING_FAILED',
                message: 'Location tracking could not start.',
            }));
        }
    }, [isSupported, handlePosition, handleError]);

    const stopTracking = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setIsTracking(false);
        setStatus('Tracking stopped');
    }, []);

    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, []);

    return (
        <section aria-labelledby="geo-title">
            <header className="tester-panel__header">
                <h2 id="geo-title">Geolocation (GPS)</h2>
                <p>Test GPS accuracy, altitude, speed, and heading. Your location stays in your browser.</p>
            </header>
            <div className="tester-panel__body">
                {!isSupported ? (
                    <div className="status-display" style={{ color: 'var(--error)' }}>Geolocation API not available.</div>
                ) : (
                    <>
                        <div className="controls-bar">
                            <button className="btn btn--primary" onClick={getSinglePosition} disabled={isTracking}>Get Position</button>
                            {!isTracking ? (
                                <button className="btn" onClick={startTracking}>Start Tracking</button>
                            ) : (
                                <button className="btn" onClick={stopTracking}>Stop Tracking</button>
                            )}
                            <span className="status-inline" role="status">{status}</span>
                        </div>

                        {position && (
                            <>
                                <div className="geo-coords">
                                    <div className="geo-coord-card">
                                        <span className="geo-coord-label">Latitude</span>
                                        <span className="geo-coord-value">{position.lat.toFixed(6)}°</span>
                                        <span className="geo-coord-dms">{formatCoordinateDms(position.lat, 'lat')}</span>
                                    </div>
                                    <div className="geo-coord-card">
                                        <span className="geo-coord-label">Longitude</span>
                                        <span className="geo-coord-value">{position.lon.toFixed(6)}°</span>
                                        <span className="geo-coord-dms">{formatCoordinateDms(position.lon, 'lon')}</span>
                                    </div>
                                </div>
                                <div className="info-grid">
                                    <div className="info-card">
                                        <h4>Accuracy</h4>
                                        <p>±{position.accuracy.toFixed(0)}m</p>
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{getAccuracyLabel(position.accuracy)}</span>
                                    </div>
                                    <div className="info-card"><h4>Altitude</h4><p>{position.altitude !== null ? `${position.altitude.toFixed(1)}m` : EMPTY_VALUE}</p></div>
                                    <div className="info-card"><h4>Speed</h4><p>{position.speed !== null ? `${(position.speed * 3.6).toFixed(1)} km/h` : EMPTY_VALUE}</p></div>
                                    <div className="info-card"><h4>Heading</h4><p>{formatSignedDegrees(position.heading)}</p></div>
                                    <div className="info-card"><h4>Alt. Accuracy</h4><p>{position.altitudeAccuracy !== null ? `±${position.altitudeAccuracy.toFixed(0)}m` : EMPTY_VALUE}</p></div>
                                    <div className="info-card"><h4>Fixes</h4><p>{history.length}</p></div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
            <style>{`
        .geo-coords { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .geo-coord-card {
          display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
          background: var(--surface-panel);
          border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem;
        }
        .geo-coord-label { font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0; }
        .geo-coord-value { font-size: 1.75rem; font-weight: 700; font-family: var(--font-mono); color: var(--text); }
        .geo-coord-dms { font-size: var(--text-xs); color: var(--text-muted); font-family: var(--font-mono); }
        @media (max-width: 480px) { .geo-coords { grid-template-columns: 1fr; } }
      `}</style>
        </section>
    );
}
