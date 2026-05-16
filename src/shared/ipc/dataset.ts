import { invoke } from '@tauri-apps/api/core';
import type { DatasetSummary } from '../types';

export async function getSheets(path: string): Promise<string[]> {
  return invoke<string[]>('get_sheets', { path });
}

export async function loadDataset(path: string, sheet?: string): Promise<DatasetSummary> {
  return invoke<DatasetSummary>('load_dataset', { path, sheet });
}
