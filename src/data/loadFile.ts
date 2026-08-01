import { open } from '@tauri-apps/plugin-dialog';
import { getSheets, loadDataset } from '../shared/ipc/dataset';
import type { LoadedDataset } from '../shared/types';

export type LoadResult =
  | { kind: 'loaded'; dataset: LoadedDataset }
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
  if (sheet) {
    return { kind: 'loaded', dataset: await loadDataset(path, sheet) };
  }

  // どの形式にシート選択が要るかは Rust 側だけが知る。ここでは拡張子を解釈しない
  const sheets = await getSheets(path);
  if (sheets.length === 0) {
    return { kind: 'loaded', dataset: await loadDataset(path) };
  }
  if (sheets.length === 1) {
    return { kind: 'loaded', dataset: await loadDataset(path, sheets[0]) };
  }
  return { kind: 'sheet-required', path, sheets };
}
