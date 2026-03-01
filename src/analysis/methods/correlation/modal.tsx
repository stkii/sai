import { Box, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import AnalysisDialogShell from '../../../components/AnalysisDialogShell';
import BaseRadioButton from '../../../components/BaseRadioButton';
import VariableSelect from '../../../components/VariableSelect';
import { useDialogError } from '../../../hooks/useDialogError';
import { useExecuteWithDialogError } from '../../../hooks/useExecuteWithDialogError';
import { useModalReset } from '../../../hooks/useModalReset';
import type {
  AnalysisModalProps,
  CorrelationAlternative,
  CorrelationMethod,
  CorrelationMissingValueUse,
  CorrelationOptions,
} from '../../../types';

const METHOD_OPTIONS = [
  { label: 'Pearson', value: 'pearson' },
  { label: 'Kendall', value: 'kendall' },
  { label: 'Spearman', value: 'spearman' },
] as const satisfies ReadonlyArray<{ label: string; value: CorrelationMethod }>;

const ALTERNATIVE_OPTIONS = [
  { label: '両側', value: 'two.sided' },
  { label: '左側', value: 'less' },
  { label: '右側', value: 'greater' },
] as const satisfies ReadonlyArray<{ label: string; value: CorrelationAlternative }>;

const MISSING_VALUE_OPTIONS = [
  { label: 'リスト（行）ごとに除外', value: 'complete.obs' },
  { label: 'ペアごとに除外', value: 'pairwise.complete.obs' },
  { label: '平均値で置換', value: 'mean_imp' },
] as const satisfies ReadonlyArray<{ label: string; value: CorrelationMissingValueUse }>;

const CorrelationModal = ({
  open,
  onClose,
  onExecute,
  variables,
}: AnalysisModalProps<CorrelationOptions>) => {
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [method, setMethod] = useState<CorrelationMethod>(METHOD_OPTIONS[0]?.value ?? 'pearson');
  const [alternative, setAlternative] = useState<CorrelationAlternative>(
    ALTERNATIVE_OPTIONS[0]?.value ?? 'two.sided'
  );
  const [use, setUse] = useState<CorrelationMissingValueUse>(
    MISSING_VALUE_OPTIONS[0]?.value ?? 'complete.obs'
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { showValidationError, showAnalysisError } = useDialogError({ setError });
  const runWithDialogError = useExecuteWithDialogError({ setLoading, setError, showAnalysisError });

  const resetOnClose = useCallback(() => {
    setSelectedVariables([]);
    setMethod(METHOD_OPTIONS[0]?.value ?? 'pearson');
    setAlternative(ALTERNATIVE_OPTIONS[0]?.value ?? 'two.sided');
    setUse(MISSING_VALUE_OPTIONS[0]?.value ?? 'complete.obs');
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
      setMethod(METHOD_OPTIONS[0]?.value ?? 'pearson');
      setAlternative(ALTERNATIVE_OPTIONS[0]?.value ?? 'two.sided');
      setUse(MISSING_VALUE_OPTIONS[0]?.value ?? 'complete.obs');
    }
  }, [open]);

  const handleExecute = async () => {
    if (selectedVariables.length === 0) {
      await showValidationError('変数を選択してください');
      return;
    }
    if (!METHOD_OPTIONS.some((option) => option.value === method)) {
      await showValidationError('相関係数の指定が不正です');
      return;
    }
    if (!ALTERNATIVE_OPTIONS.some((option) => option.value === alternative)) {
      await showValidationError('検定の指定が不正です');
      return;
    }
    if (!MISSING_VALUE_OPTIONS.some((option) => option.value === use)) {
      await showValidationError('欠損値の指定が不正です');
      return;
    }
    if (!onExecute) {
      return;
    }

    await runWithDialogError(async () => {
      await onExecute(selectedVariables, { method, alternative, use });
    });
  };

  return (
    <AnalysisDialogShell
      open={open}
      onClose={onClose}
      title="相関"
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
        <Stack gap="4">
          <Text fontWeight="semibold">相関係数</Text>
          <BaseRadioButton
            contents={METHOD_OPTIONS}
            orientation="horizontal"
            value={method}
            onChange={(value) => setMethod(value as CorrelationMethod)}
          />
          <Text fontWeight="semibold">検定</Text>
          <BaseRadioButton
            contents={ALTERNATIVE_OPTIONS}
            orientation="horizontal"
            value={alternative}
            onChange={(value) => setAlternative(value as CorrelationAlternative)}
          />
          <Text fontWeight="semibold">欠損値</Text>
          <BaseRadioButton
            contents={MISSING_VALUE_OPTIONS}
            orientation="vertical"
            value={use}
            onChange={(value) => setUse(value as CorrelationMissingValueUse)}
          />
        </Stack>
      </SimpleGrid>
    </AnalysisDialogShell>
  );
};

export default CorrelationModal;
