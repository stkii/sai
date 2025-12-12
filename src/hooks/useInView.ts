import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * React hook that tells you if a DOM element is inside a viewport
 * using the IntersectionObserver API.
 *
 * Use this for lazy loading, scroll based animations,
 * or delaying heavy work until an element comes close to view.
 *
 * @param root Element used as the viewport for intersection checks.
 *             Defaults to null, which means the browser viewport.
 * @param rootMargin Margin around the root, same syntax as CSS margin.
 *                   For example: '0px' or '600px 0px'. Defaults to '0px'.
 * @param threshold Visibility threshold from 0 to 1, or an array of numbers.
 *                  The observer is intersecting when this ratio is reached.
 *                  Defaults to 0 so any overlap counts as visible.
 * @param once If true, stop observing after the element becomes visible
 *             and keep inView as true afterwards.
 *             If false, inView becomes false again when it leaves view.
 *
 * @returns An object with:
 *          - ref: React ref to attach to the observed element
 *          - inView: boolean that says if the element is in view
 *
 * Fallback behavior:
 * When IntersectionObserver is not available, for example in SSR or tests,
 * the hook always reports inView as true for compatibility.
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const { ref, inView } = useInView<HTMLDivElement>({
 *     rootMargin: '600px 0px',
 *     threshold: 0,
 *     once: false,
 *   });
 *
 *   return (
 *     <div ref={ref}>
 *       {inView ? <HeavyContent /> : <Placeholder />}
 *     </div>
 *   );
 * };
 * ```
 */
export const useInView = <T extends Element>(
  params: {
    root?: Element | Document | null;
    rootMargin?: string;
    threshold?: number | number[];
    once?: boolean;
  } = {}
) => {
  const { root = null, rootMargin = '0px', threshold = 0, once = false } = params;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  const supportsIO = typeof IntersectionObserver !== 'undefined';

  // IntersectionObserver configuration derived from the hook parameters
  const ioInit = useMemo<IntersectionObserverInit>(
    () => ({ root: (root as Element | null) ?? null, rootMargin, threshold }),
    [root, rootMargin, threshold]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!supportsIO) {
      // Fallback: treat the element as visible when IntersectionObserver is unavailable
      setInView(true);
      return;
    }

    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const visible = e.isIntersecting;
        if (visible) setInView(true);
        else if (!once) setInView(false); // Only reset to false when `once` is disabled
        if (visible && once) {
          obs.disconnect();
        }
      }
    }, ioInit);

    obs.observe(el);
    return () => obs.disconnect();
  }, [ioInit, once, supportsIO]);

  return { ref, inView } as const;
};
