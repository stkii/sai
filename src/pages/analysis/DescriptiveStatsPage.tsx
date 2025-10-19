import { useEffect, useMemo, useState, type FC } from 'react';

import DescriptiveOption from '../../components/DescriptiveOption';
import VariableSelector from '../../components/VariableSelector';
import type { ParsedTable } from '../../dto';
import tauriIPC from '../../ipc';
import type { DescriptiveOrder } from '../../types';

type Props = {
  path: string;
  sheet: string;
  onSelectionChange?: (selectedVariables: string[], order: DescriptiveOrder) => void;
};

const DescriptiveStatsPanel: FC<Props> = ({ path, sheet, onSelectionChange }) => {
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(() => table?.headers ?? [], [table]);
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<DescriptiveOrder>('default');

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
    onSelectionChange?.(next, order);
  };

  useEffect(() => {
    onSelectionChange?.(selected, order);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  return (
    <section className="desc-panel-abs absolute left-[16px] right-[16px] top-[80px] bottom-[48px]">
      {loading && <p>読み込み中…</p>}
      {error && <p className="error text-[#b00020]">エラー: {error}</p>}
      {!loading && !error && (
        <>
          <div className="desc-content absolute inset-0">
            <div className="desc-varsel-abs absolute left-0 right-[288px] top-0 bottom-0">
              <VariableSelector allVariables={headers} value={selected} onChange={applySelection} />
            </div>
            <div className="desc-order-abs absolute right-0 top-0 left-auto w-[272px]">
              <DescriptiveOption value={order} onChange={setOrder} />
            </div>
          </div>

          {/* 内蔵の実行ボタンは削除。実行は親(AnalysisPage)の共通ボタンで行う */}
        </>
      )}
    </section>
  );
};

export default DescriptiveStatsPanel;
