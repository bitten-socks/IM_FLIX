import { useEffect, useRef, useState } from 'react';
import { SUPPORTED_PRODUCT_IDS, productForId } from '../lib/products';

// The line inside one wide panel, turning as it scrolls, and looping.
//
// The turn is real: three renders per product -- facing the camera and
// rotated either way -- cross-faded by scroll position, so a product swings
// round to face you as it reaches the middle. No CSS rotation on top of that;
// the renders carry their own perspective, and tilting them again reads as a
// photograph leaning over rather than an object turning.
//
// The loop is three copies of the line with the view parked in the middle
// one. Reaching either neighbour copy, the scroll jumps back by exactly one
// line's width once it settles -- the same product, the same offset, so
// nothing moves on screen. That is what keeps a product on both sides of the
// last one instead of an empty gap.
//
// All renders were keyed and cropped from one shared rectangle, so a product
// sits in the same place in every file: switching angle never shifts it, and
// VIBE 4 stays visibly smaller than VIBE 9 because it is.

const CARD_W = 300;
const MAX_SHRINK = 0.14;
const COPIES = 3; // the middle one is the one being looked at
const SETTLE_MS = 160;

const ANGLES = ['front', 'left', 'right'];

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export default function ProductCarousel() {
  const trackRef = useRef(null);
  const activeRef = useRef(0);
  const nearestRef = useRef(() => 0);
  const [active, setActive] = useState(0);

  const products = SUPPORTED_PRODUCT_IDS.map(productForId).filter(Boolean);
  const total = products.length;
  const loop = Array.from({ length: COPIES * total }, (_, i) => products[i % total]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const cards = [...track.children].filter((c) => c.dataset.card);
    if (!cards.length) return undefined;
    const flat = prefersReducedMotion();
    let frame = 0;
    let settle = 0;

    const centreOf = (card) => card.offsetLeft + card.offsetWidth / 2 - track.clientWidth / 2;

    // Read from the scroll position rather than from whatever the last paint
    // recorded: paint runs on an animation frame, and a frame that has not
    // arrived yet would leave the rewind working off a stale index -- which
    // is how the view slides off the end of the strip.
    const nearestIndex = () => {
      const middle = track.scrollLeft + track.clientWidth / 2;
      let best = Infinity;
      let at = 0;
      cards.forEach((card, i) => {
        const d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - middle);
        if (d < best) { best = d; at = i; }
      });
      return at;
    };
    nearestRef.current = nearestIndex;
    const pitch = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth;
    const lineWidth = pitch * total;

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
        // Measured against the gap between cards, not the viewport: a card
        // one place out has to land on a single clean pose, or every resting
        // card shows two angles at once and reads as a double exposure.
        const turn = Math.min(1, Math.abs(away) / pitch);

        const [front, left, right] = card.querySelectorAll('img');
        if (flat) {
          front.style.opacity = '1';
          left.style.opacity = '0';
          right.style.opacity = '0';
        } else {
          front.style.opacity = String(1 - turn);
          // Sitting left of the middle, a product should look back toward it.
          left.style.opacity = String(away < 0 ? turn : 0);
          right.style.opacity = String(away > 0 ? turn : 0);
        }
        card.style.transform = flat ? 'none' : `scale(${1 - turn * MAX_SHRINK})`;
      });

      if (nearest !== activeRef.current) {
        activeRef.current = nearest;
        setActive(nearest % total);
      }
    };

    // Only once the scroll has stopped: shifting mid-flick fights the
    // browser's own momentum and snapping.
    const rewind = () => {
      const i = nearestIndex();
      if (i < total) track.scrollLeft += lineWidth;
      else if (i >= total * 2) track.scrollLeft -= lineWidth;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
      clearTimeout(settle);
      settle = setTimeout(rewind, SETTLE_MS);
    };

    // Open on the middle copy, on the middle product of it.
    track.scrollLeft = centreOf(cards[total + Math.floor(total / 2)]);
    paint();

    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(settle);
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [total]);

  // Steps relative to where the view already is, so a nudge works the same
  // whichever copy happens to be on screen.
  const step = (delta) => {
    const track = trackRef.current;
    const cards = [...(track?.children ?? [])].filter((c) => c.dataset.card);
    const target = cards[nearestRef.current() + delta];
    if (!track || !target) return;
    track.scrollTo({
      left: target.offsetLeft + target.offsetWidth / 2 - track.clientWidth / 2,
      behavior: 'smooth',
    });
  };

  const jumpTo = (productIndex) => {
    const here = nearestRef.current();
    const delta = ((productIndex - (here % total) + total + 1) % total) - 1;
    step(delta);
  };

  const shown = products[active];

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl bg-panel">
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1rem,calc(50%-150px))] py-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {loop.map((p, i) => (
            <div
              key={`${p.id}-${i}`}
              data-card="1"
              style={{ width: CARD_W, willChange: 'transform' }}
              className="relative shrink-0 snap-center"
            >
              {/* Stacked rather than swapped so one angle dissolves into the
                  next; the first holds the box open, the rest lie over it. */}
              {ANGLES.map((angle, a) => (
                <img
                  key={angle}
                  src={`/${p.id}-${angle}.png`}
                  alt={a === 0 && i < total ? `${p.name} 외형` : ''}
                  aria-hidden={a > 0 || i >= total}
                  draggable="false"
                  className={`block w-full select-none ${a === 0 ? '' : 'absolute inset-0'}`}
                />
              ))}
            </div>
          ))}
        </div>

        <Arrow side="left" onClick={() => step(-1)} />
        <Arrow side="right" onClick={() => step(1)} />
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
              onClick={() => jumpTo(i)}
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
