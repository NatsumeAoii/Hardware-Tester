/**
 * Hex formatting utilities for device log display.
 * Used by the Serial/HID tester to format raw byte data as readable hex strings.
 */

/**
 * Formats raw byte data as space-separated two-character uppercase hex values.
 *
 * @param data - An ArrayBuffer or Uint8Array containing the bytes to format
 * @returns A string of space-separated uppercase hex byte values (e.g., "0A FF 3C")
 */
export function formatBytesAsHex(data: ArrayBuffer | Uint8Array): string {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const hexParts: string[] = [];
    for (let i = 0; i < bytes.length; i++) {
        hexParts.push(bytes[i].toString(16).toUpperCase().padStart(2, '0'));
    }
    return hexParts.join(' ');
}

/**
 * Creates a formatted log entry from raw byte data with an ISO timestamp
 * and optional HID report ID.
 *
 * @param data - The raw byte data to format
 * @param reportId - Optional HID report ID to include in the entry
 * @returns An object with the hex-formatted data and ISO timestamp
 */
export function formatLogEntry(
    data: Uint8Array,
    reportId?: number,
): { hex: string; timestamp: string; reportId?: number } {
    return {
        hex: formatBytesAsHex(data),
        timestamp: new Date().toISOString(),
        ...(reportId !== undefined && { reportId }),
    };
}
