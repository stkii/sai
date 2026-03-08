import { invoke } from '@tauri-apps/api/core';
import type {
  AnalysisExecutionRecord,
  AnalysisOptions,
  RawBackendAnalysisResult,
  SupportedAnalysisType,
} from './analysis/api';
import { mapBackendAnalysisResult } from './analysis/api';
import type { Dataset, ParsedDataTable } from './types';

interface RawAnalysisRunResult {
  analysisId: string;
  loggedAt: string;
  result: RawBackendAnalysisResult;
}

class TauriIpc {
  async buildNumericDataset(selection: Dataset, variables: string[]): Promise<string> {
    const payload = selection.sheet
      ? { path: selection.path, sheet: selection.sheet, variables }
      : { path: selection.path, variables };
    return invoke<string>('build_numeric_dataset', payload);
  }

  async clearNumericDatasetCache(): Promise<void> {
    await invoke('clear_numeric_dataset_cache');
  }

  async getSheets(path: string): Promise<string[]> {
    return invoke<string[]>('get_sheets', { path });
  }

  async parseTable(path: string, sheet?: string): Promise<ParsedDataTable> {
    const payload = sheet ? { path, sheet } : { path };
    return invoke<ParsedDataTable>('parse_table', payload);
  }

  async runAnalysis(
    type: SupportedAnalysisType,
    datasetCacheId: string,
    options: AnalysisOptions
  ): Promise<AnalysisExecutionRecord> {
    const raw = await invoke<RawAnalysisRunResult>('run_analysis', {
      analysisType: type,
      datasetCacheId,
      options,
    });
    return {
      executionId: raw.analysisId,
      executedAt: raw.loggedAt,
      output: mapBackendAnalysisResult(raw.result),
    };
  }
}

export const tauriIpc = new TauriIpc();
