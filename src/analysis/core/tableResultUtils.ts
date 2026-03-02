import type { AnalysisExportSection, AnalysisResult, ParsedDataTable } from '../../types';

export const createSingleTableExportSections = (result: AnalysisResult): AnalysisExportSection[] => {
  if (result.kind === 'table') {
    return [{ table: result.table }];
  }
  return [];
};

export const renderSingleTableResult = (result: AnalysisResult): ParsedDataTable | null => {
  if (result.kind === 'table') {
    return result.table;
  }
  return null;
};
