import { useCallback, useState } from 'react';
import { useDataset } from '../data/state/DatasetContext';
import { useResult } from '../result/state/ResultContext';
import { runAnalysis } from '../shared/ipc/analysis';
import type { AnalysisOptions, Method } from '../shared/types';
import { findMethod } from './methods';

interface RunInput {
  method: Method;
  variables: string[];
  options: AnalysisOptions;
}

/**
 * 分析の実行フロー (IPC 呼出 → 結果の登録 → 履歴の永続化判定)。
 * モーダルの見た目とは独立させ、呼び出し元は成否だけを受け取る。
 *
 * `run` が false を返すときは必ず `error` が立っている。理由を伴わない false を
 * 返すと、呼び出し元はモーダルを閉じず何も表示しないため操作が無反応になる。
 */
export function useRunAnalysis() {
  const { dataset } = useDataset();
  const { addResult } = useResult();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const run = useCallback(
    async ({ method, variables, options }: RunInput): Promise<boolean> => {
      const mod = findMethod(method);
      if (!mod) {
        setError(`未対応の分析メソッドです: ${method}`);
        return false;
      }
      const requiresDataset = mod.definition.requiresDataset !== false;
      if (requiresDataset && !dataset) {
        setError('データセットが読み込まれていません');
        return false;
      }

      setBusy(true);
      setError(null);
      try {
        const result = await runAnalysis({
          datasetKey: requiresDataset && dataset ? dataset.key : null,
          method,
          variables,
          options,
        });
        addResult({
          method,
          variables,
          options,
          result,
          persist: mod.definition.persistHistory !== false,
        });
        return true;
      } catch (e) {
        setError(String(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [dataset, addResult]
  );

  return { busy, error, run, clearError };
}
