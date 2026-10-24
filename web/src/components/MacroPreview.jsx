import { useEffect, useRef, useState } from 'react';
import { macroTimeline } from '../lib/protocol';

// Plays a macro back and draws it, so its timing can actually be judged.
//
// The numbers alone are not much use: nobody knows what 20ms feels like, and
// the point of these sequences is a rhythm a game reads correctly. So it
// plays with a click per press -- at these speeds the ear resolves rhythm far
// better than the eye -- and offers a quarter-speed pass for when the shape
// matters more than the tempo.
//
// The drawing gives each key its own lane, which is the only way the three
// settings look different from one another: chorded keys line up, a sustained
// key runs past its group to the lift, and a release-phase key sits after it.
// A single row of blocks -- what this was -- shows order and nothing else, so
// "together" and "one after another" drew identically.

const SLOW_FACTOR = 4;
// Past this many distinct keys lanes stop being readable, and the sequence is
// better shown as one row of events -- a 16-letter word being the case that
// gets there. Rhythm still reads; which key is which stops mattering.
const MAX_LANES = 8;
const LANE_H = 30;

export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}초`;
}

function useClicker() {
  const ctxRef = useRef(null);
  useEffect(() => () => ctxRef.current?.close?.(), []);

  return (pitch = 1400) => {
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
      osc.frequency.value = pitch;
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
  const [slow, setSlow] = useState(false);
  const [sound, setSound] = useState(true);
  // Milliseconds into the sequence, or -1 when idle. One clock drives both
  // the bars and the playhead, so they cannot drift apart.
  const [now, setNow] = useState(-1);
  const frame = useRef(0);
  const fired = useRef(new Set());
  const click = useClicker();

  const { spans, groups, liftAt, total, hasSustain, hasRelease } = macroTimeline(
    steps,
    steps.length,
  );

  const stop = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    fired.current.clear();
    setNow(-1);
  };
  useEffect(() => stop, []);
  // A step edited mid-playback would leave the playhead describing a sequence
  // that no longer exists.
  useEffect(() => stop, [steps]);

  const playing = now >= 0;

  const play = () => {
    if (playing) {
      stop();
      return;
    }
    if (!total) return;

    fired.current.clear();
    const factor = slow ? SLOW_FACTOR : 1;
    const t0 = performance.now();

    const tick = () => {
      const at = (performance.now() - t0) / factor;
      if (at >= total + 120) {
        stop();
        return;
      }
      setNow(at);

      groups.forEach((group, gi) => {
        const span = spans[group[0]];
        if (!span || fired.current.has(gi) || at < span.start) return;
        fired.current.add(gi);
        // The release phase gets a lower click, so a sequence that waits for
        // the finger is audibly in two parts rather than one long run.
        if (sound) click(span.phase === 'release' ? 900 : 1400);
      });

      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  if (!steps.length || !total) return null;

  // One lane per distinct key, in the order they first appear -- a key tapped
  // twice keeps one lane, which is what makes a double tap look like one.
  const laneKeys = [];
  labels.forEach((label) => {
    if (!laneKeys.includes(label)) laneKeys.push(label);
  });
  const lanes = laneKeys.length <= MAX_LANES ? laneKeys : null;

  // Without a release phase the lift lands on the last millisecond, leaving
  // its mark pinned to the right edge and its label on top of the bar it is
  // marking. A little slack past the end gives both somewhere to sit.
  const spanTotal = liftAt >= total ? total * 1.1 : total;
  const pct = (ms) => `${(ms / spanTotal) * 100}%`;
  const rows = lanes ? lanes.length : 1;

  // Bars to draw: one per step when laned, one per group otherwise.
  const bars = lanes
    ? spans
        .map((span, i) => span && { span, row: lanes.indexOf(labels[i]), text: labels[i] })
        .filter(Boolean)
    : groups
        .map((group) => {
          const span = spans[group[0]];
          return span && { span, row: 0, text: group.map((i) => labels[i] ?? i + 1).join('+') };
        })
        .filter(Boolean);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-white/60">
          미리듣기 · 전체 {formatDuration(total)}
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

      <div className="overflow-hidden rounded-lg bg-black/25 p-2">
        <div className="flex gap-1.5">
          {/* Lane names beside their own row. Listed underneath instead, they
              never said which row was which, which is the whole point here. */}
          <div className="shrink-0" style={{ width: 30 }}>
            {(lanes ?? ['순서']).map((label, r) => (
              <div
                key={r}
                title={label}
                className="flex items-center justify-end overflow-hidden pr-0.5 text-[10px] font-bold text-white/45"
                style={{ height: LANE_H }}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="relative flex-1" style={{ height: rows * LANE_H }}>
          {/* One baseline per lane, so an empty stretch still reads as time. */}
          {Array.from({ length: rows }, (_, r) => (
            <div
              key={`base-${r}`}
              className="absolute left-0 right-0 h-px bg-white/10"
              style={{ top: r * LANE_H + LANE_H / 2 }}
            />
          ))}

          {(hasSustain || hasRelease) && (
            <div
              className="absolute top-0 border-l border-dashed border-white/45"
              style={{ left: pct(liftAt), height: rows * LANE_H }}
            >
              <span className="absolute -top-0.5 left-1 whitespace-nowrap text-[9px] font-bold text-white/50">
                손 뗌
              </span>
            </div>
          )}

          {bars.map(({ span, row, text }, i) => {
            const live = playing && now >= span.start && now < span.end;
            const tone =
              span.phase === 'release'
                ? 'bg-violet-400/80 text-violet-50'
                : span.sustain
                  ? 'bg-amber-400/85 text-amber-950'
                  : 'bg-cyan-400/80 text-cyan-950';
            return (
              <div
                key={i}
                title={`${text} · ${span.end - span.start}ms`}
                className={`absolute flex items-center justify-center overflow-hidden rounded text-[10px] font-bold transition-[filter,opacity] duration-75 ${tone} ${
                  live ? 'brightness-125' : 'opacity-75'
                }`}
                style={{
                  left: pct(span.start),
                  width: `max(9px, ${(Math.max(1, span.end - span.start) / spanTotal) * 100}%)`,
                  top: row * LANE_H + 5,
                  height: LANE_H - 10,
                }}
              >
                {lanes ? '' : text}
              </div>
            );
          })}

          {playing && (
            <div
              className="absolute top-0 w-px bg-white/80"
              style={{ left: pct(Math.min(now, total)), height: rows * LANE_H }}
            />
          )}
          </div>
        </div>
      </div>

      <button
        onClick={play}
        className={`rounded-xl py-2.5 text-[13px] font-bold transition ${
          playing ? 'bg-white/10 text-white/70' : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
        }`}
      >
        {playing ? '■ 정지' : '▶ 이 속도로 들어보기'}
      </button>

      <p className="text-[10px] leading-relaxed text-white/25">
        소리는 실제 입력이 아니라 리듬 확인용입니다. 같이 눌리는 키는 한 번으로 들립니다.
        {hasSustain && ' 노란 막대는 손을 뗄 때까지 눌려 있습니다.'}
        {hasRelease && ' 보라 막대는 손을 뗀 뒤에 실행됩니다.'}
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
