import { useEffect, useState } from 'react';
import FlixLogo from './FlixLogo';

// Carries the wordmark from where the intro left it to where the top bar
// keeps it, so leaving the intro reads as one continuous move rather than one
// screen being swapped for another.
//
// It measures both positions and animates the difference, which is the only
// way to do this when the two are different sizes in different layouts. One
// element is rendered at the intro's size and scaled down to match the bar's,
// with the origin at its top-left corner -- translate-then-scale from that
// corner maps one rectangle exactly onto the other, so the letters never
// drift or jump at the handover.

export default function LogoFlight({ from, to, duration, onDone }) {
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    if (!to) return undefined;
    // One frame at the start position first, or the transition has nothing to
    // move from and the logo simply appears at the destination.
    const raf = requestAnimationFrame(() => setMoved(true));
    const done = setTimeout(onDone, duration);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [to, duration, onDone]);

  if (!from) return null;

  const scale = to ? to.width / from.width : 1;
  const shifted = moved && to;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: from.left,
        top: from.top,
        transformOrigin: 'top left',
        transform: shifted
          ? `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${scale})`
          : 'translate(0px, 0px) scale(1)',
        transitionProperty: 'transform',
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: 'none',
        zIndex: 60,
      }}
    >
      <FlixLogo size="xl" />
    </div>
  );
}
