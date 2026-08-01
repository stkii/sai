import { createContext, type ReactNode, useContext, useState } from 'react';
import type { LoadedDataset } from '../../shared/types';

interface ContextValue {
  dataset: LoadedDataset | null;
  setDataset: (d: LoadedDataset | null) => void;
}

const Ctx = createContext<ContextValue | null>(null);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<LoadedDataset | null>(null);
  return <Ctx.Provider value={{ dataset, setDataset }}>{children}</Ctx.Provider>;
}

export function useDataset() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDataset must be used within DatasetProvider');
  return ctx;
}
