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

async function blockExternalRequests(page: Page) {
    await page.route('**/*', route => {
        const requestUrl = new URL(route.request().url());
        if (requestUrl.protocol === 'data:' || appHosts.has(requestUrl.hostname)) {
            route.continue();
            return;
        }

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
