import { useFlixStore } from '../store/useFlixStore';

export default function ErrorBanner() {
  const { error, dismissError } = useFlixStore();
  if (!error) return null;

  return (
    <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-6 pt-4">
      <div className="flex flex-1 items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">
        <span>⚠️ {error}</span>
        <button
          onClick={dismissError}
          className="ml-auto rounded-md px-1.5 py-0.5 text-rose-300/70 hover:bg-rose-500/10 hover:text-rose-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
