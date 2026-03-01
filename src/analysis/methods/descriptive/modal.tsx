import { Box, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import AnalysisDialogShell from '../../../components/AnalysisDialogShell';
import BaseRadioButton from '../../../components/BaseRadioButton';
import VariableSelect from '../../../components/VariableSelect';
import { useDialogError } from '../../../hooks/useDialogError';
import { useExecuteWithDialogError } from '../../../hooks/useExecuteWithDialogError';
import { useModalReset } from '../../../hooks/useModalReset';
import type { AnalysisModalProps, DescriptiveOptions, DescriptiveOrder } from '../../../types';

const SORT_OPTIONS = [
  { label: '変数リスト順', value: 'default' },
  { label: '平均値による昇順', value: 'mean_asc' },
  { label: '平均値による降順', value: 'mean_desc' },
] as const satisfies ReadonlyArray<{ label: string; value: DescriptiveOrder }>;

const DescriptiveModal = ({
  open,
  onClose,
  onExecute,
  variables,
}: AnalysisModalProps<DescriptiveOptions>) => {
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [order, setOrder] = useState<DescriptiveOrder>(SORT_OPTIONS[0]?.value ?? 'default');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { showValidationError, showAnalysisError } = useDialogError({ setError });
  const runWithDialogError = useExecuteWithDialogError({ setLoading, setError, showAnalysisError });

  const resetOnClose = useCallback(() => {
    setSelectedVariables([]);
    setOrder(SORT_OPTIONS[0]?.value ?? 'default');
    setError(null);
    setLoading(false);
  }, []);

  const resetOnVariablesChange = useCallback(() => {
    setSelectedVariables([]);
    setError(null);
  }, []);

  useModalReset({
    open,
    variables,
    resetOnClose,
    resetOnVariablesChange,
  });

  useEffect(() => {
    if (open) {
      setOrder(SORT_OPTIONS[0]?.value ?? 'default');
    }
  }, [open]);

  const handleExecute = async () => {
    if (selectedVariables.length === 0) {
      await showValidationError('変数を選択してください');
      return;
    }
    if (!SORT_OPTIONS.some((option) => option.value === order)) {
      await showValidationError('ソートの指定が不正です');
      return;
    }
    if (!onExecute) {
      return;
    }

    await runWithDialogError(async () => {
      await onExecute(selectedVariables, { order });
    });
  };

  return (
    <AnalysisDialogShell
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
            <VariableSelect variables={variables} onChange={setSelectedVariables} />
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
    </AnalysisDialogShell>
  );
};

export default DescriptiveModal;
