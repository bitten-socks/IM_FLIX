import {
  CMD,
  PACKET_SIZE,
  TOTAL_KEYS,
  PING_ACK_SENTINEL,
  MATRIX_DIAG_SENTINEL,
} from './protocol';

// Mirrors DEFAULT_KEYS in QMK/flix_vibe6/keymaps/default/keymap.c, which is
// what a device with blank EEPROM comes up with.
const DEFAULT_KEYMAP = [
  { mod: 0x01, code: 0x06, isMedia: 0 }, // Ctrl+C
  { mod: 0x01, code: 0x19, isMedia: 0 }, // Ctrl+V
  { mod: 0x0a, code: 0x16, isMedia: 0 }, // Win+Shift+S
  { mod: 0x00, code: 0x80, isMedia: 1 }, // Vol Up
  { mod: 0x00, code: 0x81, isMedia: 1 }, // Vol Down
  { mod: 0x00, code: 0xe8, isMedia: 1 }, // Play/Pause
];

const MOCK_LATENCY_MS = 40;

// Stands in for a real board so the UI can be exercised without hardware.
// Implements just enough of the WebHID `HIDDevice` surface
// (sendReport/addEventListener) for useFlixStore to treat it identically to
// a real device, while simulating raw_hid_receive() from the QMK firmware.
export class MockFlixDevice extends EventTarget {
  opened = true;

  constructor() {
    super();
    this.keymap = DEFAULT_KEYMAP.map((k) => ({ ...k }));
  }

  async open() {
    this.opened = true;
  }

  async close() {
    this.opened = false;
  }

  async sendReport(_reportId, data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data.buffer);
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

    if (bytes[0] === CMD.READ_KEYMAP) {
      this._emitKeymap();
    } else if (bytes[0] === CMD.WRITE_KEY) {
      const keyIndex = bytes[1];
      if (keyIndex < TOTAL_KEYS) {
        this.keymap[keyIndex] = { mod: bytes[2], code: bytes[3], isMedia: bytes[4] };
      }
      this._emitKeymap();
    } else if (bytes[0] === CMD.PING) {
      this._emitPingAck();
    } else if (bytes[0] === CMD.READ_MATRIX) {
      // No physical switches behind the mock, so every row reads unpressed.
      this._emitMatrixDiag();
    }
  }

  _emitKeymap() {
    const response = new Uint8Array(PACKET_SIZE);
    response[0] = CMD.RESPONSE_OK;
    this.keymap.forEach((k, i) => {
      const idx = 1 + i * 3;
      response[idx] = k.mod;
      response[idx + 1] = k.code;
      response[idx + 2] = k.isMedia;
    });
    this._dispatchReport(response);
  }

  _emitPingAck() {
    const response = new Uint8Array(PACKET_SIZE);
    response[0] = CMD.RESPONSE_OK;
    response[1] = PING_ACK_SENTINEL;
    this._dispatchReport(response);
  }

  _emitMatrixDiag() {
    const response = new Uint8Array(PACKET_SIZE);
    response[0] = CMD.RESPONSE_OK;
    response[1] = MATRIX_DIAG_SENTINEL;
    this._dispatchReport(response);
  }

  _dispatchReport(bytes) {
    const event = new Event('inputreport');
    event.data = new DataView(bytes.buffer);
    event.reportId = 0;
    this.dispatchEvent(event);
  }
}
