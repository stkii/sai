import { VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { FieldFrame } from '../../../shared/ui/FieldFrame';
import {
  type Choice,
  NumberField,
  RadioChoices,
  RadioField,
  SelectInput,
} from '../../../shared/ui/fields';
import { GoldenSplit } from '../../../shared/ui/GoldenSplit';
import { ModalActions } from '../../../shared/ui/ModalActions';
import { VariablePicker } from '../../../shared/ui/VariablePicker';
import { labelOf, type ModalProps } from '../contracts';

type Between = 'variables' | 'cases';
type Measure =
  | 'euclid'
  | 'seuclid'
  | 'chebychev'
  | 'block'
  | 'minkowski'
  | 'correlation'
  | 'cosine';
type Standardize = 'none' | 'z' | 'range' | 'rescale' | 'max' | 'mean' | 'sd';
type StandardizeBy = 'variable' | 'case';

export type DistanceOptions = {
  between: Between;
  measure: Measure;
  minkowskiP: number;
  standardize: Standardize;
  standardizeBy: StandardizeBy;
};

const BETWEEN_OPTIONS: Choice<Between>[] = [
  { value: 'variables', label: '変数間' },
  { value: 'cases', label: 'ケース間' },
];

const MEASURE_OPTIONS: Choice<Measure>[] = [
  { value: 'euclid', label: 'ユークリッド距離' },
  { value: 'seuclid', label: '平方ユークリッド距離' },
  { value: 'chebychev', label: 'Chebychev' },
  { value: 'block', label: 'ブロック (市街地距離)' },
  { value: 'minkowski', label: 'Minkowski' },
  { value: 'correlation', label: 'Pearson 相関 (類似度)' },
  { value: 'cosine', label: 'コサイン (類似度)' },
];

const STANDARDIZE_OPTIONS: Choice<Standardize>[] = [
  { value: 'none', label: 'なし' },
  { value: 'z', label: 'z 得点' },
  { value: 'range', label: '範囲 −1 〜 1' },
  { value: 'rescale', label: '範囲 0 〜 1' },
  { value: 'max', label: '最大値 1' },
  { value: 'mean', label: '平均 1' },
  { value: 'sd', label: '標準偏差 1' },
];

const STANDARDIZE_BY_OPTIONS: Choice<StandardizeBy>[] = [
  { value: 'variable', label: '変数ごと' },
  { value: 'case', label: 'ケースごと' },
];

export function formatDistanceOptions(o: Partial<DistanceOptions>): string | null {
  const parts: string[] = [];
  if (o.between) parts.push(`計算対象: ${labelOf(BETWEEN_OPTIONS, o.between)}`);
  if (o.measure === 'minkowski') {
    parts.push(`測度: ${labelOf(MEASURE_OPTIONS, o.measure)} (p = ${o.minkowskiP ?? '?'})`);
  } else if (o.measure) {
    parts.push(`測度: ${labelOf(MEASURE_OPTIONS, o.measure)}`);
  }
  if (o.standardize && o.standardize !== 'none') {
    parts.push(
      `値の変換: ${labelOf(STANDARDIZE_OPTIONS, o.standardize)}` +
        ` (${labelOf(STANDARDIZE_BY_OPTIONS, o.standardizeBy)})`
    );
  } else if (o.standardize === 'none') {
    parts.push('値の変換: なし');
  }
  return parts.length > 0 ? parts.join(' / ') : null;
}

export function DistanceModal({
  headers,
  busy,
  onCancel,
  onExecute,
}: ModalProps<DistanceOptions>) {
  const [selected, setSelected] = useState<string[]>([]);
  const [between, setBetween] = useState<Between>('variables');
  const [measure, setMeasure] = useState<Measure>('euclid');
  const [minkowskiP, setMinkowskiP] = useState<number | undefined>(2);
  const [standardize, setStandardize] = useState<Standardize>('none');
  const [standardizeBy, setStandardizeBy] = useState<StandardizeBy>('variable');

  const isMinkowski = measure === 'minkowski';
  const invalidP = isMinkowski && (minkowskiP === undefined || minkowskiP <= 0);
  const disabled = selected.length < 2 || invalidP;

  function handleSubmit() {
    if (disabled) return;
    onExecute(selected, {
      between,
      measure,
      minkowskiP: minkowskiP ?? 2,
      standardize,
      standardizeBy,
    });
  }

  return (
    <VStack align="stretch" gap={4}>
      <GoldenSplit
        primary={
          <FieldFrame label="変数選択 (2つ以上)">
            <VariablePicker headers={headers} selected={selected} onChange={setSelected} />
          </FieldFrame>
        }
        secondary={
          <VStack align="stretch" gap={3}>
            <RadioField
              label="距離の計算対象"
              options={BETWEEN_OPTIONS}
              value={between}
              onChange={setBetween}
            />
            <FieldFrame label="測度">
              <VStack align="stretch" gap={2}>
                <SelectInput
                  options={MEASURE_OPTIONS}
                  value={measure}
                  onChange={(v) => setMeasure(v as Measure)}
                />
                <NumberField
                  label="Minkowski の次数 p"
                  value={minkowskiP}
                  onChange={setMinkowskiP}
                  disabled={!isMinkowski}
                />
              </VStack>
            </FieldFrame>
            <FieldFrame label="値の変換">
              <VStack align="stretch" gap={2}>
                <SelectInput
                  options={STANDARDIZE_OPTIONS}
                  value={standardize}
                  onChange={(v) => setStandardize(v as Standardize)}
                />
                <RadioChoices
                  options={STANDARDIZE_BY_OPTIONS}
                  value={standardizeBy}
                  onChange={setStandardizeBy}
                  disabled={standardize === 'none'}
                />
              </VStack>
            </FieldFrame>
          </VStack>
        }
      />
      <ModalActions busy={busy} disabled={disabled} onCancel={onCancel} onSubmit={handleSubmit} />
    </VStack>
  );
}
