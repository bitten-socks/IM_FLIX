import { useEffect, useRef, useState } from 'react';
import { MIN_STEP_MS, MAX_STEP_MS } from '../lib/protocol';

// Timing controls for a macro, plus a way to actually perceive the result.
//
// The numbers alone are not much use: nobody knows what 20ms feels like, and
// the whole point of these macros is a rhythm the game reads correctly. So
// the editor plays the sequence back -- as a moving highlight, and as a click
// per keypress, since at these speeds the ear resolves rhythm far better than
// the eye. Slow motion exists for the same reason: a 50ms sequence is over
// before it registers visually, but at quarter speed its shape is clear while
// the displayed numbers stay honest.

const PRESETS = [
  { name: '따닥 (게임)', holdMs: 15, gapMs: 20, hint: '연타 스킬' },
  { name: '빠르게', holdMs: 25, gapMs: 40, hint: '단어 입력' },
  { name: '보통', holdMs: 50, gapMs: 80, hint: '안정적' },
  { name: '느리게', holdMs: 100, gapMs: 150, hint: '반응 느린 앱' },
];

const SLOW_FACTOR = 4;

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}초`;
}

// A short blip per keypress. Rhythm at 20-50ms intervals is essentially
// invisible but clearly audible, so this is the part that actually conveys
// the timing. Created lazily -- browsers refuse an AudioContext until the
// user has interacted with the page.
function useClicker() {
  const ctxRef = useRef(null);

  useEffect(() => () => ctxRef.current?.close?.(), []);

  return () => {
    try {
      if (!ctxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        ctxRef.current = new Ctx();
      }
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 1400;
      // Ramp down rather than cutting off, which would click a second time.
      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Audio is a nicety; never let it break the editor.
    }
  };
}

export default function TimingEditor({ holdMs, gapMs, onChange, stepCount, labels = [] }) {
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [sound, setSound] = useState(true);
  const timers = useRef([]);
  const click = useClicker();

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  const stop = () => {
    clearTimers();
    setPlaying(false);
    setActiveStep(-1);
  };

  const play = () => {
    if (playing) {
      stop();
      return;
    }
    if (!stepCount) return;

    clearTimers();
    setPlaying(true);
    const factor = slow ? SLOW_FACTOR : 1;

    let elapsed = 0;
    for (let i = 0; i < stepCount; i++) {
      const at = elapsed;
      timers.current.push(
        setTimeout(() => {
          setActiveStep(i);
          if (sound) click();
        }, at),
      );
      timers.current.push(setTimeout(() => setActiveStep(-1), at + holdMs * factor));
      elapsed += (holdMs + gapMs) * factor;
    }
    timers.current.push(setTimeout(stop, elapsed + 60));
  };

  // The gap after the final step never plays -- nothing waits on it.
  const totalMs = stepCount > 0 ? holdMs * stepCount + gapMs * (stepCount - 1) : 0;

  const clamp = (v) => Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, v));
  const activePreset = PRESETS.find((p) => p.holdMs === holdMs && p.gapMs === gapMs);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-semibold text-white/80">입력 타이밍</h3>
        <span className="text-[11px] text-white/40">전체 {formatDuration(totalMs)}</span>
      </div>

      <p className="text-[11px] leading-relaxed text-white/40">
        키를 실제로 얼마나 오래 누르든, 여기서 정한 시간만큼만 입력됩니다. 길게 눌러
        다른 동작이 나가는 것을 막아줍니다.
      </p>

      <div className="grid grid-cols-2 gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => onChange({ holdMs: p.holdMs, gapMs: p.gapMs })}
            className={`rounded-lg border px-2 py-1.5 text-left transition ${
              activePreset?.name === p.name
                ? 'border-cyan-400 bg-cyan-500/10'
                : 'border-white/10 hover:border-white/25'
            }`}
          >
            <span className="block text-[11px] font-semibold text-white/85">{p.name}</span>
            <span className="block text-[10px] text-white/35">{p.hint}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Slider
          label="누르는 시간"
          hint="한 글자를 누르고 있는 길이"
          value={holdMs}
          onChange={(v) => onChange({ holdMs: clamp(v), gapMs })}
          max={300}
        />
        <Slider
          label="글자 사이 간격"
          hint="다음 글자까지 쉬는 시간"
          value={gapMs}
          onChange={(v) => onChange({ holdMs, gapMs: clamp(v) })}
          max={300}
        />
      </div>

      {stepCount > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/60">미리 듣기</span>
            <div className="flex items-center gap-2">
              <Toggle on={sound} onClick={() => setSound((v) => !v)}>
                🔊 소리
              </Toggle>
              <Toggle on={slow} onClick={() => setSlow((v) => !v)}>
                4배 느리게
              </Toggle>
            </div>
          </div>

          <div className="flex items-end gap-[3px] overflow-x-auto rounded-lg bg-black/25 p-2">
            {Array.from({ length: stepCount }, (_, i) => (
              <div key={i} className="flex shrink-0 items-end gap-[3px]">
                <div
                  title={`${labels[i] ?? i + 1} · ${holdMs}ms`}
                  style={{ width: Math.max(10, Math.min(48, holdMs / 3)) }}
                  className={`flex h-9 items-center justify-center rounded text-[10px] font-bold transition-colors duration-75 ${
                    activeStep === i ? 'bg-cyan-400 text-slate-950' : 'bg-white/15 text-white/70'
                  }`}
                >
                  {labels[i] ?? ''}
                </div>
                {i < stepCount - 1 && (
                  <div
                    style={{ width: Math.max(3, Math.min(48, gapMs / 3)) }}
                    className="h-9 rounded bg-white/[0.04]"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={play}
            className={`rounded-lg py-2 text-xs font-semibold transition ${
              playing ? 'bg-white/10 text-white/70' : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
            }`}
          >
            {playing ? '■ 정지' : '▶ 이 속도로 들어보기'}
          </button>

          <p className="text-[10px] leading-relaxed text-white/25">
            소리는 실제 입력이 아니라 리듬 확인용입니다. 게임용 연타는 눈으로 보는 것보다
            소리로 들어보는 편이 정확합니다.
          </p>
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${
        on ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-white/35'
      }`}
    >
      {children}
    </button>
  );
}

function Slider({ label, hint, value, onChange, max }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] text-white/70">{label}</span>
        <span className="font-mono text-[11px] text-cyan-300">{value}ms</span>
      </div>
      <input
        type="range"
        min={MIN_STEP_MS}
        max={max}
        value={Math.min(value, max)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cyan-400"
      />
      <p className="text-[10px] text-white/25">{hint}</p>
    </div>
  );
}
