import { useEffect, useRef, useState } from 'react';
import FlixLogo from '../components/FlixLogo';
import { ROUTES, navigate } from '../lib/router';

// The intro. The wordmark settles, the X turns out and back, then it rises a
// little as the two ways in appear beneath it -- no click needed to get past
// the logo, since a logo that must be clicked stops anyone who doesn't
// realise it.
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
    <div onClick={skip} className="flex min-h-screen flex-col items-center justify-center px-6">
      {/* Two layers: the outer one carries the rise, the inner one the fade,
          so the two movements don't have to share a single transform. The
          panels below already hold their space, so starting the wordmark
          lower is what gives it somewhere to rise from. */}
      <div
        style={{ transitionDuration: `${TIMING.lift}ms` }}
        className={`transition-transform ease-out ${
          showButtons ? 'translate-y-0' : 'translate-y-6'
        }`}
      >
        <div
          style={{ transitionDuration: `${TIMING.logoIn}ms` }}
          className={`transition-all ease-out ${
            logoShown ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-2 opacity-0 blur-[2px]'
          }`}
        >
          <FlixLogo size="xl" xAngle={xAngle} />
        </div>
      </div>

      {/* One surface split down the middle rather than two buttons: the whole
          half is the target, so it reads as choosing a side. */}
      <div
        style={{ transitionDuration: `${TIMING.buttonsIn}ms` }}
        className={`mt-12 w-full max-w-xl transition-all ease-out ${
          showButtons ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
        }`}
      >
        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/10 divide-x divide-white/10">
          <Half
            label="키 맵핑"
            hint="내 기기 설정하기"
            accent
            onClick={() => navigate(ROUTES.MAP)}
          />
          <Half
            label="둘러보기"
            hint="제품과 가이드"
            onClick={() => navigate(ROUTES.BROWSE)}
          />
        </div>
      </div>
    </div>
  );
}

function Half({ label, hint, accent = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center gap-1.5 px-6 py-10 transition-colors duration-300 ${
        accent ? 'hover:bg-cyan-500/10' : 'hover:bg-white/[0.06]'
      }`}
    >
      <span
        className={`text-base font-semibold transition-colors duration-300 ${
          accent ? 'text-cyan-300 group-hover:text-cyan-200' : 'text-white/80 group-hover:text-white'
        }`}
      >
        {label}
      </span>
      <span className="text-[11px] text-white/30 transition-colors duration-300 group-hover:text-white/50">
        {hint}
      </span>
    </button>
  );
}
