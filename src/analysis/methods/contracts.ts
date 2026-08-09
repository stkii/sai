import type { ReactNode } from 'react';
import type { AnalysisOptions, AnalysisResult, Method } from '../../shared/types';

// 各メソッドの options 型は AnalysisOptions (Record<string, unknown>) へ代入するため
// interface ではなく type で定義する (interface は implicit index signature を持たない)。

export interface ModalProps<TOptions extends AnalysisOptions = AnalysisOptions> {
  headers: string[];
  busy: boolean;
  onCancel: () => void;
  /**
   * variables は R へ射影する列の集合。options が列名を参照する場合
   * (ANOVA の subject 等) も必ず含める。含めない列は R に渡らない。
   */
  onExecute: (variables: string[], options: TOptions) => void;
}

export interface MethodDefinition<K extends Method = Method> {
  key: K;
  label: string;
  requiresDataset?: boolean; // default true
  persistHistory?: boolean; // default true
}

/** options 型を消した公開形。レジストリと ResultPane はこの形だけを扱う。 */
export interface MethodModule<K extends Method = Method> {
  definition: MethodDefinition<K>;
  renderModal: (props: ModalProps) => ReactNode;
  // 省略時は ResultPane が共通の SectionsView でフォールバック描画する。
  renderResult?: (result: AnalysisResult) => ReactNode;
  // ResultMetadata の「設定」行をモーダルの選択肢ラベルで整形する。
  // 省略時は内部値をそのまま並べる汎用フォーマットにフォールバックする。
  formatOptions?: (options: AnalysisOptions) => string | null;
}

interface MethodSpec<K extends Method, TOptions extends AnalysisOptions> {
  definition: MethodDefinition<K>;
  renderModal: (props: ModalProps<TOptions>) => ReactNode;
  renderResult?: (result: AnalysisResult) => ReactNode;
  // 履歴から復元した options は欠けている可能性があるため Partial で受ける。
  formatOptions?: (options: Partial<TOptions>) => string | null;
}

/**
 * モーダルと formatOptions を同じ options 型で結び、MethodModule へ広げる。
 * 型を跨ぐキャストはここ 1 箇所に閉じ込める。
 */
export function defineMethod<K extends Method, TOptions extends AnalysisOptions>(
  spec: MethodSpec<K, TOptions>
): MethodModule<K> {
  const { formatOptions } = spec;
  return {
    definition: spec.definition,
    renderModal: spec.renderModal,
    renderResult: spec.renderResult,
    formatOptions: formatOptions
      ? (options: AnalysisOptions) => formatOptions(options as Partial<TOptions>)
      : undefined,
  };
}

// モーダルの選択肢定数 ({ value, label }[]) から表示ラベルを引く。
// 履歴から復元した未知の値はそのまま文字列化して返す。
export function labelOf(
  items: readonly { value: string; label: string }[],
  value: unknown
): string {
  return items.find((o) => o.value === value)?.label ?? String(value);
}
