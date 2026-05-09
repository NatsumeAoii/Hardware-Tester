type AudioContextConstructor = new () => AudioContext;

type WindowWithAudioContext = Window & {
    readonly AudioContext?: AudioContextConstructor;
    readonly webkitAudioContext?: AudioContextConstructor;
};

export async function requestUserMedia(
    constraints: MediaStreamConstraints,
    navigatorRef: Navigator = navigator,
): Promise<MediaStream> {
    const requestMedia = navigatorRef.mediaDevices?.getUserMedia;
    if (typeof requestMedia !== 'function') {
        throw new DOMException('Media capture API is unavailable.', 'NotSupportedError');
    }
    return requestMedia.call(navigatorRef.mediaDevices, constraints);
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
    stream?.getTracks().forEach(track => track.stop());
}

export function getAudioTrackSettings(stream: MediaStream): MediaTrackSettings | null {
    return stream.getAudioTracks()[0]?.getSettings() ?? null;
}

export function getVideoTrackSettings(stream: MediaStream): MediaTrackSettings | null {
    return stream.getVideoTracks()[0]?.getSettings() ?? null;
}

export function createAudioContext(scope: Window = window): AudioContext {
    const audioWindow = scope as WindowWithAudioContext;
    const ctor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (typeof ctor !== 'function') {
        throw new DOMException('AudioContext API is unavailable.', 'NotSupportedError');
    }
    return new ctor();
}

export async function closeAudioContext(audioContext: AudioContext | null | undefined): Promise<void> {
    if (!audioContext || audioContext.state === 'closed') return;
    await audioContext.close();
}

export async function attachStreamToVideo(video: HTMLVideoElement, stream: MediaStream): Promise<void> {
    video.srcObject = stream;
    await video.play();
}

export function clearVideoSource(video: HTMLVideoElement | null): void {
    if (video) video.srcObject = null;
}

export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement, dpr = window.devicePixelRatio || 1): void {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
}

export function downloadDataUrl(dataUrl: string, filename: string, documentRef: Document = document): void {
    const link = documentRef.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
}
