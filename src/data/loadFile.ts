import { open } from '@tauri-apps/plugin-dialog';
import { getSheets, loadDataset } from '../shared/ipc/dataset';
import type { DatasetSummary } from '../shared/types';

export type LoadResult =
  | { kind: 'loaded'; summary: DatasetSummary }
  | { kind: 'sheet-required'; path: string; sheets: string[] };

export async function pickFile(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: 'Data files', extensions: ['csv', 'xlsx', 'xls'] }],
  });
  if (selected === null) return null;
  return typeof selected === 'string' ? selected : null;
}

export async function loadFile(path: string, sheet?: string): Promise<LoadResult> {
  const ext = path.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    const summary = await loadDataset(path);
    return { kind: 'loaded', summary };
  }

  if (sheet) {
    const summary = await loadDataset(path, sheet);
    return { kind: 'loaded', summary };
  }

  const sheets = await getSheets(path);
  if (sheets.length === 1) {
    const summary = await loadDataset(path, sheets[0]);
    return { kind: 'loaded', summary };
  }
  return { kind: 'sheet-required', path, sheets };
}
