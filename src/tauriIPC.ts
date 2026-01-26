import { invoke } from '@tauri-apps/api/core';
import type { AnalysisRunResult, ParsedDataTable } from './dto';
import { zAnalysisRunResult, zDatasetId, zParsedDataTable, zSheetNames } from './dto';

export interface AnalysisExportSection {
  sectionTitle?: string;
  table: ParsedDataTable;
}

export interface AnalysisExportLog {
  label: string;
  timestamp: string;
  sections: AnalysisExportSection[];
}

const validateParsedDataTable = (raw: unknown, source: string): ParsedDataTable => {
  const parsed = zParsedDataTable.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`${source}: ${parsed.error.message}`);
  }
  return parsed.data;
};

class TauriIPC {
  async buildNumericDataset(path: string, sheet: string | undefined, variables: string[]): Promise<string> {
    const payload = sheet ? { path, sheet, variables } : { path, variables };
    const raw = await invoke('build_numeric_dataset', payload);
    const parsed = zDatasetId.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`データセットIDのスキーマが一致しませんでした: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  async exportAnalysisToXlsx(path: string, logs: AnalysisExportLog[]): Promise<void> {
    await invoke('export_analysis_to_xlsx', { path, logs });
  }

  async getSheets(path: string): Promise<string[]> {
    const raw = await invoke('get_sheets', { path });
    const parsed = zSheetNames.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`シート名のスキーマが一致しませんでした: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  async parseTable(path: string, sheet?: string): Promise<ParsedDataTable> {
    const payload = sheet ? { path, sheet } : { path };
    const raw = await invoke('parse_table', payload);
    return validateParsedDataTable(raw, 'テーブルのスキーマが一致しませんでした');
  }

  async runAnalysis(
    analysisType: string,
    datasetId: string,
    options: Record<string, unknown> = {}
  ): Promise<AnalysisRunResult> {
    const raw = await invoke('run_analysis', {
      analysisType,
      datasetId,
      options,
    });
    const parsed = zAnalysisRunResult.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`分析結果のスキーマが一致しませんでした: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  async runPowerTest(options: Record<string, unknown> = {}): Promise<AnalysisRunResult> {
    const raw = await invoke('run_power_test', { options });
    const parsed = zAnalysisRunResult.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`分析結果のスキーマが一致しませんでした: ${parsed.error.message}`);
    }
    return parsed.data;
  }
}

const tauriIPC = new TauriIPC();

export default tauriIPC;
