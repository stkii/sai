import { VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { FieldFrame } from '../../../shared/ui/FieldFrame';
import {
  type Choice,
  RadioField,
  SelectField,
  TextField,
  toChoices,
} from '../../../shared/ui/fields';
import { GoldenSplit } from '../../../shared/ui/GoldenSplit';
import { ModalActions } from '../../../shared/ui/ModalActions';
import { VariablePicker } from '../../../shared/ui/VariablePicker';
import { labelOf, type ModalProps } from '../contracts';

type Design = 'between' | 'within';
type DataLayout = 'long' | 'wide';

export type AnovaOptions = {
  design: Design;
  dataLayout: DataLayout;
  dependent?: string;
  factors?: string[];
  subject?: string;
  // ワイド形式のみ: 条件に対応する列と、それらをまとめる被験者内要因の名前
  conditions?: string[];
  factorName?: string;
};

const DESIGN_OPTIONS: Choice<Design>[] = [
  { value: 'between', label: '被験者間' },
  { value: 'within', label: '反復測定' },
];

const LAYOUT_OPTIONS: Choice<DataLayout>[] = [
  { value: 'long', label: 'ロング形式 (1行 = 1測定)' },
  { value: 'wide', label: 'ワイド形式 (1行 = 1被験者)' },
];

const DEFAULT_FACTOR_NAME = '条件';

// R へ射影する列。options が参照する列 (subject / conditions) を漏らさないよう
// 1 箇所で導出する。射影されない列は R 側に存在せずエラーになる。
function anovaColumns(o: AnovaOptions): string[] {
  if (o.dataLayout === 'wide') return o.conditions ?? [];
  return [o.dependent ?? '', ...(o.factors ?? []), ...(o.subject ? [o.subject] : [])].filter(
    Boolean
  );
}

export function formatAnovaOptions(o: Partial<AnovaOptions>): string | null {
  const parts: string[] = [];
  if (o.design) parts.push(`デザイン: ${labelOf(DESIGN_OPTIONS, o.design)}`);
  if (o.dataLayout === 'wide') {
    parts.push('データ形式: ワイド形式 (行 = 被験者)');
    if (o.factorName) parts.push(`被験者内要因: ${o.factorName}`);
    if (o.conditions && o.conditions.length > 0) parts.push(`条件: ${o.conditions.join(', ')}`);
    return parts.length > 0 ? parts.join(' / ') : null;
  }
  if (o.dependent) parts.push(`従属変数: ${o.dependent}`);
  if (o.factors && o.factors.length > 0) parts.push(`要因: ${o.factors.join(', ')}`);
  if (o.subject) parts.push(`被験者ID列: ${o.subject}`);
  return parts.length > 0 ? parts.join(' / ') : null;
}

export function AnovaModal({ headers, busy, onCancel, onExecute }: ModalProps<AnovaOptions>) {
  const [dependent, setDependent] = useState<string>('');
  const [factors, setFactors] = useState<string[]>([]);
  const [design, setDesign] = useState<Design>('between');
  const [subject, setSubject] = useState<string>('');
  const [layout, setLayout] = useState<DataLayout>('long');
  const [conditions, setConditions] = useState<string[]>([]);
  const [factorName, setFactorName] = useState<string>(DEFAULT_FACTOR_NAME);

  // ワイド形式は被験者内要因を列の並びで表すため、反復測定でのみ選べる
  const isWide = design === 'within' && layout === 'wide';
  const invalid = isWide
    ? conditions.length < 2 || factorName.trim().length === 0
    : !dependent || factors.length === 0 || (design === 'within' && !subject);

  function handleSubmit() {
    if (invalid) return;
    if (isWide) {
      onExecute(conditions, {
        design,
        dataLayout: 'wide',
        conditions,
        factorName: factorName.trim(),
      });
      return;
    }
    const options: AnovaOptions = { design, dataLayout: 'long', dependent, factors };
    if (design === 'within') options.subject = subject;
    onExecute(anovaColumns(options), options);
  }

  return (
    <VStack align="stretch" gap={4}>
      <GoldenSplit
        primary={
          isWide ? (
            <FieldFrame label="条件に対応する列 (2つ以上)">
              <VariablePicker headers={headers} selected={conditions} onChange={setConditions} />
            </FieldFrame>
          ) : (
            <FieldFrame label="要因 (カテゴリ変数, 複数選択可)">
              <VariablePicker
                headers={headers}
                selected={factors}
                exclude={[dependent, subject].filter(Boolean)}
                onChange={setFactors}
              />
            </FieldFrame>
          )
        }
        secondary={
          <VStack align="stretch" gap={3}>
            <RadioField
              label="デザイン"
              options={DESIGN_OPTIONS}
              value={design}
              onChange={setDesign}
            />
            {design === 'within' && (
              <RadioField
                label="データ形式"
                options={LAYOUT_OPTIONS}
                value={layout}
                onChange={setLayout}
              />
            )}
            {isWide ? (
              <TextField
                label="被験者内要因の名前"
                value={factorName}
                onChange={setFactorName}
                placeholder={DEFAULT_FACTOR_NAME}
              />
            ) : (
              <>
                <SelectField
                  label="従属変数 (数値)"
                  options={toChoices(headers)}
                  value={dependent}
                  onChange={setDependent}
                  placeholder="-- 選択 --"
                />
                {design === 'within' && (
                  <SelectField
                    label="被験者ID列"
                    options={toChoices(
                      headers.filter((h) => h !== dependent && !factors.includes(h))
                    )}
                    value={subject}
                    onChange={setSubject}
                    placeholder="-- 選択 --"
                  />
                )}
              </>
            )}
          </VStack>
        }
      />
      <ModalActions busy={busy} disabled={invalid} onCancel={onCancel} onSubmit={handleSubmit} />
    </VStack>
  );
}
