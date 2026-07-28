import { useEffect, useState } from 'react';
import { useFlixStore } from '../store/useFlixStore';

// Hardware bring-up tool, not part of the shipping UI -- reachable only at
// ?debug=1. Polls the firmware's debounced matrix state so a physical press
// can be observed directly, which separates a dead switch/diode path from a
// keycode-mapping problem.

// Mirrors matrix_pins.direct in QMK/flix_vibe6/keyboard.json.
const PIN_LAYOUT = [
  { key: 'K1', pin: 'GP0', row: 0, bit: 0 },
  { key: 'K2', pin: 'GP1', row: 0, bit: 1 },
  { key: 'K3', pin: 'GP2', row: 0, bit: 2 },
  { key: 'K4', pin: 'GP3', row: 1, bit: 0 },
  { key: 'K5', pin: 'GP4', row: 1, bit: 1 },
  { key: 'K6', pin: 'GP5', row: 1, bit: 2 },
];

const POLL_INTERVAL_MS = 100;

export default function DiagnosticPanel() {
  const { connected, matrixState, readMatrix } = useFlixStore();
  const [polling, setPolling] = useState(false);
  const [everPressed, setEverPressed] = useState({});

  const enabled = new URLSearchParams(window.location.search).has('debug');

  useEffect(() => {
    if (!polling || !connected) return undefined;
    const id = setInterval(() => readMatrix(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [polling, connected, readMatrix]);

  // Latch every key seen pressed, so a brief tap isn't missed between polls.
  useEffect(() => {
    if (!matrixState) return;
    const seen = PIN_LAYOUT.filter(({ row, bit }) => (matrixState[row] >> bit) & 1);
    if (!seen.length) return;
    setEverPressed((prev) => {
      const next = { ...prev };
      seen.forEach(({ key }) => {
        next[key] = true;
      });
      return next;
    });
  }, [matrixState]);

  if (!enabled) return null;

  const isDown = ({ row, bit }) => Boolean(matrixState && ((matrixState[row] >> bit) & 1));

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-amber-300">🔧 하드웨어 진단</h2>
        <button
          onClick={() => setPolling((p) => !p)}
          disabled={!connected}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
            polling ? 'bg-amber-500 text-slate-950' : 'border border-white/15 text-white/70'
          }`}
        >
          {polling ? '측정 중지' : '측정 시작'}
        </button>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-white/50">
        측정을 시작한 뒤 실제 키를 눌러보세요. 눌린 키의 표시등이 켜지면 스위치·배선이
        정상입니다. 아무 반응이 없으면 그 키의 전기적 경로(스위치 또는 다이오드)에
        문제가 있습니다.
      </p>

      <div className="grid grid-cols-3 gap-2">
        {PIN_LAYOUT.map((slot) => {
          const down = isDown(slot);
          return (
            <div
              key={slot.key}
              className={`flex flex-col items-center gap-1 rounded-xl border py-3 transition ${
                down
                  ? 'border-emerald-400 bg-emerald-500/20'
                  : everPressed[slot.key]
                    ? 'border-emerald-500/30 bg-transparent'
                    : 'border-white/10 bg-transparent'
              }`}
            >
              <span className="text-xs font-semibold text-white/90">{slot.key}</span>
              <span className="text-[10px] text-white/40">{slot.pin}</span>
              <span
                className={`mt-0.5 h-2.5 w-2.5 rounded-full ${
                  down ? 'bg-emerald-400' : 'bg-white/15'
                }`}
              />
              {everPressed[slot.key] && !down && (
                <span className="text-[9px] text-emerald-400/70">감지됨</span>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-white/30">
        raw: {matrixState ? matrixState.map((b) => `0x${b.toString(16).padStart(2, '0')}`).join(' ') : '-'}
      </p>
    </section>
  );
}
