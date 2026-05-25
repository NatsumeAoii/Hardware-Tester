import { expect, test, type Page } from '@playwright/test';
import { testers, type TesterMeta } from '../../src/lib/testerRegistry';

const appHosts = new Set(['127.0.0.1', 'localhost']);

const routeNeedles: Partial<Record<TesterMeta['id'], string>> = {
    dashboard: 'Hardware Diagnostic Suite',
    report: 'System Diagnostic Report',
    keyboard: 'Keyboard Tester',
    mouse: 'Mouse Tester',
    'double-click': 'Double Click Tester',
    gamepad: 'Gamepad Tester',
    touch: 'Touch & Pen',
    screen: 'Screen & Display',
    mic: 'Microphone Tester',
    sound: 'Sound Output',
    webcam: 'Webcam Tester',
    vibration: 'Vibration Engine',
    battery: 'Battery Health',
    gpu: 'GPU Experience',
    bluetooth: 'Bluetooth Scanner',
    motion: 'Motion & Orientation',
    geolocation: 'Geolocation (GPS)',
    'ambient-light': 'Light & Proximity',
    midi: 'MIDI Monitor',
    network: 'Network Diagnostic',
    'burn-in': 'Burn-in / Stuck Pixel Fixer',
    printer: 'Printer Test Page',
};

async function blockExternalRequests(page: Page, externalRequests: string[] = []) {
    await page.route('**/*', route => {
        const requestUrl = new URL(route.request().url());
        if (requestUrl.protocol === 'data:' || appHosts.has(requestUrl.hostname)) {
            route.continue();
            return;
        }

        externalRequests.push(route.request().url());
        route.abort();
    });
}

test.beforeEach(async ({ page }) => {
    await blockExternalRequests(page);
});

test('dashboard exposes the primary landmarks and keyboard skip path', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /Hardware Diagnostic Suite/i })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /Hardware tests/i })).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /Skip to main content/i })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
});

test('sidebar exposes support links below the utility navigation', async ({ page }) => {
    await page.goto('/');

    const supportLinks = page.locator('.sidebar__support');
    await expect(supportLinks).toBeVisible();
    await expect(supportLinks).toContainText('GitHub repo');
    await expect(supportLinks).toContainText('Report a bug');
    await expect(supportLinks).not.toContainText('Credit');
    await expect(page.locator('body')).not.toContainText('Hardware Diagnostic Suite contributors');
    await expect(page.locator('body')).not.toContainText('Credit');
    await expect(page.getByRole('link', { name: /GitHub repo/i })).toHaveAttribute('href', 'https://github.com/NatsumeAoii/Hardware-Tester');
    await expect(page.getByRole('link', { name: /Report a bug/i })).toHaveAttribute('href', 'https://github.com/NatsumeAoii/Hardware-Tester/issues');
});

test('invalid hashes are repaired to the dashboard route', async ({ page }) => {
    await page.goto('/#not-a-real-test');

    await expect(page).toHaveURL(/#dashboard$/);
    await expect(page.getByRole('heading', { name: /Hardware Diagnostic Suite/i })).toBeVisible();
});

for (const tester of testers) {
    test(`renders ${tester.id} route`, async ({ page }) => {
        await page.goto(`/#${tester.id}`);

        await expect(page).toHaveURL(new RegExp(`#${tester.id}$`));
        await expect(page.getByRole('main')).toContainText(routeNeedles[tester.id] ?? tester.label);
    });
}

test('mobile navigation opens and collapses after route selection', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const sidebar = page.locator('.sidebar');
    await expect(sidebar).not.toHaveClass(/open/);

    await page.getByRole('button', { name: /Open navigation/i }).click();
    await expect(sidebar).toHaveClass(/open/);

    await page.getByRole('navigation', { name: /Hardware tests/i }).getByRole('link', { name: /^Keyboard$/ }).click();

    await expect(page).toHaveURL(/#keyboard$/);
    await expect(page.getByRole('main')).toContainText('Keyboard Tester');
    await expect(sidebar).not.toHaveClass(/open/);
});

test('printer route keeps exact color print rendering enabled', async ({ page }) => {
    await page.goto('/#printer');

    await expect(page.getByRole('heading', { name: /Printer Test Page/i })).toBeVisible();

    const printColorAdjust = await page.locator('.print-page').evaluate(element => {
        const style = window.getComputedStyle(element);
        return style.getPropertyValue('print-color-adjust') || style.getPropertyValue('-webkit-print-color-adjust');
    });

    expect(printColorAdjust.trim()).toBe('exact');
});

test('network route does not contact third-party endpoints before user action', async ({ page }) => {
    const externalRequests: string[] = [];
    await page.unroute('**/*');
    await blockExternalRequests(page, externalRequests);

    await page.goto('/#network');
    await expect(page.getByRole('heading', { name: /Network Diagnostic/i })).toBeVisible();
    await page.waitForTimeout(500);

    const diagnosticRequests = externalRequests.filter(url =>
        /cloudflare|ipwho\.is|ipapi\.co|api\.ipify\.org|google\.com|apple\.com|firefox\.com/.test(url),
    );
    expect(diagnosticRequests).toEqual([]);
});

test('dashboard avoids duplicate WebGL capability probes on initial render', async ({ page }) => {
    await page.addInitScript(() => {
        const counters = { canvasCreates: 0, webglContextRequests: 0 };
        Object.defineProperty(window, '__hardwarePerfCounters', { value: counters });
        const originalCreateElement = Document.prototype.createElement;
        Document.prototype.createElement = function createElement(tagName, options) {
            const element = originalCreateElement.call(this, tagName, options);
            if (String(tagName).toLowerCase() === 'canvas') {
                counters.canvasCreates += 1;
                const canvas = element as HTMLCanvasElement;
                const originalGetContext = canvas.getContext;
                canvas.getContext = function getContext(contextId: string, contextAttributes?: unknown) {
                    if (contextId === 'webgl' || contextId === 'webgl2') counters.webglContextRequests += 1;
                    return originalGetContext.call(this, contextId as never, contextAttributes as never);
                } as HTMLCanvasElement['getContext'];
            }
            return element;
        };
    });

    await page.goto('/#dashboard');
    await expect(page.getByRole('heading', { name: /Hardware Diagnostic Suite/i })).toBeVisible();
    await page.waitForTimeout(500);

    const counters = await page.evaluate(() => window.__hardwarePerfCounters as {
        canvasCreates: number;
        webglContextRequests: number;
    });

    expect(counters.webglContextRequests).toBeLessThanOrEqual(3);
});
