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
} from '../lib/keycodes';

const TABS = [
  { id: 'custom', label: '직접 입력' },
  { id: 'letters', label: '문자' },
  { id: 'numbers', label: '숫자/기타' },
  { id: 'fkeys', label: 'F1-F12' },
  { id: 'media', label: '미디어' },
  { id: 'macro', label: '단축키' },
];

function CustomCaptureTab({ onCapture }) {
  const [listening, setListening] = useState(false);
  const [lastCombo, setLastCombo] = useState(null);

  useEffect(() => {
    if (!listening) return undefined;

    const handleKeyDown = (e) => {
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
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [listening, onCapture]);

  return (
    <div className="col-span-4 flex flex-col items-center gap-3 py-6">
      <button
        onClick={() => setListening(true)}
        className={`w-full rounded-xl border-2 border-dashed py-8 text-sm font-semibold transition ${
          listening
            ? 'animate-pulse border-cyan-400 text-cyan-300'
            : 'border-white/15 text-white/60 hover:border-white/30'
        }`}
      >
        {listening ? '⌨️ 키를 누르세요...' : '⌨️ 여기를 클릭하고 원하는 키를 누르세요'}
      </button>
      {lastCombo && (
        <p className="text-xs text-white/40">방금 적용됨: {describeKey(lastCombo)}</p>
      )}
      <p className="max-w-[16rem] text-center text-[11px] leading-relaxed text-white/30">
        Ctrl·Shift·Alt·Win을 누른 채로 원하는 키를 누르면 그 조합 그대로 매핑됩니다.
      </p>
    </div>
  );
}

export default function AssignmentDrawer() {
  const [tab, setTab] = useState('custom');
  const [activeMods, setActiveMods] = useState(0);
  const { selectedKey, keymap, assignKey, closeAssignment } = useFlixStore();
  const open = selectedKey !== null;

  const toggleMod = (bit) => setActiveMods((m) => (m & bit ? m & ~bit : m | bit));
  const pickBase = (code) => assignKey({ mod: activeMods, code, isMedia: 0 });
  const pickMedia = (code) => assignKey({ mod: 0, code, isMedia: 1 });
  const pickMacro = (p) => assignKey({ mod: p.mod, code: p.code, isMedia: p.isMedia });
  const pickCustom = (combo) => assignKey(combo);

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
            <p className="text-sm font-semibold text-white">
              현재: {describeKey(keymap[selectedKey] ?? {})}
            </p>
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
          {tab === 'custom' && <CustomCaptureTab onCapture={pickCustom} />}
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
