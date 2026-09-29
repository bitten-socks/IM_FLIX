import { useCallback, useEffect, useRef, useState } from 'react';
import TopBar from './components/TopBar';
import LandingView from './views/LandingView';
import MapView from './views/MapView';
import BrowseView from './views/BrowseView';
import { ROUTES, navigate, useRoute } from './lib/router';
import { useFlixStore } from './store/useFlixStore';

// Screens change behind a veil in the page colour: it closes over the old
// one, the swap happens while nothing can be seen, and it lifts off the new
// one. Nothing overlaps, which is the point -- cross-fading two mounted views
// would mean fading a wrapper that contains the fixed assignment panel, and
// an opacity between 0 and 1 makes that wrapper the panel's containing block,
// tearing it off the viewport for the length of the fade.
const VEIL_IN = 200; // page colour closing over the old screen
const VEIL_OUT = 300; // and clearing off the new one
const SWAP_SETTLE = 30; // a beat at full cover, so no screen is caught mid-mount

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export default function App() {
  const route = useRoute();
  const supported = useFlixStore((s) => s.supported);
  const tryReconnect = useFlixStore((s) => s.tryReconnect);
  const connected = useFlixStore((s) => s.connected);
  const productName = useFlixStore((s) => s.product.name);

  const [veiled, setVeiled] = useState(false);
  const timers = useRef([]);

  // Reattach here rather than in the top bar, which the intro hides. Run from
  // the app shell it happens while the intro is still playing, so arriving at
  // the mapping screen finds the device already connected instead of showing
  // "연결 안 됨" for a beat.
  useEffect(() => {
    if (supported) tryReconnect();
  }, [supported, tryReconnect]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // The document can't name a model -- one site serves the whole line, and a
  // VIBE 9 owner reading "VIBE 6" in their tab is just wrong. Narrow it here,
  // once the device has said what it is.
  useEffect(() => {
    const suffix = {
      [ROUTES.MAP]: connected ? `${productName} 키 설정` : '키 설정',
      [ROUTES.BROWSE]: '둘러보기',
    }[route];
    document.title = suffix ? `flix map — ${suffix}` : 'flix map';
  }, [route, connected, productName]);

  const go = useCallback((target) => {
    if (prefersReducedMotion()) {
      navigate(target);
      return;
    }
    setVeiled(true);
    timers.current.push(
      setTimeout(() => {
        navigate(target);
        timers.current.push(setTimeout(() => setVeiled(false), SWAP_SETTLE));
      }, VEIL_IN),
    );
  }, []);

  // The intro owns the whole viewport; the wordmark is the centrepiece, so
  // the bar carrying that same wordmark stays out of it.
  const isLanding = route === ROUTES.LANDING;

  return (
    <div className="min-h-screen bg-ground text-white">
      {!isLanding && <TopBar onNavigate={go} />}

      {isLanding && <LandingView onLeave={go} />}
      {route === ROUTES.MAP && <MapView key="map" />}
      {route === ROUTES.BROWSE && <BrowseView key="browse" onNavigate={go} />}

      <div
        aria-hidden="true"
        style={{ transitionDuration: `${veiled ? VEIL_IN : VEIL_OUT}ms` }}
        className={`pointer-events-none fixed inset-0 z-50 bg-ground transition-opacity ease-out ${
          veiled ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
