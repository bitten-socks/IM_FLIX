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
  RESPONSE_OK: 0xff,
};

// Sentinels the firmware sends in byte[1] so replies can be told apart from
// a keymap dump, whose byte[1] is a modifier mask (max 0x0F).
export const PING_ACK_SENTINEL = 0xfe;
export const MATRIX_DIAG_SENTINEL = 0xfd;

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

// Returns null if the report isn't a 0xFF keymap dump (e.g. a ping ack or a
// matrix diagnostic reply).
export function parseKeymapResponse(data) {
  const bytes = toUint8Array(data);
  if (bytes[0] !== CMD.RESPONSE_OK) return null;
  if (bytes[1] === PING_ACK_SENTINEL || bytes[1] === MATRIX_DIAG_SENTINEL) return null;
  const keys = [];
  for (let i = 0; i < TOTAL_KEYS; i++) {
    const idx = 1 + i * 3;
    keys.push({ mod: bytes[idx], code: bytes[idx + 1], isMedia: bytes[idx + 2] });
  }
  return keys;
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
