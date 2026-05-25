import { describe, expect, it } from 'vitest';
import { getLatestChangelogVersion } from '../changelogVersion';

describe('changelogVersion', () => {
    it('uses the newest documented release after the Unreleased section', () => {
        expect(getLatestChangelogVersion(`
# Changelog

## [Unreleased]

## [4.1.0] - 2026-05-23

## [4.0.0] - Release date not documented
`)).toBe('v4.1.0');
    });

    it('falls back when the changelog has no release heading', () => {
        expect(getLatestChangelogVersion('# Changelog\n\n## [Unreleased]\n')).toBe('Version unavailable');
    });
});
