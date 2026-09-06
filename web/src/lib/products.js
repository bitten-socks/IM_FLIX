// One deployed site serves the whole flix line, so everything that differs
// between products lives here rather than being hardcoded into components.
//
// The USB product ID is the lookup key: the browser hands it to us as part of
// the HIDDevice, so the site knows which model it is talking to before
// exchanging a single packet. Keep these in sync with usb.pid in each
// keyboard.json, and with QMK/PRODUCT-REGISTRY.md.

export const VENDOR_ID = 0xfeed;

// `artwork` is the case render in public/, with `hotspots` giving each key
// opening's position as a percentage of that image. When a product has no
// render yet, `artwork` is null and the keypad falls back to a plain grid of
// `columns` wide -- usable immediately, swapped for the real render later
// without touching any component.
//
// All three renders share one orthographic camera, one 1296x1104 frame and
// one crop, so a key is 278px of pitch in every file. That is what makes the line
// look right next to itself: VIBE 4 is drawn smaller than VIBE 9 because it
// *is* smaller, rather than every product being blown up to fill its frame.
// Re-export the set together, or the sizes stop meaning anything.
const PRODUCTS = {
  0xf104: {
    id: 'vibe4',
    name: 'FLIX VIBE 4',
    keyCount: 4,
    columns: 2,
    artwork: '/vibe4.png',
    hotspots: [
      { left: 24.23, top: 27.63, width: 16.74, height: 19.57 },
      { left: 45.68, top: 27.63, width: 16.74, height: 19.57 },
      { left: 24.23, top: 52.81, width: 16.74, height: 19.57 },
      { left: 45.68, top: 52.81, width: 16.74, height: 19.57 },
    ],
    pins: ['GP0', 'GP1', 'GP2', 'GP3'],
    matrixColumns: 2,
  },
  0xf106: {
    id: 'vibe6',
    name: 'FLIX VIBE 6',
    keyCount: 6,
    columns: 3,
    artwork: '/vibe6.png',
    hotspots: [
      { left: 13.27, top: 27.63, width: 16.74, height: 19.57 },
      { left: 34.72, top: 27.63, width: 16.67, height: 19.57 },
      { left: 56.10, top: 27.63, width: 16.74, height: 19.57 },
      { left: 13.27, top: 52.81, width: 16.74, height: 19.57 },
      { left: 34.72, top: 52.81, width: 16.67, height: 19.57 },
      { left: 56.10, top: 52.81, width: 16.74, height: 19.57 },
    ],
    // Mirrors matrix_pins.direct in the keyboard's keyboard.json. Only the
    // hardware diagnostic panel needs this.
    pins: ['GP0', 'GP1', 'GP2', 'GP3', 'GP4', 'GP5'],
    matrixColumns: 3,
  },
  0xf109: {
    id: 'vibe9',
    name: 'FLIX VIBE 9',
    keyCount: 9,
    columns: 3,
    artwork: '/vibe9.png',
    hotspots: [
      { left: 13.27, top: 15.04, width: 16.74, height: 19.66 },
      { left: 34.72, top: 15.04, width: 16.67, height: 19.66 },
      { left: 56.10, top: 15.04, width: 16.74, height: 19.66 },
      { left: 13.27, top: 40.22, width: 16.74, height: 19.57 },
      { left: 34.72, top: 40.22, width: 16.67, height: 19.57 },
      { left: 56.10, top: 40.22, width: 16.74, height: 19.57 },
      { left: 13.27, top: 65.31, width: 16.74, height: 19.66 },
      { left: 34.72, top: 65.31, width: 16.67, height: 19.66 },
      { left: 56.10, top: 65.31, width: 16.74, height: 19.66 },
    ],
    pins: ['GP0', 'GP1', 'GP2', 'GP3', 'GP4', 'GP5', 'GP6', 'GP7', 'GP8'],
    matrixColumns: 3,
  },
};

// Used before a device is connected, and as the shape components can rely on
// always being present.
export const UNKNOWN_PRODUCT = {
  id: 'unknown',
  name: 'FLIX',
  keyCount: 0,
  columns: 3,
  artwork: null,
  hotspots: null,
  pins: [],
  matrixColumns: 3,
};

export function productForId(productId) {
  return PRODUCTS[productId] ?? null;
}

export const SUPPORTED_PRODUCT_IDS = Object.keys(PRODUCTS).map(Number);

// Largest key count across the line. The protocol sizes its buffers by this
// so one parser handles every model.
export const MAX_KEYS = Math.max(...Object.values(PRODUCTS).map((p) => p.keyCount));
