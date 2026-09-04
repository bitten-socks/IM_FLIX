import { useEffect, useState } from 'react';
import { MAX_MACRO_STEPS } from '../lib/protocol';
import { textToSteps, stepsToText } from '../lib/keycodes';

// Types a short word from a single key: one macro step per character.
//
// Timing is fixed here rather than exposed. Every character of a word wants
// the same rhythm, so a per-word control would be a knob with one sensible
// setting -- the 타이밍 tab is where timing actually varies and belongs.
//
// The limits are real and worth stating up front rather than letting the user
// discover them by having their input silently truncated or mistyped: a key
// holds MAX_MACRO_STEPS characters, and only characters that exist as a
// physical US-layout keystroke can be sent at all. Korean is the case that
// bites -- the keyboard sends key positions and the PC's IME decides what
// they compose into, so the same steps type a Korean word or "qmfhr"
// depending on a setting we cannot see from here.

// The "빠르게" preset: quick enough to feel instant, slow enough that apps
// which sample the keyboard rather than queue events keep up.
const HOLD_MS = 25;
const GAP_MS = 40;

export default function WordTab({ keyIndex, detail, onSave }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Seed from whatever the device already holds, so opening the tab shows the
  // current word rather than an empty box the user might save over blindly.
  useEffect(() => {
    if (!detail) return;
    setText(stepsToText(detail.steps, detail.stepCount) ?? '');
    setSaved(false);
  }, [detail?.keyIndex, keyIndex]);

  const { steps, rejected, truncated } = textToSteps(text, {
    holdMs: HOLD_MS,
    gapMs: GAP_MS,
    limit: MAX_MACRO_STEPS,
  });

  const save = async () => {
    if (!steps.length) return;
    setSaving(true);
    await onSave(steps);
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="col-span-4 flex flex-col gap-4 py-2">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-white/80" htmlFor="word-input">
          키 하나로 입력할 단어
        </label>
        <input
          id="word-input"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
          placeholder="예: block"
          spellCheck={false}
          autoComplete="off"
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 font-mono text-sm text-white placeholder:text-white/20 focus:border-cyan-400 focus:outline-none"
        />
        <div className="mt-1.5 flex items-center justify-between text-[11px]">
          <span className="text-white/35">영문·숫자·기호만 · 최대 {MAX_MACRO_STEPS}글자</span>
          <span className={steps.length >= MAX_MACRO_STEPS ? 'text-amber-300' : 'text-white/35'}>
            {steps.length} / {MAX_MACRO_STEPS}
          </span>
        </div>
      </div>

      {truncated && (
        <Notice>{MAX_MACRO_STEPS}글자까지만 저장됩니다. 뒷부분은 잘립니다.</Notice>
      )}

      {rejected.length > 0 && (
        <Notice>
          넣을 수 없어 빠지는 글자: <b>{rejected.join(' ')}</b>
          {rejected.some((ch) => /[ㄱ-힣ㄱ-ㅎㅏ-ㅣ]/.test(ch)) && (
            <>
              <br />
              한글은 키보드가 아니라 PC의 한/영 상태가 만드는 글자라, 기기에서 직접
              보낼 수 없습니다.
            </>
          )}
        </Notice>
      )}

      <button
        onClick={save}
        disabled={!steps.length || saving}
        className="rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? '저장 중...' : saved ? '✓ 저장됨' : '이 단어로 저장'}
      </button>

      <p className="text-[10px] leading-relaxed text-white/25">
        저장하면 이 키는 눌릴 때마다 위 단어를 입력합니다. 입력되는 곳의 언어가 영문일
        때만 의도한 대로 찍힙니다. 입력 속도는 <b className="text-white/40">빠르게</b>로
        고정되며, 바꾸려면 <b className="text-white/40">타이밍</b> 탭을 쓰세요.
      </p>
    </div>
  );
}

function Notice({ children }) {
  return (
    <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-200/80">
      {children}
    </p>
  );
}
