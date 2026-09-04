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
  buildReadKeyPacket,
  buildWriteStepPacket,
  buildWriteModePacket,
  parseKeymapResponse,
  parseMatrixResponse,
  parseIdentityResponse,
  buildIdentifyPacket,
  parseKeyDetailResponse,
  mergeKeyDetailChunk,
  isPingAck,
  KEY_MODE,
  KEY_DETAIL_CHUNKS,
  MIN_PROTOCOL_VERSION,
} from '../lib/protocol';
import { productForId, UNKNOWN_PRODUCT } from '../lib/products';

const EMPTY_KEYMAP = [];

export const useFlixStore = create((set, get) => ({
  supported: isWebHIDSupported(),
  device: null,
  connected: false,
  connecting: false,
  // Which model is plugged in. Resolved from the USB product ID before any
  // packet is exchanged, so the UI can size itself immediately.
  product: UNKNOWN_PRODUCT,
  // What the firmware reports about itself; null until it answers.
  identity: null,
  keymap: EMPTY_KEYMAP,
  // Full per-key detail (mode + macro steps), keyed by key index. Filled
  // lazily -- the compact keymap dump covers the keycap row on its own.
  keyDetails: {},
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

  tryReconnect: async () => {
    try {
      const device = await getPairedFlixDevice();
      if (device) get()._attachDevice(device);
    } catch {
      // no previously paired device available; user must click connect
    }
  },

  _attachDevice: (device) => {
    // The USB product ID identifies the model on its own, so the layout is
    // known before the device answers anything.
    const product = productForId(device.productId) ?? UNKNOWN_PRODUCT;

    const stop = listenForReports(device, (bytes) => {
      if (isPingAck(bytes)) {
        set({ lastPing: Date.now() });
        return;
      }
      const identity = parseIdentityResponse(bytes);
      if (identity) {
        set({ identity });
        if (identity.protocolVersion < MIN_PROTOCOL_VERSION) {
          set({
            error:
              '이 기기의 펌웨어가 오래되어 단어·타이밍 기능을 쓸 수 없습니다. ' +
              '펌웨어를 다시 설치해 주세요.',
          });
        }
        return;
      }
      const rowCount = Math.ceil(get().product.keyCount / get().product.matrixColumns) || 2;
      const matrix = parseMatrixResponse(bytes, rowCount);
      if (matrix) {
        set({ matrixState: matrix });
        return;
      }
      const detail = parseKeyDetailResponse(bytes);
      if (detail) {
        set((s) => ({
          keyDetails: {
            ...s.keyDetails,
            [detail.keyIndex]: mergeKeyDetailChunk(s.keyDetails[detail.keyIndex], detail),
          },
          lastSync: Date.now(),
        }));
        return;
      }
      const keys = parseKeymapResponse(bytes, get().product.keyCount);
      if (keys) set({ keymap: keys, lastSync: Date.now() });
    });
    device.addEventListener('disconnect', () => get().disconnect());
    set({
      device,
      product,
      connected: true,
      connecting: false,
      _stopListening: stop,
      error: null,
      keymap: Array.from({ length: product.keyCount }, () => ({
        mod: 0,
        code: 0,
        isMedia: 0,
        mode: KEY_MODE.DIRECT,
      })),
    });

    // Ask what it is before asking what it holds: a unit in the field may
    // still speak a protocol this site has already moved past.
    sendPacket(device, buildIdentifyPacket())
      .then(() => sendPacket(device, buildReadPacket()))
      .catch((err) => set({ error: `기기 정보 읽기 실패: ${err.message}` }));
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
      product: UNKNOWN_PRODUCT,
      identity: null,
      keymap: EMPTY_KEYMAP,
      keyDetails: {},
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

  // Pull the full detail (mode + every macro step) for one key. The compact
  // keymap dump only carries step 0, so the macro editor needs this.
  // A key's 16 steps span several reports, so ask for each chunk in turn.
  // The replies arrive asynchronously and are merged by the report handler.
  loadKeyDetail: async (keyIndex) => {
    const { device } = get();
    if (!device) return;
    try {
      for (let chunk = 0; chunk < KEY_DETAIL_CHUNKS; chunk++) {
        await sendPacket(device, buildReadKeyPacket(keyIndex, chunk));
      }
    } catch (err) {
      set({ error: `키 상세 읽기 실패: ${err.message}` });
    }
  },

  // Switch a key between following the physical press (direct) and firing a
  // fixed timed sequence (macro).
  setKeyMode: async (keyIndex, mode, stepCount) => {
    const { device } = get();
    if (!device) return;
    try {
      await sendPacket(device, buildWriteModePacket({ keyIndex, mode, stepCount }));
    } catch (err) {
      set({ error: `모드 변경 실패: ${err.message}` });
    }
  },

  // Write one step of a key's macro. The firmware echoes the whole key back,
  // so local state is refreshed by the report handler rather than guessed at.
  writeStep: async (step) => {
    const { device } = get();
    if (!device) return;
    try {
      await sendPacket(device, buildWriteStepPacket(step));
    } catch (err) {
      set({ error: `매크로 단계 저장 실패: ${err.message}` });
    }
  },

  // Program a key's whole macro in one go: set the mode and step count
  // first, then write each step. Order matters -- the firmware clamps
  // step_count, so raising it before writing means a half-written sequence
  // can never be played with stale steps past the new end.
  programMacro: async (keyIndex, steps) => {
    const { device } = get();
    if (!device || !steps.length) return;
    try {
      await sendPacket(
        device,
        buildWriteModePacket({ keyIndex, mode: KEY_MODE.MACRO, stepCount: steps.length }),
      );
      for (let i = 0; i < steps.length; i++) {
        await sendPacket(device, buildWriteStepPacket({ keyIndex, stepIndex: i, ...steps[i] }));
      }
      set({ lastSync: Date.now(), error: null });
      await get().refreshKeymap();
    } catch (err) {
      set({ error: `매크로 저장 실패: ${err.message}` });
    }
  },

  // Re-time an existing macro without touching which keys it presses.
  retimeMacro: async (keyIndex, holdMs, gapMs) => {
    const { device, keyDetails } = get();
    const detail = keyDetails[keyIndex];
    if (!device || !detail) return;
    try {
      for (let i = 0; i < detail.stepCount; i++) {
        const step = detail.steps[i];
        await sendPacket(
          device,
          buildWriteStepPacket({
            keyIndex,
            stepIndex: i,
            mod: step.mod,
            code: step.code,
            isMedia: step.isMedia,
            holdMs,
            gapMs,
          }),
        );
      }
      set({ lastSync: Date.now(), error: null });
    } catch (err) {
      set({ error: `타이밍 저장 실패: ${err.message}` });
    }
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
