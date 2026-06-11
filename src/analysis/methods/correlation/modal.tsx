import { Box, Button, Flex, HStack, RadioGroup, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import type { AnalysisOptions } from '../../../shared/types';
import { FieldFrame } from '../../../shared/ui/FieldFrame';
import { VariablePicker } from '../../ui/VariablePicker';
import { labelOf, type ModalProps } from '../contracts';

type CorrMethod = 'pearson' | 'spearman' | 'kendall';
type NaMode = 'complete.obs' | 'pairwise.complete.obs';

interface CorrelationOptions {
  method: CorrMethod;
  na: NaMode;
}

const METHOD_OPTIONS: { value: CorrMethod; label: string }[] = [
  { value: 'pearson', label: 'Pearson 積率相関' },
  { value: 'spearman', label: 'Spearman 順位相関' },
  { value: 'kendall', label: 'Kendall の τ' },
];

const NA_OPTIONS: { value: NaMode; label: string }[] = [
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
      <Flex gap={5} align="stretch">
        <Box flex={1} minW={0}>
          <FieldFrame label="変数選択 (2つ以上)">
            <VariablePicker headers={headers} selected={selected} onChange={setSelected} />
          </FieldFrame>
        </Box>
        <Box width="260px" flexShrink={0}>
          <VStack align="stretch" gap={3}>
            <FieldFrame label="相関係数の種類">
              <RadioGroup.Root
                size="sm"
                value={method}
                onValueChange={(d) => setMethod(d.value as CorrMethod)}
              >
                <Flex wrap="wrap" rowGap={2} columnGap={4}>
                  {METHOD_OPTIONS.map((opt) => (
                    <RadioGroup.Item key={opt.value} value={opt.value}>
                      <RadioGroup.ItemHiddenInput />
                      <RadioGroup.ItemIndicator />
                      <RadioGroup.ItemText fontSize="sm">{opt.label}</RadioGroup.ItemText>
                    </RadioGroup.Item>
                  ))}
                </Flex>
              </RadioGroup.Root>
            </FieldFrame>
            <FieldFrame label="欠測値の扱い">
              <RadioGroup.Root
                size="sm"
                value={na}
                onValueChange={(d) => setNa(d.value as NaMode)}
              >
                <Flex wrap="wrap" rowGap={2} columnGap={4}>
                  {NA_OPTIONS.map((opt) => (
                    <RadioGroup.Item key={opt.value} value={opt.value}>
                      <RadioGroup.ItemHiddenInput />
                      <RadioGroup.ItemIndicator />
                      <RadioGroup.ItemText fontSize="sm">{opt.label}</RadioGroup.ItemText>
                    </RadioGroup.Item>
                  ))}
                </Flex>
              </RadioGroup.Root>
            </FieldFrame>
          </VStack>
        </Box>
      </Flex>
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
