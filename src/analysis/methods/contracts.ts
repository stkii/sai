import type { ReactElement, ReactNode } from 'react';
import type {
  AnalysisOptions,
  AnalysisResult,
  AnalysisSection,
  SupportedAnalysisType,
} from '../types';

export interface ModalProps<TOptions extends AnalysisOptions = AnalysisOptions> {
  open: boolean;
  onClose: () => void;
  variables: string[];
  onExecute?: (variables: string[], options: TOptions) => Promise<void>;
}

export interface ModalRenderArgs {
  open: boolean;
  onClose: () => void;
  variables: string[];
  onExecute: (variables: string[], options: AnalysisOptions) => Promise<void>;
}

export interface MethodDefinition<TKey extends SupportedAnalysisType = SupportedAnalysisType> {
  key: TKey;
  label: string;
}

export interface MethodModule<TKey extends SupportedAnalysisType = SupportedAnalysisType> {
  definition: MethodDefinition<TKey>;
  renderModal: (args: ModalRenderArgs) => ReactElement;
  renderResult: (result: AnalysisResult) => ReactNode;
  buildExportSections: (result: AnalysisResult) => AnalysisSection[];
}
