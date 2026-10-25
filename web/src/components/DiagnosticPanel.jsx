import { useEffect, useState } from 'react';
import { useFlixStore } from '../store/useFlixStore';
import FirmwareFlasher from './FirmwareFlasher';

// Hardware bring-up tool, not part of the shipping UI -- reachable only at
// ?debug=1. Polls the firmware's debounced matrix state so a physical press
// can be observed directly, which separates a dead switch/diode path from a
// keycode-mapping problem.

const POLL_INTERVAL_MS = 100;

export default function DiagnosticPanel() {
  const {
    connected, matrixState, readMatrix, product, identity,
    selectedKey, keyDetails, loadKeyDetail,
  } = useFlixStore();
  const [polling, setPolling] = useState(false);
  const [everPressed, setEverPressed] = useState({});

  const enabled = new URLSearchParams(window.location.search).has('debug');

  // Derived from the product's direct-pin layout, so a new model needs no
  // change here.
  const slots = product.pins.map((pin, index) => ({
    key: `K${index + 1}`,
    pin,
    row: Math.floor(index / product.matrixColumns),
    bit: index % product.matrixColumns,
  }));

  useEffect(() => {
    if (!polling || !connected) return undefined;
    const id = setInterval(() => readMatrix(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [polling, connected, readMatrix]);

  // Latch every key seen pressed, so a brief tap isn't missed between polls.
  useEffect(() => {
    if (!matrixState) return;
    const seen = slots.filter(({ row, bit }) => (matrixState[row] >> bit) & 1);
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
        {slots.map((slot) => {
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

      {/* What the device actually returned for the selected key, chunk by
          chunk. A macro whose tail goes missing looks the same from outside
          whether the writes were refused or the reads never came -- this is
          the only place the two can be told apart. */}
      {selectedKey !== null && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="mb-1 flex items-baseline justify-between">
            <p className="font-sans text-[11px] font-semibold text-white/60">
              K{selectedKey + 1} 상세 (기기에서 읽은 그대로)
            </p>
            <button
              onClick={() => loadKeyDetail(selectedKey)}
              disabled={!connected}
              className="rounded px-2 py-0.5 text-[11px] text-cyan-300 transition hover:bg-white/5 disabled:opacity-30"
            >
              다시 읽기
            </button>
          </div>
          {(() => {
            const d = keyDetails[selectedKey];
            if (!d) return <p className="font-mono text-[11px] text-white/30">아직 안 읽음</p>;
            const arrived = [0, 1, 2, 3].filter((c) => (d.chunks ?? 0) & (1 << c));
            return (
              <div className="font-mono text-[11px] leading-relaxed text-white/40">
                <p>
                  mode {d.mode} · stepCount <b className="text-cyan-300">{d.stepCount}</b> ·
                  도착한 청크 [{arrived.join(' ') || '없음'}]
                </p>
                <p className="mt-1 break-all">
                  {d.steps.slice(0, Math.max(d.stepCount, 8)).map((st, i) => (
                    <span key={i} className={st.code ? 'text-emerald-300' : 'text-rose-400'}>
                      {i}:{st.code ? st.code.toString(16) : '00'}{' '}
                    </span>
                  ))}
                </p>
              </div>
            );
          })()}
        </div>
      )}

      <div className="mt-3 border-t border-white/10 pt-3 font-mono text-[11px] text-white/40">
        <p className="mb-1 font-sans text-[11px] font-semibold text-white/60">기기가 보고한 값</p>
        {identity ? (
          <p>
            protocol {identity.protocolVersion} · keys {identity.keyCount} · maxSteps{' '}
            <b className="text-cyan-300">{identity.maxMacroSteps}</b> · config{' '}
            {identity.configVersion}
          </p>
        ) : (
          <p>-</p>
        )}
      </div>

      <FirmwareFlasher />

    </section>
  );
}
