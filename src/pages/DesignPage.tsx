import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { type FC, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import RunField from '../components/RunField';
import '../globals.css';
import { zParsedTable } from '../dto';
import tauriIPC from '../ipc';

type DesignTestKind = 't' | 'anov' | 'chisq' | 'f2';

const TEST_LABELS: Record<DesignTestKind, string> = {
  t: 't検定',
  anov: '1要因分散分析',
  chisq: '適合度の検定',
  f2: '一般線形モデル',
};

const DesignPage: FC = () => {
  const query = useMemo(() => new URLSearchParams(window.location.search || ''), []);
  const path = query.get('path') || '';
  const sheet = query.get('sheet') || '';

  const [testKind, setTestKind] = useState<DesignTestKind | ''>('');
  const [alpha, setAlpha] = useState<string>(''); // '0.05' | '0.01'
  const [power, setPower] = useState<string>('0.8'); // 0 < power < 1 (Default: 0.8)

  const [tType, setTType] = useState<'one.sample' | 'two.sample' | 'paired'>('two.sample');
  const [tAlt, setTAlt] = useState<'two.sided' | 'one.sided'>('two.sided');
  const [anovaK, setAnovaK] = useState<string>(''); // Number of groups (k)
  const [chisqK, setChisqK] = useState<string>(''); // Number of categories (df = k-1)
  const [f2U, setF2U] = useState<string>(''); // Number of parameters (u)

  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const canRun = useMemo(() => {
    if (!testKind) return false;
    if (!alpha) return false;
    const pw = Number(power);
    if (!Number.isFinite(pw) || pw <= 0 || pw >= 1) return false;
    if (testKind === 'anov') {
      const k = Number(anovaK);
      if (!Number.isFinite(k) || k < 2) return false;
    }
    if (testKind === 'chisq') {
      const k = Number(chisqK);
      if (!Number.isFinite(k) || k < 2) return false;
    }
    if (testKind === 'f2') {
      const u = Number(f2U);
      if (!Number.isFinite(u) || u < 1) return false;
    }
    return true;
  }, [testKind, alpha, power, anovaK, chisqK, f2U]);

  async function executeDesign() {
    if (!testKind) return;
    setError(null);

    const pw = Number(power);
    if (!Number.isFinite(pw) || pw <= 0 || pw >= 1) {
      setError('検出力は 0 と 1 の間の数値で入力してください。');
      return;
    }

    const sig = Number(alpha);
    if (!(sig === 0.05 || sig === 0.01)) {
      setError('有意水準は 0.05 または 0.01 を選択してください。');
      return;
    }

    const options: Record<string, unknown> = {
      test: testKind,
      sig_level: sig,
      power: pw,
    };

    if (testKind === 't') {
      options.t_type = tType;
      options.alternative = tAlt;
    } else if (testKind === 'anov') {
      const k = Number(anovaK);
      if (!Number.isFinite(k) || k < 2) {
        setError('群数 k は 2 以上の数値で入力してください。');
        return;
      }
      options.k = k;
    } else if (testKind === 'chisq') {
      const k = Number(chisqK);
      if (!Number.isFinite(k) || k < 2) {
        setError('カテゴリ数は 2 以上の数値で入力してください。');
        return;
      }
      options.categories = k;
    } else if (testKind === 'f2') {
      const u = Number(f2U);
      if (!Number.isFinite(u) || u < 1) {
        setError('パラメータ数 u は 1 以上の数値で入力してください。');
        return;
      }
      options.u = u;
    }

    setRunning(true);
    let closed = false;
    try {
      const emptyDataset: Record<string, Array<number | null>> = {};
      const rawResult = await tauriIPC.runRAnalysisWithDataset(
        'design',
        emptyDataset,
        30_000,
        JSON.stringify(options)
      );
      const validated = zParsedTable.safeParse(rawResult);
      if (!validated.success) {
        throw new Error(`R結果のスキーマ不一致: ${validated.error.message}`);
      }
      const result = validated.data;

      const token = await tauriIPC.issueResultToken(result);
      const params: Record<string, unknown> = {
        mode: 'power-design',
        test: testKind,
        testLabel: TEST_LABELS[testKind],
        alpha: sig,
        power: pw,
      };
      if (testKind === 't') {
        params.tType = tType;
        params.alternative = tAlt;
      } else if (testKind === 'anov') {
        params.k = Number(anovaK);
      } else if (testKind === 'chisq') {
        params.categories = Number(chisqK);
      } else if (testKind === 'f2') {
        params.u = Number(f2U);
      }

      const payload: Record<string, unknown> = {
        analysis: 'design',
        token,
        path,
        sheet,
        variables: [],
        params,
      };

      try {
        localStorage.setItem('sai:pending-result-payload', JSON.stringify(payload));
      } catch {
        // ignore
      }

      await tauriIPC.openOrReuseWindow('result', 'pages/result.html', payload);

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
      <h1 className="text-2xl font-bold mb-1">サンプルサイズ設計</h1>
      <p className="text-sm mb-2">シート: {sheet || '(未指定)'}</p>
      {error && <p className="text-[#b00020] text-sm mb-2">エラー: {error}</p>}

      <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-auto">
        <section>
          <h2 className="text-base font-semibold mb-2">分析の種類</h2>
          <select
            className="border rounded px-2 py-1 min-w-[260px]"
            value={testKind}
            onChange={(e) => setTestKind(e.currentTarget.value as DesignTestKind | '')}
          >
            <option value="">選択してください</option>
            <option value="t">{TEST_LABELS.t}</option>
            <option value="anov">{TEST_LABELS.anov}</option>
            <option value="chisq">{TEST_LABELS.chisq}</option>
            <option value="f2">{TEST_LABELS.f2}</option>
          </select>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">有意水準</h2>
          <div className="flex flex-row gap-4">
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                name="alpha"
                value="0.05"
                checked={alpha === '0.05'}
                onChange={(e) => setAlpha(e.currentTarget.value)}
              />
              <span>0.05</span>
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                name="alpha"
                value="0.01"
                checked={alpha === '0.01'}
                onChange={(e) => setAlpha(e.currentTarget.value)}
              />
              <span>0.01</span>
            </label>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">検出力</h2>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            className="border rounded px-2 py-1 min-w-[160px]"
            value={power}
            onChange={(e) => setPower(e.currentTarget.value)}
            placeholder="例: 0.8"
          />
          <p className="text-xs text-gray-500 mt-1">0 &lt; 検出力 &lt; 1 の範囲で入力してください。</p>
        </section>

        {testKind === 't' && (
          <section>
            <h2 className="text-base font-semibold mb-2">t検定の設定</h2>
            <div className="flex flex-col gap-2">
              <div>
                <p className="text-sm mb-1">検定タイプ</p>
                <div className="flex flex-row gap-4">
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="radio"
                      name="t-type"
                      value="one.sample"
                      checked={tType === 'one.sample'}
                      onChange={() => setTType('one.sample')}
                    />
                    <span>1標本</span>
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="radio"
                      name="t-type"
                      value="two.sample"
                      checked={tType === 'two.sample'}
                      onChange={() => setTType('two.sample')}
                    />
                    <span>2標本</span>
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="radio"
                      name="t-type"
                      value="paired"
                      checked={tType === 'paired'}
                      onChange={() => setTType('paired')}
                    />
                    <span>対応あり</span>
                  </label>
                </div>
              </div>
              <div>
                <p className="text-sm mb-1">検定の側</p>
                <div className="flex flex-row gap-4">
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="radio"
                      name="t-alt"
                      value="two.sided"
                      checked={tAlt === 'two.sided'}
                      onChange={() => setTAlt('two.sided')}
                    />
                    <span>両側</span>
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="radio"
                      name="t-alt"
                      value="one.sided"
                      checked={tAlt === 'one.sided'}
                      onChange={() => setTAlt('one.sided')}
                    />
                    <span>片側</span>
                  </label>
                </div>
              </div>
            </div>
          </section>
        )}

        {testKind === 'anov' && (
          <section>
            <h2 className="text-base font-semibold mb-2">1要因分散分析の設定</h2>
            <label className="text-sm flex flex-col gap-1">
              <span>群数 k</span>
              <input
                type="number"
                min="2"
                step="1"
                className="border rounded px-2 py-1 min-w-[120px]"
                value={anovaK}
                onChange={(e) => setAnovaK(e.currentTarget.value)}
                placeholder="例: 3"
              />
            </label>
          </section>
        )}

        {testKind === 'chisq' && (
          <section>
            <h2 className="text-base font-semibold mb-2">適合度の検定の設定</h2>
            <label className="text-sm flex flex-col gap-1">
              <span>カテゴリ数</span>
              <input
                type="number"
                min="2"
                step="1"
                className="border rounded px-2 py-1 min-w-[120px]"
                value={chisqK}
                onChange={(e) => setChisqK(e.currentTarget.value)}
                placeholder="例: 4"
              />
            </label>
            <p className="text-xs text-gray-500 mt-1">自由度 df = カテゴリ数 - 1 として計算されます。</p>
          </section>
        )}

        {testKind === 'f2' && (
          <section>
            <h2 className="text-base font-semibold mb-2">一般線形モデルの設定</h2>
            <label className="text-sm flex flex-col gap-1">
              <span>パラメータ数</span>
              <input
                type="number"
                min="1"
                step="1"
                className="border rounded px-2 py-1 min-w-[120px]"
                value={f2U}
                onChange={(e) => setF2U(e.currentTarget.value)}
                placeholder="例: 15"
              />
            </label>
          </section>
        )}
      </div>

      <RunField
        className="mt-3"
        onRun={executeDesign}
        onClose={() => getCurrentWebviewWindow().close()}
        running={running}
        disabled={running || !canRun}
      />
    </main>
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(<DesignPage />);
