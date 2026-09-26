import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import TopBar from './components/TopBar';
import LogoFlight from './components/LogoFlight';
import LandingView from './views/LandingView';
import MapView from './views/MapView';
import BrowseView from './views/BrowseView';
import { ROUTES, navigate, useRoute } from './lib/router';
import { useFlixStore } from './store/useFlixStore';

const FLIGHT_MS = 620;

export default function App() {
  const route = useRoute();
  const supported = useFlixStore((s) => s.supported);
  const tryReconnect = useFlixStore((s) => s.tryReconnect);

  // The wordmark's journey out of the intro: `from` is where it sat there,
  // `to` where the top bar keeps it. Both have to be real measurements, and
  // `to` can only be taken once the bar exists -- which is after the route
  // has already changed.
  const [flight, setFlight] = useState(null);
  const topLogoRef = useRef(null);

  // Reattach here rather than in the top bar, which the intro hides. Run from
  // the app shell it happens while the intro is still playing, so arriving at
  // the mapping screen finds the device already connected instead of showing
  // "연결 안 됨" for a beat.
  useEffect(() => {
    if (supported) tryReconnect();
  }, [supported, tryReconnect]);

  const leaveLanding = useCallback((fromRect, target) => {
    if (fromRect) setFlight({ from: fromRect, to: null });
    navigate(target);
  }, []);

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
      {!isLanding && <TopBar logoRef={topLogoRef} logoHidden={flying} />}

      {isLanding && <LandingView onLeave={leaveLanding} />}
      {route === ROUTES.MAP && <MapView key="map" />}
      {route === ROUTES.BROWSE && <BrowseView key="browse" />}

      {flying && (
        <LogoFlight
          from={flight.from}
          to={flight.to}
          duration={FLIGHT_MS}
          onDone={endFlight}
        />
      )}
    </div>
  );
}
