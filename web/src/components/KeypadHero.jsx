import { useFlixStore } from '../store/useFlixStore';
import { describeKey } from '../lib/keycodes';
import { KEY_MODE } from '../lib/protocol';

// Renders whichever model is connected. Products that have a case drawing get
// clickable hotspots positioned over it; ones that don't yet fall back to a
// plain grid, so a new model is usable the day its firmware works rather than
// waiting on artwork.

function KeyLabel({ entry }) {
  const isMacro = entry?.mode === KEY_MODE.MACRO;
  return (
    <>
      {isMacro && (
        <span className="rounded bg-amber-500/90 px-1 py-0.5 text-[9px] font-bold text-slate-950">
          MACRO
        </span>
      )}
      <span className="rounded bg-slate-900/80 px-2 py-0.5 text-[11px] font-semibold text-white">
        {describeKey(entry ?? {})}
      </span>
    </>
  );
}

export default function KeypadHero() {
  const { keymap, selectedKey, setSelectedKey, connected, product } = useFlixStore();

  const keyIndexes = Array.from({ length: product.keyCount }, (_, i) => i);

  const selectionClasses = (index) =>
    selectedKey === index
      ? 'bg-cyan-400/20 ring-4 ring-cyan-400'
      : 'ring-2 ring-transparent hover:bg-cyan-400/10 hover:ring-cyan-400/50';

  if (product.artwork && product.hotspots) {
    return (
      <div className="flex justify-center py-2">
        <div className="relative w-full max-w-lg">
          <img
            src={product.artwork}
            alt={`${product.name} 외곽 도면`}
            className="block w-full select-none"
            draggable="false"
          />
          {keyIndexes.map((index) => {
            const spot = product.hotspots[index];
            if (!spot) return null;
            return (
              <button
                key={index}
                disabled={!connected}
                onClick={() => setSelectedKey(index)}
                style={{
                  left: `${spot.left}%`,
                  top: `${spot.top}%`,
                  width: `${spot.width}%`,
                  height: `${spot.height}%`,
                }}
                className={`absolute flex flex-col items-center justify-center gap-1 rounded-md transition disabled:cursor-not-allowed disabled:opacity-40 ${selectionClasses(index)}`}
              >
                <span className="rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
                  K{index + 1}
                </span>
                <KeyLabel entry={keymap[index]} />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-2">
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${product.columns}, minmax(0, 1fr))` }}
      >
        {keyIndexes.map((index) => (
          <button
            key={index}
            disabled={!connected}
            onClick={() => setSelectedKey(index)}
            className={`flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 transition disabled:cursor-not-allowed disabled:opacity-40 ${selectionClasses(index)}`}
          >
            <span className="text-[10px] font-medium text-white/40">K{index + 1}</span>
            <KeyLabel entry={keymap[index]} />
          </button>
        ))}
      </div>
    </div>
  );
}
