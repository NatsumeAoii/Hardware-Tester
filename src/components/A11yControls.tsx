import { useAppearancePreferences, type ThemeMode } from '../hooks/useAppearancePreferences';
import '../styles/A11yControls.css';

const themeOptions: { id: ThemeMode; label: string; path: string }[] = [
    {
        id: 'system',
        label: 'System',
        path: 'M3 4h18v12H3V4zm2 2v8h14V6H5zm4 13h6v2H9v-2z',
    },
    {
        id: 'dark',
        label: 'Dark',
        path: 'M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z',
    },
    {
        id: 'light',
        label: 'Light',
        path: 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z',
    },
];

export default function A11yControls() {
    const {
        themeMode,
        effectiveTheme,
        setThemeMode,
        highContrast,
        setHighContrast,
        largeText,
        setLargeText,
    } = useAppearancePreferences();

    const themeModeLabel = themeMode === 'system' ? `System (${effectiveTheme})` : themeMode;

    return (
        <div className="a11y-controls" aria-label="Display preferences">
            <div className="theme-mode-group" role="group" aria-label={`Theme mode: ${themeModeLabel}`}>
                {themeOptions.map(option => (
                    <button
                        key={option.id}
                        type="button"
                        className={`a11y-btn ${themeMode === option.id ? 'active' : ''}`}
                        aria-label={`Use ${option.label.toLowerCase()} theme`}
                        aria-pressed={themeMode === option.id}
                        title={`${option.label} theme`}
                        onClick={() => setThemeMode(option.id)}
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d={option.path} />
                        </svg>
                    </button>
                ))}
            </div>
            <button
                type="button"
                className={`a11y-btn ${highContrast ? 'active' : ''}`}
                aria-label="Toggle high contrast"
                aria-pressed={highContrast}
                title="High contrast"
                onClick={() => setHighContrast(value => !value)}
            >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 22C17.52 22 22 17.52 22 12S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm0-2V4c4.42 0 8 3.58 8 8s-3.58 8-8 8z" /></svg>
            </button>
            <button
                type="button"
                className={`a11y-btn ${largeText ? 'active' : ''}`}
                aria-label="Toggle larger text"
                aria-pressed={largeText}
                title="Larger text"
                onClick={() => setLargeText(value => !value)}
            >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z" /></svg>
            </button>
        </div>
    );
}
