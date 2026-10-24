// What a FLIX is good for once it leaves the PC and goes into a phone or
// tablet: a video remote, a page-turner, and a clipboard key.
//
// Nothing here is new firmware. These are ordinary single-key assignments --
// the same CMD_WRITE_KEY the rest of the panel sends. What makes them worth
// collecting is that choosing them by *role* ("앞으로 감기") instead of by
// keycode ("→") is the only way someone setting this up can tell which
// buttons will keep working when they switch apps, and which will not.
//
// That distinction is the real content of this file, and it is not cosmetic:
//
//   os     Consumer Control usage. The operating system handles it, so it
//          works over any app -- and it is the same report a Bluetooth media
//          remote sends, which is why these survive the move to a phone at
//          all.
//   wheel  A mouse wheel notch. Not a key at all, so an app that ignores the
//          keyboard still scrolls -- the pointer stack handles it instead,
//          which is why this reaches apps Page Down cannot. Held, it repeats.
//          iPhone needs AssistiveTouch on before it accepts a pointer.
//   app    An ordinary key the focused app has to choose to handle. Most
//          video players take the arrows and most readers take Page Down;
//          the distance scrolled is theirs to decide, not ours.
//   edit   Clipboard shortcuts. These are split by platform rather than
//          offered once, because the modifier genuinely differs: Android and
//          PC copy with Ctrl, iPhone and iPad with Cmd. One button labelled
//          "복사" would be wrong on half the devices it is pressed on.
//
// Codes are HID usage ids, matching the tables in keycodes.js.

import { MOD_BITS } from './keycodes';

export const SCOPES = {
  os: { label: '모든 앱', tone: 'text-emerald-300', why: '운영체제가 직접 처리합니다' },
  wheel: {
    label: '대부분의 앱',
    tone: 'text-emerald-300',
    why: '마우스 휠로 스크롤합니다 · 아이폰은 AssistiveTouch를 켜야 합니다',
  },
  app: { label: '앱에 따라', tone: 'text-amber-300', why: '앱이 키보드 입력을 받을 때 동작합니다' },
  edit: { label: '편집', tone: 'text-sky-300', why: '기기에 맞는 쪽을 고르세요' },
};

// A swipe, which is the only thing a vertical feed answers to. Shorts and
// Reels are pagers: they take a touch drag and ignore the wheel, which is why
// every other scroll role moves them not at all. One chord group -- the
// button held while the pointer runs -- is a press, a drag and a release, and
// the hold decides how far it travels.
//
// These write a macro rather than a single key, so they are kept apart from
// REMOTE_ROLES, whose entries are all one keycode each.
const POINTER = { button: 0xf4, up: 0xf5, down: 0xf6, left: 0xf7, right: 0xf8 };

const pointerStep = (code, holdMs, chord = 0) => ({
  mod: 0, code, isMedia: 1, chord, sustain: 0, onRelease: 0, holdMs, gapMs: 20,
});

// A pointer only ever moves by a delta, so a swipe leaves it where the swipe
// ended -- and a few swipes in the same direction pile it against that edge,
// where the next drag has no room left to travel. That is what "it grabs from
// the top" is: the drag is happening, against the top of the screen, across
// no distance at all.
//
// So the pointer is put back afterwards rather than before: the drag goes out
// first, which is what the press is for, and the long walk back happens while
// nobody is waiting on it. Two directions chord into one diagonal, which puts
// it in the far corner in a single move, and a shorter diagonal then brings it
// off both edges -- clear of the back-swipe strip down one side and of the
// buttons down the other.
const swipe = (toward) => {
  const backward = toward === POINTER.up ? POINTER.down : POINTER.up;
  return [
    pointerStep(POINTER.button, 300, 1), pointerStep(toward, 300),
    pointerStep(backward, 1500, 1), pointerStep(POINTER.left, 1500),
    pointerStep(toward, 280, 1), pointerStep(POINTER.right, 280),
  ];
};

export const SWIPE_ROLES = {
  feedNext: {
    label: '다음 쇼츠 · 릴스',
    note: '위로 쓸어올린 뒤 포인터를 되돌립니다',
    steps: swipe(POINTER.up),
  },
  feedPrev: {
    label: '이전 쇼츠 · 릴스',
    note: '아래로 쓸어내린 뒤 포인터를 되돌립니다',
    steps: swipe(POINTER.down),
  },
};

export const REMOTE_ROLES = {
  playpause: { label: '재생 / 일시정지', code: 0xe8, isMedia: 1, scope: 'os' },
  volup: { label: '볼륨 +', code: 0x80, isMedia: 1, scope: 'os' },
  voldown: { label: '볼륨 −', code: 0x81, isMedia: 1, scope: 'os' },
  mute: { label: '음소거', code: 0x82, isMedia: 1, scope: 'os' },
  // 0xE9/0xEA are NEXT/PREV in media_code_to_keycode(); keep them that way
  // round. Reversed, the role sent the opposite track AND the keycap showed
  // the opposite label, which looked like two separate faults.
  prev: { label: '이전 트랙', code: 0xea, isMedia: 1, scope: 'os' },
  next: { label: '다음 트랙', code: 0xe9, isMedia: 1, scope: 'os' },

  seekback: { label: '뒤로 감기', note: '← · 앱에서도 이쪽이 동작합니다', code: 0x50, isMedia: 0, scope: 'app' },
  seekfwd: { label: '앞으로 감기', note: '→ · 앱에서도 이쪽이 동작합니다', code: 0x4f, isMedia: 0, scope: 'app' },
  wheeldown: { label: '스크롤 ↓', note: '마우스 휠 · 누르면 계속', code: 0xf1, isMedia: 1, scope: 'wheel' },
  wheelup: { label: '스크롤 ↑', note: '마우스 휠 · 누르면 계속', code: 0xf0, isMedia: 1, scope: 'wheel' },

  pagedown: { label: '다음 쪽 · 스크롤 ↓', note: 'Page Down', code: 0x4e, isMedia: 0, scope: 'app' },
  pageup: { label: '이전 쪽 · 스크롤 ↑', note: 'Page Up', code: 0x4b, isMedia: 0, scope: 'app' },
  linedown: { label: '한 줄 아래', note: '↓', code: 0x51, isMedia: 0, scope: 'app' },
  lineup: { label: '한 줄 위', note: '↑', code: 0x52, isMedia: 0, scope: 'app' },

  copy: { label: '복사', note: 'Ctrl + C · 안드로이드 · PC', mod: MOD_BITS.CTRL, code: 0x06, isMedia: 0, scope: 'edit' },
  paste: { label: '붙여넣기', note: 'Ctrl + V · 안드로이드 · PC', mod: MOD_BITS.CTRL, code: 0x19, isMedia: 0, scope: 'edit' },
  copyApple: { label: '복사', note: 'Cmd + C · 아이폰 · 아이패드', mod: MOD_BITS.WIN, code: 0x06, isMedia: 0, scope: 'edit' },
  pasteApple: { label: '붙여넣기', note: 'Cmd + V · 아이폰 · 아이패드', mod: MOD_BITS.WIN, code: 0x19, isMedia: 0, scope: 'edit' },

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
    // Scrolling beats 전체화면 here: the wheel reaches most apps, while F
    // only ever worked in a browser tab.
    'prev', 'wheeldown', 'next',
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

// Grouped for display, in SCOPES order, carrying each role's id so two roles
// that share a label (복사, twice, once per platform) stay distinguishable.
export function rolesByScope() {
  return Object.entries(SCOPES).map(([scope, meta]) => ({
    scope,
    meta,
    roles: Object.entries(REMOTE_ROLES)
      .filter(([, r]) => r.scope === scope)
      .map(([id, r]) => ({ id, ...r })),
  }));
}
