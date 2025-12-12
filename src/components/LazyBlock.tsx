import type { FC, ReactNode } from 'react';
import { useInView } from '../hooks/useInView';

type Props = {
  /** Estimated height (in pixels) of the content when not rendered. Used for placeholder to prevent layout shift. */
  estimatedHeight: number;
  /** Optional CSS class to apply to the wrapper div */
  className?: string;
  /** Content to render when the block is in view */
  children: ReactNode;
};

/**
 * A lazy-loading wrapper that renders its children only while the block is near the viewport,
 * and shows a fixed-height placeholder (using `estimatedHeight`) when it is far away.
 *
 * @example
 * ```tsx
 * <LazyBlock estimatedHeight={400} className="mb-4">
 *   <HeavyTable data={data} />
 * </LazyBlock>
 * ```
 */
const LazyBlock: FC<Props> = ({ estimatedHeight, className, children }) => {
  // Observe visibility relative to the viewport, starting about 600px before it enters
  const { ref, inView } = useInView<HTMLDivElement>({
    root: null,
    rootMargin: '600px 0px',
    threshold: 0,
    once: false, // Keep observing to mount/unmount as it enters/leaves view
  });
  return (
    <div ref={ref} className={className}>
      {inView ? (
        children
      ) : (
        // Placeholder with estimated height to preserve layout and scroll position
        <div style={{ height: Math.max(estimatedHeight, 100) }} className="w-full" />
      )}
    </div>
  );
};

export default LazyBlock;
