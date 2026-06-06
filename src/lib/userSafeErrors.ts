export interface UserSafeError {
    stableCode: string;
    message: string;
    detail: string;
}

const errorMessages: Record<string, UserSafeError> = {
    NotAllowedError: {
        stableCode: 'BROWSER_PERMISSION_DENIED',
        message: 'Permission was denied.',
        detail: 'Allow access in the browser permission prompt or site settings, then try again.',
    },
    NotFoundError: {
        stableCode: 'BROWSER_DEVICE_NOT_FOUND',
        message: 'No matching device was found.',
        detail: 'Connect the hardware, unlock it if needed, and run the test again.',
    },
    NotReadableError: {
        stableCode: 'BROWSER_DEVICE_BUSY',
        message: 'The device is already in use.',
        detail: 'Close other apps or tabs using this device, then try again.',
    },
    AbortError: {
        stableCode: 'BROWSER_OPERATION_ABORTED',
        message: 'The operation was cancelled.',
        detail: 'No hardware changes were made.',
    },
    SecurityError: {
        stableCode: 'BROWSER_SECURE_CONTEXT_REQUIRED',
        message: 'This feature requires a secure browser context.',
        detail: 'Use HTTPS or localhost and check browser feature permissions.',
    },
    OverconstrainedError: {
        stableCode: 'BROWSER_CONSTRAINT_UNAVAILABLE',
        message: 'The requested hardware setting is unavailable.',
        detail: 'Try a lower resolution, a different input device, or default settings.',
    },
    NotSupportedError: {
        stableCode: 'BROWSER_API_UNSUPPORTED',
        message: 'This browser does not support the requested hardware feature.',
        detail: 'Try another modern browser or use the operating system diagnostic tool for this device.',
    },
    NetworkError: {
        stableCode: 'NETWORK_REQUEST_FAILED',
        message: 'The network request failed.',
        detail: 'Check connectivity, VPN, firewall, or captive portal state and run the test again.',
    },
    TimeoutError: {
        stableCode: 'NETWORK_TIMEOUT',
        message: 'The request timed out.',
        detail: 'The endpoint did not respond quickly enough. Try a smaller test size or another server.',
    },
};

const unknownError: UserSafeError = {
    stableCode: 'UNKNOWN_BROWSER_ERROR',
    message: 'The browser could not complete this operation.',
    detail: 'Retry once. If it still fails, check browser permissions and device availability.',
};

const toErrorName = (error: unknown) => {
    if (error instanceof DOMException || error instanceof Error) return error.name;
    if (typeof error === 'object' && error !== null && 'name' in error) return String((error as { name: unknown }).name);
    return '';
};

const getMappedError = (name: string) => {
    return Object.prototype.hasOwnProperty.call(errorMessages, name) ? errorMessages[name] : undefined;
};

export function getUserSafeError(error: unknown, fallback: Partial<UserSafeError> = {}): UserSafeError {
    const mapped = getMappedError(toErrorName(error)) ?? unknownError;
    return {
        stableCode: fallback.stableCode ?? mapped.stableCode,
        message: fallback.message ?? mapped.message,
        detail: fallback.detail ?? mapped.detail,
    };
}

export const formatUserSafeError = (error: unknown, fallback?: Partial<UserSafeError>) => {
    const safeError = getUserSafeError(error, fallback);
    return `${safeError.message} ${safeError.detail} (${safeError.stableCode})`;
};

export const isAbortError = (error: unknown) => toErrorName(error) === 'AbortError';
