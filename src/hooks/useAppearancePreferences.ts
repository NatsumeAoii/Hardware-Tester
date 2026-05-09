import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { readJsonStorage, writeJsonStorage } from '../lib/storageUtils';

export type ThemeMode = 'system' | 'dark' | 'light';
export type EffectiveTheme = 'dark' | 'light';

interface AppearancePreferences {
    themeMode: ThemeMode;
    highContrast: boolean;
    largeText: boolean;
}

const STORAGE_KEY = 'hardware-suite:appearance';
const SYSTEM_THEME_QUERY = '(prefers-color-scheme: light)';

const fallbackPreferences: AppearancePreferences = {
    themeMode: 'system',
    highContrast: false,
    largeText: false,
};

const isThemeMode = (value: unknown): value is ThemeMode => value === 'system' || value === 'dark' || value === 'light';

const normalizePreferences = (value: unknown, fallback: AppearancePreferences): AppearancePreferences => {
    if (typeof value !== 'object' || value === null) return fallback;
    const parsed = value as Partial<AppearancePreferences>;
    return {
        themeMode: isThemeMode(parsed.themeMode) ? parsed.themeMode : fallback.themeMode,
        highContrast: parsed.highContrast === true,
        largeText: parsed.largeText === true,
    };
};

const readPreferences = (): AppearancePreferences =>
    readJsonStorage(STORAGE_KEY, fallbackPreferences, normalizePreferences);

const getSystemTheme = (): EffectiveTheme => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia(SYSTEM_THEME_QUERY).matches ? 'light' : 'dark';
};

const resolveBooleanValue = (value: SetStateAction<boolean>, current: boolean) =>
    typeof value === 'function' ? (value as (previous: boolean) => boolean)(current) : value;

export function useAppearancePreferences() {
    const [preferences, setPreferences] = useState<AppearancePreferences>(readPreferences);
    const [systemTheme, setSystemTheme] = useState<EffectiveTheme>(getSystemTheme);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const media = window.matchMedia(SYSTEM_THEME_QUERY);
        const handleChange = () => setSystemTheme(media.matches ? 'light' : 'dark');

        handleChange();
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        writeJsonStorage(STORAGE_KEY, preferences);
    }, [preferences]);

    const effectiveTheme = preferences.themeMode === 'system' ? systemTheme : preferences.themeMode;

    useEffect(() => {
        if (typeof document === 'undefined') return;

        const root = document.documentElement;
        root.dataset.theme = effectiveTheme;
        root.classList.toggle('light-theme', effectiveTheme === 'light');
        root.classList.toggle('high-contrast', preferences.highContrast);
        root.classList.toggle('text-large', preferences.largeText);
    }, [effectiveTheme, preferences.highContrast, preferences.largeText]);

    const setThemeMode = useCallback<Dispatch<SetStateAction<ThemeMode>>>(value => {
        setPreferences(current => ({
            ...current,
            themeMode: typeof value === 'function' ? (value as (previous: ThemeMode) => ThemeMode)(current.themeMode) : value,
        }));
    }, []);

    const setHighContrast = useCallback<Dispatch<SetStateAction<boolean>>>(value => {
        setPreferences(current => ({
            ...current,
            highContrast: resolveBooleanValue(value, current.highContrast),
        }));
    }, []);

    const setLargeText = useCallback<Dispatch<SetStateAction<boolean>>>(value => {
        setPreferences(current => ({
            ...current,
            largeText: resolveBooleanValue(value, current.largeText),
        }));
    }, []);

    return useMemo(() => ({
        themeMode: preferences.themeMode,
        effectiveTheme,
        setThemeMode,
        highContrast: preferences.highContrast,
        setHighContrast,
        largeText: preferences.largeText,
        setLargeText,
    }), [effectiveTheme, preferences.highContrast, preferences.largeText, preferences.themeMode, setHighContrast, setLargeText, setThemeMode]);
}
