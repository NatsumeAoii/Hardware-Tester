import { describe, expect, it, vi } from 'vitest';
import { detectHardwareCapabilities } from '../hardwareCapabilities';

describe('hardwareCapabilities', () => {
    it('does not cache transient WebGL context allocation failures', () => {
        const loseContext = vi.fn();
        const webglContext = {
            getExtension: vi.fn((name: string) => (name === 'WEBGL_lose_context' ? { loseContext } : null)),
        } as unknown as WebGLRenderingContext;
        let attempts = 0;
        const scope = {
            document: {
                createElement: vi.fn(() => ({
                    getContext: vi.fn(() => {
                        attempts += 1;
                        if (attempts <= 2) throw new Error('transient context allocation failure');
                        return webglContext;
                    }),
                })),
            },
            fetch: vi.fn(),
            innerHeight: 800,
            innerWidth: 1200,
            isSecureContext: true,
            location: { hostname: 'localhost' },
            matchMedia: vi.fn(() => ({ matches: false })),
            navigator: {
                maxTouchPoints: 0,
                platform: 'Test OS',
                userAgent: 'Test Browser',
            },
            performance: {},
            screen: { height: 800, width: 1200 },
        } as unknown as Parameters<typeof detectHardwareCapabilities>[0];

        const firstGpuStatus = detectHardwareCapabilities(scope).find(capability => capability.id === 'gpu')?.status;
        const secondGpuStatus = detectHardwareCapabilities(scope).find(capability => capability.id === 'gpu')?.status;

        expect(firstGpuStatus).toBe('unsupported');
        expect(secondGpuStatus).toBe('available');
        expect(loseContext).toHaveBeenCalled();
    });
});
