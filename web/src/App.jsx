import BrowserGuard from './components/BrowserGuard';
import TopBar from './components/TopBar';
import ErrorBanner from './components/ErrorBanner';
import KeypadHero from './components/KeypadHero';
import AssignmentDrawer from './components/AssignmentDrawer';
import StatusBar from './components/StatusBar';
import DiagnosticPanel from './components/DiagnosticPanel';
import { useFlixStore } from './store/useFlixStore';

export default function App() {
  const { connected, connect, connecting, supported, connectMock } = useFlixStore();

  return (
    <div className="min-h-screen bg-[#0b0c0f] text-white">
      <BrowserGuard />
      <TopBar />
      <ErrorBanner />

      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-10">
        <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-[#15171c] p-10">
          <div className="mb-6 text-center">
            <p className="text-xs uppercase tracking-wider text-white/30">MY DEVICE</p>
            <h1 className="text-lg font-bold text-white">FLIX VIBE 6</h1>
          </div>

          <KeypadHero />

          {!connected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0b0c0f]/80 backdrop-blur-sm">
              <p className="text-sm text-white/60">FLIX VIBE 6가 연결되어 있지 않습니다</p>
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={connect}
                  disabled={!supported || connecting}
                  className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {connecting ? '연결 중...' : '🔌 FLIX VIBE 6 연결하기'}
                </button>
                <button
                  onClick={connectMock}
                  className="text-xs font-medium text-white/40 underline-offset-2 transition hover:text-white/70 hover:underline"
                >
                  🧪 하드웨어 없이 목업으로 테스트하기
                </button>
              </div>
            </div>
          )}
        </div>

        <StatusBar />
        <DiagnosticPanel />

        <p className="text-center text-xs text-white/30">
          키캡을 클릭하면 할당 패널이 열립니다 · 저장 버튼 없이 즉시 반영됩니다
        </p>
      </main>

      <AssignmentDrawer />
    </div>
  );
}
