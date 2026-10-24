import { useFlixStore } from '../store/useFlixStore';
import { describeKey, macroGroups, stepsToText } from '../lib/keycodes';
import { KEY_MODE } from '../lib/protocol';

// Renders whichever model is connected. Products that have a case drawing get
// clickable hotspots positioned over it; ones that don't yet fall back to a
// plain grid, so a new model is usable the day its firmware works rather than
// waiting on artwork.

// The case renders are near-black, so anything drawn over a keycap has to
// bring its own contrast. A dark chip with white text -- fine on the page
// background -- disappears against the product itself.
function KeyLabel({ entry, detail }) {
  const isMacro = entry?.mode === KEY_MODE.MACRO;
  // The detail arrives a moment after the dump, so until it does the keycap
  // falls back to the first step rather than going blank.
  const steps = isMacro && detail?.steps ? detail : null;
  // A sequence that spells something is shown as the word. Sixteen letters as
  // sixteen chips with arrows between them is the same thing said at six times
  // the size, and it reads worse: "block" is the macro, B→L→O→C→K is a
  // description of it.
  const word = steps ? stepsToText(steps.steps, steps.stepCount) : null;
  const groups = steps && !word ? macroGroups(steps.steps, steps.stepCount) : null;

  return (
    <>
      {isMacro && (
        <span className="rounded bg-amber-400 px-1 py-0.5 text-[9px] font-bold text-slate-950">
          MACRO
        </span>
      )}
      {word ? (
        <span className="max-w-full break-all rounded bg-white px-1 py-px text-center text-[10px] font-bold leading-tight text-slate-900 shadow">
          {word}
        </span>
      ) : groups?.length ? (
        <span
          title={groups.join(' → ')}
          className="flex max-w-full flex-wrap items-center justify-center gap-x-px gap-y-0.5"
        >
          {groups.map((group, i) => (
            <span key={i} className="flex items-center">
              {i > 0 && <span className="px-px text-[8px] font-bold text-white/80">→</span>}
              <span
                className={`rounded bg-white px-1 py-px font-bold leading-tight text-slate-900 shadow ${
                  groups.length > 6 ? 'text-[8px]' : 'text-[9px]'
                }`}
              >
                {group}
              </span>
            </span>
          ))}
        </span>
      ) : (
        <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-900 shadow">
          {describeKey(entry ?? {})}
        </span>
      )}
    </>
  );
}

export default function KeypadHero() {
  const { keymap, keyDetails, selectedKey, setSelectedKey, connected, product } = useFlixStore();

  const keyIndexes = Array.from({ length: product.keyCount }, (_, i) => i);

  // An unselected key needs a visible outline of its own: on a black case a
  // transparent ring left nothing to aim at.
  const selectionClasses = (index) =>
    selectedKey === index
      ? 'bg-cyan-400/25 ring-[3px] ring-cyan-300'
      : 'ring-1 ring-white/30 hover:bg-cyan-400/15 hover:ring-cyan-300/80';

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
                <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  K{index + 1}
                </span>
                <KeyLabel entry={keymap[index]} detail={keyDetails[index]} />
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
            className={`flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl bg-slate-800 transition disabled:cursor-not-allowed disabled:opacity-40 ${selectionClasses(index)}`}
          >
            <span className="text-[10px] font-medium text-white/50">K{index + 1}</span>
            <KeyLabel entry={keymap[index]} detail={keyDetails[index]} />
          </button>
        ))}
      </div>
    </div>
  );
}
