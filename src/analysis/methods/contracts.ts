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
  persistHistory?: boolean; // default true
}

export interface MethodModule<K extends Method = Method> {
  definition: MethodDefinition<K>;
  renderModal: (props: ModalProps) => ReactNode;
  // 省略時は ResultPane が共通の SectionsView でフォールバック描画する。
  renderResult?: (result: AnalysisResult) => ReactNode;
  // ResultMetadata の「設定」行をモーダルの選択肢ラベルで整形する。
  // 省略時は内部値をそのまま並べる汎用フォーマットにフォールバックする。
  formatOptions?: (options: AnalysisOptions) => string | null;
}

// モーダルの選択肢定数 ({ value, label }[]) から表示ラベルを引く。
// 履歴から復元した未知の値はそのまま文字列化して返す。
export function labelOf(
  items: readonly { value: string; label: string }[],
  value: unknown
): string {
  return items.find((o) => o.value === value)?.label ?? String(value);
}
