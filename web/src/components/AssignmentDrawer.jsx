import { useEffect, useRef, useState } from 'react';
import { useFlixStore } from '../store/useFlixStore';
import {
  LETTER_KEYS,
  NUMBER_KEYS,
  SPECIAL_KEYS,
  FUNCTION_KEYS,
  PUNCT_KEYS,
  NAV_KEYS,
  MEDIA_KEYS,
  MACRO_PRESETS,
  MOD_LABELS,
  MOD_BITS,
  DOM_CODE_TO_HID,
  isModifierDomCode,
  describeKey,
  stepsToText,
} from '../lib/keycodes';
import { KEY_MODE } from '../lib/protocol';
import WordTab from './WordTab';
import TimingTab from './TimingTab';

// Two levels rather than one strip of eight tabs.
//
// Picking a key is what almost every visit is for; typing a word from one key
// and building a timed sequence are a different kind of thing, and mixing
// them into the same row made the common job compete with the rare one for
// attention. 고급 holds whatever goes past what a command board normally does.
const BASIC_TABS = [
  { id: 'custom', label: '직접 입력' },
  { id: 'letters', label: '문자' },
  { id: 'numbers', label: '숫자·기호' },
  { id: 'fkeys', label: 'F1–F12' },
  { id: 'media', label: '미디어' },
  { id: 'macro', label: '단축키' },
];

const ADVANCED_TABS = [
  { id: 'word', label: '단어 입력' },
  { id: 'timing', label: '순서·타이밍' },
];

const KEY_GRID_TABS = new Set(['letters', 'numbers', 'fkeys', 'media', 'macro']);
const MODIFIER_TABS = new Set(['letters', 'numbers', 'fkeys']);

// Combinations the browser or Windows claims before the page ever sees them.
// Pressing Ctrl+W here would close the tab mid-setup, so these are offered as
// buttons instead of being captured. preventDefault() cannot save us: the
// browser acts on them at a level a page has no say over.
const RESERVED_COMBOS = [
  { label: 'Ctrl + W', mod: MOD_BITS.CTRL, code: 0x1a, why: '탭 닫기' },
  { label: 'Ctrl + T', mod: MOD_BITS.CTRL, code: 0x17, why: '새 탭' },
  { label: 'Ctrl + N', mod: MOD_BITS.CTRL, code: 0x11, why: '새 창' },
  { label: 'Alt + F4', mod: MOD_BITS.ALT, code: 0x3d, why: '창 종료' },
];

function heldModifierLabels(e) {
  return [
    e.ctrlKey && 'Ctrl',
    e.shiftKey && 'Shift',
    e.altKey && 'Alt',
    e.metaKey && 'Win',
  ].filter(Boolean);
}

// With the panel permanently on screen, an armed capture can outlive the
// user's intent -- they arm it, then click the page or tab away, and the next
// key they press gets swallowed into a mapping they never asked for. So
// arming ends on anything that means attention moved: a different key
// selected, a click outside the trigger, or the window losing focus.
export function useCaptureGuard(listening, stop, triggerRef, resetKey) {
  useEffect(() => {
    if (!listening) return undefined;

    const onPointerDown = (e) => {
      if (!triggerRef.current?.contains(e.target)) stop();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('blur', stop);
    };
  }, [listening, stop, triggerRef]);

  useEffect(() => {
    stop();
    // Only when the selected key changes -- stop is stable enough here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);
}

function CustomCaptureTab({ onCapture, keyIndex }) {
  const [listening, setListening] = useState(false);
  const triggerRef = useRef(null);
  const [held, setHeld] = useState([]);
  const [lastCombo, setLastCombo] = useState(null);

  useEffect(() => {
    if (!listening) {
      setHeld([]);
      return undefined;
    }

    // Modifiers are shown as they are held so the panel visibly responds to a
    // bare Ctrl. Without this, holding a modifier looks like a dead panel --
    // it produces no assignment on its own and used to give no feedback.
    const track = (e) => setHeld(heldModifierLabels(e));

    const handleKeyDown = (e) => {
      track(e);
      if (isModifierDomCode(e.code)) return;
      const hidCode = DOM_CODE_TO_HID[e.code];
      if (!hidCode) return;
      e.preventDefault();

      const mod =
        (e.ctrlKey ? MOD_BITS.CTRL : 0) |
        (e.shiftKey ? MOD_BITS.SHIFT : 0) |
        (e.altKey ? MOD_BITS.ALT : 0) |
        (e.metaKey ? MOD_BITS.WIN : 0);
      const combo = { mod, code: hidCode, isMedia: 0 };
      setLastCombo(combo);
      onCapture(combo);
      setListening(false);
      setHeld([]);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', track, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', track, true);
    };
  }, [listening, onCapture]);

  useCaptureGuard(listening, () => setListening(false), triggerRef, keyIndex);

  return (
    <div className="flex flex-col gap-4">
      <button
        ref={triggerRef}
        onClick={() => setListening((v) => !v)}
        className={`w-full rounded-2xl border-2 border-dashed py-8 transition ${
          listening ? 'border-cyan-400 bg-cyan-500/5' : 'border-white/15 hover:border-white/30'
        }`}
      >
        <span
          className={`block text-base font-semibold ${
            listening ? 'text-cyan-300' : 'text-white/70'
          }`}
        >
          {listening ? '기다리는 중 — 지금 누르세요' : '① 여기를 눌러 시작'}
        </span>
        <span className="mt-1.5 block text-xs text-white/40">
          {listening
            ? '내 키보드에서 누른 조합이 이 키에 저장됩니다'
            : '누른 뒤 ② 내 키보드로 원하는 조합을 누릅니다'}
        </span>

        {listening && (
          <span className="mt-4 flex min-h-[32px] items-center justify-center gap-1.5">
            {held.length === 0 ? (
              <span className="text-xs text-white/25">아직 눌린 키 없음</span>
            ) : (
              held.map((m) => (
                <span
                  key={m}
                  className="rounded-lg bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-300"
                >
                  {m}
                </span>
              ))
            )}
          </span>
        )}
      </button>

      {lastCombo && (
        <p className="text-center text-sm text-white/40">
          방금 적용됨: <b className="text-white/75">{describeKey(lastCombo)}</b>
        </p>
      )}

      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5">
        <p className="text-[13px] leading-relaxed text-white/50">
          <b className="text-white/75">예)</b> Ctrl을 누른 채로 C를 누르면 이 키가{' '}
          <b className="text-white/75">Ctrl + C</b>가 됩니다.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-white/35">
          Ctrl·Shift·Alt·Win만 누르면 저장되지 않습니다. 함께 누를 글자까지 눌러야 완성됩니다.
        </p>
      </div>

      <div>
        <p className="mb-2 text-[13px] text-white/45">
          아래 조합은 브라우저가 먼저 가로채서 직접 누를 수 없습니다. 눌러서 지정하세요.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {RESERVED_COMBOS.map((c) => (
            <button
              key={c.label}
              onClick={() => {
                setLastCombo({ mod: c.mod, code: c.code, isMedia: 0 });
                onCapture({ mod: c.mod, code: c.code, isMedia: 0 });
              }}
              className="rounded-xl border border-white/10 px-3 py-2.5 text-left transition hover:border-cyan-400/50 hover:bg-cyan-500/5"
            >
              <span className="block text-[13px] font-semibold text-white/85">{c.label}</span>
              <span className="block text-xs text-white/35">{c.why}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AssignmentDrawer() {
  const [mode, setMode] = useState('basic');
  const [basicTab, setBasicTab] = useState('custom');
  const [advancedTab, setAdvancedTab] = useState('word');
  const [activeMods, setActiveMods] = useState(0);
  const { selectedKey, keymap, keyDetails, assignKey, closeAssignment, loadKeyDetail, programMacro } =
    useFlixStore();
  const open = selectedKey !== null;
  const detail = selectedKey === null ? null : keyDetails[selectedKey];

  // The compact keymap dump only carries step 0, so the word and timing tabs
  // need the full per-key detail pulled on demand.
  useEffect(() => {
    if (selectedKey !== null) loadKeyDetail(selectedKey);
  }, [selectedKey, loadKeyDetail]);

  const toggleMod = (bit) => setActiveMods((m) => (m & bit ? m & ~bit : m | bit));
  const pickBase = (code) => assignKey({ mod: activeMods, code, isMedia: 0 });
  const pickMedia = (code) => assignKey({ mod: 0, code, isMedia: 1 });
  const pickMacro = (p) => assignKey({ mod: p.mod, code: p.code, isMedia: p.isMedia });

  const tab = mode === 'basic' ? basicTab : advancedTab;

  // A macro key's real assignment is the whole sequence, which the compact
  // dump cannot express -- show the word instead of just its first letter.
  const currentLabel = (() => {
    if (detail?.mode === KEY_MODE.MACRO) {
      const word = stepsToText(detail.steps, detail.stepCount);
      if (word) return `"${word}"`;
      return `${detail.stepCount}단계 매크로`;
    }
    return describeKey(keymap[selectedKey] ?? {});
  })();

  return (
    <>
      <div
        onClick={closeAssignment}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity xl:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        className={`fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#15171c] shadow-2xl transition-transform duration-200 xl:translate-x-0 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/40">
              {open ? `K${selectedKey + 1}` : '키 설정'}
            </p>
            <p className="mt-0.5 text-lg font-bold text-white">
              {open ? currentLabel : '선택된 키 없음'}
            </p>
          </div>
          {open && (
            <button
              onClick={closeAssignment}
              aria-label="선택 해제"
              className="rounded-xl p-2 text-xl leading-none text-white/40 transition hover:bg-white/5 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {!open && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-base text-white/50">왼쪽에서 키캡을 클릭하세요</p>
            <p className="text-sm leading-relaxed text-white/25">
              고른 키의 설정이 여기에 나타납니다.
            </p>
          </div>
        )}

        {open && (
          <>
            <div className="border-b border-white/5 px-6 py-4">
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1">
                {[
                  ['basic', '기본'],
                  ['advanced', '고급'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setMode(id)}
                    className={`rounded-lg py-2.5 text-sm font-bold transition ${
                      mode === id ? 'bg-cyan-500 text-slate-950' : 'text-white/55 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {(mode === 'basic' ? BASIC_TABS : ADVANCED_TABS).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => (mode === 'basic' ? setBasicTab(t.id) : setAdvancedTab(t.id))}
                    className={`rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                      tab === t.id
                        ? 'bg-white/15 text-white'
                        : 'bg-white/[0.04] text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'advanced' && (
              <p className="px-6 pt-4 text-[13px] leading-relaxed text-white/35">
                키 하나로 여러 글자를 보내거나, 누르는 순서와 시간까지 정하는 기능입니다.
              </p>
            )}

            {MODIFIER_TABS.has(tab) && (
              <div className="flex gap-2 px-6 pt-4">
                {MOD_LABELS.map(([bit, label]) => (
                  <button
                    key={bit}
                    onClick={() => toggleMod(bit)}
                    className={`rounded-xl border px-3 py-2 text-[13px] font-semibold transition ${
                      activeMods & bit
                        ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300'
                        : 'border-white/10 text-white/50 hover:border-white/30'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
              {tab === 'custom' && <CustomCaptureTab onCapture={assignKey} keyIndex={selectedKey} />}
              {tab === 'word' && (
                <WordTab
                  keyIndex={selectedKey}
                  detail={detail}
                  onSave={(steps) => programMacro(selectedKey, steps)}
                />
              )}
              {tab === 'timing' && (
                <TimingTab
                  keyIndex={selectedKey}
                  detail={detail}
                  onSave={(steps) => programMacro(selectedKey, steps)}
                />
              )}

              {KEY_GRID_TABS.has(tab) && (
                <div className="grid grid-cols-4 gap-2">
                  {tab === 'letters' &&
                    LETTER_KEYS.map((k) => (
                      <KeyButton key={k.code} onClick={() => pickBase(k.code)}>
                        {k.label}
                      </KeyButton>
                    ))}
                  {tab === 'numbers' &&
                    [...NUMBER_KEYS, ...SPECIAL_KEYS, ...PUNCT_KEYS, ...NAV_KEYS].map((k) => (
                      <KeyButton key={k.code} span={2} onClick={() => pickBase(k.code)}>
                        {k.label}
                      </KeyButton>
                    ))}
                  {tab === 'fkeys' &&
                    FUNCTION_KEYS.map((k) => (
                      <KeyButton key={k.code} span={2} onClick={() => pickBase(k.code)}>
                        {k.label}
                      </KeyButton>
                    ))}
                  {tab === 'media' &&
                    MEDIA_KEYS.map((k) => (
                      <KeyButton key={k.code} span={4} onClick={() => pickMedia(k.code)}>
                        {k.label}
                      </KeyButton>
                    ))}
                  {tab === 'macro' &&
                    MACRO_PRESETS.map((p) => (
                      <KeyButton key={p.name} span={4} align="left" onClick={() => pickMacro(p)}>
                        {p.name}
                      </KeyButton>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function KeyButton({ children, onClick, span = 1, align = 'center' }) {
  const spanClass = { 1: '', 2: 'col-span-2', 4: 'col-span-4' }[span];
  return (
    <button
      onClick={onClick}
      className={`rounded-xl bg-white/5 py-3 text-base font-medium text-white/90 transition hover:bg-cyan-500 hover:text-slate-950 ${spanClass} ${
        align === 'left' ? 'px-4 text-left' : ''
      }`}
    >
      {children}
    </button>
  );
}
