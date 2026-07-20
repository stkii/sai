import { VStack } from '@chakra-ui/react';
import { useState } from 'react';
import type { AnalysisOptions } from '../../../shared/types';
import { FieldFrame } from '../../../shared/ui/FieldFrame';
import { type Choice, RadioField } from '../../../shared/ui/fields';
import { GoldenSplit } from '../../../shared/ui/GoldenSplit';
import { ModalActions } from '../../../shared/ui/ModalActions';
import { VariablePicker } from '../../ui/VariablePicker';
import { labelOf, type ModalProps } from '../contracts';

type ReliabilityCoefficient = 'alpha' | 'omega';

interface ReliabilityOptions {
  coefficient: ReliabilityCoefficient;
}

const COEFFICIENT_OPTIONS: Choice<ReliabilityCoefficient>[] = [
  { value: 'alpha', label: 'Cronbachのα' },
  // ω係数は R 層が未実装のため選択不可 (導入時に disabled を外す)
  { value: 'omega', label: 'McDonaldのω (未対応)', disabled: true },
];

export function formatReliabilityOptions(options: AnalysisOptions): string | null {
  const o = options as Partial<ReliabilityOptions>;
  return o.coefficient ? `係数の種類: ${labelOf(COEFFICIENT_OPTIONS, o.coefficient)}` : null;
}

export function ReliabilityModal({ headers, busy, onCancel, onExecute }: ModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [coefficient, setCoefficient] = useState<ReliabilityCoefficient>('alpha');

  function handleSubmit() {
    if (selected.length < 2) return;
    onExecute(selected, { coefficient } satisfies ReliabilityOptions);
  }

  return (
    <VStack align="stretch" gap={4}>
      <GoldenSplit
        primary={
          <FieldFrame label="尺度を構成する項目 (2つ以上)">
            <VariablePicker headers={headers} selected={selected} onChange={setSelected} />
          </FieldFrame>
        }
        secondary={
          <RadioField
            label="係数の種類"
            options={COEFFICIENT_OPTIONS}
            value={coefficient}
            onChange={setCoefficient}
          />
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
