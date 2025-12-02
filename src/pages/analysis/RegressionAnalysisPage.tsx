import { type FC, useEffect, useMemo, useState } from 'react';
import RegressionInteractionDialog from '../../components/RegressionInteractionDialog';
import RegressionVariableSelector from '../../components/RegressionVariableSelector';
import type { ParsedTable } from '../../dto';
import tauriIPC from '../../ipc';
import type { RegressionInteraction } from '../../types';

type Props = {
  path: string;
  sheet: string;
  regressionInteractions?: RegressionInteraction[];
  regressionCenter?: boolean;
  onInteractionsChange?: (ints: RegressionInteraction[]) => void;
  onCenterChange?: (center: boolean) => void;
  onSelectionChange?: (dependent: string | null, independents: string[]) => void;
};

const RegressionAnalysisPage: FC<Props> = ({
  path,
  sheet,
  regressionInteractions,
  regressionCenter = false,
  onInteractionsChange,
  onCenterChange,
  onSelectionChange,
}) => {
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(() => table?.headers ?? [], [table]);

  const [dependent, setDependent] = useState<string | null>(null);
  const [independents, setIndependents] = useState<string[]>([]);
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);
  const [center, setCenter] = useState<boolean>(regressionCenter);

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

  const currentInteractions = regressionInteractions ?? [];
  const hasIndependents = independents.length > 0;

  return (
    <section className="flex flex-1 min-h-0 flex-col">
      {loading && <p>読み込み中…</p>}
      {error && <p className="text-[#b00020]">エラー: {error}</p>}
      {!loading && !error && (
        <>
          <div className="flex flex-row gap-4 flex-1 min-h-0 items-stretch">
            <RegressionVariableSelector
              className="w-full"
              allVariables={headers}
              dependent={dependent}
              independents={independents}
              onChange={applySelection}
            />
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">交互作用</span>
                <span className="text-xs text-gray-600">
                  変数の組み合わせから交互作用項を自動で作成します（元のシートは変更されません）。
                </span>
              </div>
              <button
                type="button"
                className="text-sm px-3 py-1.5 border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => hasIndependents && setInteractionDialogOpen(true)}
                disabled={!hasIndependents}
              >
                交互作用を編集…
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {!hasIndependents && <span>交互作用を設定するには、先に独立変数を選択してください。</span>}
              {hasIndependents && currentInteractions.length === 0 && (
                <span>交互作用は追加されていません。</span>
              )}
              {hasIndependents && currentInteractions.length > 0 && (
                <span>交互作用: {currentInteractions.map((it) => it.label).join(', ')}</span>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={center}
                onChange={(e) => {
                  const next = e.target.checked;
                  setCenter(next);
                  onCenterChange?.(next);
                }}
              />
              <span>独立変数を平均中心化して回帰を行う</span>
            </label>
          </div>
          <RegressionInteractionDialog
            isOpen={interactionDialogOpen}
            onClose={() => setInteractionDialogOpen(false)}
            variables={independents}
            interactions={currentInteractions}
            onChange={(ints) => onInteractionsChange?.(ints)}
          />
        </>
      )}
    </section>
  );
};

export default RegressionAnalysisPage;
