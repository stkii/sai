import type { FC, ReactNode } from 'react';
import { useInView } from '../hooks/useInView';

type Props = {
  estimatedHeight: number;
  className?: string;
  children: ReactNode;
};

const LazyBlock: FC<Props> = ({ estimatedHeight, className, children }) => {
  const { ref, inView } = useInView<HTMLDivElement>({
    root: null,
    rootMargin: '600px 0px',
    threshold: 0,
    once: false,
  });
  return (
    <div ref={ref} className={className}>
      {inView ? children : <div style={{ height: Math.max(estimatedHeight, 100) }} className="w-full" />}
    </div>
  );
};

export default LazyBlock;
