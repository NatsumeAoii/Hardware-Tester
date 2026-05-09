type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const getStorage = (storage?: StorageLike): StorageLike | null => {
    if (storage) return storage;
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage;
    } catch {
        return null;
    }
};

export function readJsonStorage<T>(
    key: string,
    fallback: T,
    normalize: (value: unknown, fallback: T) => T,
    storage?: StorageLike,
): T {
    const target = getStorage(storage);
    if (!target) return fallback;

    try {
        const raw = target.getItem(key);
        if (!raw) return fallback;
        return normalize(JSON.parse(raw) as unknown, fallback);
    } catch {
        return fallback;
    }
}

export function writeJsonStorage<T>(key: string, value: T, storage?: StorageLike): boolean {
    const target = getStorage(storage);
    if (!target) return false;

    try {
        target.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

export function removeStorageItem(key: string, storage?: StorageLike): boolean {
    const target = getStorage(storage);
    if (!target) return false;

    try {
        target.removeItem(key);
        return true;
    } catch {
        return false;
    }
}
