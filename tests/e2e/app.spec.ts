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

test('dashboard prioritizes diagnostic actions before dense metadata', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.dash-overview')).toBeVisible();
    await expect(page.getByLabel('Dashboard summary')).toBeVisible();
    await expect(page.getByLabel('Dashboard summary')).toContainText('Tests');
    await expect(page.getByRole('link', { name: /^Start Testing$/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Generate Report$/ })).toBeVisible();
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

for (const viewport of [
    { name: 'phone', width: 390, height: 844 },
    { name: 'tablet', width: 820, height: 1180 },
]) {
    test(`small-screen navigation keeps display controls out of the open drawer on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');

        await expect(page.locator('.a11y-controls--mobile')).toBeVisible();

        await page.getByRole('button', { name: /Open navigation/i }).click();

        await expect(page.locator('.sidebar')).toHaveClass(/open/);
        await expect(page.locator('.a11y-controls--mobile')).toBeHidden();

        await page.getByRole('complementary', { name: /Test navigation/i }).getByRole('button', { name: /Close navigation/i }).click();

        await expect(page.locator('.sidebar')).not.toHaveClass(/open/);
        await expect(page.locator('.a11y-controls--mobile')).toBeVisible();
    });
}

test('navigation explains status dots without changing link names', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByLabel('Navigation status legend')).toBeVisible();
    await expect(page.getByLabel('Navigation status legend')).toContainText('Ready');
    await expect(page.getByLabel('Navigation status legend')).toContainText('Permission');
    await expect(page.getByRole('navigation', { name: /Hardware tests/i }).getByRole('link', { name: /^Keyboard$/ })).toBeVisible();
});

test('desktop display controls live outside main content', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.a11y-controls--sidebar')).toBeVisible();
    await expect(page.locator('.a11y-controls--mobile')).toBeHidden();

    const controlsBox = await page.locator('.a11y-controls--sidebar').boundingBox();
    const mainBox = await page.getByRole('main').boundingBox();

    expect(controlsBox).not.toBeNull();
    expect(mainBox).not.toBeNull();
    expect(controlsBox!.x + controlsBox!.width).toBeLessThanOrEqual(mainBox!.x);
});

test('mobile display controls stay clear of dashboard content', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const controlsBox = await page.locator('.a11y-controls--mobile').boundingBox();
    const overviewBox = await page.locator('.dash-overview').boundingBox();

    expect(controlsBox).not.toBeNull();
    expect(overviewBox).not.toBeNull();
    expect(controlsBox!.y + controlsBox!.height).toBeLessThanOrEqual(overviewBox!.y - 8);
});

for (const viewport of [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'phone', width: 390, height: 844 },
]) {
    test(`quick actions menu exposes report and GitHub links on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');

        const menu = page.getByRole('button', { name: /Open quick actions/i });
        await expect(menu).toBeVisible();
        await menu.click();

        await expect(page.getByRole('link', { name: /^Report$/ })).toHaveAttribute('href', '#report');

        const githubLink = page.getByRole('link', { name: /^GitHub$/ });
        await expect(githubLink).toHaveAttribute('href', 'https://github.com/wardana/hardware-diagnostic-suite');
        await expect(githubLink).toHaveAttribute('target', '_blank');
        await expect(githubLink).toHaveAttribute('rel', /noreferrer/);
    });
}

test('quick actions menu stays out of the open mobile drawer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByRole('button', { name: /Open quick actions/i })).toBeVisible();
    await page.getByRole('button', { name: /Open navigation/i }).click();

    await expect(page.getByRole('button', { name: /Open quick actions/i })).toBeHidden();
});

for (const viewport of [
    { name: 'phone', width: 390, height: 844 },
    { name: 'tablet', width: 820, height: 1180 },
]) {
    test(`core tester routes avoid viewport horizontal overflow on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        for (const route of ['dashboard', 'network', 'mic', 'webcam', 'report']) {
            await page.goto(`/#${route}`);
            await expect(page.getByRole('main')).toBeVisible();

            const overflow = await page.evaluate(() => ({
                documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
                mainOverflow: Math.ceil(document.querySelector('main')!.scrollWidth - document.querySelector('main')!.clientWidth),
            }));

            expect(overflow.documentOverflow, `${route} document overflow`).toBeLessThanOrEqual(1);
            expect(overflow.bodyOverflow, `${route} body overflow`).toBeLessThanOrEqual(1);
            expect(overflow.mainOverflow, `${route} main overflow`).toBeLessThanOrEqual(1);
        }
    });
}

test('diagnostic surfaces use the shared neutral surface treatment', async ({ page }) => {
    await page.goto('/#network');

    const networkSurfaces = page.locator('.net-config, .controls-bar, .info-card').first();
    await expect(networkSurfaces).toBeVisible();

    const expectedSurfaceColor = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.backgroundColor = 'var(--surface-1)';
        document.body.appendChild(probe);
        const color = window.getComputedStyle(probe).backgroundColor;
        probe.remove();
        return color;
    });
    const expectedRadius = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--radius').trim());
    const expectedNetworkStyles = Array.from(
        { length: await page.locator('.net-config, .controls-bar, .info-card').count() },
        () => ({
            backgroundColor: expectedSurfaceColor,
            backgroundImage: 'none',
            borderRadius: expectedRadius,
        }),
    );

    await expect.poll(async () => page.locator('.net-config, .controls-bar, .info-card').evaluateAll(elements => elements.map(element => {
        const style = window.getComputedStyle(element);
        return {
            backgroundColor: style.backgroundColor,
            backgroundImage: style.backgroundImage,
            borderRadius: style.borderRadius,
        };
    })), { message: 'network surfaces settle on shared neutral treatment' }).toEqual(expectedNetworkStyles);

    const networkSurfaceStyles = await page.locator('.net-config, .controls-bar, .info-card').evaluateAll(elements => elements.map(element => {
        const style = window.getComputedStyle(element);
        return {
            backgroundColor: style.backgroundColor,
            backgroundImage: style.backgroundImage,
            borderRadius: style.borderRadius,
        };
    }));

    for (const style of networkSurfaceStyles) {
        expect(style.backgroundImage).toBe('none');
        expect(style.backgroundColor).toBe(expectedSurfaceColor);
        expect(style.borderRadius).toBe(expectedRadius);
    }

    await page.goto('/#mic');
    const micViz = page.locator('.mic-viz');
    await expect(micViz).toBeVisible();

    await expect.poll(async () => micViz.evaluate(element => {
        const style = window.getComputedStyle(element);
        return {
            backgroundColor: style.backgroundColor,
            backgroundImage: style.backgroundImage,
            borderRadius: style.borderRadius,
        };
    }), { message: 'microphone visualization settles on shared neutral treatment' }).toEqual({
        backgroundColor: expectedSurfaceColor,
        backgroundImage: 'none',
        borderRadius: expectedRadius,
    });

    const micVizStyle = await micViz.evaluate(element => {
        const style = window.getComputedStyle(element);
        return {
            backgroundColor: style.backgroundColor,
            backgroundImage: style.backgroundImage,
            borderRadius: style.borderRadius,
        };
    });

    expect(micVizStyle.backgroundImage).toBe('none');
    expect(micVizStyle.backgroundColor).toBe(expectedSurfaceColor);
    expect(micVizStyle.borderRadius).toBe(expectedRadius);
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
