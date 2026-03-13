import { invoke } from '@tauri-apps/api/core';
import type {
  AnalysisExecutionRecord,
  AnalysisLogSummary,
  AnalysisOptions,
  AnalysisResult,
  AnalysisResultPayload,
  SupportedAnalysisType,
} from './analysis/api';
import type { Dataset, ParsedDataTable } from './types';
import type { PowerAnalysisOptions } from './windows/components/PowerAnalysisDialog';

interface IpcResponse {
  analysisId: string;
  loggedAt: string;
  result: AnalysisResult;
}

class TauriIpc {
  async buildNumericDataset(selection: Dataset, variables: string[]): Promise<string> {
    const payload = selection.sheet
      ? { path: selection.path, sheet: selection.sheet, variables }
      : { path: selection.path, variables };
    return invoke<string>('build_numeric_dataset', payload);
  }

  async buildStringMixedDataset(selection: Dataset, variables: string[]): Promise<string> {
    const payload = selection.sheet
      ? { path: selection.path, sheet: selection.sheet, variables }
      : { path: selection.path, variables };
    return invoke<string>('build_string_mixed_dataset', payload);
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
    const response = await invoke<IpcResponse>('run_analysis', {
      analysisType: type,
      datasetCacheId,
      options,
    });
    return {
      executionId: response.analysisId,
      executedAt: response.loggedAt,
      output: response.result,
    };
  }

  async runPowerAnalysis(options: PowerAnalysisOptions): Promise<ParsedDataTable> {
    return invoke<ParsedDataTable>('run_power_analysis', { options });
  }

  async listAnalysisLogs(limit?: number): Promise<AnalysisLogSummary[]> {
    return invoke<AnalysisLogSummary[]>('list_analysis_logs', { limit });
  }

  async getAnalysisLog(id: string): Promise<AnalysisResultPayload | null> {
    return invoke<AnalysisResultPayload | null>('get_analysis_log', { id });
  }
}

export const tauriIpc = new TauriIpc();
