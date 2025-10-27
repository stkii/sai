import { open } from '@tauri-apps/plugin-dialog';
import { type FC, useState } from 'react';

import type { ParsedTable } from '../dto';
import tauriIPC from '../ipc';
import BaseButton from './BaseButton';

type Props = {
  onTableLoaded: (table: ParsedTable) => void;
  onError: (message: string | null) => void;
  onAnalyze?: (ctx: { filePath: string; sheet: string }) => void;
  className?: string;
};

const TableBar: FC<Props> = ({ onTableLoaded, onError, onAnalyze, className }) => {
  const [loading, setLoading] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[] | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [analysisType, setAnalysisType] = useState<string>('');

  async function pickFile() {
    try {
      onError(null);
      setLoading(true);

      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
      });

      if (!selected) return;
      const path = Array.isArray(selected) ? selected[0] : selected;
      setFilePath(path);
      setSheetNames(null);
      setSelectedSheet('');

      const names = await tauriIPC.getSheets(path);
      setSheetNames(names);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadSelectedSheet() {
    if (!filePath || !selectedSheet) return;
    try {
      onError(null);
      setLoading(true);
      const result = await tauriIPC.parseExcel(filePath, selectedSheet);
      onTableLoaded(result);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function openAnalysis(kind: string) {
    if (!filePath || !selectedSheet || !kind) return;
    const url = `pages/analysis.html?path=${encodeURIComponent(filePath)}&sheet=${encodeURIComponent(
      selectedSheet
    )}&analysis=${encodeURIComponent(kind)}`;
    try {
      await tauriIPC.openOrReuseWindow('analysis', url);
      onAnalyze?.({ filePath, sheet: selectedSheet });
      // 分析パネルを開いた後は分析種類の選択をリセット
      setTimeout(() => setAnalysisType(''), 0);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className={['flex flex-wrap items-center gap-2', className || ''].join(' ').trim()}>
      <BaseButton
        widthGroup="ribbon"
        onClick={pickFile}
        disabled={loading}
        label={filePath ? '別のファイルを選択' : 'ファイルを選択'}
      />

      {filePath && sheetNames && (
        <>
          <select
            className="border rounded px-2 py-1"
            value={selectedSheet}
            onChange={(e) => setSelectedSheet(e.currentTarget.value)}
            disabled={loading}
          >
            <option value="" disabled>
              シートを選択
            </option>
            {sheetNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            className="border rounded px-2 py-1"
            value={analysisType}
            onChange={(e) => {
              const kind = e.currentTarget.value;
              setAnalysisType(kind);
              if (kind) void openAnalysis(kind);
            }}
            disabled={loading || !selectedSheet}
          >
            <option value="" disabled>
              分析を選択
            </option>
            <option value="descriptive">記述統計</option>
            <option value="correlation">相関分析</option>
            <option value="reliability">信頼性分析</option>
            <option value="regression">回帰分析</option>
          </select>

          <BaseButton
            widthGroup="ribbon"
            onClick={loadSelectedSheet}
            disabled={!selectedSheet || loading}
            label="読み込む"
          />
        </>
      )}
    </div>
  );
};

export default TableBar;
