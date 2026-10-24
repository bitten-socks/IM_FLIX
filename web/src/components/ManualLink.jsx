// The mapping manual, offered from the two places someone looks for it: at
// the foot of the product page, beside the button that starts the mapping,
// and inside the mapping screen itself, where the question actually comes up.
//
// One component because it is one file: the path and the wording would
// otherwise be written twice and only corrected once.

const HREF = '/flix-mapping-manual.pdf';
const LABEL = '맵핑 매뉴얼';

// `download` rather than a new tab: a PDF opens in the browser's own viewer on
// some setups and downloads on others, and the button should not be a
// surprise either way. The filename it lands under is the one on the server.
export default function ManualLink({ tone = 'quiet' }) {
  const base =
    'inline-flex items-center gap-1.5 rounded-xl text-sm font-semibold transition';
  const look =
    tone === 'solid'
      ? 'border border-white/15 px-6 py-3 text-white/70 hover:border-white/30 hover:text-white'
      : 'px-3 py-1.5 text-[13px] text-white/40 hover:bg-white/5 hover:text-white/80';

  return (
    <a href={HREF} download className={`${base} ${look}`}>
      <span aria-hidden="true">↓</span>
      {LABEL}
      <span className="text-[11px] font-normal opacity-60">PDF</span>
    </a>
  );
}
