import { MIN_STEP_MS, MAX_STEP_MS } from '../lib/protocol';
import MacroPreview from './MacroPreview';

// Uniform timing for a whole sequence: one hold and one gap applied to every
// step. That is the right shape for typing a word, where per-character
// control would be noise. Sequences whose timing varies step to step -- game
// combos, chords -- are edited in the 타이밍 tab instead.

const PRESETS = [
  { name: '따닥 (게임)', holdMs: 15, gapMs: 20, hint: '연타 스킬' },
  { name: '빠르게', holdMs: 25, gapMs: 40, hint: '단어 입력' },
  { name: '보통', holdMs: 50, gapMs: 80, hint: '안정적' },
  { name: '느리게', holdMs: 100, gapMs: 150, hint: '반응 느린 앱' },
];

export default function TimingEditor({ holdMs, gapMs, onChange, stepCount, labels = [] }) {
  const clamp = (v) => Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, v));
  const activePreset = PRESETS.find((p) => p.holdMs === holdMs && p.gapMs === gapMs);

  const steps = Array.from({ length: stepCount }, () => ({ holdMs, gapMs, chord: 0 }));

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <h3 className="text-xs font-semibold text-white/80">입력 타이밍</h3>

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

      <MacroPreview steps={steps} labels={labels} />
    </div>
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
