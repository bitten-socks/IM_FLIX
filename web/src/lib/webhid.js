// Thin wrapper around navigator.hid, scoped to the raw HID interface exposed
// by the firmware in QMK/flix_vibe6.
//
// 0xFF60/0x61 is QMK's raw HID usage page/usage -- shared by *every* VIA and
// Vial keyboard, so it identifies "some QMK board", not ours. Matching on it
// alone would let the app latch onto an unrelated keyboard the user happens
// to have plugged in, and then write our keymap packets into it. So the
// vendor/product IDs are part of the match too.
//
// These must stay in sync with usb.vid / usb.pid in
// QMK/flix_vibe6/keyboard.json. Changing them there without changing them
// here makes already-shipped units invisible to the site.
const FLIX_VENDOR_ID = 0xfeed;
const FLIX_PRODUCT_ID = 0xf106;

const QMK_RAW_USAGE_PAGE = 0xff60;
const QMK_RAW_USAGE = 0x61;

// QMK puts raw HID on its own USB interface, so it needs no explicit report
// ID -- unlike a shared interface, reportId 0 is correct here.
const REPORT_ID = 0;

const FLIX_FILTERS = [
  {
    vendorId: FLIX_VENDOR_ID,
    productId: FLIX_PRODUCT_ID,
    usagePage: QMK_RAW_USAGE_PAGE,
    usage: QMK_RAW_USAGE,
  },
];

export function isWebHIDSupported() {
  return typeof navigator !== 'undefined' && 'hid' in navigator;
}

function isFlixDevice(device) {
  if (device.vendorId !== FLIX_VENDOR_ID || device.productId !== FLIX_PRODUCT_ID) {
    return false;
  }
  return Boolean(
    device.collections?.some(
      (c) => c.usagePage === QMK_RAW_USAGE_PAGE && c.usage === QMK_RAW_USAGE,
    ),
  );
}

export async function requestFlixDevice() {
  if (!isWebHIDSupported()) throw new Error('이 브라우저는 WebHID를 지원하지 않습니다.');
  const devices = await navigator.hid.requestDevice({ filters: FLIX_FILTERS });
  if (!devices.length) return null;
  // A device can expose several collections; take the one that actually
  // carries the raw HID interface rather than trusting picker order.
  const device = devices.find(isFlixDevice);
  if (!device) {
    throw new Error('선택한 기기가 FLIX VIBE 6이 아닙니다. 다시 선택해 주세요.');
  }
  if (!device.opened) await device.open();
  return device;
}

// Silently reattach to a device the user already granted permission to in a
// previous session, without prompting the browser's device picker again.
export async function getPairedFlixDevice() {
  if (!isWebHIDSupported()) return null;
  const devices = await navigator.hid.getDevices();
  const match = devices.find(isFlixDevice);
  if (!match) return null;
  if (!match.opened) await match.open();
  return match;
}

export async function sendPacket(device, packet) {
  await device.sendReport(REPORT_ID, packet);
}

export function listenForReports(device, callback) {
  const handler = (event) => {
    const { data } = event;
    callback(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  };
  device.addEventListener('inputreport', handler);
  return () => device.removeEventListener('inputreport', handler);
}
