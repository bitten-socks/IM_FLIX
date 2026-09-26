import { useEffect, useRef, useState } from 'react';
import FlixLogo from '../components/FlixLogo';

// The intro. The wordmark settles, the X turns out and back, then it rises as
// the two ways in appear beneath it -- no click needed to get past the logo,
// since a logo that must be clicked stops anyone who doesn't realise it.
//
// Leaving is staged rather than instant: the panels fade first, then the
// wordmark's position is handed up to App, which flies it to the top bar. The
// logo is the one thing both screens share, so it is what carries continuity
// across the change.
//
// Every duration lives here so the pace can be tuned in one place. The feel
// is meant to be unhurried rather than quick: slow easing, no bounce, and the
// X's turn overlapping the tail of the wordmark's fade.
const TIMING = {
  logoIn: 850, // wordmark fading and settling
  xStart: 500, // the X begins turning while that is still finishing
  xTurn: 560, // out, and later back
  xHold: 110, // a beat at full rotation
  buttonsIn: 520,
  lift: 620, // the wordmark easing up as the panels arrive
  panelsOut: 220, // panels clearing before the wordmark travels
};

const X_REST = 0;
const X_TURNED = 45;

const AT_TURN_BACK = TIMING.xStart + TIMING.xTurn + TIMING.xHold;
const AT_BUTTONS = AT_TURN_BACK + TIMING.xTurn;

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export default function LandingView({ onLeave }) {
  // Skipping straight to the end state is what makes this bearable on the
  // tenth visit: any click lands it immediately.
  const [settled, setSettled] = useState(prefersReducedMotion);
  const [logoShown, setLogoShown] = useState(false);
  const [xAngle, setXAngle] = useState(X_REST);
  const [showButtons, setShowButtons] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const timers = useRef([]);
  const logoRef = useRef(null);

  useEffect(() => {
    if (settled) {
      setLogoShown(true);
      setXAngle(X_REST);
      setShowButtons(true);
      return undefined;
    }

    // A frame's delay so the browser paints the "before" state first;
    // without it the opacity transition has nothing to move from.
    const raf = requestAnimationFrame(() => setLogoShown(true));
    timers.current = [
      setTimeout(() => setXAngle(X_TURNED), TIMING.xStart),
      setTimeout(() => setXAngle(X_REST), AT_TURN_BACK),
      setTimeout(() => setShowButtons(true), AT_BUTTONS),
    ];

    return () => {
      cancelAnimationFrame(raf);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [settled]);

  const skip = () => {
    if (!showButtons) setSettled(true);
  };

  const depart = (target) => {
    if (leaving) return;

    if (prefersReducedMotion()) {
      onLeave(null, target);
      return;
    }

    // Clear the panels first, then hand the wordmark's exact position up so
    // it can carry on from there. Measuring after the fade keeps the reading
    // honest -- the logo has finished its rise by then.
    setLeaving(true);
    setTimeout(() => {
      onLeave(logoRef.current?.getBoundingClientRect() ?? null, target);
    }, TIMING.panelsOut);
  };

  // Once the scripted turn is over the X goes back to answering the cursor,
  // the way it does in the top bar. Handing over means dropping the inline
  // angle entirely -- an inline transform would outrank the hover class and
  // pin the letter upright.
  const introOver = showButtons;

  return (
    <div onClick={skip} className="flex min-h-screen flex-col items-center justify-center px-6">
      {/* Two layers: the outer one carries the rise, the inner one the fade,
          so the two movements don't have to share a single transform. The
          panels below already hold their space, so starting the wordmark
          lower is what gives it somewhere to rise from. */}
      <div
        style={{ transitionDuration: `${TIMING.lift}ms` }}
        className={`transition-transform ease-out ${
          showButtons ? 'translate-y-0' : 'translate-y-12'
        }`}
      >
        <div
          ref={logoRef}
          style={{ transitionDuration: `${TIMING.logoIn}ms` }}
          className={`group cursor-pointer transition-all ease-out ${
            logoShown ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-2 opacity-0 blur-[2px]'
          } ${leaving ? 'opacity-0' : ''}`}
        >
          <FlixLogo size="xl" xAngle={introOver ? null : xAngle} interactive={introOver} />
        </div>
      </div>

      {/* One surface split down the middle rather than two buttons: the whole
          half is the target, so it reads as choosing a side. */}
      <div
        style={{
          transitionDuration: `${leaving ? TIMING.panelsOut : TIMING.buttonsIn}ms`,
        }}
        className={`mt-12 w-full max-w-3xl transition-all ease-out ${
          showButtons && !leaving
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-3 opacity-0'
        }`}
      >
        <div className="grid grid-cols-2 divide-x divide-white/10 overflow-hidden rounded-2xl">
          <Half label="키 맵핑" hint="내 기기 설정하기" accent onClick={() => depart('/map')} />
          <Half label="둘러보기" hint="제품과 가이드" onClick={() => depart('/browse')} />
        </div>
      </div>
    </div>
  );
}

function Half({ label, hint, accent = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center gap-2 px-8 py-16"
    >
      {/* The whole caption lifts together. Moving only the heading would open
          a gap under it and read as two separate things. */}
      <span
        className={`inline-block text-base font-semibold transition-transform duration-300 ease-out group-hover:-translate-y-1 ${
          accent ? 'text-cyan-300' : 'text-white/85'
        }`}
      >
        {label}
      </span>
      <span className="inline-block text-[11px] text-white/30 transition-transform duration-300 ease-out group-hover:-translate-y-1">
        {hint}
      </span>
    </button>
  );
}
