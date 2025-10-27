import { type FC, useEffect, useMemo, useState } from 'react';

import RegressionVariableSelector from '../../components/RegressionVariableSelector';
import type { ParsedTable } from '../../dto';
import tauriIPC from '../../ipc';

type Props = {
  path: string;
  sheet: string;
  onSelectionChange?: (dependent: string | null, independents: string[]) => void;
};

const RegressionAnalysisPage: FC<Props> = ({ path, sheet, onSelectionChange }) => {
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(() => table?.headers ?? [], [table]);

  const [dependent, setDependent] = useState<string | null>(null);
  const [independents, setIndependents] = useState<string[]>([]);

  useEffect(() => {
    if (!path || !sheet) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await tauriIPC.parseExcel(path, sheet);
        if (!cancelled) setTable(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path, sheet]);

  const applySelection = (next: { dependent: string | null; independents: string[] }) => {
    setDependent(next.dependent);
    setIndependents(next.independents);
    onSelectionChange?.(next.dependent, next.independents);
  };

  // 変更通知は onChange 経由（applySelection）でのみ行う。

  return (
    <section className="flex flex-1 min-h-0 flex-col">
      {loading && <p>読み込み中…</p>}
      {error && <p className="text-[#b00020]">エラー: {error}</p>}
      {!loading && !error && (
        <div className="flex flex-row gap-4 flex-1 min-h-0 items-stretch">
          <RegressionVariableSelector
            className="w-full"
            allVariables={headers}
            dependent={dependent}
            independents={independents}
            onChange={applySelection}
          />
        </div>
      )}
    </section>
  );
};

export default RegressionAnalysisPage;
