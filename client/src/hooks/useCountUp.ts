import { useCallback, useEffect, useRef, useState } from 'react';

interface CountUpOptions {
  duration?: number; // milliseconds
  startOnView?: boolean;
}

export function useCountUp<T extends HTMLElement = HTMLDivElement>(
  target: number,
  { duration = 1200, startOnView = true }: CountUpOptions = {}
): [number, React.RefObject<T | null>] {
  const [count, setCount] = useState(0);
  const elementRef = useRef<T | null>(null);
  const startedRef = useRef(false);

  const animate = useCallback(() => {
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo / easeOutCubic curve
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(ease * target);

      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    requestAnimationFrame(step);
  }, [duration, target]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || !startOnView) {
      if (!startOnView) {
        animate();
      }
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [animate, startOnView]);

  return [count, elementRef];
}
