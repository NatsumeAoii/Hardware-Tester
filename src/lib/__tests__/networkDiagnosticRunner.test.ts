import { describe, expect, it, vi } from 'vitest';
import { createTimeoutError, type TestServer } from '../networkDiagnostics';
import { runNetworkDiagnostic } from '../networkDiagnosticRunner';

const server: TestServer = {
    id: 'test',
    name: 'Test Server',
    pingUrl: 'https://example.test/ping',
    downloadUrl: bytes => `https://example.test/down?bytes=${bytes}`,
    uploadUrl: bytes => `https://example.test/up?bytes=${bytes}`,
};

const okResponse = () => ({
    blob: vi.fn().mockResolvedValue(new Blob(['ok'])),
}) as unknown as Response;

describe('networkDiagnosticRunner', () => {
    it('returns a completed failed result when every request fails', async () => {
        const result = await runNetworkDiagnostic({
            server,
            testSizeBytes: 1024,
            fetcher: vi.fn().mockRejectedValue(createTimeoutError(1)),
            delay: vi.fn().mockResolvedValue(undefined),
            now: vi.fn(() => 10),
        });

        expect(result).toMatchObject({
            ping: -1,
            jitter: -1,
            download: -1,
            upload: -1,
            packetLoss: 100,
            grade: '',
        });
    });

    it('returns null without work when the signal is already aborted', async () => {
        const controller = new AbortController();
        controller.abort();
        const fetcher = vi.fn();

        await expect(runNetworkDiagnostic({
            server,
            testSizeBytes: 1024,
            fetcher,
            signal: controller.signal,
        })).resolves.toBeNull();
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('reports progress and grades successful samples', async () => {
        let tick = 0;
        const progress: string[] = [];
        const fetcher = vi.fn().mockResolvedValue(okResponse());

        const result = await runNetworkDiagnostic({
            server,
            testSizeBytes: 1024,
            fetcher,
            delay: vi.fn().mockResolvedValue(undefined),
            now: vi.fn(() => {
                tick += 20;
                return tick;
            }),
            onProgress: step => progress.push(step.text),
        });

        expect(result?.packetLoss).toBe(0);
        expect(result?.ping).toBe(20);
        expect(result?.grade).not.toBe('');
        expect(progress).toContain('Testing latency...');
        expect(progress).toContain('Complete');
    });
});
