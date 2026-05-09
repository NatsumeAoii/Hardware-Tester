import { getDeviceMemory } from './browserAdapters';
import { NOT_AVAILABLE, formatResolution } from './formatters';

export type WebGLContext = WebGLRenderingContext | WebGL2RenderingContext;

export interface GpuInfo {
    vendor: string;
    renderer: string;
    glVersion: string;
    shadingLang: string;
    maxTextureSize: string;
    maxViewportDims: string;
    maxAnisotropy: string;
    extensions: number;
    antialiasing: string;
}

type AnisotropyExtension = {
    MAX_TEXTURE_MAX_ANISOTROPY_EXT: number;
};

export function createWebGLContext(canvas: HTMLCanvasElement): WebGLContext | null {
    return canvas.getContext('webgl2') || canvas.getContext('webgl');
}

export function disposeWebGLContext(gl: WebGLContext): void {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
}

export function getWebGLInfo(canvas: HTMLCanvasElement = document.createElement('canvas')): GpuInfo | null {
    const gl = createWebGLContext(canvas);
    if (!gl) return null;

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const aniso = (
        gl.getExtension('EXT_texture_filter_anisotropic') ||
        gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic')
    ) as AnisotropyExtension | null;
    const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array | number[] | null;

    const info: GpuInfo = {
        vendor: String(debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)),
        renderer: String(debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)),
        glVersion: String(gl.getParameter(gl.VERSION)),
        shadingLang: String(gl.getParameter(gl.SHADING_LANGUAGE_VERSION)),
        maxTextureSize: `${String(gl.getParameter(gl.MAX_TEXTURE_SIZE))}px`,
        maxViewportDims: viewport ? formatResolution(viewport[0], viewport[1]) : NOT_AVAILABLE,
        maxAnisotropy: aniso ? `${String(gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT))}x` : NOT_AVAILABLE,
        extensions: gl.getSupportedExtensions()?.length || 0,
        antialiasing: gl.getContextAttributes()?.antialias ? 'Enabled' : 'Disabled',
    };

    disposeWebGLContext(gl);
    return info;
}

export function getParticleBudget(scope: Window = window, navigatorRef: Navigator = navigator): number {
    const prefersReducedMotion = scope.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const memory = getDeviceMemory(navigatorRef) ?? 4;
    const threads = navigatorRef.hardwareConcurrency || 4;
    const coarsePointer = scope.matchMedia('(pointer: coarse)').matches;

    if (prefersReducedMotion) return 12000;
    if (memory <= 2 || threads <= 4 || coarsePointer) return 20000;
    if (memory <= 4 || threads <= 6) return 35000;
    return 50000;
}

function compileShader(gl: WebGLContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Shader allocation failed.');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader) || 'Unknown shader compile error.';
        gl.deleteShader(shader);
        throw new Error(info);
    }
    return shader;
}

export function createWebGLProgram(gl: WebGLContext, vertexSource: string, fragmentSource: string): WebGLProgram {
    const program = gl.createProgram();
    if (!program) throw new Error('Shader program allocation failed.');

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    try {
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(program) || 'Unknown shader link error.');
        }
        return program;
    } catch (error) {
        gl.deleteProgram(program);
        throw error;
    } finally {
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
    }
}

export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement, dpr = window.devicePixelRatio || 1): void {
    canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
}

export function createParticlePositions(count: number, random: () => number = Math.random): Float32Array {
    const positions = new Float32Array(count * 2);
    for (let index = 0; index < positions.length; index++) {
        positions[index] = (random() - 0.5) * 2;
    }
    return positions;
}

export function jitterParticlePositions(
    positions: Float32Array,
    amplitude = 0.002,
    random: () => number = Math.random,
): void {
    for (let index = 0; index < positions.length; index++) {
        positions[index] += (random() - 0.5) * amplitude;
    }
}
