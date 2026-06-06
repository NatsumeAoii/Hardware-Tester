import changelogText from '../../CHANGELOG.md?raw';

const RELEASE_HEADING_PATTERN = /^## \[([^\]]+)\]/gm;
const UNAVAILABLE_VERSION_LABEL = 'Version unavailable';

export interface ChangelogEntry {
    version: string;
    content: string;
}

/**
 * Parses all versioned release entries from the changelog markdown.
 * Stops at "Earlier History" or end of file.
 */
export function parseChangelogEntries(changelog = changelogText): ChangelogEntry[] {
    const entries: ChangelogEntry[] = [];
    const lines = changelog.split('\n');
    let currentVersion: string | null = null;
    let currentLines: string[] = [];

    for (const line of lines) {
        // Stop parsing at "Earlier History" section
        if (/^## Earlier History/i.test(line)) break;

        const headingMatch = line.match(/^## \[([^\]]+)\]/);
        if (headingMatch) {
            // Save the previous entry
            if (currentVersion) {
                entries.push({
                    version: currentVersion,
                    content: currentLines.join('\n').trim(),
                });
            }
            currentVersion = headingMatch[1].trim();
            currentLines = [];
        } else if (currentVersion) {
            currentLines.push(line);
        }
    }

    // Save the last entry
    if (currentVersion) {
        entries.push({
            version: currentVersion,
            content: currentLines.join('\n').trim(),
        });
    }

    return entries.filter(entry => entry.version.toLowerCase() !== 'unreleased');
}

export function getLatestChangelogVersion(changelog = changelogText): string {
    for (const match of changelog.matchAll(RELEASE_HEADING_PATTERN)) {
        const version = match[1].trim();
        if (version && version.toLowerCase() !== 'unreleased') return `v${version}`;
    }

    return UNAVAILABLE_VERSION_LABEL;
}

export const changelogEntries = parseChangelogEntries();
export const appVersionLabel = getLatestChangelogVersion();
