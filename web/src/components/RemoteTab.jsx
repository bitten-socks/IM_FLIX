import { useState } from 'react';
import { useFlixStore } from '../store/useFlixStore';
import { POINTER_PROTOCOL_VERSION } from '../lib/protocol';

const SWIPE_KEY = 'flix.swipeMs';
import {
  REMOTE_ROLES,
  SWIPE_ROLES,
  SWIPE_DEFAULT_MS,
  SWIPE_MAX_MS,
  SWIPE_MIN_MS,
  layoutAssignments,
  layoutFor,
  rolesByScope,
  swipeSteps,
} from '../lib/remote';

// Setting the device up for a phone or tablet.
//
// Every other tab assigns the one key that is selected, because that is what
// mapping normally is. The preset here does not fit that shape: a remote is a
// set of keys that only makes sense together -- seek either side of play,
// volume under it -- and asking someone to place six roles one at a time,
// guessing the arrangement as they go, is how they end up with a layout they
// have to re-learn. So the preset writes the lot, and the roles underneath
// are for changing your mind about one of them afterwards.
//
// The roles are grouped by how far they reach, not by what they do. Which
// buttons keep working when you switch from YouTube to a reader is the thing
// someone setting this up actually needs to know, and nothing on the device
// can tell them later.

// The note is the actual key being sent -- "→", "Ctrl + C · 안드로이드 · PC" --
// kept under the role rather than beside it. Beside it, the longer pairs
// wrapped and the two columns stopped lining up; under it, the role name is
// what the eye runs down and the keycode is there for whoever wants to check
// it. It also carries the platform, which is the whole reason 복사 appears
// twice.
function RoleButton({ role, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group rounded-xl bg-white/5 px-3.5 py-2.5 text-left transition hover:bg-cyan-500"
    >
      <span className="block text-[15px] font-medium text-white/90 group-hover:text-slate-950">
        {role.label}
      </span>
      <span className="mt-0.5 block text-[11px] leading-tight text-white/30 group-hover:text-slate-950/55">
        {role.note ?? '미디어 키'}
      </span>
    </button>
  );
}

// The arrangement the preset is about to write, drawn as the keypad itself.
// A list of role names in key order is not something anyone can picture; the
// grid is, and it is the only way to see that seek sits either side of play
// before committing to it.
function LayoutPreview({ layout, columns }) {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {layout.map((roleId, i) => (
        <div
          key={`${roleId}-${i}`}
          className="rounded-lg bg-black/25 px-1.5 py-2.5 text-center text-[11px] font-medium leading-tight text-white/70"
        >
          {REMOTE_ROLES[roleId].label}
        </div>
      ))}
    </div>
  );
}

export default function RemoteTab({ keyIndex }) {
  const product = useFlixStore((s) => s.product);
  const assignKey = useFlixStore((s) => s.assignKey);
  const assignKeys = useFlixStore((s) => s.assignKeys);
  const programMacro = useFlixStore((s) => s.programMacro);
  const identity = useFlixStore((s) => s.identity);

  // An older build answers the write and then drops the pointer codes, which
  // looks exactly like a swipe that does not work. Say so instead.
  const canSwipe = (identity?.protocolVersion ?? 0) >= POINTER_PROTOCOL_VERSION;

  // How far the swipe drags, kept here rather than in the step editor: it is
  // the one part of the gesture that has to be found by trying it, since the
  // right amount depends on the screen it lands on. Remembered so it is found
  // once, not once per key.
  const [swipeMs, setSwipeMs] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(SWIPE_KEY));
      if (saved >= SWIPE_MIN_MS && saved <= SWIPE_MAX_MS) return saved;
    } catch {
      // Private windows and blocked storage: the default is fine.
    }
    return SWIPE_DEFAULT_MS;
  });

  const changeSwipe = (value) => {
    setSwipeMs(value);
    try {
      localStorage.setItem(SWIPE_KEY, String(value));
    } catch {
      // Not worth failing the setting over.
    }
  };
  const [applied, setApplied] = useState(false);

  const layout = layoutFor(product.keyCount);

  const applyAll = async () => {
    await assignKeys(layoutAssignments(product.keyCount));
    setApplied(true);
    setTimeout(() => setApplied(false), 2600);
  };

  const pick = (role) =>
    assignKey({ mod: role.mod ?? 0, code: role.code, isMedia: role.isMedia });

  // A swipe is two keys held together, so it is written as a macro rather
  // than assigned as one keycode like everything else on this tab.
  const pickSwipe = (role) => programMacro(keyIndex, swipeSteps(role.toward, swipeMs));

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5">
        <p className="text-[13px] leading-relaxed text-white/55">
          <b className="text-white/80">여기서 설정하고, 폰에 꽂아 쓰세요.</b> 설정은 기기 안에
          저장되므로 PC에서 뽑아 폰이나 태블릿에 연결해도 그대로입니다.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-white/35">
          앱 설치도 페어링도 없고, 충전할 배터리도 없습니다. 데이터가 오가는 C to C 케이블이
          필요하며, 기기에 따라 동작이 다를 수 있습니다.
        </p>
      </div>

      {layout && (
        <div>
          <p className="mb-2.5 text-[13px] text-white/45">
            {product.name} 전체를 한 번에 영상 리모컨으로 바꿉니다.
          </p>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <LayoutPreview layout={layout} columns={product.columns} />
            <button
              onClick={applyAll}
              className={`mt-4 w-full rounded-xl py-3 text-[15px] font-bold transition ${
                applied
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
              }`}
            >
              {applied ? '적용했습니다' : '이대로 전체 적용'}
            </button>
            <p className="mt-2.5 text-center text-xs leading-relaxed text-white/30">
              모든 키를 덮어씁니다. 언제든 아래에서 하나씩 바꿀 수 있습니다.
            </p>
          </div>
        </div>
      )}

      <div className="border-t border-white/5 pt-5">
        <p className="mb-3 text-[13px] text-white/45">
          또는 지금 고른 <b className="text-white/75">K{keyIndex + 1}</b> 에만 하나씩 지정합니다.
        </p>

        <div className="flex flex-col gap-5">
          <div>
            <div className="mb-2 flex items-baseline gap-2">
              <span className="text-xs font-bold text-violet-300">세로 피드</span>
              <span className="text-[11px] text-white/25">
                쇼츠 · 릴스 · 틱톡 · 아이폰은 AssistiveTouch를 켜야 합니다
              </span>
            </div>
            {canSwipe ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(SWIPE_ROLES).map(([id, role]) => (
                    <RoleButton key={id} role={role} onClick={() => pickSwipe(role)} />
                  ))}
                </div>

                <div className="mt-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-semibold text-white/70">쓸어올리는 양</span>
                    <span className="font-mono text-[13px] text-cyan-300">{swipeMs}ms</span>
                  </div>
                  <input
                    type="range"
                    min={SWIPE_MIN_MS}
                    max={SWIPE_MAX_MS}
                    value={swipeMs}
                    onChange={(e) => changeSwipe(Number(e.target.value))}
                    className="mt-2 w-full"
                  />
                  <p className="mt-1 text-[11px] leading-relaxed text-white/30">
                    화면 크기에 따라 다릅니다. <b className="text-white/50">안 넘어가면 늘리고</b>,
                    <b className="text-white/50"> 두 개씩 넘어가면 줄이세요.</b> 바꾼 뒤 위 버튼을
                    다시 눌러야 기기에 들어갑니다.
                  </p>
                </div>

                <p className="mt-1.5 text-[11px] leading-relaxed text-white/25">
                  세로 피드는 휠로는 넘어가지 않습니다. 쓸어올리는 동작을 그대로 흉내 냅니다.
                </p>
              </>
            ) : (
              <p className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3.5 py-3 text-[12px] leading-relaxed text-amber-200/75">
                이 기기의 펌웨어는 쓸어올리기를 아직 모릅니다. 지정해도 아무 일도 일어나지
                않으므로 버튼을 내려두었습니다.
              </p>
            )}
          </div>

          {rolesByScope().map(({ scope, meta, roles }) => (
            <div key={scope}>
              <div className="mb-2 flex items-baseline gap-2">
                <span className={`text-xs font-bold ${meta.tone}`}>{meta.label}</span>
                <span className="text-[11px] text-white/25">{meta.why}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => (
                  <RoleButton key={r.id} role={r} onClick={() => pick(r)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Macros are played by the firmware, not by anything on the host, so
          they cross to a phone untouched -- but nothing on this screen would
          suggest that, and someone who set one up on a PC has no reason to
          assume it still works. Said here rather than in 고급, because this
          is the tab where the question comes up. */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5">
        <p className="text-[13px] font-semibold text-white/75">단어와 매크로도 그대로 됩니다</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/40">
          <b className="text-white/60">고급</b> 탭에서 만든 단어 입력과 순서·타이밍 매크로는 기기
          안에서 재생됩니다. 폰에 꽂아도 PC에서와 똑같이 입력되므로, 자주 쓰는 답장이나 아이디를 키
          하나에 넣어 두면 폰에서도 한 번에 나옵니다.
        </p>
      </div>
    </div>
  );
}
