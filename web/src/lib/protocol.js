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

// Chunked CMD_READ_KEY replies landed in protocol 4, chords in 5, a hold that
// follows the finger in 7, a release phase in 8, and wheel codes in 9. Older firmware either
// packs steps at a different offset or accepts a flag and ignores it, which
// looks like it worked while the part that matters never happens.
export const MIN_PROTOCOL_VERSION = 9;

// Pointer codes -- the button and the four directions a swipe is built from
// -- arrived in 10. This is not a floor like the one above: everything else
// still works on 9, so the swipe roles are withheld rather than the device
// being refused.
export const POINTER_PROTOCOL_VERSION = 10;

// Firmware clamps every step's timing into this range.
export const MIN_STEP_MS = 1;
export const MAX_STEP_MS = 5000;

// A step's mod byte carries flags alongside the modifier bits.
const STEP_FLAG_MEDIA = 0x80;
// Hold this step while the next one is pressed, rather than releasing first.
// A run of these fires as one chord -- the only way two ordinary keys (not
// just modifiers) can go down at the same instant.
const STEP_FLAG_CHORD = 0x20;
// Stays down after its group ends, so later steps land on top of it. Released
// with everything else when the macro finishes.
const STEP_FLAG_SUSTAIN = 0x10;
// From this step on, the sequence plays when the key is let go rather than
// when it is pressed. Pressing a key that is already down gives a game no new
// press to read, so a second tap of the same key can only come after the
// first one ends.
const STEP_FLAG_ON_RELEASE = 0x40;
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
  sustain = 0,
  onRelease = 0,
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
    (chord ? STEP_FLAG_CHORD : 0) |
    (sustain ? STEP_FLAG_SUSTAIN : 0) |
    (onRelease ? STEP_FLAG_ON_RELEASE : 0);
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
      sustain: (modByte & STEP_FLAG_SUSTAIN) !== 0 ? 1 : 0,
      onRelease: (modByte & STEP_FLAG_ON_RELEASE) !== 0 ? 1 : 0,
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
  return { mod: 0, isMedia: 0, chord: 0, sustain: 0, onRelease: 0, code: 0, holdMs: 0, gapMs: 0 };
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

// How far a sustained key is drawn past its group to show it is still down.
// A hold that follows the finger has no set length, so the drawing needs some
// figure; this one is only ever a picture.
export const HOLD_TAIL_MS = 260;

// Floor on the wait between the finger lifting and the release phase, matching
// MIN_HANDOVER_MS in the firmware. Above it the wait is the gap on the last
// step before the lift, which is a setting like any other -- so a preview that
// used a constant here was showing a sequence nobody had asked for.
export const MIN_HANDOVER_MS = 24;

// Where every step sits in time. chordGroups() says which steps fire
// together; this says when, which is what a preview needs to show the shape
// of a sequence rather than just its order.
//
// Three things bend the plain "hold, then gap" walk:
//   - a chord group shares one start and one hold, so its steps stack
//   - a sustained step does not end with its group; it runs to the lift
//   - an on-release step opens a second phase, which plays after the lift
//
// Times are milliseconds from the first press. Returns a span per step plus
// the marks a drawing needs.
export function macroTimeline(steps, stepCount = steps.length) {
  const count = Math.min(stepCount, steps.length);
  if (!count) return { spans: [], groups: [], liftAt: 0, total: 0, hasSustain: false, hasRelease: false };

  const groups = chordGroups(steps, count);
  let releaseIndex = count;
  for (let i = 0; i < count; i++) {
    if (steps[i].onRelease) {
      releaseIndex = i;
      break;
    }
  }

  const spans = new Array(count).fill(null);

  // Lay a run of groups end to end from `from`, returning where the last one
  // stops. The trailing gap is left off: nothing waits on it.
  const lay = (list, from, phase) => {
    let at = from;
    let end = from;
    list.forEach((group, gi) => {
      const hold = steps[group[0]].holdMs;
      const gap = steps[group[group.length - 1]].gapMs;
      group.forEach((i) => {
        spans[i] = { start: at, end: at + hold, sustain: !!steps[i].sustain, phase };
      });
      end = at + hold;
      if (gi < list.length - 1) at = end + gap;
    });
    return end;
  };

  const pressGroups = groups.filter((g) => g[0] < releaseIndex);
  const releaseGroups = groups.filter((g) => g[0] >= releaseIndex);

  const pressEnd = lay(pressGroups, 0, 'press');
  const sustainedPress = spans.some((s) => s && s.phase === 'press' && s.sustain);
  // A sustained key is down until the finger lifts, which has no set length,
  // so the lift mark sits a little past the last press and the held bars run
  // to it. Without one, the lift is simply where the press phase ended.
  const liftAt = sustainedPress ? pressEnd + HOLD_TAIL_MS : pressEnd;

  // The firmware waits out the gap belonging to the last step it played
  // before the lift, never less than MIN_HANDOVER_MS.
  const handover = releaseIndex > 0
    ? Math.max(MIN_HANDOVER_MS, steps[releaseIndex - 1].gapMs)
    : MIN_HANDOVER_MS;
  const releaseEnd = releaseGroups.length
    ? lay(releaseGroups, liftAt + handover, 'release')
    : liftAt;

  spans.forEach((span) => {
    if (!span || !span.sustain) return;
    span.end = Math.max(span.end, span.phase === 'press' ? liftAt : releaseEnd);
  });

  return {
    spans,
    groups,
    liftAt,
    total: Math.max(liftAt, releaseEnd),
    hasSustain: spans.some((s) => s && s.sustain),
    hasRelease: releaseGroups.length > 0,
  };
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
