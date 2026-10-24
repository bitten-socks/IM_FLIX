import { useFlixStore } from '../store/useFlixStore';
import { describeKey, macroGroups, stepsToText } from '../lib/keycodes';
import { describeSwipe } from '../lib/remote';
import { KEY_MODE } from '../lib/protocol';

// Renders whichever model is connected. Products that have a case drawing get
// clickable hotspots positioned over it; ones that don't yet fall back to a
// plain grid, so a new model is usable the day its firmware works rather than
// waiting on artwork.

// The case renders are near-black, so anything drawn over a keycap has to
// bring its own contrast. A dark chip with white text -- fine on the page
// background -- disappears against the product itself.
function KeyLabel({ entry, detail }) {
  // Just the badge for a macro. A key opening is about 86px square, so a
  // sequence written across it wrapped into a block of tiny text that fought
  // the case render behind it; the sequences are listed under the keypad
  // instead, where there is a line's width to say them in.
  if (entry?.mode === KEY_MODE.MACRO) {
    // ...except a gesture, which is a macro only in how the firmware plays
    // it. It was chosen as one button and reads as one here.
    const swipe = detail?.steps ? describeSwipe(detail.steps, detail.stepCount) : null;
    if (swipe) {
      return (
        <span className="max-w-full break-keep rounded bg-violet-400 px-1 py-0.5 text-center text-[9px] font-bold leading-tight text-slate-950">
          {swipe}
        </span>
      );
    }
    return (
      <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
        MACRO
      </span>
    );
  }
  return (
    <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-900 shadow">
      {describeKey(entry ?? {})}
    </span>
  );
}

// What each macro key actually does, under the keypad where a line of text
// fits. Rows select their key, so the list works the way the keycaps do.
function MacroList({ keymap, keyDetails, product, selectedKey, onSelect, connected }) {
  const rows = [];
  for (let i = 0; i < product.keyCount; i++) {
    if (keymap[i]?.mode !== KEY_MODE.MACRO) continue;
    const detail = keyDetails[i];
    // Gestures are not sequences anyone needs reading back to them.
    if (detail?.steps && describeSwipe(detail.steps, detail.stepCount)) continue;
    const text = detail?.steps
      ? stepsToText(detail.steps, detail.stepCount) ??
        macroGroups(detail.steps, detail.stepCount).join(' → ')
      : '읽는 중…';
    rows.push({ index: i, text });
  }
  if (!rows.length) return null;

  return (
    <div className="mt-5 flex flex-col gap-1 border-t border-slate-900/10 pt-4">
      {rows.map(({ index, text }) => (
        <button
          key={index}
          disabled={!connected}
          onClick={() => onSelect(index)}
          className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition disabled:cursor-not-allowed ${
            selectedKey === index ? 'bg-cyan-400/25' : 'hover:bg-slate-900/[0.06]'
          }`}
        >
          <span className="w-6 shrink-0 text-[11px] font-bold text-slate-500">K{index + 1}</span>
          <span className="shrink-0 rounded bg-amber-400 px-1 py-0.5 text-[9px] font-bold text-slate-950">
            MACRO
          </span>
          <span className="min-w-0 break-all text-[13px] font-semibold text-slate-900">{text}</span>
        </button>
      ))}
    </div>
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

  const keypad =
    product.artwork && product.hotspots ? (
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
    ) : (
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

  return (
    <>
      {keypad}
      <MacroList
        keymap={keymap}
        keyDetails={keyDetails}
        product={product}
        selectedKey={selectedKey}
        onSelect={setSelectedKey}
        connected={connected}
      />
    </>
  );
}
