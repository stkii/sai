import { tauriIpc } from '../../ipc';
import type { Dataset, ParsedDataTable } from '../../types';

export const getSheetNamesByPath = async (path: string): Promise<string[]> => {
  return tauriIpc.getSheets(path);
};

export interface SwitchedSheetResult {
  table: ParsedDataTable;
  selection: Dataset;
}

export const switchSheet = async (
  selection: Dataset,
  nextSheet: string
): Promise<SwitchedSheetResult> => {
  const table = await tauriIpc.parseTable(selection.path, nextSheet);
  return {
    table,
    selection: { path: selection.path, sheet: nextSheet },
  };
};
