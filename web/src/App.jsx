import { useEffect } from 'react';
import TopBar from './components/TopBar';
import LandingView from './views/LandingView';
import MapView from './views/MapView';
import BrowseView from './views/BrowseView';
import { ROUTES, useRoute } from './lib/router';
import { useFlixStore } from './store/useFlixStore';

export default function App() {
  const route = useRoute();
  const supported = useFlixStore((s) => s.supported);
  const tryReconnect = useFlixStore((s) => s.tryReconnect);

  // Reattach here rather than in the top bar, which the intro hides. Run from
  // the app shell it happens while the intro is still playing, so arriving at
  // the mapping screen finds the device already connected instead of showing
  // "연결 안 됨" for a beat.
  useEffect(() => {
    if (supported) tryReconnect();
  }, [supported, tryReconnect]);

  // The intro owns the whole viewport; the wordmark is the centrepiece, so
  // the bar carrying that same wordmark stays out of it.
  const isLanding = route === ROUTES.LANDING;

  return (
    <div className="min-h-screen bg-ground text-white">
      {!isLanding && <TopBar />}

      {isLanding && <LandingView />}
      {route === ROUTES.MAP && <MapView />}
      {route === ROUTES.BROWSE && <BrowseView />}
    </div>
  );
}
