// HID usage ids, sent to the firmware as-is. QMK/users/flix/flix.c maps a
// step's {mod, code} straight onto a QMK keycode, so a value added here needs
// no firmware counterpart -- but it must be a real HID usage id.

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

// --- Typing a word -------------------------------------------------------
//
// A word is emitted one character per macro step. What a given keystroke
// produces is decided by the PC, not by us: these are US-layout positions,
// and the host must be in English input mode. Korean cannot work this way at
// all -- the characters are composed by the IME from jamo keystrokes, so the
// same steps would type "qmfhr" rather than a Korean word. textToSteps()
// therefore reports unsupported characters instead of emitting something
// that would silently type gibberish.

const SHIFTED_SYMBOLS = {
  '!': 0x1e, '@': 0x1f, '#': 0x20, '$': 0x21, '%': 0x22,
  '^': 0x23, '&': 0x24, '*': 0x25, '(': 0x26, ')': 0x27,
  _: 0x2d, '+': 0x2e, '{': 0x2f, '}': 0x30, '|': 0x31,
  ':': 0x33, '"': 0x34, '~': 0x35, '<': 0x36, '>': 0x37, '?': 0x38,
};

// char -> { code, shift } for everything a word may contain.
export const TEXT_CHAR_TO_KEY = (() => {
  const map = {};
  LETTER_KEYS.forEach(({ code, label }) => {
    map[label.toLowerCase()] = { code, shift: false };
    map[label] = { code, shift: true };
  });
  NUMBER_KEYS.forEach(({ code, label }) => {
    map[label] = { code, shift: false };
  });
  PUNCT_KEYS.forEach(({ code, label }) => {
    map[label] = { code, shift: false };
  });
  map[' '] = { code: 0x2c, shift: false };
  Object.entries(SHIFTED_SYMBOLS).forEach(([ch, code]) => {
    map[ch] = { code, shift: true };
  });
  return map;
})();

export function isTypableChar(ch) {
  return Object.prototype.hasOwnProperty.call(TEXT_CHAR_TO_KEY, ch);
}

// Turn text into macro steps, one per character. Returns the steps it could
// build plus the characters it had to drop, so the UI can say which ones and
// why rather than quietly typing something else.
export function textToSteps(text, { holdMs = 20, gapMs = 30, limit = 16 } = {}) {
  const steps = [];
  const rejected = [];

  for (const ch of text) {
    if (steps.length >= limit) break;
    const entry = TEXT_CHAR_TO_KEY[ch];
    if (!entry) {
      if (!rejected.includes(ch)) rejected.push(ch);
      continue;
    }
    steps.push({
      mod: entry.shift ? MOD_BITS.SHIFT : 0,
      code: entry.code,
      isMedia: 0,
      holdMs,
      gapMs,
    });
  }

  return { steps, rejected, truncated: [...text].length > limit };
}

// Best-effort inverse of textToSteps, for showing a saved macro back as text.
// Steps that are chorded, carry a modifier other than Shift, or hold a media
// code have no character form -- those come back as null so the caller falls
// back to the step list rather than printing a misleading word.
export function stepsToText(steps, stepCount) {
  const used = steps.slice(0, stepCount);
  if (!used.length) return null;

  let out = '';
  for (const step of used) {
    // A chord is keys pressed together, which no sequence of characters
    // describes -- "cv" would read as typing c then v, the opposite of what
    // the device does.
    if (step.chord) return null;
    if (step.isMedia || (step.mod & ~MOD_BITS.SHIFT) !== 0) return null;
    const wantShift = (step.mod & MOD_BITS.SHIFT) !== 0;
    const hit = Object.entries(TEXT_CHAR_TO_KEY).find(
      ([, v]) => v.code === step.code && v.shift === wantShift,
    );
    if (!hit) return null;
    out += hit[0];
  }
  return out;
}
