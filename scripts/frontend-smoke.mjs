import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const packageJson = JSON.parse(read('package.json'));
assert.equal(packageJson.scripts.test, 'vitest run');
assert.equal(packageJson.scripts['test:smoke'], 'node scripts/frontend-smoke.mjs');
assert.equal(packageJson.scripts['test:e2e'], 'playwright test');

assert.ok(existsSync(join(root, 'src/lib/testerRegistry.ts')), 'tester registry must centralize route/test metadata');
assert.ok(existsSync(join(root, 'src/lib/siteMeta.ts')), 'site metadata must be centralized');
assert.ok(existsSync(join(root, 'src/lib/hardwareCapabilities.ts')), 'hardware compatibility detection must be centralized');
assert.ok(existsSync(join(root, 'src/lib/userSafeErrors.ts')), 'user-safe browser error mapping must be centralized');
assert.ok(existsSync(join(root, 'src/lib/browserAdapters.ts')), 'browser API adapters must centralize experimental hardware API typing');
assert.ok(existsSync(join(root, 'src/lib/networkDiagnostics.ts')), 'network diagnostic logic must be isolated from the UI component');
assert.ok(existsSync(join(root, 'src/lib/diagnosticState.ts')), 'diagnostic state helpers must be centralized');
assert.ok(existsSync(join(root, 'src/lib/formatters.ts')), 'shared display formatters must be centralized');
assert.ok(existsSync(join(root, 'src/lib/graphicsDiagnostics.ts')), 'WebGL diagnostic helpers must be centralized');
assert.ok(existsSync(join(root, 'src/lib/lifecycle.ts')), 'lifecycle cleanup helpers must be centralized');
assert.ok(existsSync(join(root, 'src/lib/mediaDiagnostics.ts')), 'media diagnostic helpers must be centralized');
assert.ok(existsSync(join(root, 'src/lib/permissions.ts')), 'permission probing helpers must be centralized');
assert.ok(existsSync(join(root, 'src/lib/routeUtils.ts')), 'hash routing helpers must be centralized');
assert.ok(existsSync(join(root, 'src/lib/storageUtils.ts')), 'safe storage helpers must be centralized');
assert.ok(existsSync(join(root, 'src/hooks/useAppearancePreferences.ts')), 'appearance preference service must exist');
assert.ok(existsSync(join(root, 'src/hooks/useHardwareCapabilities.ts')), 'hardware compatibility hook must exist');
assert.ok(existsSync(join(root, 'src/components/dashboard/CompatibilityMatrix.tsx')), 'dashboard compatibility panel must be isolated');
assert.ok(existsSync(join(root, 'public/site.webmanifest')), 'web app manifest must exist');
assert.ok(existsSync(join(root, 'vitest.config.ts')), 'Vitest unit test collection config must exist');
assert.ok(existsSync(join(root, 'playwright.config.ts')), 'Playwright browser regression config must exist');
assert.ok(existsSync(join(root, 'tests/e2e/app.spec.ts')), 'browser route regression specs must exist');

const app = read('src/App.tsx');
assert.match(app, /from '\.\/lib\/testerRegistry'/, 'App must consume centralized tester registry');
assert.match(app, /from '\.\/lib\/routeUtils'/, 'App must consume centralized hash route logic');
assert.match(app, /useAppearancePreferences/, 'App must use persisted appearance preference logic');
assert.match(app, /useHardwareCapabilities/, 'App must surface hardware compatibility in navigation');
assert.match(app, /nav-status/, 'App navigation must show tester readiness status');
assert.match(app, /nav-status-legend/, 'App navigation must explain tester readiness status dots');
assert.match(app, /Navigation status legend/, 'App navigation status legend must be accessible');
assert.match(app, /aria-hidden="true"/, 'decorative nav status dots must not pollute link accessible names');
assert.doesNotMatch(app, /decodeURIComponent/, 'App must not own hash decoding details');
assert.doesNotMatch(app, /const svgPaths/, 'App must not own duplicate nav icon metadata');
assert.doesNotMatch(app, /const testers/, 'App must not own duplicate tester route metadata');

const dashboard = read('src/components/Dashboard.tsx');
assert.match(dashboard, /from '\.\.\/lib\/testerRegistry'/, 'Dashboard must consume centralized tester registry');
assert.match(dashboard, /from '\.\/dashboard\/CompatibilityMatrix'/, 'Dashboard must delegate compatibility UI');
assert.match(dashboard, /dash-overview/, 'Dashboard must use the workstation overview layout');
assert.match(dashboard, /Dashboard summary/, 'Dashboard overview summary must be accessible');
assert.doesNotMatch(dashboard, /const features/, 'Dashboard must not own duplicate dashboard feature metadata');
assert.doesNotMatch(dashboard, /const featureSvgPaths/, 'Dashboard must not own duplicate feature icon metadata');
assert.doesNotMatch(dashboard, /const apis/, 'Dashboard must not own hardware API compatibility logic');

const registry = read('src/lib/testerRegistry.ts');
for (const id of ['dashboard', 'keyboard', 'screen', 'ambient-light', 'printer', 'report']) {
  assert.match(registry, new RegExp(`id: '${id}'`), `registry missing ${id}`);
}
assert.match(registry, /dashboardDescription:/, 'registry must include dashboard feature descriptions');
assert.match(registry, /techStack/, 'registry must expose tech stack metadata');

const appearanceHook = read('src/hooks/useAppearancePreferences.ts');
assert.match(appearanceHook, /from '\.\.\/lib\/storageUtils'/, 'appearance preferences must use safe storage helpers');
assert.match(appearanceHook, /prefers-color-scheme/, 'appearance preferences must support system theme');
assert.match(appearanceHook, /light-theme/, 'appearance preferences must apply light theme class');
assert.match(appearanceHook, /high-contrast/, 'appearance preferences must apply high contrast class');
assert.doesNotMatch(appearanceHook, /JSON\.parse|localStorage\.setItem|localStorage\.getItem/, 'appearance hook must not own storage parsing/writing');

const capabilities = read('src/lib/hardwareCapabilities.ts');
assert.match(capabilities, /detectHardwareCapabilities/, 'hardware capability registry must expose detector');
assert.match(capabilities, /getDeviceProfile/, 'hardware capability registry must detect device profile');
assert.match(capabilities, /secureContextRequired/, 'hardware capabilities must model secure-context requirements');
assert.match(capabilities, /fallback:/, 'hardware capabilities must define fallback guidance');
assert.match(capabilities, /desktop/, 'hardware capabilities must account for desktop hardware');
assert.match(capabilities, /mobile/, 'hardware capabilities must account for mobile hardware');
assert.match(capabilities, /getCapabilitySupport/, 'hardware capability detection must fail closed when API probes throw');
assert.match(capabilities, /typeof navigatorRef\.getGamepads === 'function'/, 'gamepad capability must align with tester runtime guard');
assert.match(capabilities, /typeof navigatorRef\.vibrate === 'function'/, 'vibration capability must require a callable API');

const capabilityHook = read('src/hooks/useHardwareCapabilities.ts');
assert.match(capabilityHook, /useHardwareCapabilities/, 'hardware compatibility hook must be named');
assert.match(capabilityHook, /resize/, 'hardware compatibility hook must react to viewport changes');
assert.match(capabilityHook, /visibilitychange/, 'hardware compatibility hook must refresh on tab visibility');

const compatibilityPanel = read('src/components/dashboard/CompatibilityMatrix.tsx');
assert.match(compatibilityPanel, /CompatibilityMatrix/, 'compatibility panel must export the dashboard component');
assert.match(compatibilityPanel, /compatibility-score/, 'compatibility panel must render a support score');
assert.match(compatibilityPanel, /Hardware compatibility summary/, 'compatibility panel must expose an accessible summary label');

const userSafeErrors = read('src/lib/userSafeErrors.ts');
assert.match(userSafeErrors, /getUserSafeError/, 'user-safe error mapper must be exported');
assert.match(userSafeErrors, /NotAllowedError/, 'permission denial must be handled explicitly');
assert.match(userSafeErrors, /stableCode/, 'user-safe errors must expose stable codes');
for (const componentPath of [
  'src/components/MicTester.tsx',
  'src/components/WebcamTester.tsx',
  'src/components/BluetoothTester.tsx',
  'src/components/MidiTester.tsx',
  'src/components/GeolocationTester.tsx',
  'src/components/SoundTester.tsx',
  'src/components/NetworkTester.tsx',
]) {
  const content = read(componentPath);
  assert.match(content, /getUserSafeError|formatUserSafeError/, `${componentPath} must use user-safe browser errors`);
  assert.doesNotMatch(content, /console\.error/, `${componentPath} must not leak diagnostics to console in user flows`);
}

const printer = read('src/components/PrinterTest.tsx');
assert.match(printer, /print-color-adjust:\s*exact/i, 'print page must preserve calibration colors');
assert.match(printer, /-webkit-print-color-adjust:\s*exact/i, 'print page must preserve calibration colors in Chromium');
assert.match(printer, /\.print-page,\s*\.print-page \*/s, 'print-color-adjust must apply to every printable child');
assert.doesNotMatch(printer, /â|Ã|Â/, 'print page must not contain mojibake text');
assert.match(printer, /printWhenFontsReady/, 'print action should wait for fonts through the shared adapter');

const network = read('src/components/NetworkTester.tsx');
assert.match(network, /network-alert/, 'Network tester must keep fatal errors visible after progress stops');
assert.match(network, /from '\.\.\/lib\/networkDiagnostics'/, 'Network tester must consume centralized network diagnostic logic');
assert.doesNotMatch(network, /function fetchWithTimeout/, 'Network tester must not own fetch timeout logic');
assert.doesNotMatch(network, /function parseTrace/, 'Network tester must not own trace parsing logic');
assert.doesNotMatch(network, /as any/, 'Network tester must not parse API responses through any casts');

const networkDiagnostics = read('src/lib/networkDiagnostics.ts');
assert.match(networkDiagnostics, /fetchWithTimeout/, 'network diagnostics must expose timeout-aware fetch');
assert.match(networkDiagnostics, /TimeoutError/, 'network diagnostics must distinguish request timeouts from user aborts');
assert.match(networkDiagnostics, /parseCloudflareTrace/, 'network diagnostics must expose robust Cloudflare trace parsing');
assert.match(networkDiagnostics, /fetchIpWithFallback/, 'network diagnostics must retain cascading public IP fallback logic');
assert.match(networkDiagnostics, /appendCacheBust/, 'network diagnostics must add cache-busting parameters safely');

const formatters = read('src/lib/formatters.ts');
for (const exportedName of [
  'EMPTY_VALUE',
  'NOT_AVAILABLE',
  'formatBytes',
  'formatClockDuration',
  'formatCoordinateDms',
  'formatDurationFromSeconds',
  'formatMilliseconds',
  'formatResolution',
  'formatSpeedMbps',
]) {
  assert.match(formatters, new RegExp(`export .*${exportedName}|export function ${exportedName}`), `formatters must export ${exportedName}`);
}

const diagnosticState = read('src/lib/diagnosticState.ts');
assert.match(diagnosticState, /DiagnosticPhase/, 'diagnostic state must model phases');
assert.match(diagnosticState, /createDiagnosticState/, 'diagnostic state must expose a state factory');
assert.match(diagnosticState, /getDiagnosticMessage/, 'diagnostic state must expose stable message extraction');

const permissions = read('src/lib/permissions.ts');
assert.match(permissions, /queryPermissionState/, 'permissions module must safely query browser permissions');
assert.match(permissions, /throwIfPermissionDenied/, 'permissions module must expose denied-permission preflight guards');
assert.match(permissions, /getMotionPermissionApis/, 'permissions module must centralize motion permission API detection');
assert.match(permissions, /requestMotionPermissions/, 'permissions module must centralize motion permission requests');

const mediaDiagnostics = read('src/lib/mediaDiagnostics.ts');
assert.match(mediaDiagnostics, /requestUserMedia/, 'media diagnostics must expose guarded user-media requests');
assert.match(mediaDiagnostics, /stopMediaStream/, 'media diagnostics must expose stream cleanup');
assert.match(mediaDiagnostics, /createAudioContext/, 'media diagnostics must expose cross-browser audio context creation');
assert.match(mediaDiagnostics, /downloadDataUrl/, 'media diagnostics must centralize snapshot downloads');

const lifecycle = read('src/lib/lifecycle.ts');
assert.match(lifecycle, /createCleanupStack/, 'lifecycle helpers must expose cleanup stacks');
assert.match(lifecycle, /abortableDelay/, 'lifecycle helpers must expose abortable delays');
assert.match(lifecycle, /cancelAnimationFrameIfSet/, 'lifecycle helpers must expose guarded animation cleanup');
assert.match(lifecycle, /clearTimeoutIfSet/, 'lifecycle helpers must expose guarded timeout cleanup');

const graphicsDiagnostics = read('src/lib/graphicsDiagnostics.ts');
assert.match(graphicsDiagnostics, /createWebGLContext/, 'graphics diagnostics must expose WebGL context creation');
assert.match(graphicsDiagnostics, /getWebGLInfo/, 'graphics diagnostics must expose GPU information extraction');
assert.match(graphicsDiagnostics, /createWebGLProgram/, 'graphics diagnostics must centralize shader program lifecycle');
assert.match(graphicsDiagnostics, /getParticleBudget/, 'graphics diagnostics must centralize adaptive GPU load');

const routeUtils = read('src/lib/routeUtils.ts');
assert.match(routeUtils, /getHashTester/, 'route utils must expose tester hash resolution');
assert.match(routeUtils, /repairInvalidHash/, 'route utils must expose invalid hash repair');
assert.match(routeUtils, /isNarrowViewport/, 'route utils must expose responsive navigation breakpoint logic');

const storageUtils = read('src/lib/storageUtils.ts');
assert.match(storageUtils, /readJsonStorage/, 'storage utils must expose safe JSON reads');
assert.match(storageUtils, /writeJsonStorage/, 'storage utils must expose safe JSON writes');

const browserAdapters = read('src/lib/browserAdapters.ts');
for (const exportedName of [
  'getBattery',
  'getBluetooth',
  'requestMidiAccess',
  'getAmbientLightSensorConstructor',
  'getProximitySensorConstructor',
  'canVibrate',
  'vibrateDevice',
  'printWhenFontsReady',
]) {
  assert.match(browserAdapters, new RegExp(`export .*${exportedName}|export async function ${exportedName}|export function ${exportedName}`), `browser adapters must export ${exportedName}`);
}

const gamepad = read('src/components/GamepadTester.tsx');
assert.match(gamepad, /isSupported/, 'Gamepad tester must guard unsupported browsers before polling');
assert.match(gamepad, /Gamepad API is not available/, 'Gamepad tester must show an unsupported browser state');

const keyboard = read('src/components/KeyboardTester.tsx');
assert.match(keyboard, /isEditableTarget/, 'Keyboard tester must not hijack editable controls');
assert.match(keyboard, /shouldPreventDefault/, 'Keyboard tester must preserve browser shortcuts and form controls');

const doubleClick = read('src/components/DoubleClickTester.tsx');
assert.match(doubleClick, /recordClick/, 'Double-click tester should share pointer and keyboard click logic without fake events');
assert.doesNotMatch(doubleClick, /as any/, 'Double-click tester must not cast synthetic keyboard clicks to mouse events');

const touch = read('src/components/TouchTester.tsx');
assert.match(touch, /getRelativePoints/, 'Touch tester should centralize touch-list conversion');
assert.doesNotMatch(touch, /areaRef\.current!/, 'Touch tester must not assume the touch area ref exists during event handling');

const motion = read('src/components/MotionTester.tsx');
assert.match(motion, /from '\.\.\/lib\/permissions'/, 'Motion tester must use centralized permission helpers');
assert.match(motion, /formatUserSafeError/, 'Motion tester must map permission failures to user-safe messages');
assert.match(motion, /motion-alert/, 'Motion tester must keep permission/runtime failures visible');
assert.doesNotMatch(motion, /unknown as PermissionCapableSensorEvent/, 'Motion tester must not own motion permission API casts');

const screen = read('src/components/ScreenTester.tsx');
assert.match(screen, /screen-alert/, 'Screen tester must keep fullscreen failures visible');

const gpu = read('src/components/GpuTester.tsx');
assert.match(gpu, /from '\.\.\/lib\/graphicsDiagnostics'/, 'GPU tester must use centralized WebGL helpers');
assert.match(gpu, /particleBudget/, 'GPU stress test must adapt load to hardware capability');
assert.doesNotMatch(gpu, /createShader|createProgram\(/, 'GPU tester must not own shader program lifecycle');

for (const componentPath of [
  'src/components/MicTester.tsx',
  'src/components/WebcamTester.tsx',
  'src/components/SoundTester.tsx',
]) {
  const content = read(componentPath);
  assert.match(content, /from '\.\.\/lib\/mediaDiagnostics'/, `${componentPath} must use centralized media diagnostics`);
  assert.doesNotMatch(content, /navigator\.mediaDevices\.getUserMedia|new AudioContext|streamRef\.current\.getTracks\(\)\.forEach/, `${componentPath} must not duplicate low-level media setup/cleanup`);
}

for (const componentPath of [
  'src/components/BurnInFixer.tsx',
  'src/components/DoubleClickTester.tsx',
  'src/components/GamepadTester.tsx',
  'src/components/GpuTester.tsx',
  'src/components/MicTester.tsx',
  'src/components/MouseTester.tsx',
  'src/components/NetworkTester.tsx',
  'src/components/ScreenTester.tsx',
  'src/components/VibrationTester.tsx',
  'src/components/WebcamTester.tsx',
]) {
  assert.match(read(componentPath), /from '\.\.\/lib\/lifecycle'/, `${componentPath} must use centralized lifecycle cleanup helpers`);
}

for (const componentPath of [
  'src/components/MicTester.tsx',
  'src/components/WebcamTester.tsx',
  'src/components/GeolocationTester.tsx',
]) {
  assert.match(read(componentPath), /throwIfPermissionDenied/, `${componentPath} must use permission preflight where the browser supports it`);
}

for (const componentPath of [
  'src/components/BatteryTester.tsx',
  'src/components/GeolocationTester.tsx',
  'src/components/NetworkTester.tsx',
  'src/components/GpuTester.tsx',
  'src/hooks/useDeviceSpecs.ts',
]) {
  assert.match(read(componentPath), /from '\.\.\/lib\/formatters'|from '\.\/formatters'/, `${componentPath} must use shared display formatters`);
}

for (const componentPath of [
  'src/components/BluetoothTester.tsx',
  'src/components/MidiTester.tsx',
]) {
  assert.match(read(componentPath), /from '\.\.\/lib\/diagnosticState'/, `${componentPath} must use shared diagnostic state helpers`);
}

const report = read('src/components/SystemReport.tsx');
assert.match(report, /printWhenFontsReady/, 'system report print action should wait for fonts through the shared adapter');
assert.match(report, /print-color-adjust:\s*exact/i, 'system report print styles must preserve colors');

for (const componentPath of [
  'src/components/AmbientLightTester.tsx',
  'src/components/BatteryTester.tsx',
  'src/components/BluetoothTester.tsx',
  'src/components/MidiTester.tsx',
  'src/hooks/useDeviceSpecs.ts',
]) {
  assert.doesNotMatch(read(componentPath), /as any|: any\b/, `${componentPath} must use typed browser adapters instead of any casts`);
}

const workflow = read('.github/workflows/deploy.yml');
assert.match(workflow, /node-version:\s*22/, 'CI must use a Node version compatible with Vite 8');
assert.match(workflow, /npm test/, 'CI must run unit tests');
assert.match(workflow, /npm run test:smoke/, 'CI must run frontend smoke tests');
assert.match(workflow, /playwright install --with-deps chromium/, 'CI must install the Chromium browser for e2e tests');
assert.match(workflow, /npm run test:e2e/, 'CI must run browser route tests');
assert.match(workflow, /npm audit --audit-level=moderate/, 'CI must run dependency audit');

const playwrightConfig = read('playwright.config.ts');
assert.match(playwrightConfig, /testDir:\s*'\.\/tests\/e2e'/, 'Playwright must only collect e2e specs');
assert.match(playwrightConfig, /webServer:/, 'Playwright must start the local app server for browser tests');
assert.match(playwrightConfig, /Desktop Chrome/, 'Playwright must exercise the Chromium browser baseline');

const e2eSpec = read('tests/e2e/app.spec.ts');
assert.match(e2eSpec, /invalid hashes are repaired/, 'e2e tests must cover hash route repair');
assert.match(e2eSpec, /mobile navigation opens and collapses/, 'e2e tests must cover mobile navigation behavior');
assert.match(e2eSpec, /printer route keeps exact color print rendering enabled/, 'e2e tests must cover print color safeguards');
assert.match(e2eSpec, /blockExternalRequests/, 'e2e tests must avoid relying on third-party network services');

const vitestConfig = read('vitest.config.ts');
assert.match(vitestConfig, /src\/lib\/__tests__\/\*\*\/\*\.test\.ts/, 'Vitest must only collect unit tests');

const indexHtml = read('index.html');
assert.match(indexHtml, /<meta name="theme-color"/, 'index must declare theme colors');
assert.match(indexHtml, /<meta property="og:title"/, 'index must include Open Graph title');
assert.match(indexHtml, /<meta name="twitter:card"/, 'index must include Twitter card metadata');
assert.match(indexHtml, /<meta name="application-name"/, 'index must include application metadata');
assert.match(indexHtml, /<link rel="manifest" href="\/site\.webmanifest"/, 'index must link the web app manifest');
assert.match(indexHtml, /application\/ld\+json/, 'index must include structured WebApplication metadata');

const siteMeta = read('src/lib/siteMeta.ts');
assert.match(siteMeta, /siteMeta/, 'site metadata module must export siteMeta');
assert.match(siteMeta, /Hardware Diagnostic Suite/, 'site metadata must define the product name');
assert.match(siteMeta, /themeColor/, 'site metadata must define theme colors');
assert.match(siteMeta, /repositoryUrl/, 'site metadata must centralize the source repository URL');
assert.match(siteMeta, /https:\/\/github\.com\/wardana\/hardware-diagnostic-suite/, 'site metadata must point at the GitHub repository');

const manifest = JSON.parse(read('public/site.webmanifest'));
assert.equal(manifest.name, 'Hardware Diagnostic Suite');
assert.equal(manifest.display, 'standalone');

console.log('frontend smoke checks passed');
