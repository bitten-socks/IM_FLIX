import FadeIn from '../components/FadeIn';
import ManualLink from '../components/ManualLink';
import ProductCarousel from '../components/ProductCarousel';
import { ROUTES, navigate } from '../lib/router';

// The product page, which is the detail page -- the same images that go up on
// the marketplace listing, in the same order.
//
// This used to be a layout waiting on photography: four features and three use
// cases, each led by an empty 4:5 slot describing the picture that belonged in
// it. The pictures arrived as a finished detail page instead, laid out whole
// rather than as loose images, so the layout it was waiting for no longer had
// anything to hold. Keeping both would have meant writing the same product
// twice and remembering to change both.
//
// The captions live in `alt`, which is the only place the words survive now
// that they are drawn into the images: screen readers read them, and search
// engines have something to index besides the filename.

const DETAIL = [
  { src: '1.jpg', alt: 'FLIX — 키링이 된 매크로 패드. VIBE 4 · 6 · 9 제품과 패키지' },
  {
    src: '2.jpg',
    alt:
      '키캡으로 스트레스 해소 · 설치 없이 키보드 맵핑 · 축 커스텀 가능. ' +
      '가방에 걸린 키링, 노트북에 연결한 모습, 교체용 축',
  },
  {
    src: '3.jpg',
    alt:
      '언제 쓰는 건가요 — AI와 작업할 때, 설계·편집 작업, 게임 키 분리, 게임 커맨드 등록. ' +
      '반복적인 작업과 키보드로 누르기 어려운 작업에 사용합니다',
  },
  {
    src: '4.jpg',
    alt:
      'FLIX 라인업 — VIBE 4는 2×2 미니멀형, VIBE 6은 3×2 밸런스형, VIBE 9는 3×3 확장형',
  },
  {
    src: '5.png',
    alt: '매핑은 어떻게 하나요 — 연결, 설정, 확정 세 단계. 프로그램 설치 없이 브라우저에서',
  },
  {
    src: '6.png',
    alt:
      '무엇을 매핑할 수 있나요 — 문자·숫자·기호, 단축키 조합, 단어, 미디어, 마우스 휠, ' +
      '여러 키 순서대로. 설정은 기기 안에 저장됩니다',
  },
  {
    src: '7.png',
    alt: '고급 매크로 설정 — 순서대로, 동시에, 손 뗄 때까지 세 가지 타이밍',
  },
  {
    src: '8.png',
    alt: '게임에 유용한 매크로 — 잡고 있다가 같이 떼기(QW), 뗐다가 다시 누르기(DD)',
  },
  {
    src: '9.png',
    alt:
      '폰·태블릿에서 사용 — 모든 앱에서 미디어 키, 대부분의 앱에서 스크롤, ' +
      '숏폼 피드 넘기기, 앱에 따라 동작하는 키',
  },
  {
    src: '10.png',
    alt:
      '유의사항 — 키 맵핑은 자판의 위치로, 한 키에 최대 16자, 설정은 컴퓨터에서만, ' +
      'Safari·Firefox 미지원, 회사·학교 네트워크에서는 접속이 막힐 수 있음',
  },
];

// The first four are photographs and ride far smaller as JPEG -- 2.9MB of PNG
// down to 0.9MB, with nothing visible lost at this quality even on the body
// text laid over them. The rest are flat colour and lettering, where PNG is
// both smaller and exact, so they stay as they are.
//
// The images are 860x1100. Giving the browser that ratio up front stops the
// page jumping as each one arrives, and everything below the first is left to
// load on approach -- ten of them is a few megabytes, and nobody has scrolled
// to the last one yet.
const SHEET_WIDTH = 860;
const SHEET_HEIGHT = 1100;

// Bound by the height of the window rather than its width, so a sheet is never
// taller than the screen showing it. At 860 wide a sheet stands 1100 tall,
// which is more than a laptop has, and the bottom of every one was cut off.
// 76vh of width comes to 97vh of height -- the whole sheet, with a little room
// under it. The 860 cap keeps it from being drawn larger than the image it is
// made of on a tall display.
//
// The carousel above shares it: the two sit in one column down the page, and
// written out twice they would eventually stop matching.
const COLUMN = 'mx-auto w-full max-w-[min(860px,76vh)]';

export default function BrowseView({ onNavigate = navigate }) {
  return (
    <FadeIn>
      <div className="mx-auto max-w-4xl px-6 pb-28 pt-10">
        <Section eyebrow="PRODUCTS" title="제품 둘러보기">
          <p className="mx-auto mb-8 mt-3 max-w-lg text-center text-sm leading-relaxed text-white/45">
            키 개수만 다르고 쓰는 방법은 같습니다. 좌우로 넘겨 보세요.
          </p>
        </Section>

        <div className={COLUMN}>
          <ProductCarousel />
        </div>

        {/* The sheets carry their own background and padding, so nothing is
            drawn around them -- a card here would be a frame around a frame. */}
        <div className={`${COLUMN} mt-24 flex flex-col overflow-hidden rounded-2xl`}>
          {DETAIL.map(({ src, alt }, i) => (
            <img
              key={src}
              src={`/detail/${src}`}
              alt={alt}
              width={SHEET_WIDTH}
              height={SHEET_HEIGHT}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="block w-full"
            />
          ))}
        </div>

<div className="mt-20 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => onNavigate(ROUTES.MAP)}
            className="rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            키 맵핑 시작하기
          </button>
          <ManualLink tone="solid" />
        </div>
      </div>
    </FadeIn>
  );
}

function Section({ eyebrow, title, className = '', children }) {
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
