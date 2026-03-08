import { Box, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { BaseRadioButton } from '../../../components/BaseRadioButton';
import { VariableSelector } from '../../../components/VariableSelector';
import { ModalFrame } from '../../components/ModalFrame';
import type { AnalysisOptions } from '../../types';
import type { ModalProps } from '../contracts';

export type DescriptiveOrder = 'default' | 'mean_asc' | 'mean_desc';

export interface DescriptiveOptions extends AnalysisOptions {
  order: DescriptiveOrder;
}

const SORT_OPTIONS = [
  { label: '変数リスト順', value: 'default' },
  { label: '平均値による昇順', value: 'mean_asc' },
  { label: '平均値による降順', value: 'mean_desc' },
] as const satisfies ReadonlyArray<{ label: string; value: DescriptiveOrder }>;

const DEFAULT_ORDER = SORT_OPTIONS[0]?.value ?? 'default';

export const DescriptiveModal = ({
  open,
  onClose,
  variables,
  onExecute,
}: ModalProps<DescriptiveOptions>) => {
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [order, setOrder] = useState<DescriptiveOrder>(DEFAULT_ORDER);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const previousVariablesKeyRef = useRef('');

  useEffect(() => {
    if (!open) {
      setSelectedVariables([]);
      setOrder(DEFAULT_ORDER);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    const nextVariablesKey = variables.join('\u0000');
    if (previousVariablesKeyRef.current === nextVariablesKey) {
      return;
    }
    previousVariablesKeyRef.current = nextVariablesKey;
    setSelectedVariables([]);
    setError(null);
  }, [variables]);

  const handleExecute = async () => {
    if (selectedVariables.length === 0) {
      setError('変数を選択してください');
      return;
    }
    if (!onExecute) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onExecute(selectedVariables, { order });
    } catch (executeError: unknown) {
      setError(executeError instanceof Error ? executeError.message : String(executeError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="記述統計"
      onExecute={handleExecute}
      loading={loading}
      error={error}
    >
      <SimpleGrid columns={{ base: 1, md: 2 }} gap="6" alignItems="start">
        <Stack gap="3">
          <Text fontWeight="semibold">変数選択</Text>
          <Box overflowX="auto">
            <VariableSelector variables={variables} onChange={setSelectedVariables} />
          </Box>
        </Stack>
        <Stack gap="3">
          <Text fontWeight="semibold">ソート</Text>
          <BaseRadioButton
            contents={SORT_OPTIONS}
            orientation="vertical"
            value={order}
            onChange={(value) => setOrder(value as DescriptiveOrder)}
          />
        </Stack>
      </SimpleGrid>
    </ModalFrame>
  );
};
