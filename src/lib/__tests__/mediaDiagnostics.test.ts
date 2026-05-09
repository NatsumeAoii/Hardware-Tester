import { describe, expect, it, vi } from 'vitest';
import { stopMediaStream } from '../mediaDiagnostics';

describe('mediaDiagnostics', () => {
    it('stops every track on a media stream', () => {
        const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }];
        const stream = {
            getTracks: () => tracks,
        } as unknown as MediaStream;

        stopMediaStream(stream);

        expect(tracks[0].stop).toHaveBeenCalledOnce();
        expect(tracks[1].stop).toHaveBeenCalledOnce();
    });
});
