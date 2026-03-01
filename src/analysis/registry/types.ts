import type { ReactElement, ReactNode } from 'react';
import type { AnalysisExportSection, AnalysisModalKey, AnalysisResult, ParsedDataTable } from '../../types';

export interface AnalysisMethodDefinition<TKey extends AnalysisModalKey = AnalysisModalKey> {
  key: TKey;
  label: string;
  requiresDataset: boolean;
}

export interface AnalysisModalRenderArgs {
  open: boolean;
  onClose: () => void;
  variables: string[];
  onExecute: (variables: string[], options: Record<string, unknown>) => Promise<void>;
}

export interface AnalysisMethodModule<TKey extends AnalysisModalKey = AnalysisModalKey> {
  definition: AnalysisMethodDefinition<TKey>;
  renderModal: (args: AnalysisModalRenderArgs) => ReactElement;
  renderResult: (result: AnalysisResult) => ReactNode;
  buildExportSections: (result: AnalysisResult) => AnalysisExportSection[];
}

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
