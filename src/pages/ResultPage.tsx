import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { save } from '@tauri-apps/plugin-dialog';
import { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import BaseButton from '../components/BaseButton';
import CorrelationTables from '../components/CorrelationTables';
import DataTable from '../components/DataTable';
import MultiBlockTable from '../components/MultiBlockTable';
import { type ParsedTable, zParsedTable, zResultPayload } from '../dto';
import '../globals.css';
import tauriIPC from '../ipc';

type AnalysisEntry = {
  id: string;
  createdAt: number;
  analysis: string;
  source: { filePath: string; sheet: string };
  variables: string[];
  params?: unknown;
  result: ParsedTable;
};

type ResultPayload = {
  token?: string;
  analysis?: string;
  path?: string;
  sheet?: string;
  variables?: string[];
  params?: unknown;
  dataset?: Record<string, Array<number | null>>;
};

const ResultPage: FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [entries, setEntries] = useState<AnalysisEntry[]>([]);
  const consumedTokensRef = useRef<Set<string>>(new Set());
  const entryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sessionIdRef = useRef<string>(`${Math.random().toString(16).slice(2)}-${Date.now().toString(36)}`);

  // 共通ハンドラ
  const handlePayload = useCallback(async (p: ResultPayload) => {
    // 受信ペイロードのruntime検証
    const parsed = zResultPayload.safeParse(p);
    if (!parsed.success) {
      throw new Error(`結果ペイロードのスキーマ不一致: ${parsed.error.message}`);
    }
    const pdata = parsed.data;
    const token = String(pdata.token || '');
    const analysis = String(pdata.analysis || '');
    const path = String(pdata.path || '');
    const sheet = String(pdata.sheet || '');
    const variables = pdata.variables || [];
    const params = pdata.params;
    if (!token) return;
    try {
      if (consumedTokensRef.current.has(token)) return;
      const cacheKey = `sai:result-token:${token}`;
      let result: ParsedTable | null = null;
      try {
        const raw = sessionStorage.getItem(cacheKey);
        if (raw) {
          const json = JSON.parse(raw);
          const ok = zParsedTable.safeParse(json);
          if (ok.success) {
            result = ok.data as ParsedTable;
          }
        }
      } catch {
        // 破損していれば読み捨て
      }
      if (!result) {
        const r = await tauriIPC.consumeResultToken(token);
        const ok = zParsedTable.safeParse(r);
        if (!ok.success) {
          throw new Error(`結果テーブルのスキーマ不一致: ${ok.error.message}`);
        }
        result = ok.data as ParsedTable;
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(result));
        } catch {
          void 0;
        }
      }
      if (!result) return;
      consumedTokensRef.current.add(token);
      const entry: AnalysisEntry = {
        id: token,
        createdAt: Date.now(),
        analysis,
        source: { filePath: path, sheet },
        variables,
        params,
        result,
      };
      setEntries((cur) => [...cur, entry]);
      try {
        await tauriIPC.appendAnalysisLog(entry);
      } catch {
        // ログ失敗はUIのブロック要因にしない
      }
      setTimeout(() => {
        const el = entryRefs.current[entry.id];
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // 初回マウント時に Analysis 側が置いたペンディングペイロードを確認
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sai:pending-result-payload');
      if (raw) {
        const json = JSON.parse(raw);
        const ok = zResultPayload.safeParse(json);
        if (ok.success) {
          const p = ok.data as ResultPayload;
          // 一度取り出したら消す（多重処理防止）
          localStorage.removeItem('sai:pending-result-payload');
          void handlePayload(p);
        } else {
          // 壊れたペイロードは捨てる
          localStorage.removeItem('sai:pending-result-payload');
        }
      }
    } catch {
      // 読み取り失敗は無視（イベントに委ねる）
    }
  }, [handlePayload]);

  // result:load イベントでの追記
  useEffect(() => {
    const win = getCurrentWebviewWindow();
    let unlisten: (() => void) | null = null;
    (async () => {
      unlisten = await win.listen('result:load', async (ev: { payload: unknown }) => {
        const p = (ev.payload as ResultPayload | null) ?? null;
        if (!p) return;
        await handlePayload(p);
      });
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, [handlePayload]);

  const formatTime = (ms: number) => {
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  async function onExport() {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const hms = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const suggested = `sai-export-${ymd}-${hms}.json`;
    const dest = await save({ defaultPath: suggested, filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (!dest) return;
    const exportObj = {
      app: 'sai',
      format: 1,
      exportedAt: now.toISOString(),
      sessionId: sessionIdRef.current,
      entries,
    };
    try {
      await tauriIPC.saveTextFile(dest, JSON.stringify(exportObj, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="w-full h-screen flex flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#E0E0E0] sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="履歴パネルの表示/非表示"
            className="px-2 py-1 text-sm rounded hover:bg-gray-50"
            onClick={() => setShowSidebar((v) => !v)}
            title="履歴パネルの表示/非表示"
          >
            ☰
          </button>
          <h1 className="text-xl font-semibold m-0">結果ビューア</h1>
        </div>
        <BaseButton onClick={onExport} label="⬇ エクスポート" />
      </div>
      {error && <p className="text-[#b00020] px-3 py-1 border-b border-[#E0E0E0]">エラー: {error}</p>}
      <div
        className={`flex-1 min-h-0 flex flex-row overflow-hidden ${showSidebar ? 'divide-x divide-[#E0E0E0]' : ''}`}
      >
        {/* 左: 履歴（固定幅） */}
        {showSidebar && (
          <aside className="w-[260px] shrink-0 flex flex-col min-h-0 overflow-hidden">
            <div className="text-sm text-gray-600 px-3 py-2 sticky top-0 bg-white z-10">分析履歴</div>
            <div className="flex-1 overflow-y-auto px-2 py-1">
              {entries.length === 0 && (
                <div className="text-xs text-gray-500 px-1 py-1">まだ結果はありません</div>
              )}
              {entries.map((e, idx) => (
                <button
                  type="button"
                  key={e.id}
                  className="w-full text-left text-sm px-2 py-1 rounded hover:bg-gray-50"
                  onClick={() => {
                    const el = entryRefs.current[e.id];
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  title={`${e.analysis} (${e.source.sheet})`}
                >
                  <span className="text-gray-500 mr-1">#{idx + 1}</span>
                  <span className="font-medium">{e.analysis || 'unknown'}</span>
                  <span className="text-gray-500 ml-2">{formatTime(e.createdAt)}</span>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* 右: 結果（可変幅） */}
        <section className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="text-sm text-gray-600 px-3 py-2 sticky top-0 bg-white z-10">分析結果</div>
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {entries.map((e, idx) => (
              <div
                key={e.id}
                ref={(el) => {
                  entryRefs.current[e.id] = el;
                }}
                className="mb-4 pb-3 border-b last:border-b-0"
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="text-base font-semibold m-0">
                    #{idx + 1} {e.analysis}
                    <span className="text-gray-500 text-xs ml-2">{formatTime(e.createdAt)}</span>
                  </h2>
                  <div className="text-xs text-gray-500">
                    {e.source.sheet}
                    {e.variables?.length ? ` / 変数: ${e.variables.length}` : ''}
                  </div>
                </div>
                {e.analysis === 'regression' ? (
                  <MultiBlockTable data={e.result} fluid />
                ) : e.analysis === 'correlation' ? (
                  <CorrelationTables data={e.result} fluid />
                ) : (
                  <DataTable data={e.result} fluid />
                )}
              </div>
            ))}
            {entries.length === 0 && (
              <div className="text-sm text-gray-500">分析パネルから実行するとここに結果が蓄積されます</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(<ResultPage />);
