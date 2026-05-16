import { createContext, type ReactNode, useContext, useState } from 'react';
import type { DatasetSummary } from '../../shared/types';

interface ContextValue {
  summary: DatasetSummary | null;
  setSummary: (s: DatasetSummary | null) => void;
}

const Ctx = createContext<ContextValue | null>(null);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  return <Ctx.Provider value={{ summary, setSummary }}>{children}</Ctx.Provider>;
}

export function useDataset() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDataset must be used within DatasetProvider');
  return ctx;
}
