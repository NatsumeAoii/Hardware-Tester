export interface ScreenInfo {
    label: string;
    width: number;
    height: number;
    left: number;
    top: number;
    devicePixelRatio: number;
    isPrimary: boolean;
}

export interface LayoutRect {
    left: number;
    top: number;
    width: number;
    height: number;
    index: number;
}

/**
 * Computes the layout rectangles for the visual diagram.
 * Each screen is positioned proportionally to its left/top offset,
 * and scaled proportionally to its resolution relative to other screens.
 */
export function computeLayoutRects(
    screens: ScreenInfo[],
    containerWidth: number,
    containerHeight: number,
): LayoutRect[] {
    if (screens.length === 0) return [];

    let minLeft = Infinity;
    let minTop = Infinity;
    let maxRight = -Infinity;
    let maxBottom = -Infinity;

    for (const s of screens) {
        minLeft = Math.min(minLeft, s.left);
        minTop = Math.min(minTop, s.top);
        maxRight = Math.max(maxRight, s.left + s.width);
        maxBottom = Math.max(maxBottom, s.top + s.height);
    }

    const totalWidth = maxRight - minLeft;
    const totalHeight = maxBottom - minTop;

    if (totalWidth === 0 || totalHeight === 0) return [];

    const padding = 16;
    const availableWidth = containerWidth - padding * 2;
    const availableHeight = containerHeight - padding * 2;
    const scale = Math.min(availableWidth / totalWidth, availableHeight / totalHeight);

    return screens.map((s, index) => ({
        left: padding + (s.left - minLeft) * scale,
        top: padding + (s.top - minTop) * scale,
        width: s.width * scale,
        height: s.height * scale,
        index,
    }));
}

/**
 * Computes a bounded percentage from usage and quota values.
 * Returns 0 if quota is 0 to avoid division by zero.
 */
export function computePercentage(usage: number, quota: number): number {
    if (quota === 0) return 0;
    return Math.min(100, Math.max(0, Math.round((usage / quota) * 100)));
}
