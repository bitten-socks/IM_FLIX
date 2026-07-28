import { useFlixStore } from '../store/useFlixStore';

export default function BrowserGuard() {
  const supported = useFlixStore((s) => s.supported);
  if (supported) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-w-md rounded-2xl border border-amber-500/30 bg-slate-900 p-6 text-slate-100 shadow-xl">
        <h2 className="mb-2 text-lg font-bold text-amber-400">지원하지 않는 브라우저입니다</h2>
        <p className="text-sm leading-relaxed text-slate-300">
          flix map은 <b>WebHID API</b>가 필요합니다. Safari, Firefox 등에서는 동작하지
          않습니다. <b>Chrome, Edge, Whale</b> 브라우저로 접속해 주세요.
        </p>
      </div>
    </div>
  );
}
