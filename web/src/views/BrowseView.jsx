import FadeIn from '../components/FadeIn';
import ProductCarousel from '../components/ProductCarousel';
import { ROUTES, navigate } from '../lib/router';

// Draft. The structure is the deliverable here -- three sections in the order
// someone meets the product: what it is, what it does, what it is for. The
// wording is a first pass and expects to be replaced.

const FEATURES = [
  {
    title: '열쇠고리형 클리커 겸 커맨드보드',
    body: '가방이나 키링에 걸어 두고, 필요할 때 USB로 연결해 씁니다. 손에 잡히는 크기에 클리커와 매크로패드를 함께 담았습니다.',
  },
  {
    title: '축 교체 가능',
    body: '핫스왑 소켓이라 납땜 없이 축을 바꿀 수 있습니다. 조용한 축, 걸리는 맛이 있는 축 — 취향대로 고르세요.',
  },
  {
    title: '키 맵핑 가능',
    body: '브라우저에서 바로 설정합니다. 프로그램을 깔 필요가 없고, 바꾼 값은 기기에 저장되어 다른 PC에 꽂아도 그대로입니다.',
  },
];

const USE_CASES = [
  {
    tag: 'AI',
    title: 'AI와 대화할 때',
    body: '자주 쓰는 지시를 키 하나에 담아 둡니다. 선택지를 고를 때 누르는 1·2 같은 답도 손을 옮기지 않고 누를 수 있습니다.',
  },
  {
    tag: 'GAME',
    title: '게임',
    body: '배틀그라운드의 수류탄 교체처럼 손이 꼬이는 키를 하나로 모읍니다. FIFA의 연속 입력 커맨드도 한 번에 넣을 수 있습니다.',
  },
  {
    tag: 'WORK',
    title: '작업',
    body: '오토캐드 단축키, 편집 툴의 자주 쓰는 명령을 손 닿는 곳에 둡니다. 단축키를 외우는 대신 키에 적어 두는 셈입니다.',
  },
];

export default function BrowseView({ onNavigate = navigate }) {
  return (
    <FadeIn>
      <div className="mx-auto max-w-5xl px-6 pb-24 pt-10">
        <Section eyebrow="PRODUCTS" title="제품 둘러보기">
          <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-relaxed text-white/45">
            키 개수만 다르고 쓰는 방법은 같습니다. 좌우로 넘겨 보세요.
          </p>
        </Section>

        <ProductCarousel />

        <Section eyebrow="FEATURES" title="무엇을 할 수 있나요" className="mt-24">
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/10 p-6 transition-colors duration-300 hover:border-white/20"
              >
                <h3 className="text-sm font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/45">{f.body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section eyebrow="USE CASES" title="이렇게 씁니다" className="mt-24">
          <div className="mt-10 flex flex-col gap-3">
            {USE_CASES.map((c) => (
              <div
                key={c.tag}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 p-6 transition-colors duration-300 hover:border-white/20 sm:flex-row sm:items-start sm:gap-8"
              >
                <span className="shrink-0 text-[11px] font-bold tracking-[0.15em] text-cyan-300 sm:w-20 sm:pt-0.5">
                  {c.tag}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">{c.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/45">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div className="mt-24 text-center">
          <button
            onClick={() => onNavigate(ROUTES.MAP)}
            className="rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            키 맵핑 시작하기
          </button>
        </div>
      </div>
    </FadeIn>
  );
}

function Section({ eyebrow, title, children, className = '' }) {
  return (
    <section className={className}>
      <p className="text-center text-[11px] font-semibold tracking-[0.2em] text-white/25">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-center text-xl font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}
