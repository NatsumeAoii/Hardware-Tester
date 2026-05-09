import { DEFAULT_TESTER, isTesterId, type TesterId } from './testerRegistry';

export const TESTER_NAV_MEDIA_QUERY = '(max-width: 1024px)';

type RoutingWindow = {
    history: Pick<History, 'replaceState'>;
    location: Pick<Location, 'hash'>;
    matchMedia: (query: string) => Pick<MediaQueryList, 'matches'>;
};

export function getDecodedHash(scope: RoutingWindow = window): string {
    const hash = scope.location.hash.slice(1);
    try {
        return decodeURIComponent(hash);
    } catch {
        return hash;
    }
}

export function getHashTester(scope: RoutingWindow = window): TesterId {
    const hash = getDecodedHash(scope);
    return isTesterId(hash) ? hash : DEFAULT_TESTER;
}

export function toTesterHash(testerId: TesterId): string {
    return `#${encodeURIComponent(testerId)}`;
}

export function repairInvalidHash(hash: string, testerId: TesterId, scope: RoutingWindow = window): void {
    if (hash === testerId) return;
    scope.history.replaceState(null, '', toTesterHash(testerId));
}

export function isNarrowViewport(scope: RoutingWindow = window): boolean {
    return scope.matchMedia(TESTER_NAV_MEDIA_QUERY).matches;
}
