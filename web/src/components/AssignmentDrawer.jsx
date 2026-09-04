import { useEffect, useState } from 'react';
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

const TABS = [
  { id: 'custom', label: '직접 입력' },
  { id: 'word', label: '단어' },
  { id: 'letters', label: '문자' },
  { id: 'numbers', label: '숫자/기타' },
  { id: 'fkeys', label: 'F1-F12' },
  { id: 'media', label: '미디어' },
  { id: 'macro', label: '단축키' },
];

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

function CustomCaptureTab({ onCapture }) {
  const [listening, setListening] = useState(false);
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

  return (
    <div className="col-span-4 flex flex-col gap-3 py-2">
      <button
        onClick={() => setListening((v) => !v)}
        className={`w-full rounded-xl border-2 border-dashed py-6 transition ${
          listening
            ? 'border-cyan-400 bg-cyan-500/5'
            : 'border-white/15 hover:border-white/30'
        }`}
      >
        <span
          className={`block text-sm font-semibold ${
            listening ? 'text-cyan-300' : 'text-white/60'
          }`}
        >
          {listening ? '기다리는 중 — 지금 누르세요' : '① 여기를 눌러 시작'}
        </span>
        <span className="mt-1 block text-[11px] text-white/35">
          {listening
            ? '내 키보드에서 누른 조합이 이 키에 저장됩니다'
            : '누른 뒤 ② 내 키보드로 원하는 조합을 누릅니다'}
        </span>

        {listening && (
          <span className="mt-3 flex min-h-[26px] items-center justify-center gap-1">
            {held.length === 0 ? (
              <span className="text-[11px] text-white/25">아직 눌린 키 없음</span>
            ) : (
              held.map((m) => (
                <span
                  key={m}
                  className="rounded bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-300"
                >
                  {m}
                </span>
              ))
            )}
          </span>
        )}
      </button>

      {lastCombo && (
        <p className="text-center text-xs text-white/40">
          방금 적용됨: <b className="text-white/70">{describeKey(lastCombo)}</b>
        </p>
      )}

      <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
        <p className="text-[11px] leading-relaxed text-white/45">
          <b className="text-white/70">예)</b> Ctrl을 누른 채로 C를 누르면 이 키가{' '}
          <b className="text-white/70">Ctrl + C</b>가 됩니다.
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-white/30">
          Ctrl·Shift·Alt·Win만 누르면 저장되지 않습니다. 함께 누를 글자까지 눌러야
          완성됩니다.
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] text-white/40">
          아래 조합은 브라우저가 먼저 가로채서 직접 누를 수 없습니다. 눌러서 지정하세요.
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {RESERVED_COMBOS.map((c) => (
            <button
              key={c.label}
              onClick={() => {
                setLastCombo({ mod: c.mod, code: c.code, isMedia: 0 });
                onCapture({ mod: c.mod, code: c.code, isMedia: 0 });
              }}
              className="rounded-lg border border-white/10 px-2 py-1.5 text-left transition hover:border-cyan-400/50 hover:bg-cyan-500/5"
            >
              <span className="block text-[11px] font-semibold text-white/80">{c.label}</span>
              <span className="block text-[10px] text-white/30">{c.why}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AssignmentDrawer() {
  const [tab, setTab] = useState('custom');
  const [activeMods, setActiveMods] = useState(0);
  const { selectedKey, keymap, keyDetails, assignKey, closeAssignment, loadKeyDetail, programMacro } =
    useFlixStore();
  const open = selectedKey !== null;
  const detail = selectedKey === null ? null : keyDetails[selectedKey];

  // The compact keymap dump only carries step 0, so the word tab needs the
  // full per-key detail pulled on demand.
  useEffect(() => {
    if (selectedKey !== null) loadKeyDetail(selectedKey);
  }, [selectedKey, loadKeyDetail]);

  const toggleMod = (bit) => setActiveMods((m) => (m & bit ? m & ~bit : m | bit));
  const pickBase = (code) => assignKey({ mod: activeMods, code, isMedia: 0 });
  const pickMedia = (code) => assignKey({ mod: 0, code, isMedia: 1 });
  const pickMacro = (p) => assignKey({ mod: p.mod, code: p.code, isMedia: p.isMedia });

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
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        className={`fixed right-0 top-0 z-40 flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-[#15171c] shadow-2xl transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/40">
              K{selectedKey === null ? '-' : selectedKey + 1}
            </p>
            <p className="text-sm font-semibold text-white">현재: {currentLabel}</p>
          </div>
          <button
            onClick={closeAssignment}
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-white/5 px-5 py-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                tab === t.id
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {(tab === 'letters' || tab === 'numbers' || tab === 'fkeys') && (
          <div className="flex gap-2 px-5 pt-3">
            {MOD_LABELS.map(([bit, label]) => (
              <button
                key={bit}
                onClick={() => toggleMod(bit)}
                className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
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

        <div className="grid flex-1 auto-rows-min grid-cols-4 gap-2 overflow-y-auto p-5">
          {tab === 'custom' && <CustomCaptureTab onCapture={assignKey} />}
          {tab === 'word' && (
            <WordTab
              keyIndex={selectedKey}
              detail={detail}
              onSave={(steps) => programMacro(selectedKey, steps)}
            />
          )}
          {tab === 'letters' &&
            LETTER_KEYS.map((k) => (
              <button
                key={k.code}
                onClick={() => pickBase(k.code)}
                className="rounded-lg bg-white/5 py-2 text-sm font-medium text-white/90 hover:bg-cyan-500 hover:text-slate-950"
              >
                {k.label}
              </button>
            ))}
          {tab === 'numbers' &&
            [...NUMBER_KEYS, ...SPECIAL_KEYS, ...PUNCT_KEYS, ...NAV_KEYS].map((k) => (
              <button
                key={k.code}
                onClick={() => pickBase(k.code)}
                className="col-span-2 rounded-lg bg-white/5 py-2 text-sm font-medium text-white/90 hover:bg-cyan-500 hover:text-slate-950"
              >
                {k.label}
              </button>
            ))}
          {tab === 'fkeys' &&
            FUNCTION_KEYS.map((k) => (
              <button
                key={k.code}
                onClick={() => pickBase(k.code)}
                className="col-span-2 rounded-lg bg-white/5 py-2 text-sm font-medium text-white/90 hover:bg-cyan-500 hover:text-slate-950"
              >
                {k.label}
              </button>
            ))}
          {tab === 'media' &&
            MEDIA_KEYS.map((k) => (
              <button
                key={k.code}
                onClick={() => pickMedia(k.code)}
                className="col-span-4 rounded-lg bg-white/5 py-2 text-sm font-medium text-white/90 hover:bg-cyan-500 hover:text-slate-950"
              >
                {k.label}
              </button>
            ))}
          {tab === 'macro' &&
            MACRO_PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => pickMacro(p)}
                className="col-span-4 rounded-lg bg-white/5 px-3 py-2 text-left text-sm font-medium text-white/90 hover:bg-cyan-500 hover:text-slate-950"
              >
                {p.name}
              </button>
            ))}
        </div>
      </aside>
    </>
  );
}
