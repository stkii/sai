import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { appendHistory, clearHistory, loadHistory, removeHistory } from '../../shared/ipc';
import type { AnalysisOptions, AnalysisResult, HistoryRecord, Method } from '../../shared/types';

export type ResultEntry = HistoryRecord;

interface AddInput {
  method: Method;
  variables: string[];
  options: AnalysisOptions;
  result: AnalysisResult;
}

interface ContextValue {
  results: ResultEntry[];
  currentId: string | null;
  current: ResultEntry | null;
  addResult: (input: AddInput) => string;
  selectResult: (id: string | null) => void;
  clearResults: () => void;
  removeResult: (id: string) => void;
}

const Ctx = createContext<ContextValue | null>(null);

export function ResultProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory()
      .then((records) => setResults(records))
      .catch((e) => console.warn('履歴の読込に失敗:', e));
  }, []);

  const addResult = useCallback((input: AddInput) => {
    const id = crypto.randomUUID();
    const entry: ResultEntry = {
      id,
      ...input,
      createdAt: Date.now(),
    };
    setResults((prev) => [...prev, entry]);
    setCurrentId(id);
    if (input.method !== 'power') {
      appendHistory(entry).catch((e) => console.warn('履歴の保存に失敗:', e));
    }
    return id;
  }, []);

  const selectResult = useCallback((id: string | null) => setCurrentId(id), []);
  const clearResults = useCallback(() => {
    setResults([]);
    setCurrentId(null);
    clearHistory().catch((e) => console.warn('履歴の削除に失敗:', e));
  }, []);
  const removeResult = useCallback((id: string) => {
    setResults((prev) => prev.filter((r) => r.id !== id));
    setCurrentId((prev) => (prev === id ? null : prev));
    removeHistory(id).catch((e) => console.warn('履歴の削除に失敗:', e));
  }, []);

  const current = useMemo(
    () => results.find((r) => r.id === currentId) ?? null,
    [results, currentId]
  );

  const value = useMemo<ContextValue>(
    () => ({ results, currentId, current, addResult, selectResult, clearResults, removeResult }),
    [results, currentId, current, addResult, selectResult, clearResults, removeResult]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useResult() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useResult must be used within ResultProvider');
  return ctx;
}
