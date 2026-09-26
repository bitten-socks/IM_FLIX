import BrowserGuard from '../components/BrowserGuard';
import ErrorBanner from '../components/ErrorBanner';
import KeypadHero from '../components/KeypadHero';
import AssignmentDrawer from '../components/AssignmentDrawer';
import StatusBar from '../components/StatusBar';
import DiagnosticPanel from '../components/DiagnosticPanel';
import FadeIn from '../components/FadeIn';
import { useFlixStore } from '../store/useFlixStore';

// The mapping screen. BrowserGuard lives here rather than around the whole
// app: browsing the products and the guide needs nothing from WebHID, so a
// phone should still be able to read those instead of being stopped at the
// door. Only this screen actually requires a device.
//
// From xl up the assignment panel is always on screen, so the column reserves
// its width (max-w-sm = 24rem) instead of letting it cover the keypad. Below
// that the panel goes back to sliding over the page, which is the only thing
// that fits.

// Plenty of USB-C cables carry power and nothing else. With one of those
// the device never appears to the computer at all -- the browser's picker
// comes up empty and the product looks broken. Worth saying before that
// happens, and worth saying louder once it has.
function CableNotice({ emphasised }) {
  if (emphasised) {
    return (
      <div className="mx-6 max-w-sm rounded-xl border border-amber-600/30 bg-amber-500/10 px-4 py-3 text-center">
        <p className="text-xs font-semibold text-amber-800">기기를 찾지 못했습니다</p>
        <p className="mt-1 text-[11px] leading-relaxed text-amber-900/70">
          충전만 되는 케이블일 수 있습니다. 데이터가 오가는 케이블로 바꿔 꽂아 보세요.
        </p>
      </div>
    );
  }
  return (
    <p className="mx-6 max-w-xs text-center text-[11px] leading-relaxed text-slate-500/80">
      충전만 되는 케이블로는 연결되지 않습니다. 데이터가 오가는 케이블인지 확인해 주세요.
    </p>
  );
}

export default function MapView() {
  const { connected, connect, connecting, supported, product, noDevicePicked } = useFlixStore();

  return (
    <>
      <BrowserGuard />
      <ErrorBanner />

      <FadeIn>
      <div className="xl:pr-96">
        <main className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-10">
          {/* Before a device is chosen the keypad is empty, leaving the
              panel shorter than the notice that sits over it -- which clipped
              the first line off the top. A floor keeps the two in step. */}
          <div className="relative min-h-[19rem] overflow-hidden rounded-3xl bg-panel p-10">
            <div className="mb-6 text-center">
              <p className="text-xs uppercase tracking-wider text-slate-500">MY DEVICE</p>
              <h1 className="text-lg font-bold text-slate-900">
                {connected ? product.name : 'FLIX'}
              </h1>
            </div>

            <KeypadHero />

            {!connected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-panel/85 backdrop-blur-sm">
                <p className="text-sm text-slate-500">FLIX 기기가 연결되어 있지 않습니다</p>
                <button
                  onClick={connect}
                  disabled={!supported || connecting}
                  className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {connecting ? '연결 중...' : '🔌 FLIX 기기 연결하기'}
                </button>

                <CableNotice emphasised={noDevicePicked} />
              </div>
            )}
          </div>

          <StatusBar />
          <DiagnosticPanel />

          <p className="text-center text-xs text-white/30">
            키캡을 클릭하면 오른쪽에서 설정합니다 · 저장 버튼 없이 즉시 반영됩니다
          </p>
        </main>
      </div>
      </FadeIn>

      <AssignmentDrawer />
    </>
  );
}
