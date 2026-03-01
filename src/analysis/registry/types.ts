import type { ReactElement, ReactNode } from 'react';
import type {
  AnalysisExportSection,
  AnalysisOptions,
  AnalysisResult,
  ParsedDataTable,
  SupportedAnalysisType,
} from '../../types';

export interface AnalysisMethodDefinition<TKey extends SupportedAnalysisType = SupportedAnalysisType> {
  key: TKey;
  label: string;
}

export interface AnalysisModalRenderArgs {
  open: boolean;
  onClose: () => void;
  variables: string[];
  onExecute: (variables: string[], options: AnalysisOptions) => Promise<void>;
}

export interface AnalysisMethodModule<TKey extends SupportedAnalysisType = SupportedAnalysisType> {
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
