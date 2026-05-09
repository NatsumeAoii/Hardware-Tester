import { describe, expect, it, vi } from 'vitest';
import { abortableDelay, createCleanupStack } from '../lifecycle';

describe('lifecycle', () => {
    it('runs cleanup callbacks once in reverse order and collects errors', () => {
        const stack = createCleanupStack();
        const calls: string[] = [];
        stack.add(() => calls.push('first'));
        stack.add(() => { throw new Error('cleanup failed'); });
        stack.add(() => calls.push('third'));

        const result = stack.run();

        expect(calls).toEqual(['third', 'first']);
        expect(result.errors).toHaveLength(1);
        expect(stack.size()).toBe(0);
        expect(stack.run().errors).toHaveLength(0);
    });

    it('resolves or aborts delays with explicit abort errors', async () => {
        vi.useFakeTimers();
        const controller = new AbortController();
        const resolved = abortableDelay(50);
        await vi.advanceTimersByTimeAsync(50);
        await expect(resolved).resolves.toBeUndefined();

        const aborted = abortableDelay(50, controller.signal);
        controller.abort();
        await expect(aborted).rejects.toMatchObject({ name: 'AbortError' });
        vi.useRealTimers();
    });
});
