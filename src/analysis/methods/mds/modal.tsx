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

type Source = 'raw' | 'matrix';
type Between = 'variables' | 'cases';
type Measure =
  | 'euclid'
  | 'seuclid'
  | 'chebychev'
  | 'block'
  | 'minkowski'
  | 'correlation'
  | 'cosine';
type MdsType = 'ratio' | 'interval' | 'ordinal';
type Ties = 'primary' | 'secondary' | 'tertiary';

export type MdsOptions = {
  source: Source;
  between: Between;
  measure: Measure;
  minkowskiP: number;
  type: MdsType;
  ties: Ties;
  ndim: number;
};

const SOURCE_OPTIONS: Choice<Source>[] = [
  { value: 'raw', label: '生データ' },
  { value: 'matrix', label: '非類似度行列' },
];

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

const TYPE_OPTIONS: Choice<MdsType>[] = [
  { value: 'ratio', label: '比' },
  { value: 'interval', label: '間隔' },
  { value: 'ordinal', label: '順序 (非計量)' },
];

const TIES_OPTIONS: Choice<Ties>[] = [
  { value: 'secondary', label: '同順位を保つ' },
  { value: 'primary', label: '同順位をほどく' },
  { value: 'tertiary', label: 'ブロック単位' },
];

export function formatMdsOptions(o: Partial<MdsOptions>): string | null {
  const parts: string[] = [];
  if (o.source) parts.push(`データの形式: ${labelOf(SOURCE_OPTIONS, o.source)}`);
  if (o.source === 'raw') {
    if (o.between) parts.push(`計算対象: ${labelOf(BETWEEN_OPTIONS, o.between)}`);
    if (o.measure === 'minkowski') {
      parts.push(`測度: ${labelOf(MEASURE_OPTIONS, o.measure)} (p = ${o.minkowskiP ?? '?'})`);
    } else if (o.measure) {
      parts.push(`測度: ${labelOf(MEASURE_OPTIONS, o.measure)}`);
    }
  }
  if (o.type) parts.push(`変換: ${labelOf(TYPE_OPTIONS, o.type)}`);
  if (o.type === 'ordinal' && o.ties) {
    parts.push(`同順位の扱い: ${labelOf(TIES_OPTIONS, o.ties)}`);
  }
  if (o.ndim !== undefined) parts.push(`次元数: ${o.ndim}`);
  return parts.length > 0 ? parts.join(' / ') : null;
}

export function MdsModal({ headers, busy, onCancel, onExecute }: ModalProps<MdsOptions>) {
  const [selected, setSelected] = useState<string[]>([]);
  const [source, setSource] = useState<Source>('raw');
  const [between, setBetween] = useState<Between>('variables');
  const [measure, setMeasure] = useState<Measure>('euclid');
  const [minkowskiP, setMinkowskiP] = useState<number | undefined>(2);
  const [type, setType] = useState<MdsType>('ratio');
  const [ties, setTies] = useState<Ties>('secondary');
  const [ndim, setNdim] = useState<number | undefined>(2);

  const isMatrix = source === 'matrix';
  const isMinkowski = !isMatrix && measure === 'minkowski';
  // 非類似度行列は列そのものが対象、生データの変数間も同じく変数が対象になる。
  // ケース間だけは対象が行なので、必要な列は2つでよい。
  const minSelected = isMatrix || between === 'variables' ? 3 : 2;
  const invalidP = isMinkowski && (minkowskiP === undefined || minkowskiP <= 0);
  const invalidNdim = ndim === undefined || ndim < 1;
  const disabled = selected.length < minSelected || invalidP || invalidNdim;

  function handleSubmit() {
    if (disabled) return;
    onExecute(selected, {
      source,
      between,
      measure,
      minkowskiP: minkowskiP ?? 2,
      type,
      ties,
      ndim: ndim ?? 2,
    });
  }

  return (
    <VStack align="stretch" gap={4}>
      <GoldenSplit
        primary={
          <FieldFrame label={`変数選択 (${minSelected}つ以上)`}>
            <VariablePicker headers={headers} selected={selected} onChange={setSelected} />
          </FieldFrame>
        }
        secondary={
          <VStack align="stretch" gap={3}>
            <RadioField
              label="データの形式"
              options={SOURCE_OPTIONS}
              value={source}
              onChange={setSource}
            />
            <FieldFrame label="距離の作り方">
              <VStack align="stretch" gap={2}>
                <RadioChoices
                  options={BETWEEN_OPTIONS}
                  value={between}
                  onChange={setBetween}
                  disabled={isMatrix}
                />
                <SelectInput
                  options={MEASURE_OPTIONS}
                  value={measure}
                  onChange={(v) => setMeasure(v as Measure)}
                  disabled={isMatrix}
                />
                <NumberField
                  label="Minkowski の次数 p"
                  value={minkowskiP}
                  onChange={setMinkowskiP}
                  disabled={!isMinkowski}
                />
              </VStack>
            </FieldFrame>
            <FieldFrame label="変換">
              <VStack align="stretch" gap={2}>
                <RadioChoices options={TYPE_OPTIONS} value={type} onChange={setType} />
                <SelectInput
                  options={TIES_OPTIONS}
                  value={ties}
                  onChange={(v) => setTies(v as Ties)}
                  disabled={type !== 'ordinal'}
                />
              </VStack>
            </FieldFrame>
            <FieldFrame label="次元数">
              <NumberField label="" value={ndim} onChange={setNdim} step="1" />
            </FieldFrame>
          </VStack>
        }
      />
      <ModalActions busy={busy} disabled={disabled} onCancel={onCancel} onSubmit={handleSubmit} />
    </VStack>
  );
}
