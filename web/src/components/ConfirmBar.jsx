import { useState } from 'react';
import { useFlixStore } from '../store/useFlixStore';

// The "I'm done" button.
//
// Every change is already written to the device the moment it is made, which
// is the right behaviour and the wrong feeling: with no moment of commitment,
// people are left wondering whether anything was saved and go looking for a
// save button that is not there.
//
// So this is a real check rather than a reassuring no-op. It asks the device
// what it is actually holding and waits for the answer, which is the only
// honest way to say "saved" -- the reply is the proof. A button that merely
// showed a tick would be lying on the one screen where trust matters.

const ANSWER_TIMEOUT_MS = 2500;
// Long enough to be noticed. The confirmation is the whole point of the
// button, and one that clears while someone is still looking at the keypad
// leaves them no better off than before pressing it.
const DONE_FOR_MS = 6000;

export default function ConfirmBar() {
  const connected = useFlixStore((s) => s.connected);
  const refreshKeymap = useFlixStore((s) => s.refreshKeymap);
  const [state, setState] = useState('idle'); // idle | checking | done | failed

  const confirm = async () => {
    setState('checking');

    // The device answers asynchronously through the report handler, so the
    // send resolving proves nothing. A fresh lastSync is what proves it
    // replied.
    const before = useFlixStore.getState().lastSync;
    await refreshKeymap();

    const deadline = Date.now() + ANSWER_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (useFlixStore.getState().lastSync !== before) {
        setState('done');
        setTimeout(() => setState('idle'), DONE_FOR_MS);
        return;
      }
      await new Promise((r) => setTimeout(r, 60));
    }
    setState('failed');
    setTimeout(() => setState('idle'), DONE_FOR_MS);
  };

  const label = {
    idle: '설정 확정하기',
    checking: '기기에서 확인하는 중...',
    done: '✓ 기기에 저장되었습니다',
    failed: '기기가 응답하지 않습니다 · 케이블을 확인해 주세요',
  }[state];

  const tone =
    state === 'done'
      ? 'bg-emerald-500 text-emerald-950'
      : state === 'failed'
        ? 'bg-amber-500 text-amber-950'
        : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400';

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={confirm}
        disabled={!connected || state === 'checking'}
        className={`w-full rounded-2xl py-4 text-[15px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${tone}`}
      >
        {label}
      </button>
      <p className="text-center text-xs leading-relaxed text-white/30">
        바꾸는 즉시 기기에 저장돼요. 이 버튼은 저장된 내용을 기기에서 다시 읽어
        확인해 줍니다.
      </p>
    </div>
  );
}
