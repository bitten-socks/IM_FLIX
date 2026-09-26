import { useEffect, useState } from 'react';

// Eases a view's content in on mount.
//
// Deliberately wrapped around a view's own column rather than the whole view:
// an opacity between 0 and 1 makes an element the containing block for any
// fixed-position descendant, which would tear the assignment panel off the
// viewport for the length of the fade.

export default function FadeIn({ children, duration = 320, delay = 0 }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(id);
  }, [delay]);

  return (
    <div
      style={{ transitionDuration: `${duration}ms` }}
      className={`transition-opacity ease-out ${shown ? 'opacity-100' : 'opacity-0'}`}
    >
      {children}
    </div>
  );
}
