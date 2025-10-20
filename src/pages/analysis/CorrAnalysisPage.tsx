import { useEffect, useMemo, useState, type FC } from 'react';

import CorrOption from '../../components/CorrOption';
import type { CorrOptionValue } from '../../types';
import VariableSelector from '../../components/VariableSelector';
import type { ParsedTable } from '../../dto';
import tauriIPC from '../../ipc';

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
  }, [options]);

  return (
    <section className="corr-panel-abs absolute left-[16px] right-[16px] top-[80px] bottom-[48px]">
      {loading && <p>読み込み中…</p>}
      {error && <p className="error text-[#b00020]">エラー: {error}</p>}
      {!loading && !error && (
        <>
          <div className="corr-content absolute inset-0">
            <div className="corr-varsel-abs absolute left-0 right-[288px] top-0 bottom-0">
              <VariableSelector allVariables={headers} value={selected} onChange={applySelection} />
            </div>
            <div className="corr-option-abs absolute right-0 top-0 left-auto w-[272px]">
              <CorrOption value={options} onChange={setOptions} />
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default CorrAnalysisPage;
