// Raw HID packet protocol shared with the QMK firmware in QMK/users/flix.
// Layout is dictated by raw_hid_receive() in flix.c -- keep this file and
// that handler in sync.

import { MAX_KEYS } from './products';

// QMK fixes every raw HID report at RAW_EPSIZE (32) bytes in both
// directions; a differently-sized report is rejected outright.
export const PACKET_SIZE = 32;

export const CMD = {
  READ_KEYMAP: 0x01,
  WRITE_KEY: 0x02,
  PING: 0x03,
  READ_MATRIX: 0x04,
  BOOTLOADER: 0x05,
  READ_KEY: 0x06,
  WRITE_STEP: 0x07,
  WRITE_MODE: 0x08,
  IDENTIFY: 0x09,
  RESPONSE_OK: 0xff,
};

// Sentinels the firmware sends in byte[1] so replies can be told apart from a
// keymap dump, whose byte[1] is a packed flag/modifier byte (max 0xCF).
export const PING_ACK_SENTINEL = 0xfe;
export const MATRIX_DIAG_SENTINEL = 0xfd;
export const KEY_DETAIL_SENTINEL = 0xfc;
export const IDENTITY_SENTINEL = 0xfb;

// Per-key behaviour, mirroring enum flix_key_mode in the firmware.
export const KEY_MODE = {
  // Output follows the physical key -- held while held, released on release.
  DIRECT: 0,
  // Pressing fires a fixed timed sequence; the release is ignored. Output
  // length is set by config, not by how long the user holds.
  MACRO: 1,
};

// Steps a key may emit in macro mode. Must match MAX_MACRO_STEPS in the
// firmware. Sixteen is what makes a short word practical -- one step per
// character.
export const MAX_MACRO_STEPS = 16;

// Sixteen steps are 96 bytes, far past what one 32-byte report holds, so the
// firmware answers CMD_READ_KEY in chunks of four steps and the client
// stitches them together. Must match FLIX_STEPS_PER_CHUNK in the firmware.
export const STEPS_PER_CHUNK = 4;
export const KEY_DETAIL_CHUNKS = Math.ceil(MAX_MACRO_STEPS / STEPS_PER_CHUNK);

// Chunked CMD_READ_KEY replies landed in protocol 4 and chords in 5. Older
// firmware packs steps at a different offset and has no chord flag, so
// reading it with this parser would silently yield wrong timings.
export const MIN_PROTOCOL_VERSION = 5;

// Firmware clamps every step's timing into this range.
export const MIN_STEP_MS = 1;
export const MAX_STEP_MS = 5000;

// A step's mod byte carries flags alongside the modifier bits.
const STEP_FLAG_MEDIA = 0x80;
// Hold this step while the next one is pressed, rather than releasing first.
// A run of these fires as one chord -- the only way two ordinary keys (not
// just modifiers) can go down at the same instant.
const STEP_FLAG_CHORD = 0x20;
const STEP_MOD_MASK = 0x0f;
// Only present in the compact keymap dump, never stored in a step.
const DUMP_FLAG_MACRO = 0x40;

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

// Compact keymap dump: two bytes per key -- packed flags plus the keycode --
// which is what keeps a 9-key product inside one 32-byte report. Modifiers,
// the media flag and the macro flag all share the first byte.
//
// `keyCount` comes from the identified product, so one parser serves every
// model. Returns null for other report types.
export function parseKeymapResponse(data, keyCount) {
  const bytes = toUint8Array(data);
  if (bytes[0] !== CMD.RESPONSE_OK) return null;
  if (
    bytes[1] === PING_ACK_SENTINEL ||
    bytes[1] === MATRIX_DIAG_SENTINEL ||
    bytes[1] === KEY_DETAIL_SENTINEL ||
    bytes[1] === IDENTITY_SENTINEL
  ) {
    return null;
  }
  const count = Math.min(keyCount ?? MAX_KEYS, MAX_KEYS);
  const keys = [];
  for (let i = 0; i < count; i++) {
    const flags = bytes[1 + i * 2];
    keys.push({
      mod: flags & STEP_MOD_MASK,
      isMedia: (flags & STEP_FLAG_MEDIA) !== 0 ? 1 : 0,
      mode: (flags & DUMP_FLAG_MACRO) !== 0 ? KEY_MODE.MACRO : KEY_MODE.DIRECT,
      code: bytes[1 + i * 2 + 1],
    });
  }
  return keys;
}

export function buildReadKeyPacket(keyIndex, chunk = 0) {
  const buf = new Uint8Array(PACKET_SIZE);
  buf[0] = CMD.READ_KEY;
  buf[1] = keyIndex & 0xff;
  buf[2] = chunk & 0xff;
  return buf;
}

// One step of a macro. hold is how long the key stays down, gap is the pause
// after releasing it before the next step.
export function buildWriteStepPacket({
  keyIndex,
  stepIndex,
  mod = 0,
  code,
  isMedia = 0,
  chord = 0,
  holdMs,
  gapMs,
}) {
  const buf = new Uint8Array(PACKET_SIZE);
  buf[0] = CMD.WRITE_STEP;
  buf[1] = keyIndex & 0xff;
  buf[2] = stepIndex & 0xff;
  buf[3] =
    (mod & STEP_MOD_MASK) |
    (isMedia ? STEP_FLAG_MEDIA : 0) |
    (chord ? STEP_FLAG_CHORD : 0);
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

// One chunk of a key's detail: mode and step count, plus STEPS_PER_CHUNK
// steps starting at chunk * STEPS_PER_CHUNK. The header repeats in every
// chunk, so a reply that arrives on its own -- a write echo -- is still
// readable. Callers merge chunks with mergeKeyDetailChunk().
export function parseKeyDetailResponse(data) {
  const bytes = toUint8Array(data);
  if (bytes[0] !== CMD.RESPONSE_OK || bytes[1] !== KEY_DETAIL_SENTINEL) return null;

  const chunk = bytes[5];
  const steps = [];
  for (let s = 0; s < STEPS_PER_CHUNK; s++) {
    const idx = 6 + s * 6;
    const modByte = bytes[idx];
    steps.push({
      mod: modByte & STEP_MOD_MASK,
      isMedia: (modByte & STEP_FLAG_MEDIA) !== 0 ? 1 : 0,
      chord: (modByte & STEP_FLAG_CHORD) !== 0 ? 1 : 0,
      code: bytes[idx + 1],
      holdMs: bytes[idx + 2] | (bytes[idx + 3] << 8),
      gapMs: bytes[idx + 4] | (bytes[idx + 5] << 8),
    });
  }

  return {
    keyIndex: bytes[2],
    mode: bytes[3],
    stepCount: bytes[4],
    chunk,
    steps,
  };
}

export function emptyStep() {
  return { mod: 0, isMedia: 0, chord: 0, code: 0, holdMs: 0, gapMs: 0 };
}

// Split steps into the groups that actually fire together, so callers can
// show and time a chord as the single event it is rather than as N events.
export function chordGroups(steps, stepCount) {
  const groups = [];
  let current = [];
  for (let i = 0; i < Math.min(stepCount, steps.length); i++) {
    current.push(i);
    if (!steps[i].chord || i === stepCount - 1) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

// How long a macro takes end to end. A chord counts once, and the final gap
// never plays because nothing waits on it.
export function macroDurationMs(steps, stepCount) {
  const groups = chordGroups(steps, stepCount);
  return groups.reduce((total, g, i) => {
    const hold = steps[g[0]].holdMs;
    const gap = i < groups.length - 1 ? steps[g[g.length - 1]].gapMs : 0;
    return total + hold + gap;
  }, 0);
}

// Fold an incoming chunk into whatever detail we already hold for that key.
// Steps outside the chunk are left as they were, so the four replies to a
// full read accumulate instead of overwriting each other.
export function mergeKeyDetailChunk(previous, incoming) {
  const steps = previous?.steps?.length === MAX_MACRO_STEPS
    ? [...previous.steps]
    : Array.from({ length: MAX_MACRO_STEPS }, emptyStep);

  const first = incoming.chunk * STEPS_PER_CHUNK;
  incoming.steps.forEach((step, i) => {
    if (first + i < MAX_MACRO_STEPS) steps[first + i] = step;
  });

  return {
    keyIndex: incoming.keyIndex,
    mode: incoming.mode,
    stepCount: incoming.stepCount,
    steps,
  };
}

export function isPingAck(data) {
  const bytes = toUint8Array(data);
  return bytes[0] === CMD.RESPONSE_OK && bytes[1] === PING_ACK_SENTINEL;
}

// Debounced matrix state, one bitmask per matrix row. Row count varies by
// product, so the caller says how many to read. A bit stays 0 while its
// switch reads unpressed. Returns null for other report types.
export function parseMatrixResponse(data, rowCount = 2) {
  const bytes = toUint8Array(data);
  if (bytes[0] !== CMD.RESPONSE_OK || bytes[1] !== MATRIX_DIAG_SENTINEL) return null;
  const rows = [];
  for (let r = 0; r < rowCount; r++) rows.push(bytes[2 + r]);
  return rows;
}

export function buildIdentifyPacket() {
  const buf = new Uint8Array(PACKET_SIZE);
  buf[0] = CMD.IDENTIFY;
  return buf;
}

// What the device says it is. Lets one deployed site keep working against
// firmware older than itself instead of misreading it -- the USB product ID
// says which model, this says which protocol that unit actually speaks.
export function parseIdentityResponse(data) {
  const bytes = toUint8Array(data);
  if (bytes[0] !== CMD.RESPONSE_OK || bytes[1] !== IDENTITY_SENTINEL) return null;
  return {
    protocolVersion: bytes[2],
    keyCount: bytes[3],
    maxMacroSteps: bytes[4],
    configVersion: bytes[5],
  };
}
