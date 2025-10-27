import { invoke } from '@tauri-apps/api/core';

import type { ParsedTable } from './dto';

class TauriIPC {
  async buildNumericDataset(
    path: string,
    sheet: string,
    variables: string[]
  ): Promise<Record<string, Array<number | null>>> {
    return await invoke('build_numeric_dataset', { path, sheet, variables });
  }

  async getSheets(path: string): Promise<string[]> {
    return await invoke('get_excel_sheets', { path });
  }

  async parseExcel(path: string, sheet: string): Promise<ParsedTable> {
    return await invoke('parse_excel', { path, sheet });
  }

  async openOrReuseWindow(label: string, url: string, payload?: Record<string, unknown>): Promise<void> {
    return await invoke('open_or_reuse_window', {
      label,
      url,
      payload,
    });
  }

  async runRAnalysisWithDataset(
    analysis: string,
    dataset: Record<string, Array<number | null>>,
    timeoutMs: number,
    optionsJson?: string
  ): Promise<ParsedTable> {
    return await invoke('run_r_analysis_with_dataset', {
      analysis,
      dataset,
      timeoutMs,
      optionsJson,
    });
  }

  async issueResultToken(result: ParsedTable): Promise<string> {
    return await invoke('issue_result_token', { result });
  }

  async consumeResultToken(token: string): Promise<ParsedTable> {
    return await invoke('consume_result_token', { token });
  }

  async saveTextFile(path: string, contents: string): Promise<void> {
    return await invoke('save_text_file', { path, contents });
  }

  async appendAnalysisLog(entry: unknown): Promise<void> {
    return await invoke('append_analysis_log', { entry });
  }
}

const tauriIPC = new TauriIPC();
export default tauriIPC;
