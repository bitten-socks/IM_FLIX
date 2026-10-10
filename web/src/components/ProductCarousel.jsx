import { useEffect, useRef, useState } from 'react';
import { SUPPORTED_PRODUCT_IDS, productForId } from '../lib/products';

// The line inside one wide panel, turning as it scrolls.
//
// The turn is real now: three renders per product -- facing the camera and
// rotated either way -- cross-faded by scroll position, so a product appears
// to swing round to face you as it reaches the middle. That replaces the CSS
// rotateY this used to fake, and the two must not both be applied: the
// renders already carry their own perspective, and tilting them again reads
// as a photograph leaning over rather than an object turning.
//
// All nine were cropped from one shared rectangle, so a product sits in the
// same place in every file. Switching angle therefore never shifts it, and
// VIBE 4 stays visibly smaller than VIBE 9 because it is.
//
// Opacity is written straight to the nodes; only the caption is React state,
// and it changes a few times per drag rather than every frame.

const CARD_W = 300;
const MAX_SHRINK = 0.14;

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

const ANGLES = ['front', 'left', 'right'];

export default function ProductCarousel() {
  const trackRef = useRef(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);

  const products = SUPPORTED_PRODUCT_IDS.map(productForId).filter(Boolean);

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

      // Measured against the gap between cards, not the viewport: a card one
      // place from the middle must land on a single clean pose, or every card
      // at rest shows two angles at once and reads as a double exposure.
      const pitch = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth;

      cards.forEach((card, i) => {
        const away = card.offsetLeft + card.offsetWidth / 2 - middle;
        if (Math.abs(away) < nearestGap) {
          nearestGap = Math.abs(away);
          nearest = i;
        }
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
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1rem,calc(50%-150px))] py-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((p) => (
            <div
              key={p.id}
              data-card="1"
              style={{ width: CARD_W, willChange: 'transform' }}
              className="relative shrink-0 snap-center"
            >
              {/* Stacked rather than swapped so one angle dissolves into the
                  next; the first holds the box open, the rest lie over it. */}
              {ANGLES.map((angle, i) => (
                <img
                  key={angle}
                  src={`/${p.id}-${angle}.png`}
                  alt={i === 0 ? `${p.name} 외형` : ''}
                  aria-hidden={i > 0}
                  draggable="false"
                  className={`block w-full select-none ${i === 0 ? '' : 'absolute inset-0'}`}
                />
              ))}
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
