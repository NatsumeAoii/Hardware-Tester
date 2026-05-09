import { describe, expect, it, vi } from 'vitest';
import { createParticlePositions, getParticleBudget, jitterParticlePositions } from '../graphicsDiagnostics';

describe('graphicsDiagnostics', () => {
    it('adapts particle budget to reduced motion and constrained hardware', () => {
        const reducedMotionScope = {
            matchMedia: vi.fn((query: string) => ({ matches: query.includes('prefers-reduced-motion') })),
        } as unknown as Window;
        expect(getParticleBudget(reducedMotionScope, { hardwareConcurrency: 16 } as Navigator)).toBe(12000);

        const mobileScope = {
            matchMedia: vi.fn((query: string) => ({ matches: query.includes('pointer: coarse') })),
        } as unknown as Window;
        expect(getParticleBudget(mobileScope, { hardwareConcurrency: 2 } as Navigator)).toBe(20000);
    });

    it('creates and jitters particle positions deterministically when given a deterministic random source', () => {
        const positions = createParticlePositions(2, () => 1);
        expect(Array.from(positions)).toEqual([1, 1, 1, 1]);

        jitterParticlePositions(positions, 0.2, () => 0);
        for (const position of positions) expect(position).toBeCloseTo(0.9);
    });
});
