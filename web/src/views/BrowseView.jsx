import FadeIn from '../components/FadeIn';
import { ROUTES, navigate } from '../lib/router';

// Placeholder. The landing needs somewhere for its second button to go, and a
// button that leads nowhere is worse than one that admits it isn't ready yet.
// The products, mapping guide and examples land here next.

export default function BrowseView() {
  return (
    <FadeIn>
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-lg font-bold text-white">둘러보기</h1>
      <p className="text-sm leading-relaxed text-white/45">
        제품 소개와 맵핑 가이드, 활용 사례를 준비하고 있습니다.
      </p>
      <button
        onClick={() => navigate(ROUTES.MAP)}
        className="mt-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
      >
        키 맵핑으로 이동
      </button>
    </main>
    </FadeIn>
  );
}
