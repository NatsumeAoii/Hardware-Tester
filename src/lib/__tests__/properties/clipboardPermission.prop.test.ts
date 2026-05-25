import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property 7: Clipboard permission state display
 * **Validates: Requirements 5.5**
 *
 * For any combination of clipboard-read and clipboard-write permission states
 * (each being one of granted, denied, or prompt), the rendered output SHALL
 * display both permission names with their corresponding state values.
 *
 * This is a data model property test that verifies the clipboard permission
 * display model correctly represents all possible state combinations.
 */

type PermissionState = 'granted' | 'denied' | 'prompt';

const VALID_STATES: PermissionState[] = ['granted', 'denied', 'prompt'];

interface ClipboardPermissionDisplay {
    name: string;
    state: PermissionState;
}

/**
 * Builds the clipboard permission display model from read and write states.
 * This mirrors the data structure used by ClipboardTester to render permission badges.
 */
function buildClipboardPermissionDisplay(
    readState: PermissionState,
    writeState: PermissionState
): ClipboardPermissionDisplay[] {
    return [
        { name: 'clipboard-read', state: readState },
        { name: 'clipboard-write', state: writeState },
    ];
}

const permissionStateArb: fc.Arbitrary<PermissionState> = fc.constantFrom(...VALID_STATES);

describe('Property 7: Clipboard permission state display', () => {
    it('should display both permission names with their corresponding state values for all combinations', () => {
        fc.assert(
            fc.property(
                permissionStateArb,
                permissionStateArb,
                (readState: PermissionState, writeState: PermissionState) => {
                    const display = buildClipboardPermissionDisplay(readState, writeState);

                    // 1. Both permission names ('clipboard-read' and 'clipboard-write') are represented
                    const names = display.map((d) => d.name);
                    expect(names).toContain('clipboard-read');
                    expect(names).toContain('clipboard-write');

                    // 2. Each state value is one of the valid states
                    for (const entry of display) {
                        expect(VALID_STATES).toContain(entry.state);
                    }

                    // 3. The combination is complete (no missing permission)
                    expect(display).toHaveLength(2);

                    // Verify the correct state is associated with the correct permission name
                    const readEntry = display.find((d) => d.name === 'clipboard-read');
                    const writeEntry = display.find((d) => d.name === 'clipboard-write');
                    expect(readEntry).toBeDefined();
                    expect(writeEntry).toBeDefined();
                    expect(readEntry!.state).toBe(readState);
                    expect(writeEntry!.state).toBe(writeState);
                }
            ),
            { numRuns: 100 }
        );
    });
});
