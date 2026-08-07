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
import { toaster } from '../../shared/ui/toaster';

export type ResultEntry = HistoryRecord;

// 履歴はユーザーにとって分析の記録そのもの。永続化の失敗を黙って捨てると
// 画面の表示とディスクの内容が食い違うため、必ず結果 (再起動後どうなるか) を伝える。
function notifyHistoryFailure(title: string, consequence: string, e: unknown) {
  toaster.create({
    type: 'error',
    title,
    description: `${consequence} ${String(e)}`,
    meta: { closable: true },
  });
}

interface AddInput {
  method: Method;
  variables: string[];
  options: AnalysisOptions;
  result: AnalysisResult;
  /** false なら履歴 JSONL へ保存しない (呼び出し元が MethodDefinition から算出する) */
  persist: boolean;
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
      .catch((e) =>
        notifyHistoryFailure('履歴を読み込めませんでした', '保存済みの履歴は表示されません。', e)
      );
  }, []);

  const addResult = useCallback((input: AddInput) => {
    const id = crypto.randomUUID();
    const { persist, ...record } = input;
    const entry: ResultEntry = {
      id,
      ...record,
      createdAt: Date.now(),
    };
    setResults((prev) => [...prev, entry]);
    setCurrentId(id);
    if (persist) {
      appendHistory(entry).catch((e) =>
        notifyHistoryFailure(
          '履歴に保存できませんでした',
          'この結果はアプリを再起動すると失われます。',
          e
        )
      );
    }
    return id;
  }, []);

  const selectResult = useCallback((id: string | null) => setCurrentId(id), []);
  const clearResults = useCallback(() => {
    setResults([]);
    setCurrentId(null);
    clearHistory().catch((e) =>
      notifyHistoryFailure(
        '履歴を削除できませんでした',
        '保存済みの履歴はアプリを再起動すると再表示されます。',
        e
      )
    );
  }, []);
  const removeResult = useCallback((id: string) => {
    setResults((prev) => prev.filter((r) => r.id !== id));
    setCurrentId((prev) => (prev === id ? null : prev));
    removeHistory(id).catch((e) =>
      notifyHistoryFailure(
        '履歴から削除できませんでした',
        'この結果はアプリを再起動すると再表示されます。',
        e
      )
    );
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
