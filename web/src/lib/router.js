import { useEffect, useState } from 'react';

// Hash routing, deliberately.
//
// Real paths would need a rewrite rule on the host so a refresh on /map does
// not 404, and netlify.toml has no such rule. A hash never reaches the
// server, so the deploy config stays as it is and any URL survives a reload.
// The engraved address has no hash, which lands on the intro -- while someone
// who bookmarks #/map skips straight back to their keys.

export const ROUTES = {
  LANDING: '/',
  MAP: '/map',
  BROWSE: '/browse',
};

const KNOWN = Object.values(ROUTES);

function currentRoute() {
  const raw = window.location.hash.replace(/^#/, '');
  // An unrecognised hash falls back to the intro rather than rendering a
  // blank page -- a stale bookmark or a typo still lands somewhere usable.
  return KNOWN.includes(raw) ? raw : ROUTES.LANDING;
}

export function navigate(path) {
  if (currentRoute() !== path) window.location.hash = path;
}

export function useRoute() {
  const [route, setRoute] = useState(currentRoute);

  useEffect(() => {
    const onChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}
