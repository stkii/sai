import type { ReactElement, ReactNode } from 'react';
import type {
  AnalysisExportSection,
  AnalysisOptions,
  AnalysisResult,
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
