import { useEffect, useRef, useState } from 'react';
import { chordGroups, macroDurationMs } from '../lib/protocol';

// Plays a macro back so its timing can actually be judged.
//
// The numbers alone are not much use: nobody knows what 20ms feels like, and
// the point of these sequences is a rhythm a game reads correctly. So it
// plays with a click per press -- at these speeds the ear resolves rhythm far
// better than the eye -- and offers a quarter-speed pass for when the shape
// matters more than the tempo. Keys that fire together are drawn and played
// as one event, because that is what the device does.

const SLOW_FACTOR = 4;

export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}초`;
}

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

export default function MacroPreview({ steps, labels = [] }) {
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(false);
  const [sound, setSound] = useState(true);
  const [activeGroup, setActiveGroup] = useState(-1);
  const timers = useRef([]);
  const click = useClicker();

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const groups = chordGroups(steps, steps.length);
  const totalMs = macroDurationMs(steps, steps.length);

  const stop = () => {
    clearTimers();
    setPlaying(false);
    setActiveGroup(-1);
  };

  const play = () => {
    if (playing) {
      stop();
      return;
    }
    if (!groups.length) return;

    clearTimers();
    setPlaying(true);
    const factor = slow ? SLOW_FACTOR : 1;

    let elapsed = 0;
    groups.forEach((group, gi) => {
      const hold = steps[group[0]].holdMs;
      const gap = steps[group[group.length - 1]].gapMs;
      const at = elapsed;
      timers.current.push(
        setTimeout(() => {
          setActiveGroup(gi);
          if (sound) click();
        }, at),
      );
      timers.current.push(setTimeout(() => setActiveGroup(-1), at + hold * factor));
      elapsed += (hold + gap) * factor;
    });
    timers.current.push(setTimeout(stop, elapsed + 60));
  };

  if (!steps.length) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-white/60">
          미리 듣기 · 전체 {formatDuration(totalMs)}
        </span>
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
        {groups.map((group, gi) => {
          const hold = steps[group[0]].holdMs;
          const gap = steps[group[group.length - 1]].gapMs;
          const text = group.map((i) => labels[i] ?? i + 1).join('+');
          return (
            <div key={gi} className="flex shrink-0 items-end gap-[3px]">
              <div
                title={`${text} · ${hold}ms`}
                style={{ minWidth: Math.max(14, Math.min(56, hold / 3)) }}
                className={`flex h-9 items-center justify-center rounded px-1 text-[10px] font-bold transition-colors duration-75 ${
                  activeGroup === gi ? 'bg-cyan-400 text-slate-950' : 'bg-white/15 text-white/70'
                }`}
              >
                {text}
              </div>
              {gi < groups.length - 1 && (
                <div
                  style={{ width: Math.max(3, Math.min(56, gap / 3)) }}
                  className="h-9 rounded bg-white/[0.04]"
                />
              )}
            </div>
          );
        })}
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
        소리는 실제 입력이 아니라 리듬 확인용입니다. 함께 눌리는 키는 한 번으로 들립니다.
      </p>
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
