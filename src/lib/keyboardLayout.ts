export interface KeyDef {
    code: string;
    label: string;
    classes?: string;
}

export interface KeyRow {
    group: string;
    type?: string;
    keys: KeyDef[];
}

export const keyboardLayout: KeyRow[] = [
    {
        group: 'main-keys', type: 'f-keys', keys: [
            { code: 'Escape', label: 'Esc' }, { code: 'F1', label: 'F1' }, { code: 'F2', label: 'F2' },
            { code: 'F3', label: 'F3' }, { code: 'F4', label: 'F4' }, { code: 'F5', label: 'F5' },
            { code: 'F6', label: 'F6' }, { code: 'F7', label: 'F7' }, { code: 'F8', label: 'F8' },
            { code: 'F9', label: 'F9' }, { code: 'F10', label: 'F10' }, { code: 'F11', label: 'F11' },
            { code: 'F12', label: 'F12' },
        ]
    },
    {
        group: 'main-keys', keys: [
            { code: 'Backquote', label: '`' }, { code: 'Digit1', label: '1' }, { code: 'Digit2', label: '2' },
            { code: 'Digit3', label: '3' }, { code: 'Digit4', label: '4' }, { code: 'Digit5', label: '5' },
            { code: 'Digit6', label: '6' }, { code: 'Digit7', label: '7' }, { code: 'Digit8', label: '8' },
            { code: 'Digit9', label: '9' }, { code: 'Digit0', label: '0' }, { code: 'Minus', label: '-' },
            { code: 'Equal', label: '=' }, { code: 'Backspace', label: '⌫', classes: 'w-2' },
        ]
    },
    {
        group: 'main-keys', keys: [
            { code: 'Tab', label: 'Tab', classes: 'w-1-5' }, { code: 'KeyQ', label: 'Q' }, { code: 'KeyW', label: 'W' },
            { code: 'KeyE', label: 'E' }, { code: 'KeyR', label: 'R' }, { code: 'KeyT', label: 'T' },
            { code: 'KeyY', label: 'Y' }, { code: 'KeyU', label: 'U' }, { code: 'KeyI', label: 'I' },
            { code: 'KeyO', label: 'O' }, { code: 'KeyP', label: 'P' }, { code: 'BracketLeft', label: '[' },
            { code: 'BracketRight', label: ']' }, { code: 'Backslash', label: '\\', classes: 'w-1-5' },
        ]
    },
    {
        group: 'main-keys', keys: [
            { code: 'CapsLock', label: 'Caps', classes: 'w-1-75' }, { code: 'KeyA', label: 'A' },
            { code: 'KeyS', label: 'S' }, { code: 'KeyD', label: 'D' }, { code: 'KeyF', label: 'F' },
            { code: 'KeyG', label: 'G' }, { code: 'KeyH', label: 'H' }, { code: 'KeyJ', label: 'J' },
            { code: 'KeyK', label: 'K' }, { code: 'KeyL', label: 'L' }, { code: 'Semicolon', label: ';' },
            { code: 'Quote', label: "'" }, { code: 'Enter', label: 'Enter', classes: 'w-2-25' },
        ]
    },
    {
        group: 'main-keys', keys: [
            { code: 'ShiftLeft', label: 'Shift', classes: 'w-2-25' }, { code: 'KeyZ', label: 'Z' },
            { code: 'KeyX', label: 'X' }, { code: 'KeyC', label: 'C' }, { code: 'KeyV', label: 'V' },
            { code: 'KeyB', label: 'B' }, { code: 'KeyN', label: 'N' }, { code: 'KeyM', label: 'M' },
            { code: 'Comma', label: ',' }, { code: 'Period', label: '.' }, { code: 'Slash', label: '/' },
            { code: 'ShiftRight', label: 'Shift', classes: 'w-2-75' },
        ]
    },
    {
        group: 'main-keys', keys: [
            { code: 'ControlLeft', label: 'Ctrl', classes: 'w-1-25' }, { code: 'MetaLeft', label: 'Win', classes: 'w-1-25' },
            { code: 'AltLeft', label: 'Alt', classes: 'w-1-25' }, { code: 'Space', label: '', classes: 'w-space' },
            { code: 'AltRight', label: 'Alt', classes: 'w-1-25' }, { code: 'MetaRight', label: 'Win', classes: 'w-1-25' },
            { code: 'ContextMenu', label: 'Menu', classes: 'w-1-25' }, { code: 'ControlRight', label: 'Ctrl', classes: 'w-1-25' },
        ]
    },
    {
        group: 'edit-keys', type: 'hidden-in-75', keys: [
            { code: 'Insert', label: 'Ins' }, { code: 'Home', label: 'Home' }, { code: 'PageUp', label: 'PgUp' },
        ]
    },
    {
        group: 'edit-keys', keys: [
            { code: 'Delete', label: 'Del' }, { code: 'End', label: 'End' }, { code: 'PageDown', label: 'PgDn' },
        ]
    },
    {
        group: 'edit-keys', type: 'arrow-keys', keys: [
            { code: '', label: '' }, { code: 'ArrowUp', label: '↑' }, { code: '', label: '' },
        ]
    },
    {
        group: 'edit-keys', keys: [
            { code: 'ArrowLeft', label: '←' }, { code: 'ArrowDown', label: '↓' }, { code: 'ArrowRight', label: '→' },
        ]
    },
    {
        group: 'numpad', keys: [
            { code: 'NumLock', label: 'Num' }, { code: 'NumpadDivide', label: '/' },
            { code: 'NumpadMultiply', label: '*' }, { code: 'NumpadSubtract', label: '-' },
        ]
    },
    {
        group: 'numpad', keys: [
            { code: 'Numpad7', label: '7' }, { code: 'Numpad8', label: '8' },
            { code: 'Numpad9', label: '9' }, { code: 'NumpadAdd', label: '+', classes: 'h-2' },
        ]
    },
    {
        group: 'numpad', keys: [
            { code: 'Numpad4', label: '4' }, { code: 'Numpad5', label: '5' },
            { code: 'Numpad6', label: '6' },
        ]
    },
    {
        group: 'numpad', keys: [
            { code: 'Numpad1', label: '1' }, { code: 'Numpad2', label: '2' },
            { code: 'Numpad3', label: '3' }, { code: 'NumpadEnter', label: 'Ent', classes: 'h-2' },
        ]
    },
    {
        group: 'numpad', keys: [
            { code: 'Numpad0', label: '0', classes: 'w-2' }, { code: 'NumpadDecimal', label: '.' },
        ]
    },
];

export function getLocationName(location: number): string {
    const names: Record<number, string> = { 0: 'Standard', 1: 'Left', 2: 'Right', 3: 'Numpad' };
    return names[location] ?? `Unknown (${location})`;
}
