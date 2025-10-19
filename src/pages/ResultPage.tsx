import { useEffect, useMemo, useState, type FC } from 'react';
import { createRoot } from 'react-dom/client';

import type { ParsedTable } from '../dto';
import tauriIPC from '../ipc';

const ResultPage: FC = () => {
  const query = useMemo(() => new URLSearchParams(window.location.search || ''), []);
  const analysis = query.get('analysis') || '';

  const [table, setTable] = useState<ParsedTable | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = query.get('token') || '';
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        if (!token) throw new Error('tokenがURLに含まれていません');

        // React StrictMode 下ではエフェクトが二重に実行されるため
        // トークンの二重消費を避ける目的で sessionStorage を使ってキャッシュする。
        const cacheKey = `sai:result-token:${token}`;
        let cached: ParsedTable | null = null;
        try {
          const raw = sessionStorage.getItem(cacheKey);
          if (raw) cached = JSON.parse(raw) as ParsedTable;
        } catch {
          void 0; // storage/JSON が使えない環境では黙って続行
        }

        if (cached) {
          if (!cancelled) setTable(cached);
          return;
        }

        const result = await tauriIPC.consumeResultToken(token);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(result));
        } catch {
          void 0; // ストレージ容量やプライベートモード等の例外は無視
        }
        if (!cancelled) setTable(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <main className="container result-root p-4">
      <h1 className="m-0">結果ビューア</h1>
      <p className="muted small text-[#666]">分析: {analysis || '-'}</p>
      {error ? (
        <p className="mt-4 text-[#b00020]">エラー: {error}</p>
      ) : !table ? (
        <p className="mt-4">結果を取得中…</p>
      ) : (
        <div className="mt-3 overflow-auto">
          <table className="border-collapse min-w-[480px]">
            <thead>
              <tr>
                {table.headers.map((h, i) => (
                  <th key={`h-${i}`} className="bg-[#fafafa] border px-2 py-1 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, r) => (
                <tr key={`r-${r}`}>
                  {row.map((cell, c) => (
                    <td key={`c-${r}-${c}`} className="border px-2 py-1">
                      {String(cell ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(<ResultPage />);
