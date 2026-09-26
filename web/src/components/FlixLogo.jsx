// The wordmark, shared by the top bar and the intro.
//
// The X turns in both places but for different reasons -- on hover in the bar,
// on a timeline during the intro -- so the rotation is a prop rather than a
// hover class. Keeping one component means the letter-spacing and the pivot
// can't drift apart between the two.

const SIZES = {
  sm: 'text-2xl',
  xl: 'text-5xl sm:text-6xl',
};

export default function FlixLogo({ size = 'sm', xAngle = null, interactive = false }) {
  // The X pivots on its own centre; without an explicit origin it swings from
  // the edge of the inline box and drifts sideways as it turns.
  const xStyle = xAngle === null ? undefined : { transform: `rotate(${xAngle}deg)` };

  return (
    <span className={`font-logo font-bold text-white ${SIZES[size]}`}>
      <span className="tracking-[0.25em]">
        FLI
        <span
          style={xStyle}
          className={`inline-block origin-center tracking-normal transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            interactive ? 'group-hover:rotate-45' : ''
          }`}
        >
          X
        </span>
      </span>{' '}
      <span className="tracking-wide text-cyan-400">MAP</span>
    </span>
  );
}
