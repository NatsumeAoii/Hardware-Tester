import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { EMPTY_VALUE, formatInteger } from '../lib/formatters';
import {
    createParticlePositions,
    createWebGLContext,
    createWebGLProgram,
    getParticleBudget,
    getWebGLInfo,
    jitterParticlePositions,
    resizeCanvasToDisplaySize,
    type GpuInfo,
} from '../lib/graphicsDiagnostics';
import { cancelAnimationFrameIfSet } from '../lib/lifecycle';

export default function GpuTester() {
    const [gpuInfo, setGpuInfo] = useState<GpuInfo | null>(null);
    const [isSupported, setIsSupported] = useState(true);
    const [stressActive, setStressActive] = useState(false);
    const [stressFps, setStressFps] = useState(EMPTY_VALUE);
    const [stressTime, setStressTime] = useState(0);
    const [stressError, setStressError] = useState('');
    const particleBudget = useMemo(getParticleBudget, []);
    const particleLabel = useMemo(() => formatInteger(particleBudget), [particleBudget]);

    const stressCanvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const activeRef = useRef(false);
    const cleanupStressRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const info = getWebGLInfo();
        if (!info) {
            setIsSupported(false);
            return;
        }
        setGpuInfo(info);
    }, []);

    const startStressTest = useCallback(() => {
        if (activeRef.current) return;
        cleanupStressRef.current?.();
        cleanupStressRef.current = null;
        setStressError('');
        const canvas = stressCanvasRef.current;
        if (!canvas) return;

        const gl = createWebGLContext(canvas);
        if (!gl) {
            setStressError('WebGL stress renderer could not start. Hardware acceleration may be disabled. (GPU_STRESS_UNAVAILABLE)');
            return;
        }

        resizeCanvasToDisplaySize(canvas);
        gl.viewport(0, 0, canvas.width, canvas.height);

        const vertSrc = `attribute vec2 a_pos; void main() { gl_Position = vec4(a_pos, 0.0, 1.0); gl_PointSize = 4.0; }`;
        const fragSrc = `precision mediump float; uniform float u_time; void main() {
            vec2 uv = gl_PointCoord;
            float d = length(uv - 0.5);
            vec3 col = 0.5 + 0.5 * cos(u_time + vec3(0,2,4) + d * 6.28);
            gl_FragColor = vec4(col, 1.0 - d * 2.0);
        }`;

        let prog: WebGLProgram;
        try {
            prog = createWebGLProgram(gl, vertSrc, fragSrc);
            gl.useProgram(prog);
        } catch {
            setStressError('WebGL stress renderer failed to initialize on this GPU. Try updating the browser or graphics driver. (GPU_STRESS_INIT_FAILED)');
            return;
        }

        const count = particleBudget;
        const positions = createParticlePositions(count);

        const buf = gl.createBuffer();
        if (!buf) {
            setStressError('WebGL stress renderer could not allocate a particle buffer. (GPU_STRESS_UNAVAILABLE)');
            gl.deleteProgram(prog);
            return;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        const aPos = gl.getAttribLocation(prog, 'a_pos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        const uTime = gl.getUniformLocation(prog, 'u_time');
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        cleanupStressRef.current = () => {
            gl.deleteBuffer(buf);
            gl.deleteProgram(prog);
        };

        activeRef.current = true;
        setStressActive(true);
        let frames = 0;
        let lastSec = performance.now();
        const start = performance.now();

        const render = () => {
            if (!activeRef.current) return;
            const now = performance.now();
            const elapsed = (now - start) / 1000;
            setStressTime(Math.floor(elapsed));

            gl.clearColor(0.04, 0.05, 0.07, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform1f(uTime, elapsed);

            jitterParticlePositions(positions);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
            gl.drawArrays(gl.POINTS, 0, count);

            frames++;
            if (now - lastSec >= 1000) {
                setStressFps(String(frames));
                frames = 0;
                lastSec = now;
            }

            animRef.current = requestAnimationFrame(render);
        };
        animRef.current = requestAnimationFrame(render);
    }, [particleBudget]);

    const stopStressTest = useCallback(() => {
        activeRef.current = false;
        cancelAnimationFrameIfSet(animRef.current);
        cleanupStressRef.current?.();
        cleanupStressRef.current = null;
        setStressActive(false);
        setStressFps(EMPTY_VALUE);
        setStressTime(0);
        setStressError('');
    }, []);

    useEffect(() => {
        return () => {
            activeRef.current = false;
            cancelAnimationFrameIfSet(animRef.current);
            cleanupStressRef.current?.();
            cleanupStressRef.current = null;
        };
    }, []);

    return (
        <section aria-labelledby="gpu-title">
            <header className="tester-panel__header">
                <h2 id="gpu-title">GPU Experience</h2>
                <p>Inspect your graphics card capabilities and run a WebGL stress test.</p>
            </header>
            <div className="tester-panel__body">
                {!isSupported ? (
                    <div className="status-display" style={{ color: 'var(--error)' }}>WebGL not available.</div>
                ) : gpuInfo && (
                    <>
                        <div className="info-grid">
                            <div className="info-card"><h4>GPU Vendor</h4><p style={{ fontSize: 'var(--text-sm)' }}>{gpuInfo.vendor}</p></div>
                            <div className="info-card" style={{ gridColumn: 'span 2' }}><h4>Renderer</h4><p style={{ fontSize: 'var(--text-sm)' }}>{gpuInfo.renderer}</p></div>
                            <div className="info-card"><h4>WebGL Version</h4><p style={{ fontSize: 'var(--text-sm)' }}>{gpuInfo.glVersion}</p></div>
                            <div className="info-card"><h4>Shading Language</h4><p style={{ fontSize: 'var(--text-sm)' }}>{gpuInfo.shadingLang}</p></div>
                            <div className="info-card"><h4>Max Texture</h4><p>{gpuInfo.maxTextureSize}</p></div>
                            <div className="info-card"><h4>Max Viewport</h4><p>{gpuInfo.maxViewportDims}</p></div>
                            <div className="info-card"><h4>Anisotropy</h4><p>{gpuInfo.maxAnisotropy}</p></div>
                            <div className="info-card"><h4>Extensions</h4><p>{gpuInfo.extensions}</p></div>
                            <div className="info-card"><h4>Antialiasing</h4><p>{gpuInfo.antialiasing}</p></div>
                        </div>

                        <h3 className="section-title">GPU Stress Test ({particleLabel} particles)</h3>
                        <div className="controls-bar">
                            <button className="btn btn--primary" disabled={stressActive} onClick={startStressTest}>Start Stress Test</button>
                            <button className="btn" disabled={!stressActive} onClick={stopStressTest}>Stop</button>
                            {stressActive && (
                                <span className="status-inline">
                                    FPS: <strong style={{ color: 'var(--primary)' }}>{stressFps}</strong> &middot; {stressTime}s elapsed
                                </span>
                            )}
                        </div>
                        {stressError && <div className="gpu-alert" role="alert">{stressError}</div>}
                        <div className="gpu-stress-area">
                            <canvas ref={stressCanvasRef} className="gpu-canvas"></canvas>
                            {!stressActive && (
                                <div className="gpu-placeholder">
                                    <span>Press Start to render {particleLabel} WebGL particles</span>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            <style>{`
        .gpu-stress-area { position: relative; width: 100%; aspect-ratio: 16/9; border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); background: var(--bg); }
        .gpu-canvas { width: 100%; height: 100%; display: block; }
        .gpu-placeholder { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: var(--text-sm); opacity: 0.5; }
        .gpu-alert {
          border: 1px solid rgba(239,68,68,0.35);
          background: rgba(239,68,68,0.08); color: var(--error);
          border-radius: var(--radius-sm); padding: 0.75rem 1rem;
          font-size: var(--text-sm);
        }
        .status-inline { color: var(--text-muted); font-size: var(--text-sm); font-family: var(--font-mono); }
      `}</style>
        </section>
    );
}
