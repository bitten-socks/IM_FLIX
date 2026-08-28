// Raw HID packet protocol shared with the QMK firmware in QMK/flix_vibe6.
// Layout is dictated by raw_hid_receive() in that keymap.c -- keep this file
// and that handler in sync.

// QMK fixes every raw HID report at RAW_EPSIZE (32) bytes in both
// directions; a differently-sized report is rejected outright.
export const PACKET_SIZE = 32;
export const TOTAL_KEYS = 6;

export const CMD = {
  READ_KEYMAP: 0x01,
  WRITE_KEY: 0x02,
  PING: 0x03,
  READ_MATRIX: 0x04,
  BOOTLOADER: 0x05,
  READ_KEY: 0x06,
  WRITE_STEP: 0x07,
  WRITE_MODE: 0x08,
  RESPONSE_OK: 0xff,
};

// Sentinels the firmware sends in byte[1] so replies can be told apart from
// a keymap dump, whose byte[1] is a modifier mask (max 0x0F).
export const PING_ACK_SENTINEL = 0xfe;
export const MATRIX_DIAG_SENTINEL = 0xfd;
export const KEY_DETAIL_SENTINEL = 0xfc;

// Per-key behaviour, mirroring enum flix_key_mode in the firmware.
export const KEY_MODE = {
  // Output follows the physical key -- held while held, released on release.
  DIRECT: 0,
  // Pressing fires a fixed timed sequence; the release is ignored. Output
  // length is set by config, not by how long the user holds.
  MACRO: 1,
};

// Steps a key may emit in macro mode. Bounded by what fits in one 32-byte
// report alongside the header -- must match MAX_MACRO_STEPS in the firmware.
export const MAX_MACRO_STEPS = 4;

// Firmware clamps every step's timing into this range.
export const MIN_STEP_MS = 1;
export const MAX_STEP_MS = 5000;

// bit7 of a step's mod byte carries the media flag; modifiers use bits 0-3.
const STEP_FLAG_MEDIA = 0x80;
const STEP_MOD_MASK = 0x0f;

export function buildMatrixPacket() {
  const buf = new Uint8Array(PACKET_SIZE);
  buf[0] = CMD.READ_MATRIX;
  return buf;
}

// Reboots the device into its UF2 bootloader; it disappears from USB and
// remounts as the RPI-RP2 drive, so the connection is expected to drop.
export function buildBootloaderPacket() {
  const buf = new Uint8Array(PACKET_SIZE);
  buf[0] = CMD.BOOTLOADER;
  return buf;
}

export function buildReadPacket() {
  const buf = new Uint8Array(PACKET_SIZE);
  buf[0] = CMD.READ_KEYMAP;
  return buf;
}

export function buildPingPacket() {
  const buf = new Uint8Array(PACKET_SIZE);
  buf[0] = CMD.PING;
  return buf;
}

// key_idx: 0-5, mod: bitmask, code: base HID usage id, isMedia: 0|1
export function buildWritePacket({ keyIndex, mod = 0, code, isMedia = 0 }) {
  const buf = new Uint8Array(PACKET_SIZE);
  buf[0] = CMD.WRITE_KEY;
  buf[1] = keyIndex & 0xff;
  buf[2] = mod & 0xff;
  buf[3] = code & 0xff;
  buf[4] = isMedia ? 1 : 0;
  return buf;
}

function toUint8Array(data) {
  if (data instanceof Uint8Array) return data;
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

// Compact keymap dump: step 0 plus the mode of every key, which is all the
// keycap row needs. Returns null for other report types.
export function parseKeymapResponse(data) {
  const bytes = toUint8Array(data);
  if (bytes[0] !== CMD.RESPONSE_OK) return null;
  if (
    bytes[1] === PING_ACK_SENTINEL ||
    bytes[1] === MATRIX_DIAG_SENTINEL ||
    bytes[1] === KEY_DETAIL_SENTINEL
  ) {
    return null;
  }
  const keys = [];
  for (let i = 0; i < TOTAL_KEYS; i++) {
    const idx = 1 + i * 4;
    keys.push({
      mod: bytes[idx],
      code: bytes[idx + 1],
      isMedia: bytes[idx + 2],
      mode: bytes[idx + 3],
    });
  }
  return keys;
}

export function buildReadKeyPacket(keyIndex) {
  const buf = new Uint8Array(PACKET_SIZE);
  buf[0] = CMD.READ_KEY;
  buf[1] = keyIndex & 0xff;
  return buf;
}

// One step of a macro. hold is how long the key stays down, gap is the pause
// after releasing it before the next step.
export function buildWriteStepPacket({ keyIndex, stepIndex, mod = 0, code, isMedia = 0, holdMs, gapMs }) {
  const buf = new Uint8Array(PACKET_SIZE);
  buf[0] = CMD.WRITE_STEP;
  buf[1] = keyIndex & 0xff;
  buf[2] = stepIndex & 0xff;
  buf[3] = (mod & STEP_MOD_MASK) | (isMedia ? STEP_FLAG_MEDIA : 0);
  buf[4] = code & 0xff;
  buf[5] = holdMs & 0xff;
  buf[6] = (holdMs >> 8) & 0xff;
  buf[7] = gapMs & 0xff;
  buf[8] = (gapMs >> 8) & 0xff;
  return buf;
}

export function buildWriteModePacket({ keyIndex, mode, stepCount }) {
  const buf = new Uint8Array(PACKET_SIZE);
  buf[0] = CMD.WRITE_MODE;
  buf[1] = keyIndex & 0xff;
  buf[2] = mode & 0xff;
  buf[3] = stepCount & 0xff;
  return buf;
}

// Full detail for a single key, including every macro step.
export function parseKeyDetailResponse(data) {
  const bytes = toUint8Array(data);
  if (bytes[0] !== CMD.RESPONSE_OK || bytes[1] !== KEY_DETAIL_SENTINEL) return null;

  const steps = [];
  for (let s = 0; s < MAX_MACRO_STEPS; s++) {
    const idx = 5 + s * 6;
    const modByte = bytes[idx];
    steps.push({
      mod: modByte & STEP_MOD_MASK,
      isMedia: (modByte & STEP_FLAG_MEDIA) !== 0 ? 1 : 0,
      code: bytes[idx + 1],
      holdMs: bytes[idx + 2] | (bytes[idx + 3] << 8),
      gapMs: bytes[idx + 4] | (bytes[idx + 5] << 8),
    });
  }

  return {
    keyIndex: bytes[2],
    mode: bytes[3],
    stepCount: bytes[4],
    steps,
  };
}

export function isPingAck(data) {
  const bytes = toUint8Array(data);
  return bytes[0] === CMD.RESPONSE_OK && bytes[1] === PING_ACK_SENTINEL;
}

// Debounced matrix state, one bitmask per row. Returns null for other
// report types. A bit stays 0 while its switch reads unpressed.
export function parseMatrixResponse(data) {
  const bytes = toUint8Array(data);
  if (bytes[0] !== CMD.RESPONSE_OK || bytes[1] !== MATRIX_DIAG_SENTINEL) return null;
  return [bytes[2], bytes[3]];
}
