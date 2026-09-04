import { useEffect, useState } from 'react';
import { MAX_MACRO_STEPS, MIN_STEP_MS, MAX_STEP_MS, KEY_MODE, chordGroups } from '../lib/protocol';
import { DOM_CODE_TO_HID, isModifierDomCode, MOD_BITS, describeKey } from '../lib/keycodes';
import MacroPreview from './MacroPreview';

// Step-by-step macro editor: each press gets its own hold and gap, and any
// step can be marked as firing together with the next one.
//
// This is the tab for sequences where the timing is the point -- a game combo
// where one press must land 20ms after another, or two keys that have to go
// down at the same instant. The word tab covers the other case, where every
// character wants the same timing and per-step control is only noise.

const DEFAULT_HOLD_MS = 20;
const DEFAULT_GAP_MS = 30;

const PRESETS = [
  { name: '따닥', holdMs: 15, gapMs: 20 },
  { name: '빠르게', holdMs: 25, gapMs: 40 },
  { name: '보통', holdMs: 50, gapMs: 80 },
];

export default function TimingTab({ keyIndex, detail, onSave }) {
  const [steps, setSteps] = useState([]);
  const [listening, setListening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Start from what the device already holds, so the tab edits the real
  // sequence rather than silently replacing it with a blank one.
  useEffect(() => {
    if (!detail) return;
    if (detail.mode === KEY_MODE.MACRO && detail.stepCount > 0) {
      setSteps(
        detail.steps.slice(0, detail.stepCount).map((s) => ({
          mod: s.mod,
          code: s.code,
          isMedia: s.isMedia,
          chord: s.chord ?? 0,
          holdMs: s.holdMs || DEFAULT_HOLD_MS,
          gapMs: s.gapMs || DEFAULT_GAP_MS,
        })),
      );
    } else {
      // A direct key becomes a one-step sequence, which is exactly what it is.
      const first = detail.steps?.[0];
      setSteps(
        first?.code
          ? [
              {
                mod: first.mod,
                code: first.code,
                isMedia: first.isMedia,
                chord: 0,
                holdMs: DEFAULT_HOLD_MS,
                gapMs: DEFAULT_GAP_MS,
              },
            ]
          : [],
      );
    }
    setSaved(false);
  }, [detail?.keyIndex, keyIndex]);

  useEffect(() => {
    if (!listening) return undefined;

    const handleKeyDown = (e) => {
      if (isModifierDomCode(e.code)) return;
      const code = DOM_CODE_TO_HID[e.code];
      if (!code) return;
      e.preventDefault();

      const mod =
        (e.ctrlKey ? MOD_BITS.CTRL : 0) |
        (e.shiftKey ? MOD_BITS.SHIFT : 0) |
        (e.altKey ? MOD_BITS.ALT : 0) |
        (e.metaKey ? MOD_BITS.WIN : 0);

      setSteps((prev) =>
        prev.length >= MAX_MACRO_STEPS
          ? prev
          : [...prev, { mod, code, isMedia: 0, chord: 0, holdMs: DEFAULT_HOLD_MS, gapMs: DEFAULT_GAP_MS }],
      );
      setListening(false);
      setSaved(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [listening]);

  const update = (index, patch) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    setSaved(false);
  };

  const remove = (index) => {
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // A trailing chord flag would mean "fire with the next step" when there
      // is no next step, so clear it.
      if (next.length) next[next.length - 1] = { ...next[next.length - 1], chord: 0 };
      return next;
    });
    setSaved(false);
  };

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= steps.length) return;
    setSteps((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      if (next.length) next[next.length - 1] = { ...next[next.length - 1], chord: 0 };
      return next;
    });
    setSaved(false);
  };

  const applyPreset = (p) => {
    setSteps((prev) => prev.map((s) => ({ ...s, holdMs: p.holdMs, gapMs: p.gapMs })));
    setSaved(false);
  };

  const save = async () => {
    if (!steps.length) return;
    setSaving(true);
    await onSave(steps);
    setSaving(false);
    setSaved(true);
  };

  const labels = steps.map((s) => describeKey(s));
  const groups = chordGroups(steps, steps.length);

  return (
    <div className="col-span-4 flex flex-col gap-4 py-2">
      <p className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[11px] leading-relaxed text-white/45">
        키를 순서대로 추가하고 <b className="text-white/70">단계마다 시간을 따로</b> 정합니다.
        <br />
        같이 눌러야 하는 키는 <b className="text-white/70">＋동시</b>로 묶으면 한 번에
        내려갑니다.
      </p>

      {steps.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {steps.map((step, i) => {
            const groupIndex = groups.findIndex((g) => g.includes(i));
            const inChord = groups[groupIndex]?.length > 1;
            const isLast = i === steps.length - 1;
            const isGroupTail = groups[groupIndex]?.[groups[groupIndex].length - 1] === i;

            return (
              <div
                key={i}
                className={`rounded-lg border px-2.5 py-2 ${
                  inChord ? 'border-cyan-400/30 bg-cyan-500/[0.04]' : 'border-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-4 shrink-0 text-[10px] text-white/30">{i + 1}</span>
                  <span className="flex-1 truncate text-xs font-semibold text-white/85">
                    {describeKey(step)}
                  </span>
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="rounded px-1 text-[11px] text-white/40 hover:bg-white/10 disabled:opacity-20"
                    title="위로"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={isLast}
                    className="rounded px-1 text-[11px] text-white/40 hover:bg-white/10 disabled:opacity-20"
                    title="아래로"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => remove(i)}
                    className="rounded px-1 text-[11px] text-white/40 hover:bg-red-500/20 hover:text-red-300"
                    title="삭제"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-1.5 flex items-center gap-2">
                  {/* Only the step that opens a chord owns its hold; the rest
                      go down and come up with it. */}
                  {(!inChord || groups[groupIndex][0] === i) && (
                    <NumberField
                      label="누름"
                      value={step.holdMs}
                      onChange={(v) => update(i, { holdMs: v })}
                    />
                  )}
                  {isGroupTail && !isLast && (
                    <NumberField
                      label="간격"
                      value={step.gapMs}
                      onChange={(v) => update(i, { gapMs: v })}
                    />
                  )}
                  {!isLast && (
                    <button
                      onClick={() => update(i, { chord: step.chord ? 0 : 1 })}
                      className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                        step.chord
                          ? 'bg-cyan-500/25 text-cyan-300'
                          : 'bg-white/5 text-white/35 hover:bg-white/10'
                      }`}
                    >
                      ＋동시
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setListening((v) => !v)}
        disabled={steps.length >= MAX_MACRO_STEPS}
        className={`rounded-xl border-2 border-dashed py-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-30 ${
          listening ? 'border-cyan-400 text-cyan-300' : 'border-white/15 text-white/50 hover:border-white/30'
        }`}
      >
        {listening
          ? '지금 키를 누르세요 — 그 키가 추가됩니다'
          : `＋ 단계 추가 (${steps.length}/${MAX_MACRO_STEPS})`}
      </button>

      {steps.length > 1 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/30">전체 적용</span>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className="rounded border border-white/10 px-2 py-1 text-[10px] text-white/60 transition hover:border-cyan-400/50"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {steps.length > 0 && <MacroPreview steps={steps} labels={labels} />}

      <button
        onClick={save}
        disabled={!steps.length || saving}
        className="rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? '저장 중...' : saved ? '✓ 저장됨' : '이 순서로 저장'}
      </button>

      <p className="text-[10px] leading-relaxed text-white/25">
        키를 실제로 얼마나 오래 누르든 여기서 정한 시간만큼만 입력됩니다. 길게 눌러 다른
        동작이 나가는 것을 막아줍니다.
      </p>
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-1">
      <span className="text-[10px] text-white/35">{label}</span>
      <input
        type="number"
        min={MIN_STEP_MS}
        max={MAX_STEP_MS}
        value={value}
        onChange={(e) =>
          onChange(Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, Number(e.target.value) || MIN_STEP_MS)))
        }
        className="w-14 rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-right font-mono text-[11px] text-cyan-300 focus:border-cyan-400 focus:outline-none"
      />
      <span className="text-[10px] text-white/25">ms</span>
    </label>
  );
}
