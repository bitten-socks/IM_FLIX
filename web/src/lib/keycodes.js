// Keycode tables mirror MCU/code.py's build_kmk_key() exactly.
// Any code added here must have a matching branch in that function,
// or the MCU will silently fall back to KC.NO / KC.A.

export const MOD_BITS = {
  CTRL: 0x01,
  SHIFT: 0x02,
  ALT: 0x04,
  WIN: 0x08,
};

export const MOD_LABELS = [
  [MOD_BITS.CTRL, 'Ctrl'],
  [MOD_BITS.SHIFT, 'Shift'],
  [MOD_BITS.ALT, 'Alt'],
  [MOD_BITS.WIN, 'Win'],
];

export const LETTER_KEYS = Array.from({ length: 26 }, (_, i) => ({
  code: 0x04 + i,
  label: String.fromCharCode(65 + i),
}));

export const NUMBER_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n, i) => ({
  code: 0x1e + i,
  label: String(n),
}));

export const SPECIAL_KEYS = [
  { code: 0x28, label: 'Enter' },
  { code: 0x29, label: 'Esc' },
  { code: 0x2a, label: 'Backspace' },
  { code: 0x2b, label: 'Tab' },
  { code: 0x2c, label: 'Space' },
];

export const FUNCTION_KEYS = Array.from({ length: 12 }, (_, i) => ({
  code: 0x3a + i,
  label: `F${i + 1}`,
}));

export const PUNCT_KEYS = [
  { code: 0x2d, label: '-' },
  { code: 0x2e, label: '=' },
  { code: 0x2f, label: '[' },
  { code: 0x30, label: ']' },
  { code: 0x31, label: '\\' },
  { code: 0x33, label: ';' },
  { code: 0x34, label: "'" },
  { code: 0x35, label: '`' },
  { code: 0x36, label: ',' },
  { code: 0x37, label: '.' },
  { code: 0x38, label: '/' },
];

export const NAV_KEYS = [
  { code: 0x49, label: 'Insert' },
  { code: 0x4a, label: 'Home' },
  { code: 0x4b, label: 'Page Up' },
  { code: 0x4c, label: 'Delete' },
  { code: 0x4d, label: 'End' },
  { code: 0x4e, label: 'Page Down' },
  { code: 0x4f, label: '→' },
  { code: 0x50, label: '←' },
  { code: 0x51, label: '↓' },
  { code: 0x52, label: '↑' },
];

// Maps a physical-key-layout DOM KeyboardEvent.code to the same HID usage ID
// build_kmk_key() in MCU/code.py expects, so a real keypress can be captured
// and mapped directly (see AssignmentDrawer's "직접 입력" tab).
export const DOM_CODE_TO_HID = {
  ...Object.fromEntries(LETTER_KEYS.map((k) => [`Key${k.label}`, k.code])),
  Digit1: 0x1e,
  Digit2: 0x1f,
  Digit3: 0x20,
  Digit4: 0x21,
  Digit5: 0x22,
  Digit6: 0x23,
  Digit7: 0x24,
  Digit8: 0x25,
  Digit9: 0x26,
  Digit0: 0x27,
  Enter: 0x28,
  Escape: 0x29,
  Backspace: 0x2a,
  Tab: 0x2b,
  Space: 0x2c,
  F1: 0x3a,
  F2: 0x3b,
  F3: 0x3c,
  F4: 0x3d,
  F5: 0x3e,
  F6: 0x3f,
  F7: 0x40,
  F8: 0x41,
  F9: 0x42,
  F10: 0x43,
  F11: 0x44,
  F12: 0x45,
  Minus: 0x2d,
  Equal: 0x2e,
  BracketLeft: 0x2f,
  BracketRight: 0x30,
  Backslash: 0x31,
  Semicolon: 0x33,
  Quote: 0x34,
  Backquote: 0x35,
  Comma: 0x36,
  Period: 0x37,
  Slash: 0x38,
  Insert: 0x49,
  Home: 0x4a,
  PageUp: 0x4b,
  Delete: 0x4c,
  End: 0x4d,
  PageDown: 0x4e,
  ArrowRight: 0x4f,
  ArrowLeft: 0x50,
  ArrowDown: 0x51,
  ArrowUp: 0x52,
};

const MODIFIER_DOM_CODES = new Set([
  'ControlLeft',
  'ControlRight',
  'ShiftLeft',
  'ShiftRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
]);

export function isModifierDomCode(domCode) {
  return MODIFIER_DOM_CODES.has(domCode);
}

export const MEDIA_KEYS = [
  { code: 0x80, label: 'Vol +' },
  { code: 0x81, label: 'Vol -' },
  { code: 0x82, label: 'Mute' },
  { code: 0xe8, label: 'Play/Pause' },
  { code: 0xe9, label: 'Next' },
  { code: 0xea, label: 'Prev' },
];

export const MACRO_PRESETS = [
  { name: 'Ctrl+C (복사)', mod: MOD_BITS.CTRL, code: 0x06, isMedia: 0 },
  { name: 'Ctrl+V (붙여넣기)', mod: MOD_BITS.CTRL, code: 0x19, isMedia: 0 },
  { name: 'Ctrl+X (잘라내기)', mod: MOD_BITS.CTRL, code: 0x1b, isMedia: 0 },
  { name: 'Ctrl+Z (실행취소)', mod: MOD_BITS.CTRL, code: 0x1d, isMedia: 0 },
  { name: 'Ctrl+S (저장)', mod: MOD_BITS.CTRL, code: 0x16, isMedia: 0 },
  { name: 'Win+Shift+S (캡처)', mod: MOD_BITS.WIN | MOD_BITS.SHIFT, code: 0x16, isMedia: 0 },
  { name: 'Alt+Tab (창 전환)', mod: MOD_BITS.ALT, code: 0x2b, isMedia: 0 },
];

const ALL_BASE_KEYS = [
  ...LETTER_KEYS,
  ...NUMBER_KEYS,
  ...SPECIAL_KEYS,
  ...FUNCTION_KEYS,
  ...PUNCT_KEYS,
  ...NAV_KEYS,
];

export function findBaseKeyLabel(code) {
  const found = ALL_BASE_KEYS.find((k) => k.code === code);
  return found ? found.label : `0x${code.toString(16).toUpperCase()}`;
}

export function findMediaLabel(code) {
  const found = MEDIA_KEYS.find((k) => k.code === code);
  return found ? found.label : `MEDIA 0x${code.toString(16).toUpperCase()}`;
}

export function describeKey({ mod = 0, code = 0, isMedia = 0 }) {
  if (!code && !mod) return '(비어있음)';
  if (isMedia) return findMediaLabel(code);
  const mods = MOD_LABELS.filter(([bit]) => mod & bit).map(([, label]) => label);
  return [...mods, findBaseKeyLabel(code)].join('+');
}
