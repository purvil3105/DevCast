import { useEffect, useRef, useState } from 'react';

export function useReveal<T extends HTMLElement = HTMLElement>(root?: Element | null, delay = 0) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); observer.disconnect(); }
    }, { root: root ?? null, threshold: 0.12 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [root]);

  return { ref, inView, style: { '--reveal-delay': `${delay}ms` } as React.CSSProperties };
}
