import { describe, expect, it } from 'vitest';
import { readJsonStorage, removeStorageItem, writeJsonStorage } from '../storageUtils';

const createStorage = (initial: Record<string, string> = {}) => {
    const values = new Map(Object.entries(initial));
    return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value); },
        removeItem: (key: string) => { values.delete(key); },
    };
};

describe('storageUtils', () => {
    it('falls back on invalid JSON and normalizes valid payloads', () => {
        const storage = createStorage({ bad: '{', good: '{"enabled":true}' });
        const normalize = (value: unknown, fallback: { enabled: boolean }) =>
            typeof value === 'object' && value !== null && 'enabled' in value
                ? { enabled: value.enabled === true }
                : fallback;

        expect(readJsonStorage('bad', { enabled: false }, normalize, storage)).toEqual({ enabled: false });
        expect(readJsonStorage('good', { enabled: false }, normalize, storage)).toEqual({ enabled: true });
    });

    it('writes and removes JSON values without throwing', () => {
        const storage = createStorage();
        expect(writeJsonStorage('prefs', { theme: 'dark' }, storage)).toBe(true);
        expect(storage.getItem('prefs')).toBe('{"theme":"dark"}');
        expect(removeStorageItem('prefs', storage)).toBe(true);
        expect(storage.getItem('prefs')).toBeNull();
    });
});
