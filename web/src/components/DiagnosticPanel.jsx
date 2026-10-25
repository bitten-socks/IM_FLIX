import { useEffect, useState } from 'react';
import { useFlixStore } from '../store/useFlixStore';

// Hardware bring-up tool, not part of the shipping UI -- reachable only at
// ?debug=1. Polls the firmware's debounced matrix state so a physical press
// can be observed directly, which separates a dead switch/diode path from a
// keycode-mapping problem.

const POLL_INTERVAL_MS = 100;

export default function DiagnosticPanel() {
  const { connected, matrixState, readMatrix, product, enterBootloader, identity } =
    useFlixStore();
  const [polling, setPolling] = useState(false);
  const [everPressed, setEverPressed] = useState({});
  const [armed, setArmed] = useState(false);

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

      {/* The key combo is read once, while the board boots, so it is no help
          to a device already plugged in -- and none at all if a half-written
          flash left one that enumerates but will not take the combo. The
          firmware has always answered CMD_BOOTLOADER; nothing ever sent it.
          Armed in two steps because the device leaves USB as a keyboard and
          comes back as a drive. */}
      <div className="mt-4 border-t border-white/10 pt-4">
        {armed ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setArmed(false);
                enterBootloader();
              }}
              className="flex-1 rounded-lg bg-amber-500 py-2 text-[13px] font-bold text-slate-950 transition hover:bg-amber-400"
            >
              RPI-RP2 드라이브로 재부팅
            </button>
            <button
              onClick={() => setArmed(false)}
              className="rounded-lg px-3 py-2 text-[13px] text-white/50 hover:text-white"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => setArmed(true)}
            disabled={!connected}
            className="w-full rounded-lg border border-amber-500/30 py-2 text-[13px] font-semibold text-amber-300/80 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-30"
          >
            부트로더로 재부팅
          </button>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-white/30">
          기기가 USB에서 사라지고 RPI-RP2 드라이브로 다시 나타납니다. 설정은 지워지지 않습니다.
        </p>
      </div>
    </section>
  );
}
