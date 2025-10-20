import { useEffect, useMemo, useState, type FC } from 'react';
import { createRoot } from 'react-dom/client';

import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

import RunField from '../components/RunField';
import '../globals.css';
import tauriIPC from '../ipc';
import type { DescriptiveOrder } from '../types';
import type { CorrOptionValue } from '../types';
import CorrAnalysisPage from './analysis/CorrAnalysisPage';
import DescriptiveStatsPage from './analysis/DescriptiveStatsPage';

const AnalysisPage: FC = () => {
  const query = useMemo(() => new URLSearchParams(window.location.search || ''), []);
  const path = query.get('path') || '';
  const sheet = query.get('sheet') || '';
  const type = query.get('analysis') || query.get('type') || '';

  const [selectedVars, setSelectedVars] = useState<string[]>([]);
  const [order, setOrder] = useState<DescriptiveOrder>('default');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [corrOptions, setCorrOptions] = useState<CorrOptionValue | null>(null);

  useEffect(() => {
    const win = getCurrentWebviewWindow();
    let unlisten: (() => void) | null = null;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      unlisten = await win.listen('analysis:load', (_ev: unknown) => {
        // 既存ウィンドウ再利用時の初期化処理はここに書く
      });
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  async function executeAnalysis() {
    if (!path || !sheet || selectedVars.length === 0) return;
    setError(null);
    setRunning(true);
    let closed = false;
    try {
      // 1) Excelから数値データセットを抽出
      const dataset = await tauriIPC.buildNumericDataset(path, sheet, selectedVars);
      // 2) Rで分析実行（種類に応じて切り替え）
      let result;
      if (type === 'descriptive') {
        const options = { order };
        result = await tauriIPC.runRAnalysisWithDataset(
          'descriptive',
          dataset,
          30_000,
          JSON.stringify(options)
        );
      } else if (type === 'correlation') {
        const sel =
          corrOptions ??
          ({
            methods: { pearson: true, kendall: false, spearman: false },
            alt: 'two.sided',
            use: 'all.obs',
          } as const);
        const opts = {
          methods: Object.entries(sel.methods)
            .filter(([, v]) => !!v)
            .map(([k]) => k),
          alt: sel.alt,
          use: sel.use,
        } as { methods: string[]; alt: string; use: string };
        result = await tauriIPC.runRAnalysisWithDataset('correlation', dataset, 30_000, JSON.stringify(opts));
      } else {
        throw new Error(`未対応の分析種別: ${type}`);
      }

      // 3) トークンを発行し、URLで渡す（イベント依存を排除）
      const token = await tauriIPC.issueResultToken(result);
      const url = `pages/result.html?analysis=${encodeURIComponent(type)}&token=${encodeURIComponent(token)}`;
      await tauriIPC.openOrReuseWindow('result', url);
      // 結果ウィンドウを開いたら、分析ウィンドウは安全に閉じる
      // 新規ウィンドウ作成とフォーカス移行をOS側に委ねるため、次フレームで閉じる
      await new Promise((r) => setTimeout(r, 0));
      const current = getCurrentWebviewWindow();
      await current.close();
      closed = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!closed) setRunning(false);
    }
  }

  return (
    <main className="w-full h-full flex flex-col bg-white rounded-2xl shadow-md p-4 overflow-hidden">
      <h1 className="text-2xl font-bold mb-1">分析パネル</h1>
      <p className="text-sm mb-2">
        分析: {type} / シート: {sheet}
      </p>
      {error && <p className="text-[#b00020] text-sm mb-2">エラー: {error}</p>}

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {type === 'descriptive' ? (
          <DescriptiveStatsPage
            path={path}
            sheet={sheet}
            onSelectionChange={(sel, ord) => {
              setSelectedVars(sel);
              setOrder(ord);
            }}
          />
        ) : null}
        {type === 'correlation' ? (
          <CorrAnalysisPage
            path={path}
            sheet={sheet}
            onSelectionChange={(sel, opts) => {
              setSelectedVars(sel);
              setCorrOptions(opts);
            }}
          />
        ) : null}
      </div>

      <RunField
        className="mt-3"
        onRun={executeAnalysis}
        onClose={() => getCurrentWebviewWindow().close()}
        running={running}
        disabled={running || !path || !sheet || selectedVars.length === 0}
      />
    </main>
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(<AnalysisPage />);
