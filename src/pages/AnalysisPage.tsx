import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { type FC, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import RunField from '../components/RunField';
import '../globals.css';
import tauriIPC from '../ipc';
import { ANALYSIS_REGISTRY, type AnalysisType } from '../registry';
import type { CorrOptionValue, DescriptiveOrder } from '../types';

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
      // 2) レジストリ経由でオプションを構築し、Rで実行
      const analysisType: AnalysisType = (type as AnalysisType) || 'descriptive';
      const def = ANALYSIS_REGISTRY[analysisType];
      if (!def) throw new Error(`未対応の分析種別: ${type}`);
      const optionsJson = def.buildOptionsJson({ selectedVars, order, corrOptions }) ?? undefined;
      const result = await tauriIPC.runRAnalysisWithDataset(analysisType, dataset, 30_000, optionsJson);

      // 3) トークンを発行し、payload で結果ビューへ渡す（URLクエリ依存を排除）
      const token = await tauriIPC.issueResultToken(result);
      const payload: Record<string, unknown> = {
        analysis: analysisType,
        token,
        path,
        sheet,
        variables: selectedVars,
        dataset,
      };
      payload.params = def.buildParamsForPayload({ selectedVars, order, corrOptions });

      // 新規ウィンドウ作成直後はJSリスナー未登録の可能性があるため、
      // ローカルストレージへペンディングペイロードを格納して受け渡しの保険をかける
      try {
        localStorage.setItem('sai:pending-result-payload', JSON.stringify(payload));
      } catch {
        // ストレージ失敗は致命ではない（イベント経由にフォールバック）
      }
      await tauriIPC.openOrReuseWindow('result', 'pages/result.html', payload);
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
        {(() => {
          const analysisType: AnalysisType = (type as AnalysisType) || 'descriptive';
          const def = ANALYSIS_REGISTRY[analysisType];
          if (!def) return <p className="text-[#b00020]">未対応の分析種別です: {type}</p>;
          return def.renderEditor({
            path,
            sheet,
            state: { selectedVars, order, corrOptions },
            setSelectedVars,
            setOrder,
            setCorrOptions: (v) => setCorrOptions(v),
          });
        })()}
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
