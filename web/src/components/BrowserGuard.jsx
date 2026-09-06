import { useFlixStore } from '../store/useFlixStore';

// Shown when the browser cannot talk to USB devices at all.
//
// The two reasons need different advice. On a desktop it is the wrong
// browser, and switching fixes it. On a phone nothing fixes it -- no mobile
// browser can reach a USB device -- so telling someone to install Chrome
// sends them to install it and fail again. That matters more than it sounds:
// the address is engraved on the underside of the product, so people will
// read it off the case and type it into whatever is in their hand.

function isHandheld() {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPod|iPad|Mobile/i.test(ua)) return true;
  // iPadOS reports itself as a Mac; a touchscreen is what gives it away.
  // Windows touch laptops are excluded -- those can run a supported browser.
  return navigator.maxTouchPoints > 1 && !/Windows/i.test(ua);
}

export default function BrowserGuard() {
  const supported = useFlixStore((s) => s.supported);
  if (supported) return null;

  const handheld = isHandheld();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-w-md rounded-2xl border border-amber-500/30 bg-slate-900 p-6 text-slate-100 shadow-xl">
        <h2 className="mb-2 text-lg font-bold text-amber-400">
          {handheld ? '컴퓨터에서 열어주세요' : '지원하지 않는 브라우저입니다'}
        </h2>

        {handheld ? (
          <>
            <p className="text-sm leading-relaxed text-slate-300">
              키 설정은 <b>컴퓨터에서만</b> 할 수 있습니다. 휴대폰·태블릿은 USB 기기에
              연결할 수 없어서, 브라우저를 바꿔도 되지 않습니다.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              기기를 컴퓨터에 USB로 연결한 뒤, <b>Chrome·Edge·Whale</b>에서 아래 주소를
              열어주세요.
            </p>
            <p className="mt-3 rounded-lg bg-black/40 px-3 py-2 text-center font-mono text-sm text-cyan-300">
              {window.location.host}
            </p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-slate-300">
            이 브라우저에서는 기기와 연결할 수 없습니다. <b>Chrome, Edge, Whale</b>로
            열어주세요. Safari와 Firefox는 지원하지 않습니다.
          </p>
        )}
      </div>
    </div>
  );
}
