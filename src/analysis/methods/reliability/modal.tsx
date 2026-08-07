import { VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { FieldFrame } from '../../../shared/ui/FieldFrame';
import { type Choice, RadioField } from '../../../shared/ui/fields';
import { GoldenSplit } from '../../../shared/ui/GoldenSplit';
import { ModalActions } from '../../../shared/ui/ModalActions';
import { VariablePicker } from '../../ui/VariablePicker';
import { labelOf, type ModalProps } from '../contracts';

type ReliabilityCoefficient = 'alpha' | 'omega';

export type ReliabilityOptions = {
  coefficient: ReliabilityCoefficient;
};

const COEFFICIENT_OPTIONS: Choice<ReliabilityCoefficient>[] = [
  { value: 'alpha', label: 'Cronbachのα' },
  { value: 'omega', label: 'McDonaldのω' },
];

/** ω は単一因子モデルの識別に3項目を要する (α は2項目から算出できる)。 */
function minItemsFor(coefficient: ReliabilityCoefficient): number {
  return coefficient === 'omega' ? 3 : 2;
}

export function formatReliabilityOptions(o: Partial<ReliabilityOptions>): string | null {
  return o.coefficient ? `係数の種類: ${labelOf(COEFFICIENT_OPTIONS, o.coefficient)}` : null;
}

export function ReliabilityModal({
  headers,
  busy,
  onCancel,
  onExecute,
}: ModalProps<ReliabilityOptions>) {
  const [selected, setSelected] = useState<string[]>([]);
  const [coefficient, setCoefficient] = useState<ReliabilityCoefficient>('alpha');
  const minItems = minItemsFor(coefficient);

  function handleSubmit() {
    if (selected.length < minItems) return;
    onExecute(selected, { coefficient });
  }

  return (
    <VStack align="stretch" gap={4}>
      <GoldenSplit
        primary={
          <FieldFrame label={`尺度を構成する項目 (${minItems}つ以上)`}>
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
        disabled={selected.length < minItems}
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </VStack>
  );
}
