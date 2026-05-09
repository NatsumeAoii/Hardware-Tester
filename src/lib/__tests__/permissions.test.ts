import { describe, expect, it, vi } from 'vitest';
import {
    allPermissionsGranted,
    queryPermissionState,
    requestMotionPermissions,
    throwIfPermissionDenied,
} from '../permissions';

describe('permissions', () => {
    it('returns unsupported when the Permissions API is unavailable', async () => {
        const nav = {} as Navigator;
        await expect(queryPermissionState('camera' as PermissionName, nav)).resolves.toBe('unsupported');
    });

    it('throws a safe DOMException for denied permissions', async () => {
        const nav = {
            permissions: {
                query: vi.fn().mockResolvedValue({ state: 'denied' }),
            },
        } as unknown as Navigator;

        await expect(throwIfPermissionDenied('camera' as PermissionName, 'Camera', nav))
            .rejects.toMatchObject({ name: 'NotAllowedError' });
    });

    it('requests motion permissions and validates grant results', async () => {
        const results = await requestMotionPermissions([
            { requestPermission: vi.fn().mockResolvedValue('granted') },
            { requestPermission: vi.fn().mockResolvedValue('prompt') },
        ]);

        expect(results).toEqual(['granted', 'prompt']);
        expect(allPermissionsGranted(results)).toBe(false);
        expect(allPermissionsGranted(['granted', 'granted'])).toBe(true);
    });
});
