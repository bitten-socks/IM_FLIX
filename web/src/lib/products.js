// One deployed site serves the whole flix line, so everything that differs
// between products lives here rather than being hardcoded into components.
//
// The USB product ID is the lookup key: the browser hands it to us as part of
// the HIDDevice, so the site knows which model it is talking to before
// exchanging a single packet. Keep these in sync with usb.pid in each
// keyboard.json, and with QMK/PRODUCT-REGISTRY.md.

export const VENDOR_ID = 0xfeed;

// `artwork` is the case drawing in public/, with `hotspots` giving each key
// opening's position as a percentage of that image. When a product has no
// drawing yet, `artwork` is null and the keypad falls back to a plain grid of
// `columns` wide -- usable immediately, swapped for the real render later
// without touching any component.
const PRODUCTS = {
  0xf104: {
    id: 'vibe4',
    name: 'FLIX VIBE 4',
    keyCount: 4,
    columns: 2,
    artwork: null,
    hotspots: null,
    pins: ['GP0', 'GP1', 'GP2', 'GP3'],
    matrixColumns: 2,
  },
  0xf106: {
    id: 'vibe6',
    name: 'FLIX VIBE 6',
    keyCount: 6,
    columns: 3,
    artwork: '/assembly.png',
    hotspots: [
      { left: 36.46, top: 12.05, width: 18.17, height: 36.15 },
      { left: 55.73, top: 12.05, width: 18.17, height: 36.15 },
      { left: 75.0, top: 12.05, width: 18.17, height: 36.15 },
      { left: 36.46, top: 52.31, width: 18.17, height: 35.38 },
      { left: 55.73, top: 52.31, width: 18.17, height: 35.38 },
      { left: 75.0, top: 52.31, width: 18.17, height: 35.38 },
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
    artwork: null,
    hotspots: null,
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
