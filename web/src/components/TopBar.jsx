import { useEffect } from 'react';
import { useFlixStore } from '../store/useFlixStore';

export default function TopBar() {
  const { connected, connecting, isMock, connect, disconnect, tryReconnect, supported } =
    useFlixStore();

  useEffect(() => {
    if (supported) tryReconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  return (
    <header className="flex items-center justify-between border-b border-white/5 px-6 py-4">
      <div className="group flex cursor-pointer items-center gap-2">
        <span className="font-logo text-2xl font-bold text-white">
          <span className="tracking-[0.25em]">
            FLI
            <span className="inline-block tracking-normal transition-transform duration-300 ease-out group-hover:rotate-45">
              X
            </span>
          </span>{' '}
          <span className="tracking-wide text-cyan-400">MAP</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs text-white/50">
          <span
            className={`h-2 w-2 rounded-full ${
              isMock ? 'bg-amber-400' : connected ? 'bg-emerald-400' : 'bg-white/20'
            }`}
          />
          {isMock ? '🧪 목업 모드' : connected ? '연결됨' : '연결 안 됨'}
        </span>
        <button
          onClick={connected ? disconnect : connect}
          disabled={!supported || connecting}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
            connected
              ? 'border border-white/10 text-white/70 hover:bg-white/5'
              : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
          }`}
        >
          {connecting ? '연결 중...' : connected ? '연결 해제' : '연결하기'}
        </button>
      </div>
    </header>
  );
}
