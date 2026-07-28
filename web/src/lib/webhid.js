// Thin wrapper around navigator.hid, scoped to QMK's raw HID interface as
// exposed by the firmware in QMK/flix_vibe6.
//
// 0xFF60/0x61 is QMK's standard raw HID usage page/usage (the same pair
// VIA and Vial use). QMK puts raw HID on its own USB interface, so unlike a
// shared interface it needs no explicit report ID -- reportId 0 is correct.
//
// No vendorId/productId filter: the usage page already identifies the
// interface, and this keeps the picker working if the VID/PID changes
// between firmware revisions.

const QMK_RAW_USAGE_PAGE = 0xff60;
const QMK_RAW_USAGE = 0x61;
const REPORT_ID = 0;

const FLIX_FILTERS = [{ usagePage: QMK_RAW_USAGE_PAGE, usage: QMK_RAW_USAGE }];

export function isWebHIDSupported() {
  return typeof navigator !== 'undefined' && 'hid' in navigator;
}

function isFlixDevice(device) {
  return device.collections?.some(
    (c) => c.usagePage === QMK_RAW_USAGE_PAGE && c.usage === QMK_RAW_USAGE,
  );
}

export async function requestFlixDevice() {
  if (!isWebHIDSupported()) throw new Error('이 브라우저는 WebHID를 지원하지 않습니다.');
  const devices = await navigator.hid.requestDevice({ filters: FLIX_FILTERS });
  if (!devices.length) return null;
  // The picker can hand back a device whose other collections matched
  // loosely; take the one that actually exposes the raw HID interface.
  const device = devices.find(isFlixDevice) ?? devices[0];
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
