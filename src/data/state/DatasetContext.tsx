import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import type { LoadedDataset } from '../../shared/types';

interface ContextValue {
  dataset: LoadedDataset | null;
  setDataset: (d: LoadedDataset | null) => void;
}

const Ctx = createContext<ContextValue | null>(null);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<LoadedDataset | null>(null);
  // 毎レンダーで新しい object を渡すと、全行を描く DataPreview まで再描画が走る
  const value = useMemo<ContextValue>(() => ({ dataset, setDataset }), [dataset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDataset() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDataset must be used within DatasetProvider');
  return ctx;
}
