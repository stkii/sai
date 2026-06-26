import { Button, Flex, HStack, RadioGroup, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import type { AnalysisOptions } from '../../../shared/types';
import { FieldFrame } from '../../../shared/ui/FieldFrame';
import { GoldenSplit } from '../../../shared/ui/GoldenSplit';
import { VariablePicker } from '../../ui/VariablePicker';
import { labelOf, type ModalProps } from '../contracts';

type ReliabilityCoefficient = 'alpha' | 'omega';

interface ReliabilityOptions {
  coefficient: ReliabilityCoefficient;
}

const COEFFICIENT_OPTIONS: { value: ReliabilityCoefficient; label: string; disabled?: boolean }[] =
  [
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
          <FieldFrame label="係数の種類">
            <RadioGroup.Root
              size="sm"
              value={coefficient}
              onValueChange={(d) => setCoefficient(d.value as ReliabilityCoefficient)}
            >
              <Flex wrap="wrap" rowGap={2} columnGap={4}>
                {COEFFICIENT_OPTIONS.map((opt) => (
                  <RadioGroup.Item key={opt.value} value={opt.value} disabled={opt.disabled}>
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemIndicator />
                    <RadioGroup.ItemText fontSize="sm">{opt.label}</RadioGroup.ItemText>
                  </RadioGroup.Item>
                ))}
              </Flex>
            </RadioGroup.Root>
          </FieldFrame>
        }
      />
      <HStack justify="flex-end" gap={2}>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          キャンセル
        </Button>
        <Button
          size="sm"
          colorPalette="blue"
          onClick={handleSubmit}
          loading={busy}
          disabled={selected.length < 2}
        >
          実行
        </Button>
      </HStack>
    </VStack>
  );
}
