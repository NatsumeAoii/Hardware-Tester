import { describe, expect, it, vi } from 'vitest';
import { getDecodedHash, getHashTester, isNarrowViewport, repairInvalidHash, toTesterHash } from '../routeUtils';

const createRoutingScope = (hash: string, matches = false) => ({
    location: { hash },
    history: { replaceState: vi.fn() },
    matchMedia: vi.fn(() => ({ matches })),
});

describe('routeUtils', () => {
    it('decodes tester hashes and falls back to the dashboard for invalid values', () => {
        expect(getDecodedHash(createRoutingScope('#ambient-light'))).toBe('ambient-light');
        expect(getHashTester(createRoutingScope('#not-real'))).toBe('dashboard');
    });

    it('repairs invalid hashes and preserves valid tester hash formatting', () => {
        const scope = createRoutingScope('#broken');
        repairInvalidHash('broken', 'network', scope);
        expect(scope.history.replaceState).toHaveBeenCalledWith(null, '', '#network');
        expect(toTesterHash('double-click')).toBe('#double-click');
    });

    it('uses the shared responsive nav breakpoint', () => {
        expect(isNarrowViewport(createRoutingScope('', true))).toBe(true);
        expect(isNarrowViewport(createRoutingScope('', false))).toBe(false);
    });
});
