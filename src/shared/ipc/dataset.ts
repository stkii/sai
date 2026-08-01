import { invoke } from '@tauri-apps/api/core';
import type { LoadedDataset } from '../types';

/** シート名の一覧を返す。空配列は「シート選択が不要な形式」の合図。 */
export async function getSheets(path: string): Promise<string[]> {
  return invoke<string[]>('get_sheets', { path });
}

export async function loadDataset(path: string, sheet?: string): Promise<LoadedDataset> {
  return invoke<LoadedDataset>('load_dataset', { path, sheet });
}
