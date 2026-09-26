import { useEffect, useRef } from 'react';
import { SUPPORTED_PRODUCT_IDS, productForId } from '../lib/products';

// The line, scrolled sideways with the cards turning as they pass.
//
// The turn is driven by scroll position rather than by an index: each card
// reads how far its centre sits from the container's, and leans by that much.
// That way it tracks a finger or a trackpad continuously instead of snapping
// between fixed poses, which is what makes it feel like one rotating surface.
//
// Styles are written straight to the nodes rather than through state -- a
// scroll handler that re-renders React on every frame is the usual reason a
// carousel like this stutters.

const CARD_W = 300; // px; the padding maths below depends on it
const MAX_TURN = 34; // degrees at the edge of the run
const MAX_SHRINK = 0.16;
const MAX_FADE = 0.55;

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export default function ProductCarousel() {
  const trackRef = useRef(null);

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
      for (const card of cards) {
        const away = card.offsetLeft + card.offsetWidth / 2 - middle;
        // Normalised against a little over half the viewport so a card is
        // fully turned by the time it reaches the edge.
        const t = Math.max(-1, Math.min(1, away / (track.clientWidth * 0.55)));
        const face = card.firstElementChild;
        face.style.transform = flat
          ? 'none'
          : `rotateY(${-t * MAX_TURN}deg) scale(${1 - Math.abs(t) * MAX_SHRINK})`;
        face.style.opacity = String(1 - Math.abs(t) * MAX_FADE);
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

  const nudge = (direction) => {
    const track = trackRef.current;
    if (track) track.scrollBy({ left: direction * CARD_W, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={trackRef}
        style={{ perspective: '1400px' }}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-[max(1.5rem,calc(50%-150px))] py-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((p) => (
          <article
            key={p.id}
            data-card="1"
            style={{ width: CARD_W }}
            className="shrink-0 snap-center"
          >
            {/* The face is what turns; the slot around it keeps its place in
                the scroll run so the maths above stays simple. */}
            <div
              style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
              className="transition-[opacity] duration-150"
            >
              <div className="rounded-2xl bg-panel p-6">
                <img
                  src={p.artwork}
                  alt={`${p.name} 외형`}
                  className="mx-auto block w-full select-none"
                  draggable="false"
                />
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-sm font-bold text-white">{p.name}</h3>
                <p className="mt-0.5 text-[11px] text-white/35">
                  키 {p.keyCount}개 · {p.columns} × {p.keyCount / p.columns}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <Arrow side="left" onClick={() => nudge(-1)} />
      <Arrow side="right" onClick={() => nudge(1)} />
    </div>
  );
}

function Arrow({ side, onClick }) {
  const left = side === 'left';
  return (
    <button
      onClick={onClick}
      aria-label={left ? '이전 제품' : '다음 제품'}
      className={`absolute top-1/2 hidden -translate-y-1/2 rounded-full border border-white/10 bg-ground/70 p-2 text-white/50 backdrop-blur transition hover:border-white/30 hover:text-white sm:block ${
        left ? 'left-2' : 'right-2'
      }`}
    >
      <span className="block h-5 w-5 leading-5">{left ? '‹' : '›'}</span>
    </button>
  );
}
