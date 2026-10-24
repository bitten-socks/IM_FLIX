import { useEffect, useRef, useState } from 'react';
import { MAX_MACRO_STEPS, MIN_STEP_MS, MAX_STEP_MS, KEY_MODE, chordGroups } from '../lib/protocol';
import {
  DOM_CODE_TO_HID,
  isModifierDomCode,
  MOD_BITS,
  describeKey,
  textToSteps,
  MACRO_KEY_TOKENS,
} from '../lib/keycodes';
import MacroPreview from './MacroPreview';
import { useCaptureGuard } from './AssignmentDrawer';

// The whole sequence editor: what the key sends, in what order, and with what
// timing.
//
// Typing and the step list used to be separate tabs, which could not work --
// each one held its own copy of the sequence and saved all of it, so whichever
// was edited last silently threw the other's work away. There is one list of
// steps here and every control writes to it. Text is an input method for that
// list, not a second copy of it: typing appends and never rewrites what is
// already there, which is what keeps the two from fighting.
//
// Milliseconds are not the interface. Nobody knows what 20ms feels like, so
// the speed is chosen by name and the numbers only appear for someone who
// asks for them. What the key will actually do is spelled out in a sentence
// at the top, because a list of steps with numbers beside them does not
// answer "what happens when I press this".

const DEFAULT_HOLD_MS = 20;
const DEFAULT_GAP_MS = 30;

// Appended steps take the speed the sequence already runs at, so adding to a
// macro does not leave one stretch marching to a different beat.
const commonHoldFor = (steps) => steps[0]?.holdMs ?? DEFAULT_HOLD_MS;
const commonGapFor = (steps) => steps[0]?.gapMs ?? DEFAULT_GAP_MS;

const SPEEDS = [
  { id: 'snap', name: '따닥', hint: '연타처럼 붙여서', holdMs: 15, gapMs: 20 },
  { id: 'quick', name: '빠르게', hint: '기본값', holdMs: 25, gapMs: 40 },
  { id: 'steady', name: '보통', hint: '안정적으로', holdMs: 50, gapMs: 80 },
  { id: 'slow', name: '느리게', hint: '반응 느린 프로그램', holdMs: 100, gapMs: 150 },
];

export default function TimingTab({ keyIndex, detail, onSave }) {
  const [steps, setSteps] = useState([]);
  const [listening, setListening] = useState(false);
  const [draft, setDraft] = useState('');
  const draftRef = useRef(null);
  const [showNumbers, setShowNumbers] = useState(false);
  const addRef = useRef(null);
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
          sustain: s.sustain ?? 0,
          onRelease: s.onRelease ?? 0,
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
                sustain: 0,
                onRelease: 0,
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
          : [
              ...prev,
              {
                mod,
                code,
                isMedia: 0,
                chord: 0,
                sustain: 0,
                onRelease: 0,
                holdMs: DEFAULT_HOLD_MS,
                gapMs: DEFAULT_GAP_MS,
              },
            ],
      );
      setListening(false);
      setSaved(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [listening]);

  useCaptureGuard(listening, () => setListening(false), addRef, keyIndex);

  const update = (index, patch) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    setSaved(false);
  };

  const setRelease = (index, on) => {
    setSteps((prev) =>
      prev.map((s, i) => {
        if (i === index) {
          return { ...s, onRelease: on ? 1 : 0, chord: on ? 0 : s.chord, sustain: on ? 0 : s.sustain };
        }
        return on && i > index ? { ...s, sustain: 0 } : s;
      }),
    );
    setSaved(false);
  };

  const remove = (index) => {
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // A trailing "together" flag would mean "fire with the next step" when
      // there is no next step, so clear it.
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

  const room = MAX_MACRO_STEPS - steps.length;
  const draftParsed = textToSteps(draft, {
    holdMs: commonHoldFor(steps),
    gapMs: commonGapFor(steps),
    limit: Math.max(0, room),
  });

  const appendDraft = () => {
    if (!draftParsed.steps.length) return;
    setSteps((prev) => [
      // A trailing "together" flag would now point at the first appended step
      // and silently chord them, so clear it before extending.
      ...prev.map((s, i) => (i === prev.length - 1 ? { ...s, chord: 0 } : s)),
      ...draftParsed.steps.map((s) => ({ ...s, chord: 0, sustain: 0, onRelease: 0 })),
    ]);
    setDraft('');
    setSaved(false);
  };

  const insertToken = (token) => {
    const el = draftRef.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    setDraft(draft.slice(0, start) + token + draft.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const applySpeed = (speed) => {
    setSteps((prev) => prev.map((s) => ({ ...s, holdMs: speed.holdMs, gapMs: speed.gapMs })));
    setSaved(false);
  };

  const applyToAll = (patch) => {
    setSteps((prev) => prev.map((s) => ({ ...s, ...patch })));
    setSaved(false);
  };

  const save = async () => {
    if (!steps.length) return;
    setSaving(true);
    await onSave(steps);
    setSaving(false);
    setSaved(true);
  };

  // Measured over the press phase only -- steps that play after the lift are
  // taps by definition and can never be held.
  // Where the release phase begins, or -1 while there is none. A step from
  // here on plays after the finger has lifted, so it cannot also be held
  // until the finger lifts -- that has already happened.
  const releaseAt = steps.findIndex((s) => s.onRelease);
  const pressPhase = releaseAt === -1 ? steps : steps.slice(0, releaseAt);
  const allSustained = pressPhase.length > 0 && pressPhase.every((s) => s.sustain);
  const labels = steps.map((s) => describeKey(s));
  const groups = chordGroups(steps, steps.length);
  // The sliders speak for the whole sequence, so they show the first step's
  // value -- which is what they are about to write to every step anyway.
  const commonHold = steps[0]?.holdMs ?? DEFAULT_HOLD_MS;
  const commonGap = steps[0]?.gapMs ?? DEFAULT_GAP_MS;
  const activeSpeed = SPEEDS.find(
    (s) => steps.length > 0 && steps.every((x) => x.holdMs === s.holdMs && x.gapMs === s.gapMs),
  );

  return (
    <div className="flex flex-col gap-5">
      <Summary groups={groups} labels={labels} />

      {steps.length > 0 && (
        <div className="flex flex-col gap-2">
          {steps.map((step, i) => {
            const groupIndex = groups.findIndex((g) => g.includes(i));
            const group = groups[groupIndex] ?? [i];
            const inChord = group.length > 1;
            const isLast = i === steps.length - 1;
            const afterLift = releaseAt !== -1 && i >= releaseAt;

            return (
              <div
                key={i}
                className={`rounded-xl border px-3.5 py-3 ${
                  inChord ? 'border-cyan-400/30 bg-cyan-500/[0.05]' : 'border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-xs text-white/30">{i + 1}</span>
                  <span className="flex-1 truncate text-[15px] font-semibold text-white/90">
                    {describeKey(step)}
                  </span>
                  <IconButton label="위로" onClick={() => move(i, -1)} disabled={i === 0}>
                    ↑
                  </IconButton>
                  <IconButton label="아래로" onClick={() => move(i, 1)} disabled={isLast}>
                    ↓
                  </IconButton>
                  <IconButton label="삭제" onClick={() => remove(i)} danger>
                    ✕
                  </IconButton>
                </div>

                {!afterLift && (
                <button
                  onClick={() => update(i, { sustain: step.sustain ? 0 : 1 })}
                  className={`mt-2.5 w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium transition ${
                    step.sustain
                      ? 'bg-amber-500/20 text-amber-200'
                      : 'bg-white/[0.04] text-white/40 hover:bg-white/10'
                  }`}
                >
                  {step.sustain ? '✓ 손 뗄 때까지 누르고 있음' : '손 뗄 때까지 누르고 있기'}
                </button>
                )}

                {i > 0 && (
                  <button
                    onClick={() => setRelease(i, !step.onRelease)}
                    className={`mt-2.5 w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium transition ${
                      step.onRelease
                        ? 'bg-violet-500/20 text-violet-200'
                        : 'bg-white/[0.04] text-white/40 hover:bg-white/10'
                    }`}
                  >
                    {step.onRelease
                      ? '✓ 여기부터 손 뗀 뒤에 실행'
                      : '여기부터 손 뗀 뒤에 실행'}
                  </button>
                )}

                {!isLast && !step.onRelease && (
                  <button
                    onClick={() => update(i, { chord: step.chord ? 0 : 1 })}
                    className={`mt-2.5 w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium transition ${
                      step.chord
                        ? 'bg-cyan-500/20 text-cyan-200'
                        : 'bg-white/[0.04] text-white/40 hover:bg-white/10'
                    }`}
                  >
                    {step.chord ? '✓ 아래 키와 같이 누름' : '아래 키와 같이 누르기'}
                  </button>
                )}

                {showNumbers && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-3">
                    {group[0] === i && (
                      <NumberField
                        label="누름"
                        value={step.holdMs}
                        onChange={(v) => update(i, { holdMs: v })}
                      />
                    )}
                    {group[group.length - 1] === i && !isLast && (
                      <NumberField
                        label="다음까지"
                        value={step.gapMs}
                        onChange={(v) => update(i, { gapMs: v })}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pressPhase.length > 1 && (
        <button
          onClick={() =>
            setSteps((prev) => {
              const cut = prev.findIndex((s) => s.onRelease);
              const end = cut === -1 ? prev.length : cut;
              const on = allSustained ? 0 : 1;
              return prev.map((s, i) => (i < end ? { ...s, sustain: on } : s));
            }) || setSaved(false)
          }
          className={`rounded-xl px-4 py-3 text-left text-[13px] font-semibold transition ${
            allSustained
              ? 'bg-amber-500/20 text-amber-200'
              : 'bg-white/[0.04] text-white/55 hover:bg-white/10'
          }`}
        >
          {allSustained
            ? '✓ 누르는 동안 전부 잡고 있음'
            : '누르는 동안 전부 잡고 있기'}
          <span className="mt-0.5 block text-[11px] font-normal text-white/35">
            순서대로 눌러서 {pressPhase.length}개를 모두 잡고 있다가, 손을 떼면 같이 놓습니다
          </span>
        </button>
      )}

      <div className="rounded-xl border border-white/10 p-3.5">
        <p className="mb-2 text-[13px] font-semibold text-white/70">글자로 추가</p>
        <div className="flex gap-2">
          <input
            ref={draftRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                appendDraft();
              }
            }}
            placeholder="예: block"
            spellCheck={false}
            autoComplete="off"
            disabled={room <= 0}
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 font-mono text-[15px] text-white placeholder:text-white/20 focus:border-cyan-400 focus:outline-none disabled:opacity-40"
          />
          <button
            onClick={appendDraft}
            disabled={!draftParsed.steps.length}
            className="shrink-0 rounded-lg bg-white/10 px-4 text-[13px] font-semibold text-white/80 transition hover:bg-white/15 disabled:opacity-30"
          >
            추가
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {MACRO_KEY_TOKENS.map(({ token, label }) => (
            <button
              key={token}
              onClick={() => insertToken(token)}
              title={label}
              disabled={room <= 0}
              className="flex min-w-[46px] flex-col items-center rounded-lg border border-white/10 px-2 py-1.5 transition hover:border-cyan-400/50 hover:bg-cyan-500/5 disabled:opacity-30"
            >
              <span className="font-mono text-sm leading-none text-white/85">{token}</span>
              <span className="mt-1 text-[10px] leading-none text-white/35">{label}</span>
            </button>
          ))}
        </div>

        {draftParsed.rejected.length > 0 && (
          <p className="mt-2 text-[12px] leading-relaxed text-amber-200/80">
            넣을 수 없어 빠지는 글자: <b>{draftParsed.rejected.join(' ')}</b>
            {draftParsed.rejected.some((ch) => /[ㄱ-힣ㄱ-ㅎㅏ-ㅣ]/.test(ch)) && (
              <>
                <br />
                한글은 키보드가 아니라 PC의 한/영 상태가 만드는 글자라, 기기에서 직접 보낼
                수 없습니다.
              </>
            )}
          </p>
        )}
      </div>

      <button
        ref={addRef}
        onClick={() => setListening((v) => !v)}
        disabled={steps.length >= MAX_MACRO_STEPS}
        className={`rounded-xl border-2 border-dashed py-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-30 ${
          listening
            ? 'border-cyan-400 text-cyan-300'
            : 'border-white/15 text-white/55 hover:border-white/30'
        }`}
      >
        {listening
          ? '지금 키를 누르세요 — 그 키가 추가됩니다'
          : `＋ 키 추가 (${steps.length}/${MAX_MACRO_STEPS})`}
      </button>

      {steps.length > 0 && (
        <div>
          <p className="mb-2 text-[13px] font-semibold text-white/70">입력 속도</p>
          <div className="grid grid-cols-2 gap-2">
            {SPEEDS.map((s) => (
              <button
                key={s.id}
                onClick={() => applySpeed(s)}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  activeSpeed?.id === s.id
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-white/10 hover:border-white/25'
                }`}
              >
                <span className="block text-[13px] font-bold text-white/90">{s.name}</span>
                <span className="block text-xs text-white/35">{s.hint}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <Slider
              label="누르는 시간"
              hint="키 하나를 누르고 있는 길이"
              value={commonHold}
              onChange={(v) => applyToAll({ holdMs: v })}
            />
            <Slider
              label="다음 키까지 간격"
              hint="떼고 나서 쉬는 시간"
              value={commonGap}
              onChange={(v) => applyToAll({ gapMs: v })}
            />

            <p className="text-xs leading-relaxed text-white/30">
              막대는 {SLIDER_MAX_MS}ms까지 움직입니다. 더 길게 누르려면 숫자칸에 직접
              적으세요 — 최대 {MAX_STEP_MS}ms({MAX_STEP_MS / 1000}초)까지 됩니다.
            </p>
          </div>

          <button
            onClick={() => setShowNumbers((v) => !v)}
            className={`mt-3 w-full rounded-xl border py-2.5 text-[13px] font-medium transition ${
              showNumbers
                ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200'
                : 'border-white/10 text-white/50 hover:border-white/25 hover:text-white/75'
            }`}
          >
            {showNumbers ? '단계별 조정 닫기' : '단계마다 다르게 설정하기'}
          </button>
        </div>
      )}

      {steps.length > 0 && <MacroPreview steps={steps} labels={labels} />}

      <button
        onClick={save}
        disabled={!steps.length || saving}
        className="rounded-xl bg-cyan-500 py-3 text-[15px] font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? '저장 중...' : saved ? '✓ 저장됨' : '이 순서로 저장'}
      </button>

      <p className="text-xs leading-relaxed text-white/25">
        키를 실제로 얼마나 오래 누르든 여기서 정한 시간만큼만 입력됩니다. 길게 눌러 다른
        동작이 나가는 것을 막아줍니다.
      </p>
    </div>
  );
}

// What the key will do, in one sentence. A list of steps with numbers beside
// them does not answer that on its own.
function Summary({ groups, labels }) {
  if (!groups.length) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5 text-[13px] leading-relaxed text-white/45">
        아래에서 키를 순서대로 추가하세요. 이 키를 한 번 누르면 추가한 순서대로 입력됩니다.
      </p>
    );
  }

  const phrase = groups
    .map((g) => g.map((i) => labels[i]).join(' + '))
    .join(' → ');

  return (
    <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.06] px-4 py-3.5 text-[13px] leading-relaxed text-white/60">
      이 키를 누르면 <b className="text-cyan-200">{phrase}</b> 순서로 입력됩니다.
      {groups.some((g) => g.length > 1) && (
        <>
          <br />
          <span className="text-white/35">＋로 묶인 키는 동시에 눌립니다.</span>
        </>
      )}
    </p>
  );
}

function IconButton({ children, onClick, label, disabled = false, danger = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded-lg px-2 py-1 text-sm transition disabled:opacity-20 ${
        danger ? 'text-white/40 hover:bg-red-500/20 hover:text-red-300' : 'text-white/40 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

// The track covers the band people actually work in; the firmware accepts far
// more. Stretching one slider across the whole range would squeeze 10-100ms
// into a couple of percent of its length, where 20ms and 40ms land on the
// same pixel. So the box beside it takes anything longer, and a line under
// the pair says so -- a value past the end parks the thumb at the far right,
// which the number beside it corrects.
const SLIDER_MAX_MS = 300;

function Slider({ label, hint, value, onChange }) {
  const clamp = (v) => Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, v));

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-[13px] text-white/70">{label}</span>
        <span className="flex items-center gap-1.5">
          <input
            type="number"
            min={MIN_STEP_MS}
            max={MAX_STEP_MS}
            value={value}
            onChange={(e) => onChange(clamp(Number(e.target.value) || MIN_STEP_MS))}
            aria-label={`${label} (밀리초)`}
            className="w-20 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-right font-mono text-[13px] text-cyan-300 focus:border-cyan-400 focus:outline-none"
          />
          <span className="text-xs text-white/30">ms</span>
        </span>
      </div>
      <input
        type="range"
        min={MIN_STEP_MS}
        max={SLIDER_MAX_MS}
        value={Math.min(value, SLIDER_MAX_MS)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cyan-400"
      />
      <p className="mt-0.5 text-xs text-white/25">{hint}</p>
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs text-white/40">{label}</span>
      <input
        type="number"
        min={MIN_STEP_MS}
        max={MAX_STEP_MS}
        value={value}
        onChange={(e) =>
          onChange(
            Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, Number(e.target.value) || MIN_STEP_MS)),
          )
        }
        className="w-16 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-right font-mono text-[13px] text-cyan-300 focus:border-cyan-400 focus:outline-none"
      />
      <span className="text-xs text-white/25">ms</span>
    </label>
  );
}
