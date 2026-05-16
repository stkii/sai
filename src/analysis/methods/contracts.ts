import type { ReactNode } from 'react';
import type { AnalysisOptions, AnalysisResult, Method } from '../../shared/types';

export interface ModalProps<TOptions extends AnalysisOptions = AnalysisOptions> {
  headers: string[];
  busy: boolean;
  onCancel: () => void;
  onExecute: (variables: string[], options: TOptions) => void;
}

export interface MethodDefinition<K extends Method = Method> {
  key: K;
  label: string;
  requiresDataset?: boolean; // default true
}

export interface MethodModule<K extends Method = Method> {
  definition: MethodDefinition<K>;
  renderModal: (props: ModalProps) => ReactNode;
  renderResult: (result: AnalysisResult) => ReactNode;
}
