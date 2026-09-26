import { useEffect, useRef, useState } from 'react';
import { SUPPORTED_PRODUCT_IDS, productForId } from '../lib/products';

// The line inside one wide panel, turning as it scrolls.
//
// One surface holding all three rather than three separate cards: the panel
// is the display case, and the products move within it. The turn is driven by
// scroll position rather than by a selected index, so it tracks a finger or a
// trackpad continuously instead of snapping between fixed poses -- that
// continuity is what makes it read as one rotating surface.
//
// Transforms are written straight to the nodes; only the caption is React
// state, and it changes a few times per drag rather than every frame. A
// scroll handler that re-renders on every frame is the usual reason a
// carousel like this stutters.

const CARD_W = 300; // px; the padding maths below depends on it
const MAX_TURN = 34; // degrees at the edge of the run
const MAX_SHRINK = 0.16;
const MAX_FADE = 0.6;

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export default function ProductCarousel() {
  const trackRef = useRef(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);

  const products = SUPPORTED_PRODUCT_IDS.map(productForId).filter((p) => p?.artwork);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const cards = [...track.children].filter((c) => c.dataset.card);
    const flat = prefersReducedMotion();
    let frame = 0;

    const paint = () => {
      frame = 0;
      const middle = track.scrollLeft + track.clientWidth / 2;
      let nearest = 0;
      let nearestGap = Infinity;

      cards.forEach((card, i) => {
        const away = card.offsetLeft + card.offsetWidth / 2 - middle;
        if (Math.abs(away) < nearestGap) {
          nearestGap = Math.abs(away);
          nearest = i;
        }
        // Normalised against a little over half the case so a product is
        // fully turned by the time it reaches the edge.
        const t = Math.max(-1, Math.min(1, away / (track.clientWidth * 0.55)));
        const face = card.firstElementChild;
        face.style.transform = flat
          ? 'none'
          : `rotateY(${-t * MAX_TURN}deg) scale(${1 - Math.abs(t) * MAX_SHRINK})`;
        face.style.opacity = String(1 - Math.abs(t) * MAX_FADE);
      });

      if (nearest !== activeRef.current) {
        activeRef.current = nearest;
        setActive(nearest);
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    // Open on the middle of the line so the turn is visible immediately
    // rather than only after the first scroll.
    const middleCard = cards[Math.floor(cards.length / 2)];
    if (middleCard) {
      track.scrollLeft =
        middleCard.offsetLeft + middleCard.offsetWidth / 2 - track.clientWidth / 2;
    }
    paint();

    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const scrollToCard = (index) => {
    const track = trackRef.current;
    const card = track?.children[index];
    if (!track || !card) return;
    track.scrollTo({
      left: card.offsetLeft + card.offsetWidth / 2 - track.clientWidth / 2,
      behavior: 'smooth',
    });
  };

  const shown = products[active];

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl bg-panel">
        <div
          ref={trackRef}
          style={{ perspective: '1400px' }}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1rem,calc(50%-150px))] py-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((p) => (
            <div
              key={p.id}
              data-card="1"
              style={{ width: CARD_W }}
              className="flex shrink-0 snap-center items-center"
            >
              {/* The face is what turns; the slot around it keeps its place in
                  the scroll run so the maths above stays simple. */}
              <img
                src={p.artwork}
                alt={`${p.name} 외형`}
                style={{ willChange: 'transform' }}
                className="block w-full select-none"
                draggable="false"
              />
            </div>
          ))}
        </div>

        <Arrow side="left" onClick={() => scrollToCard(Math.max(0, active - 1))} />
        <Arrow
          side="right"
          onClick={() => scrollToCard(Math.min(products.length - 1, active + 1))}
        />
      </div>

      {/* One caption for the case, naming whatever is centred in it. */}
      <div className="mt-5 text-center">
        <h3 className="text-sm font-bold text-white">{shown?.name}</h3>
        <p className="mt-0.5 text-[11px] text-white/35">
          키 {shown?.keyCount}개 · {shown?.columns} × {shown?.keyCount / shown?.columns}
        </p>

        <div className="mt-4 flex items-center justify-center gap-2">
          {products.map((p, i) => (
            <button
              key={p.id}
              onClick={() => scrollToCard(i)}
              aria-label={p.name}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? 'w-6 bg-cyan-400' : 'w-1.5 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Arrow({ side, onClick }) {
  const left = side === 'left';
  return (
    <button
      onClick={onClick}
      aria-label={left ? '이전 제품' : '다음 제품'}
      className={`absolute top-1/2 hidden -translate-y-1/2 rounded-full bg-slate-900/10 p-2 text-slate-900/40 backdrop-blur transition hover:bg-slate-900/20 hover:text-slate-900/70 sm:block ${
        left ? 'left-3' : 'right-3'
      }`}
    >
      <span className="block h-5 w-5 leading-5">{left ? '‹' : '›'}</span>
    </button>
  );
}
