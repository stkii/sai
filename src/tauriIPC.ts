import { invoke } from '@tauri-apps/api/core';
import type {
  AnalysisExportLog,
  AnalysisLogEntry,
  AnalysisLogSummary,
  AnalysisRunResult,
  ParsedDataTable,
  SupportedAnalysisType,
} from './types';

class TauriIpc {
  async getSheets(path: string): Promise<string[]> {
    return invoke<string[]>('get_sheets', { path });
  }

  async parseTable(path: string, sheet?: string): Promise<ParsedDataTable> {
    const payload = sheet ? { path, sheet } : { path };
    return invoke<ParsedDataTable>('parse_table', payload);
  }

  async buildNumericDataset(path: string, sheet: string | undefined, variables: string[]): Promise<string> {
    const payload = sheet ? { path, sheet, variables } : { path, variables };
    return invoke<string>('build_numeric_dataset', payload);
  }

  async runAnalysis(
    analysisType: SupportedAnalysisType,
    datasetCacheId: string,
    options: Record<string, unknown>
  ): Promise<AnalysisRunResult> {
    return invoke<AnalysisRunResult>('run_analysis', {
      analysisType,
      datasetCacheId,
      options,
    });
  }

  async exportAnalysisToXlsx(path: string, logs: AnalysisExportLog[]): Promise<void> {
    await invoke('export_analysis_to_xlsx', { path, logs });
  }

  async clearNumericDatasetCache(): Promise<void> {
    await invoke('clear_numeric_dataset_cache');
  }

  async listRecentAnalysisLogs(limit: number): Promise<AnalysisLogSummary[]> {
    return invoke<AnalysisLogSummary[]>('list_recent_analysis_logs', { limit });
  }

  async getAnalysisLogEntry(analysisId: string): Promise<AnalysisLogEntry> {
    return invoke<AnalysisLogEntry>('get_analysis_log_entry', { analysisId });
  }
}

const tauriIpc = new TauriIpc();

export default tauriIpc;
