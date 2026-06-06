import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeLayoutRects, ScreenInfo } from '../../displayLayout';

/**
 * Property 3: Screen layout diagram proportional positioning
 * Validates: Requirements 2.6
 *
 * For any set of screen objects with left/top offsets and width/height values,
 * the rendered layout rectangles SHALL be positioned such that the relative
 * distances between rectangles are proportional to the relative distances
 * between the reported offsets, and each rectangle's aspect ratio matches
 * its screen's width:height ratio.
 */

/** Generate a valid ScreenInfo with positive dimensions and arbitrary offsets */
const screenInfoArb = fc.record({
    label: fc.string({ minLength: 1, maxLength: 10 }),
    width: fc.integer({ min: 100, max: 7680 }),
    height: fc.integer({ min: 100, max: 4320 }),
    left: fc.integer({ min: -10000, max: 10000 }),
    top: fc.integer({ min: -10000, max: 10000 }),
    devicePixelRatio: fc.double({ min: 1, max: 4, noNaN: true, noDefaultInfinity: true }),
    isPrimary: fc.boolean(),
}) satisfies fc.Arbitrary<ScreenInfo>;

/** Generate an array of 2+ screens to test relative positioning */
const multiScreenArb = fc.array(screenInfoArb, { minLength: 2, maxLength: 6 });

/** Generate positive container dimensions */
const containerDimArb = fc.integer({ min: 200, max: 2000 });

describe('Property 3: Screen layout diagram proportional positioning', () => {
    it('each rectangle aspect ratio matches its screen width:height ratio', () => {
        fc.assert(
            fc.property(
                fc.array(screenInfoArb, { minLength: 1, maxLength: 6 }),
                containerDimArb,
                containerDimArb,
                (screens, containerWidth, containerHeight) => {
                    const rects = computeLayoutRects(screens, containerWidth, containerHeight);

                    // If the function returns empty (e.g. all screens at same point with zero total extent), skip
                    if (rects.length === 0) return;

                    for (let i = 0; i < rects.length; i++) {
                        const rect = rects[i];
                        const screen = screens[i];

                        // Aspect ratio of the rect should match the screen's aspect ratio
                        const screenAspect = screen.width / screen.height;
                        const rectAspect = rect.width / rect.height;

                        // Allow floating point tolerance of 1e-6
                        expect(Math.abs(screenAspect - rectAspect)).toBeLessThan(1e-6);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('relative distances between rectangles are proportional to reported offsets', () => {
        fc.assert(
            fc.property(
                multiScreenArb,
                containerDimArb,
                containerDimArb,
                (screens, containerWidth, containerHeight) => {
                    const rects = computeLayoutRects(screens, containerWidth, containerHeight);

                    // If the function returns empty, skip
                    if (rects.length === 0) return;

                    // Compute the scale factor used by the function
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

                    if (totalWidth === 0 || totalHeight === 0) return;

                    const padding = 16;
                    const availableWidth = containerWidth - padding * 2;
                    const availableHeight = containerHeight - padding * 2;
                    const scale = Math.min(availableWidth / totalWidth, availableHeight / totalHeight);

                    // For any pair of screens, verify the distance between their
                    // rect positions is proportional (by the same scale factor) to
                    // the distance between their original offsets
                    for (let i = 0; i < screens.length; i++) {
                        for (let j = i + 1; j < screens.length; j++) {
                            const origDx = (screens[j].left - screens[i].left);
                            const origDy = (screens[j].top - screens[i].top);

                            const rectDx = rects[j].left - rects[i].left;
                            const rectDy = rects[j].top - rects[i].top;

                            // The rect distance should equal original distance * scale
                            expect(Math.abs(rectDx - origDx * scale)).toBeLessThan(1e-6);
                            expect(Math.abs(rectDy - origDy * scale)).toBeLessThan(1e-6);
                        }
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
