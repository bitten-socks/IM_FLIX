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
  detailIsComplete,
  isPingAck,
  KEY_MODE,
  KEY_DETAIL_CHUNKS,
  MIN_PROTOCOL_VERSION,
} from '../lib/protocol';
import { productForId, UNKNOWN_PRODUCT } from '../lib/products';

const EMPTY_KEYMAP = [];

// How long to let the replies to a write arrive before trusting what comes
// next. The device answers each step as it writes it, and those answers are
// the only thing that can be confused for a read.
const WRITE_SETTLE_MS = 150;

// A beat between steps. Writing a macro is a burst of reports, each of which
// the device answers and then queues a save for; sent back to back, one can
// go missing -- almost always the last.
const WRITE_GAP_MS = 12;

// How long to wait for a read to come back whole before giving up on it.
const READ_TIMEOUT_MS = 1500;

// A beat between chunk requests, for the same reason as between writes.
const READ_GAP_MS = 10;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// What the device says a step is, against what it was told. Only the fields
// that travel: a step carries nothing else.
const sameStep = (a, b) =>
  a && b &&
  a.code === b.code &&
  (a.mod & 0x0f) === (b.mod & 0x0f) &&
  !!a.isMedia === !!b.isMedia &&
  !!a.chord === !!b.chord &&
  !!a.sustain === !!b.sustain &&
  !!a.onRelease === !!b.onRelease &&
  a.holdMs === b.holdMs &&
  a.gapMs === b.gapMs;

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
  // The step editor needs the panel wide enough to put the preview beside the
  // steps. The panel reserves its own column on large screens, so the page has
  // to widen with it rather than be covered by it.
  wideDrawer: false,
  setWideDrawer: (wide) => set({ wideDrawer: wide }),
  lastSync: null,
  lastPing: null,
  matrixState: null,
  // True once a connect attempt ended without a device. Usually a cable that
  // only carries power: the device never enumerates, so the browser's picker
  // has nothing to show and the user is left with a product that looks dead.
  noDevicePicked: false,
  error: null,
  _stopListening: null,

  connect: async () => {
    set({ connecting: true, error: null });
    try {
      const device = await requestFlixDevice();
      if (!device) {
        set({ connecting: false, noDevicePicked: true });
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
        // Every step written is answered with the chunk that step sits in, as
        // it stands at that instant -- so mid-write the replies describe a
        // half-written sequence: three letters and a blank, or the last chunk
        // on its own. They are indistinguishable from a read's reply, so the
        // key being written is muted until its writes have drained.
        if (get()._writingKey === detail.keyIndex) return;
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
      if (keys) {
        set({ keymap: keys, lastSync: Date.now() });
        get().loadMacroDetails();
      }
    });
    device.addEventListener('disconnect', () => get().disconnect());
    set({
      device,
      product,
      connected: true,
      noDevicePicked: false,
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
  // Set while a key's steps are being written, so the replies those writes
  // produce are not mistaken for the finished sequence.
  _writingKey: null,

  // The compact dump says which keys are macros but carries only each one's
  // first step, which is why a macro keycap could show nothing but its first
  // letter. Showing the whole sequence means pulling the detail for every
  // macro key, not just the one being edited.
  loadMacroDetails: async () => {
    const { product } = get();
    for (let i = 0; i < product.keyCount; i++) {
      const { keymap, keyDetails } = get();
      // Presence is not enough: a write echo leaves one chunk behind, and
      // skipping on that left the keycap showing the holes.
      if (keymap[i]?.mode !== KEY_MODE.MACRO || detailIsComplete(keyDetails[i])) continue;
      await get().loadKeyDetail(i);
    }
  },

  loadKeyDetail: async (keyIndex) => {
    const { device } = get();
    if (!device) return;
    try {
      for (let chunk = 0; chunk < KEY_DETAIL_CHUNKS; chunk++) {
        await sendPacket(device, buildReadKeyPacket(keyIndex, chunk));
        // Four requests sent together are four replies the device has to get
        // out before the host asks again; spaced, none of them has to wait.
        await pause(READ_GAP_MS);
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
  // Reads the key back until it is whole, or gives up and returns whatever
  // arrived -- the caller decides what an incomplete answer means.
  _awaitKeyDetail: async (keyIndex) => {
    const until = Date.now() + READ_TIMEOUT_MS;
    while (Date.now() < until) {
      const detail = get().keyDetails[keyIndex];
      if (detailIsComplete(detail)) return detail;
      await pause(40);
    }
    return get().keyDetails[keyIndex];
  },

  programMacro: async (keyIndex, steps) => {
    const { device } = get();
    if (!device || !steps.length) return;

    const sendAll = async (which) => {
      await sendPacket(
        device,
        buildWriteModePacket({ keyIndex, mode: KEY_MODE.MACRO, stepCount: steps.length }),
      );
      for (const i of which) {
        await sendPacket(device, buildWriteStepPacket({ keyIndex, stepIndex: i, ...steps[i] }));
        await pause(WRITE_GAP_MS);
      }
    };

    // Read the key back and say which steps did not arrive as sent.
    const readBack = async () => {
      set((s) => {
        const keyDetails = { ...s.keyDetails };
        delete keyDetails[keyIndex];
        return { keyDetails, _writingKey: null, lastSync: Date.now(), error: null };
      });
      await get().loadKeyDetail(keyIndex);
      const detail = await get()._awaitKeyDetail(keyIndex);
      if (!detailIsComplete(detail)) return steps.map((_, i) => i);
      return steps
        .map((step, i) => (sameStep(detail.steps[i], step) ? -1 : i))
        .filter((i) => i >= 0);
    };

    set({ _writingKey: keyIndex });
    try {
      await sendAll(steps.map((_, i) => i));

      // Sending is not arriving: the replies to those writes are still on
      // their way, and any that lands after the key is unmuted would be taken
      // for the finished sequence. Give them a moment to drain first.
      await pause(WRITE_SETTLE_MS);

      // A dropped report leaves the device holding a sequence it was never
      // asked for, and nothing else would notice. Check, and write again what
      // did not land -- once, because a second failure is not a race.
      let missing = await readBack();
      if (missing.length) {
        set({ _writingKey: keyIndex });
        await sendAll(missing);
        await pause(WRITE_SETTLE_MS);
        missing = await readBack();
      }
      if (missing.length) {
        set({ error: '매크로 일부가 기기에 들어가지 않았습니다. 다시 저장해 주세요.' });
      }

      await get().refreshKeymap();
    } catch (err) {
      set({ _writingKey: null, error: `매크로 저장 실패: ${err.message}` });
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

  // Write several keys in one go, for a whole-device preset. Each packet is
  // the same CMD_WRITE_KEY a single assignment sends, and the firmware forces
  // the key back to direct mode as it lands -- so this also undoes a macro
  // that happened to be sitting on one of these keys.
  //
  // Cached detail for the keys written is dropped rather than patched: it
  // still describes the macro that was there, and the panel reads it to
  // decide what to call the key. Whatever is still selected is pulled again.
  assignKeys: async (assignments) => {
    const { device, selectedKey } = get();
    if (!device || !assignments.length) return;
    try {
      for (const a of assignments) {
        await sendPacket(
          device,
          buildWritePacket({
            keyIndex: a.keyIndex,
            mod: a.mod ?? 0,
            code: a.code,
            isMedia: a.isMedia ?? 0,
          }),
        );
      }
    } catch (err) {
      set({ error: `프리셋 적용 실패: ${err.message}` });
      return;
    }

    const written = new Set(assignments.map((a) => a.keyIndex));
    set((s) => ({
      keyDetails: Object.fromEntries(
        Object.entries(s.keyDetails).filter(([i]) => !written.has(Number(i))),
      ),
      lastSync: Date.now(),
      error: null,
    }));

    await get().refreshKeymap();
    if (selectedKey !== null && written.has(selectedKey)) {
      await get().loadKeyDetail(selectedKey);
    }
  },

  dismissError: () => set({ error: null }),
}));
