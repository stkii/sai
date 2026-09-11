import { invoke } from '@tauri-apps/api/core';
import type { HistoryLoadResult, HistoryRecord } from '../types';

export async function loadHistory(): Promise<HistoryLoadResult> {
  return invoke<HistoryLoadResult>('load_history');
}

export async function appendHistory(record: HistoryRecord): Promise<void> {
  return invoke<void>('append_history', { record });
}

export async function clearHistory(): Promise<void> {
  return invoke<void>('clear_history');
}

export async function removeHistory(id: string): Promise<void> {
  return invoke<void>('remove_history', { id });
}
