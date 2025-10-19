import { useEffect, useMemo, useState, type FC } from 'react';
import { createRoot } from 'react-dom/client';

import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

import BaseButton from '../components/BaseButton';
import tauriIPC from '../ipc';
import type { DescriptiveOrder } from '../types';
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
      // 2) Rで分析実行（MVP: descriptive固定） + 並び順はRで適用
      const result = await tauriIPC.runRAnalysisWithDataset('descriptive', dataset, 30_000, order);

      // 3) トークンを発行し、URLで渡す（イベント依存を排除）
      const token = await tauriIPC.issueResultToken(result);
      const url = `pages/result.html?analysis=${encodeURIComponent('descriptive')}&token=${encodeURIComponent(token)}`;
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
    <main className="container analysis-panel-root h-[100vh] w-full relative overflow-hidden">
      <h1 className="absolute left-[16px] top-[12px] m-0">分析パネル</h1>
      <p className="analysis-panel-subtitle absolute left-[16px] m-0 muted small top-[48px] text-[#666666] text-[12px]">
        分析: {type} / シート: {sheet}
      </p>
      {error && (
        <p className="absolute left-[16px] top-[66px] text-[#b00020] text-[12px] m-0">エラー: {error}</p>
      )}
      <div className="absolute right-[16px] top-[40px]">
        <BaseButton
          widthGroup="analysis-primary"
          onClick={executeAnalysis}
          disabled={running || !path || !sheet || selectedVars.length === 0}
          label={<>{running ? '実行中…' : '実行'}</>}
        />
      </div>
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
    </main>
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(<AnalysisPage />);
