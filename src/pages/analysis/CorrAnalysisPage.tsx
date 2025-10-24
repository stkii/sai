import { type FC, useEffect, useMemo, useState } from 'react';

import CorrOption from '../../components/CorrOption';
import VariableSelector from '../../components/VariableSelector';
import type { ParsedTable } from '../../dto';
import tauriIPC from '../../ipc';
import type { CorrOptionValue } from '../../types';

type Props = {
  path: string;
  sheet: string;
  onSelectionChange?: (selectedVariables: string[], options: CorrOptionValue) => void;
};

const CorrAnalysisPage: FC<Props> = ({ path, sheet, onSelectionChange }) => {
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(() => table?.headers ?? [], [table]);
  const [selected, setSelected] = useState<string[]>([]);
  const [options, setOptions] = useState<CorrOptionValue>({
    methods: { pearson: true, kendall: false, spearman: false },
    alt: 'two.sided',
    use: 'all.obs',
  });

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

  const applySelection = (next: string[]) => {
    setSelected(next);
    onSelectionChange?.(next, options);
  };

  useEffect(() => {
    onSelectionChange?.(selected, options);
  }, [options, selected, onSelectionChange]);

  return (
    <section className="flex flex-1 min-h-0 flex-col">
      {loading && <p>読み込み中…</p>}
      {error && <p className="text-[#b00020]">エラー: {error}</p>}
      {!loading && !error && (
        <div className="flex flex-row gap-4 flex-1 min-h-0 items-stretch">
          <VariableSelector
            className="w-1/2"
            allVariables={headers}
            value={selected}
            onChange={applySelection}
          />
          <CorrOption className="w-1/2" value={options} onChange={setOptions} />
        </div>
      )}
    </section>
  );
};

export default CorrAnalysisPage;
