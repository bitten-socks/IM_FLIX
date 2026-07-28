import { useFlixStore } from '../store/useFlixStore';

function timeAgo(ts) {
  if (!ts) return '-';
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 1) return '방금';
  return `${sec}초 전`;
}

export default function StatusBar() {
  const { connected, lastSync, ping, lastPing } = useFlixStore();
  if (!connected) return null;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#15171c] px-5 py-3 text-xs text-white/40">
      <span>마지막 동기화: {timeAgo(lastSync)}</span>
      <button onClick={ping} className="rounded-lg px-2 py-1 text-white/60 hover:bg-white/5">
        연결 확인 {lastPing ? `(${timeAgo(lastPing)})` : ''}
      </button>
    </div>
  );
}
