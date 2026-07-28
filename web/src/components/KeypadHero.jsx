import { useFlixStore } from '../store/useFlixStore';
import { describeKey } from '../lib/keycodes';

// Pixel-measured from the real case artwork (IAM_doggagi/Assembly.png,
// cropped to public/assembly.png at 820x390). Percentages locate each of the
// 6 key openings within that cropped image -- keep in sync if the artwork
// is re-exported at different bounds.
const HOTSPOTS = [
  { index: 0, left: 36.46, top: 12.05, width: 18.17, height: 36.15 },
  { index: 1, left: 55.73, top: 12.05, width: 18.17, height: 36.15 },
  { index: 2, left: 75.0, top: 12.05, width: 18.17, height: 36.15 },
  { index: 3, left: 36.46, top: 52.31, width: 18.17, height: 35.38 },
  { index: 4, left: 55.73, top: 52.31, width: 18.17, height: 35.38 },
  { index: 5, left: 75.0, top: 52.31, width: 18.17, height: 35.38 },
];

export default function KeypadHero() {
  const { keymap, selectedKey, setSelectedKey, connected } = useFlixStore();

  return (
    <div className="flex justify-center py-2">
      <div className="relative w-full max-w-lg">
        <img
          src="/assembly.png"
          alt="FLIX VIBE 6 외곽 도면"
          className="block w-full select-none"
          draggable="false"
        />
        {HOTSPOTS.map(({ index, left, top, width, height }) => (
          <button
            key={index}
            disabled={!connected}
            onClick={() => setSelectedKey(index)}
            style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
            className={`absolute flex flex-col items-center justify-center gap-1 rounded-md transition disabled:cursor-not-allowed disabled:opacity-40 ${
              selectedKey === index
                ? 'bg-cyan-400/20 ring-4 ring-cyan-400'
                : 'ring-2 ring-transparent hover:bg-cyan-400/10 hover:ring-cyan-400/50'
            }`}
          >
            <span className="rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
              K{index + 1}
            </span>
            <span className="rounded bg-slate-900/80 px-2 py-0.5 text-[11px] font-semibold text-white">
              {describeKey(keymap[index] ?? {})}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
