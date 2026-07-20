import { VStack } from '@chakra-ui/react';
import { useState } from 'react';
import type { AnalysisOptions } from '../../../shared/types';
import { FieldFrame } from '../../../shared/ui/FieldFrame';
import { type Choice, RadioField } from '../../../shared/ui/fields';
import { GoldenSplit } from '../../../shared/ui/GoldenSplit';
import { ModalActions } from '../../../shared/ui/ModalActions';
import { VariablePicker } from '../../ui/VariablePicker';
import { labelOf, type ModalProps } from '../contracts';

type CorrMethod = 'pearson' | 'spearman' | 'kendall';
type NaMode = 'complete.obs' | 'pairwise.complete.obs';

interface CorrelationOptions {
  method: CorrMethod;
  na: NaMode;
}

const METHOD_OPTIONS: Choice<CorrMethod>[] = [
  { value: 'pearson', label: 'Pearson 積率相関' },
  { value: 'spearman', label: 'Spearman 順位相関' },
  { value: 'kendall', label: 'Kendall の τ' },
];

const NA_OPTIONS: Choice<NaMode>[] = [
  { value: 'complete.obs', label: 'リストワイズ削除' },
  { value: 'pairwise.complete.obs', label: 'ペアワイズ削除' },
];

export function formatCorrelationOptions(options: AnalysisOptions): string | null {
  const o = options as Partial<CorrelationOptions>;
  const parts: string[] = [];
  if (o.method) parts.push(`相関係数の種類: ${labelOf(METHOD_OPTIONS, o.method)}`);
  if (o.na) parts.push(`欠測値の扱い: ${labelOf(NA_OPTIONS, o.na)}`);
  return parts.length > 0 ? parts.join(' / ') : null;
}

export function CorrelationModal({ headers, busy, onCancel, onExecute }: ModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [method, setMethod] = useState<CorrMethod>('pearson');
  const [na, setNa] = useState<NaMode>('complete.obs');

  function handleSubmit() {
    if (selected.length < 2) return;
    onExecute(selected, { method, na } satisfies CorrelationOptions);
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
              label="相関係数の種類"
              options={METHOD_OPTIONS}
              value={method}
              onChange={setMethod}
            />
            <RadioField label="欠測値の扱い" options={NA_OPTIONS} value={na} onChange={setNa} />
          </VStack>
        }
      />
      <ModalActions
        busy={busy}
        disabled={selected.length < 2}
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </VStack>
  );
}
