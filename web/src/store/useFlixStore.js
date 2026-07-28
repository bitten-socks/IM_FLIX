import { create } from 'zustand';
import {
  requestFlixDevice,
  getPairedFlixDevice,
  sendPacket,
  listenForReports,
  isWebHIDSupported,
} from '../lib/webhid';
import {
  buildReadPacket,
  buildWritePacket,
  buildPingPacket,
  buildMatrixPacket,
  buildBootloaderPacket,
  parseKeymapResponse,
  parseMatrixResponse,
  isPingAck,
  TOTAL_KEYS,
} from '../lib/protocol';
import { MockFlixDevice } from '../lib/mockDevice';

const EMPTY_KEYMAP = Array.from({ length: TOTAL_KEYS }, () => ({ mod: 0, code: 0, isMedia: 0 }));

export const useFlixStore = create((set, get) => ({
  supported: isWebHIDSupported(),
  device: null,
  connected: false,
  connecting: false,
  isMock: false,
  keymap: EMPTY_KEYMAP,
  selectedKey: null,
  lastSync: null,
  lastPing: null,
  matrixState: null,
  error: null,
  _stopListening: null,

  connect: async () => {
    set({ connecting: true, error: null });
    try {
      const device = await requestFlixDevice();
      if (!device) {
        set({ connecting: false });
        return;
      }
      get()._attachDevice(device);
    } catch (err) {
      set({ error: err.message, connecting: false });
    }
  },

  // Exercises the UI/protocol flow end to end against an in-memory stand-in
  // for the board (see lib/mockDevice.js), without needing hardware.
  connectMock: () => {
    get()._attachDevice(new MockFlixDevice());
    set({ isMock: true });
  },

  tryReconnect: async () => {
    try {
      const device = await getPairedFlixDevice();
      if (device) get()._attachDevice(device);
    } catch {
      // no previously paired device available; user must click connect
    }
  },

  _attachDevice: (device) => {
    const stop = listenForReports(device, (bytes) => {
      if (isPingAck(bytes)) {
        set({ lastPing: Date.now() });
        return;
      }
      const matrix = parseMatrixResponse(bytes);
      if (matrix) {
        set({ matrixState: matrix });
        return;
      }
      const keys = parseKeymapResponse(bytes);
      if (keys) set({ keymap: keys, lastSync: Date.now() });
    });
    device.addEventListener('disconnect', () => get().disconnect());
    set({ device, connected: true, connecting: false, _stopListening: stop, error: null });
    sendPacket(device, buildReadPacket()).catch((err) =>
      set({ error: `키맵 읽기 요청 실패: ${err.message}` }),
    );
  },

  disconnect: async () => {
    const { device, _stopListening } = get();
    if (_stopListening) _stopListening();
    if (device) {
      try {
        await device.close();
      } catch {
        // device may already be gone (physically unplugged)
      }
    }
    set({
      device: null,
      connected: false,
      isMock: false,
      keymap: EMPTY_KEYMAP,
      selectedKey: null,
      lastSync: null,
      lastPing: null,
    });
  },

  refreshKeymap: async () => {
    const { device } = get();
    if (!device) return;
    try {
      await sendPacket(device, buildReadPacket());
    } catch (err) {
      set({ error: `키맵 읽기 요청 실패: ${err.message}` });
    }
  },

  ping: async () => {
    const { device } = get();
    if (!device) return;
    try {
      await sendPacket(device, buildPingPacket());
    } catch (err) {
      set({ error: `핑 전송 실패: ${err.message}` });
      return;
    }
  },

  // Diagnostic: ask the firmware for its debounced matrix state. Used to
  // tell a dead switch/diode path apart from a firmware-side problem --
  // see readMatrixLoop() usage notes in QMK/README.md.
  readMatrix: async () => {
    const { device } = get();
    if (!device) return;
    try {
      await sendPacket(device, buildMatrixPacket());
    } catch (err) {
      set({ error: `매트릭스 진단 요청 실패: ${err.message}` });
    }
  },

  // Reboots the device into its UF2 bootloader for a firmware update. The
  // device drops off USB as a side effect, so tear down our side too.
  enterBootloader: async () => {
    const { device } = get();
    if (!device) return;
    try {
      await sendPacket(device, buildBootloaderPacket());
    } catch (err) {
      set({ error: `부트로더 진입 실패: ${err.message}` });
      return;
    }
    await get().disconnect();
  },

  setSelectedKey: (index) =>
    set((s) => ({ selectedKey: s.selectedKey === index ? null : index })),

  closeAssignment: () => set({ selectedKey: null }),

  assignKey: async ({ mod = 0, code, isMedia = 0 }) => {
    const { device, selectedKey, keymap } = get();
    if (!device || selectedKey === null) return;
    const packet = buildWritePacket({ keyIndex: selectedKey, mod, code, isMedia });
    try {
      await sendPacket(device, packet);
    } catch (err) {
      set({ error: `키 할당 전송 실패: ${err.message}` });
      return;
    }
    const next = [...keymap];
    next[selectedKey] = { mod, code, isMedia };
    // Optimistic local update; the firmware echoes the authoritative keymap
    // back right after, and debounce-saves to EEPROM ~1.5s after the last
    // change (see raw_hid_receive in QMK/flix_vibe6's keymap.c).
    set({ keymap: next, lastSync: Date.now(), error: null });
  },

  dismissError: () => set({ error: null }),
}));
