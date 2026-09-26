import { useEffect, useRef, useState } from 'react';
import FlixLogo from '../components/FlixLogo';
import { ROUTES, navigate } from '../lib/router';

// The intro. The wordmark settles, the X turns out and back, then the two
// ways in appear on their own -- no click needed to get past the logo, since
// a logo that must be clicked stops anyone who doesn't realise it.
//
// Every duration lives here so the pace can be tuned in one place. The feel
// is meant to be unhurried rather than quick: slow easing, no bounce, and the
// X's turn overlapping the tail of the wordmark's fade so the whole thing
// still lands in a little over a second.
const TIMING = {
  logoIn: 600, // wordmark fading and settling
  xStart: 350, // the X begins turning while that is still finishing
  xTurn: 400, // out, and later back
  xHold: 80, // a beat at full rotation
  buttonsIn: 420,
};

const X_REST = 0;
const X_TURNED = 45;

const AT_TURN_BACK = TIMING.xStart + TIMING.xTurn + TIMING.xHold;
const AT_BUTTONS = AT_TURN_BACK + TIMING.xTurn;

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export default function LandingView() {
  // Skipping straight to the end state is what makes this bearable on the
  // tenth visit: any click lands it immediately.
  const [settled, setSettled] = useState(prefersReducedMotion);
  const [logoShown, setLogoShown] = useState(false);
  const [xAngle, setXAngle] = useState(X_REST);
  const [showButtons, setShowButtons] = useState(false);
  const timers = useRef([]);

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

  return (
    <div
      onClick={skip}
      className="flex min-h-screen flex-col items-center justify-center gap-10 px-6"
    >
      <div
        style={{ transitionDuration: `${TIMING.logoIn}ms` }}
        className={`transition-all ease-out ${
          logoShown ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-2 opacity-0 blur-[2px]'
        }`}
      >
        <FlixLogo size="xl" xAngle={xAngle} />
      </div>

      <div
        style={{ transitionDuration: `${TIMING.buttonsIn}ms` }}
        className={`flex flex-col items-center gap-4 transition-all ease-out sm:flex-row ${
          showButtons ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
        }`}
      >
        <button
          onClick={() => navigate(ROUTES.MAP)}
          className="w-56 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          키 맵핑
        </button>
        <button
          onClick={() => navigate(ROUTES.BROWSE)}
          className="w-56 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
        >
          둘러보기
        </button>
      </div>
    </div>
  );
}
