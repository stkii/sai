import { invoke } from '@tauri-apps/api/core';
import type { AnalysisRunResult, ParsedDataTable } from './dto';
import { zAnalysisRunResult, zDatasetId, zParsedDataTable, zSheetNames } from './dto';

const validateParsedDataTable = (raw: unknown, source: string): ParsedDataTable => {
  const parsed = zParsedDataTable.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`${source}: ${parsed.error.message}`);
  }
  return parsed.data;
};

class TauriIPC {
  async buildNumericDataset(path: string, sheet: string, variables: string[]): Promise<string> {
    const raw = await invoke('build_numeric_dataset', { path, sheet, variables });
    const parsed = zDatasetId.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`データセットIDのスキーマが一致しませんでした: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  async getSheets(path: string): Promise<string[]> {
    const raw = await invoke('get_excel_sheets', { path });
    const parsed = zSheetNames.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`シート名のスキーマが一致しませんでした: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  async parseExcel(path: string, sheet: string): Promise<ParsedDataTable> {
    const raw = await invoke('parse_excel', { path, sheet });
    return validateParsedDataTable(raw, 'Excelテーブルのスキーマが一致しませんでした');
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
}

const tauriIPC = new TauriIPC();

export default tauriIPC;
