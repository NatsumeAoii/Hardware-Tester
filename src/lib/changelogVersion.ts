import changelogText from '../../CHANGELOG.md?raw';

const RELEASE_HEADING_PATTERN = /^## \[([^\]]+)\]/gm;
const UNAVAILABLE_VERSION_LABEL = 'Version unavailable';

export function getLatestChangelogVersion(changelog = changelogText): string {
    for (const match of changelog.matchAll(RELEASE_HEADING_PATTERN)) {
        const version = match[1].trim();
        if (version && version.toLowerCase() !== 'unreleased') return `v${version}`;
    }

    return UNAVAILABLE_VERSION_LABEL;
}

export const appVersionLabel = getLatestChangelogVersion();
