// The "video remote" role set: what a FLIX becomes when it is unplugged from
// the PC and plugged into a phone or tablet.
//
// Nothing here is new firmware. These are ordinary single-key assignments --
// the same CMD_WRITE_KEY the rest of the panel sends. What makes them worth
// collecting is that choosing them by *role* ("앞으로 감기") instead of by
// keycode ("→") is the only way someone setting up a remote can tell which
// buttons will work everywhere and which depend on the app.
//
// That distinction is the real content of this file, and it is not cosmetic:
//
//   os      Consumer Control usage. The operating system handles it, so it
//           works over any app -- and it is the same report a Bluetooth
//           media remote sends, which is why these survive the move to a
//           phone at all.
//   app     An ordinary key the focused app has to choose to handle. Most
//           video players take the arrows; the seek distance is theirs to
//           decide, not ours.
//   youtube Documented YouTube shortcuts. Exact and reliable there, inert
//           elsewhere.
//
// Codes are HID usage ids, matching the tables in keycodes.js.

import { MOD_BITS } from './keycodes';

export const SCOPES = {
  os: { label: '모든 앱', tone: 'text-emerald-300', why: '운영체제가 직접 처리합니다' },
  app: { label: '앱에 따라', tone: 'text-amber-300', why: '앱이 키보드 입력을 받을 때 동작합니다' },
  youtube: { label: '유튜브', tone: 'text-white/40', why: '유튜브의 정식 단축키입니다' },
};

export const REMOTE_ROLES = {
  playpause: { label: '재생 / 일시정지', code: 0xe8, isMedia: 1, scope: 'os' },
  volup: { label: '볼륨 +', code: 0x80, isMedia: 1, scope: 'os' },
  voldown: { label: '볼륨 −', code: 0x81, isMedia: 1, scope: 'os' },
  mute: { label: '음소거', code: 0x82, isMedia: 1, scope: 'os' },
  prev: { label: '이전 트랙', code: 0xe9, isMedia: 1, scope: 'os' },
  next: { label: '다음 트랙', code: 0xea, isMedia: 1, scope: 'os' },

  seekback: { label: '뒤로 감기', note: '←', code: 0x50, isMedia: 0, scope: 'app' },
  seekfwd: { label: '앞으로 감기', note: '→', code: 0x4f, isMedia: 0, scope: 'app' },

  back10: { label: '10초 뒤로', note: 'J', code: 0x0d, isMedia: 0, scope: 'youtube' },
  fwd10: { label: '10초 앞으로', note: 'L', code: 0x0f, isMedia: 0, scope: 'youtube' },
  fullscreen: { label: '전체화면', note: 'F', code: 0x09, isMedia: 0, scope: 'youtube' },
  caption: { label: '자막 켜기 / 끄기', note: 'C', code: 0x06, isMedia: 0, scope: 'youtube' },
  slower: {
    label: '배속 느리게',
    note: 'Shift + ,',
    mod: MOD_BITS.SHIFT,
    code: 0x36,
    isMedia: 0,
    scope: 'youtube',
  },
  faster: {
    label: '배속 빠르게',
    note: 'Shift + .',
    mod: MOD_BITS.SHIFT,
    code: 0x37,
    isMedia: 0,
    scope: 'youtube',
  },
};

// One layout per product, in key order -- row-major, the same order the
// keypad draws. Seeking goes on the arrows rather than YouTube's J/L: the
// arrows work in most players, and a remote that only works in one app is
// not a remote.
//
// Every layout keeps 재생/일시정지 and 음소거 on it, because those two are
// the ones that never depend on which app is in front.
export const REMOTE_LAYOUTS = {
  4: ['seekback', 'seekfwd', 'playpause', 'mute'],
  6: ['seekback', 'playpause', 'seekfwd', 'voldown', 'mute', 'volup'],
  9: [
    'seekback', 'playpause', 'seekfwd',
    'voldown', 'mute', 'volup',
    'prev', 'fullscreen', 'next',
  ],
};

export function layoutFor(keyCount) {
  return REMOTE_LAYOUTS[keyCount] ?? null;
}

// Turn a layout into the assignments the store writes, dropping any role
// the layout names past the end of the device.
export function layoutAssignments(keyCount) {
  const layout = layoutFor(keyCount);
  if (!layout) return [];
  return layout.slice(0, keyCount).map((roleId, keyIndex) => {
    const role = REMOTE_ROLES[roleId];
    return {
      keyIndex,
      mod: role.mod ?? 0,
      code: role.code,
      isMedia: role.isMedia,
    };
  });
}
