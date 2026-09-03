import type { ReactNode } from 'react';
import type { VariableSpec } from '../../shared/types';

/** 変数作成の種別。メニューの項目と 1 対 1 で対応する。 */
export type VariableKind = 'reverse';

export interface VariableModalProps {
  headers: string[];
  busy: boolean;
  onCancel: () => void;
  onSubmit: (spec: VariableSpec) => void;
}

export interface VariableDefinition {
  key: VariableKind;
  /** メニュー項目の文言。ダイアログの見出しは「<label>の作成」で組み立てる */
  label: string;
}

export interface VariableModule {
  definition: VariableDefinition;
  renderModal: (props: VariableModalProps) => ReactNode;
}
