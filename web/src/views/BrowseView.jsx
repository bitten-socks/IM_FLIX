import FadeIn from '../components/FadeIn';
import ProductCarousel from '../components/ProductCarousel';
import { ROUTES, navigate } from '../lib/router';

// Draft. The structure is the deliverable here -- three sections in the order
// someone meets the product: what it is, what it does, what it is for.
//
// Features and use cases are laid out the way a shopping listing reads:
// full-width blocks stacked down the page, each led by a picture, rather than
// a row of cards to compare. Cards invite comparison; these are meant to be
// read in order. The image slots are empty on purpose and say what belongs in
// them, so the layout can be judged before the photography exists.

const FEATURES = [
  {
    step: '01',
    title: '열쇠고리형 클리커 겸 커맨드보드',
    body: '가방이나 키링에 걸어 두고, 필요할 때 USB로 연결해 씁니다. 손에 잡히는 크기에 클리커와 매크로패드를 함께 담았습니다.',
    slot: '키링에 걸린 제품 · 손에 쥔 크기 비교',
  },
  {
    step: '02',
    title: '축 교체 가능',
    body: '핫스왑 소켓이라 납땜 없이 축을 바꿀 수 있습니다. 조용한 축, 걸리는 맛이 있는 축 — 취향대로 고르세요.',
    slot: '키캡을 뽑아 축을 교체하는 장면',
  },
  {
    step: '03',
    title: '키 맵핑 가능',
    body: '브라우저에서 바로 설정합니다. 프로그램을 깔 필요가 없고, 바꾼 값은 기기에 저장되어 다른 PC에 꽂아도 그대로입니다.',
    slot: '맵핑 화면과 기기가 함께 보이는 사진',
  },
];

const USE_CASES = [
  {
    tag: 'AI',
    title: 'AI와 대화할 때',
    body: '자주 쓰는 지시를 키 하나에 담아 둡니다. 선택지를 고를 때 누르는 1·2 같은 답도 손을 옮기지 않고 누를 수 있습니다.',
    slot: 'AI 화면 옆에 놓인 기기',
  },
  {
    tag: 'GAME',
    title: '게임',
    body: '배틀그라운드의 수류탄 교체처럼 손이 꼬이는 키를 하나로 모읍니다. FIFA의 연속 입력 커맨드도 한 번에 넣을 수 있습니다.',
    slot: '게임 화면 + 키보드 옆 기기',
  },
  {
    tag: 'WORK',
    title: '작업',
    body: '오토캐드 단축키, 편집 툴의 자주 쓰는 명령을 손 닿는 곳에 둡니다. 단축키를 외우는 대신 키에 적어 두는 셈입니다.',
    slot: '작업 화면 + 책상 위 기기',
  },
];

export default function BrowseView({ onNavigate = navigate }) {
  return (
    <FadeIn>
      <div className="mx-auto max-w-4xl px-6 pb-28 pt-10">
        <Section eyebrow="PRODUCTS" title="제품 둘러보기">
          <p className="mx-auto mb-8 mt-3 max-w-lg text-center text-sm leading-relaxed text-white/45">
            키 개수만 다르고 쓰는 방법은 같습니다. 좌우로 넘겨 보세요.
          </p>
        </Section>

        <ProductCarousel />

        <Section eyebrow="FEATURES" title="무엇을 할 수 있나요" className="mt-28">
          <div className="mt-12 flex flex-col gap-20">
            {FEATURES.map((f) => (
              <DetailBlock
                key={f.step}
                label={f.step}
                title={f.title}
                body={f.body}
                slot={f.slot}
              />
            ))}
          </div>
        </Section>

        <Section eyebrow="USE CASES" title="이렇게 씁니다" className="mt-28">
          <div className="mt-12 flex flex-col gap-20">
            {USE_CASES.map((c) => (
              <DetailBlock
                key={c.tag}
                label={c.tag}
                title={c.title}
                body={c.body}
                slot={c.slot}
              />
            ))}
          </div>
        </Section>

        <div className="mt-28 text-center">
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

function DetailBlock({ label, title, body, slot }) {
  return (
    <article>
      <ImageSlot note={slot} />
      <div className="mx-auto mt-7 max-w-xl text-center">
        <p className="text-[11px] font-bold tracking-[0.18em] text-cyan-300">{label}</p>
        <h3 className="mt-2 text-lg font-bold text-white">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-white/45">{body}</p>
      </div>
    </article>
  );
}

// Stands in for photography that doesn't exist yet, and says what goes here
// so the block can be reviewed as a layout rather than as a gap.
function ImageSlot({ note }) {
  return (
    <div className="flex aspect-[16/9] w-full items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02]">
      <p className="px-6 text-center text-xs text-white/25">
        이미지 자리
        <br />
        <span className="text-white/15">{note}</span>
      </p>
    </div>
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
