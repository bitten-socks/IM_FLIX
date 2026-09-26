import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import TopBar from './components/TopBar';
import LogoFlight from './components/LogoFlight';
import LandingView from './views/LandingView';
import MapView from './views/MapView';
import BrowseView from './views/BrowseView';
import { ROUTES, navigate, useRoute } from './lib/router';
import { useFlixStore } from './store/useFlixStore';

// Two screen transitions, side by side so they can be judged against each
// other. `?fx=b` flies the wordmark from the intro to the top bar; anything
// else dissolves through the page colour. One of these gets deleted once the
// choice is made -- this is a comparison, not a setting worth keeping.
const FX = new URLSearchParams(window.location.search).get('fx') === 'b' ? 'b' : 'a';

const FLIGHT_MS = 620; // B: the wordmark's journey
const VEIL_IN = 200; // A: page colour closing over the old screen
const VEIL_OUT = 300; // A: and clearing off the new one

export default function App() {
  const route = useRoute();
  const supported = useFlixStore((s) => s.supported);
  const tryReconnect = useFlixStore((s) => s.tryReconnect);

  // B. The wordmark's journey out of the intro: `from` is where it sat there,
  // `to` where the top bar keeps it. Both have to be real measurements, and
  // `to` can only be taken once the bar exists -- which is after the route
  // has already changed.
  const [flight, setFlight] = useState(null);
  const topLogoRef = useRef(null);

  // A. Opaque while the screens swap underneath, so the change is never seen
  // happening. Nothing overlaps, which is what keeps the fixed assignment
  // panel out of trouble -- fading a wrapper that contains it would tear it
  // off the viewport.
  const [veiled, setVeiled] = useState(false);
  const veilTimers = useRef([]);

  // Reattach here rather than in the top bar, which the intro hides. Run from
  // the app shell it happens while the intro is still playing, so arriving at
  // the mapping screen finds the device already connected instead of showing
  // "연결 안 됨" for a beat.
  useEffect(() => {
    if (supported) tryReconnect();
  }, [supported, tryReconnect]);

  useEffect(() => () => veilTimers.current.forEach(clearTimeout), []);

  const go = useCallback((target) => {
    if (FX === 'b') {
      navigate(target);
      return;
    }
    setVeiled(true);
    veilTimers.current = [
      setTimeout(() => {
        navigate(target);
        // A frame at full cover before lifting, so the new screen is never
        // caught mid-mount.
        veilTimers.current.push(setTimeout(() => setVeiled(false), 30));
      }, VEIL_IN),
    ];
  }, []);

  const leaveLanding = useCallback(
    (fromRect, target) => {
      if (FX === 'b' && fromRect) setFlight({ from: fromRect, to: null });
      go(target);
    },
    [go],
  );

  // Before the browser paints the new screen, so the bar's logo is never seen
  // sitting there while its double is still mid-flight.
  useLayoutEffect(() => {
    if (!flight || flight.to || !topLogoRef.current) return;
    const to = topLogoRef.current.getBoundingClientRect();
    setFlight((f) => (f && !f.to ? { ...f, to } : f));
  }, [flight, route]);

  const endFlight = useCallback(() => setFlight(null), []);

  // The intro owns the whole viewport; the wordmark is the centrepiece, so
  // the bar carrying that same wordmark stays out of it.
  const isLanding = route === ROUTES.LANDING;
  const flying = Boolean(flight);

  return (
    <div className="min-h-screen bg-ground text-white">
      {!isLanding && <TopBar logoRef={topLogoRef} logoHidden={flying} onNavigate={go} />}

      {isLanding && <LandingView onLeave={leaveLanding} stageOut={FX === 'b'} />}
      {route === ROUTES.MAP && <MapView key="map" />}
      {route === ROUTES.BROWSE && <BrowseView key="browse" onNavigate={go} />}

      {flying && (
        <LogoFlight from={flight.from} to={flight.to} duration={FLIGHT_MS} onDone={endFlight} />
      )}

      {FX === 'a' && (
        <div
          aria-hidden="true"
          style={{ transitionDuration: `${veiled ? VEIL_IN : VEIL_OUT}ms` }}
          className={`pointer-events-none fixed inset-0 z-50 bg-ground transition-opacity ease-out ${
            veiled ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}
