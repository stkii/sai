import { Box, CloseButton, Dialog, HStack, Portal, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { getAnalysisLabel } from '../analysis/analysisRegistry';
import type { AnalysisOptions } from '../analysis/runner';
import ExecuteButton from '../components/ExecuteButton';
import MissingValueUse, { MISSING_VALUE_OPTIONS } from '../components/MissingValueUse';
import RadioOptions from '../components/RadioOptions';
import VariableSelector from '../components/VariableSelector';
import { useDialogError } from '../hooks/useDialogError';

const METHOD_OPTIONS = [
  { label: 'Pearson', value: 'pearson' },
  { label: 'Kendall', value: 'kendall' },
  { label: 'Spearman', value: 'spearman' },
];

const ALTERNATIVE_OPTIONS = [
  { label: '両側', value: 'two.sided' },
  { label: '左側', value: 'less' },
  { label: '右側', value: 'greater' },
];

interface CorrTestModalOptions extends AnalysisOptions {
  method: string;
  alternative: string;
  use: string;
}

interface CorrTestModalProps {
  open: boolean;
  onClose: () => void;
  variables: string[];
  onExecute?: (variables: string[], options: CorrTestModalOptions) => Promise<void>;
}

const CorrTestModal = ({ open, onClose, onExecute, variables }: CorrTestModalProps) => {
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState(METHOD_OPTIONS[0]?.value ?? 'pearson');
  const [alternative, setAlternative] = useState(ALTERNATIVE_OPTIONS[0]?.value ?? 'two.sided');
  const [use, setUse] = useState(MISSING_VALUE_OPTIONS[0]?.value ?? 'all.obs');

  const { showValidationError, showAnalysisError } = useDialogError(setError);

  useEffect(() => {
    if (!open) {
      setSelectedVariables([]);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    setSelectedVariables([]);
    setError(null);
    if (variables.length === 0) {
      return;
    }
  }, [variables]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setMethod(METHOD_OPTIONS[0]?.value ?? 'pearson');
    setAlternative(ALTERNATIVE_OPTIONS[0]?.value ?? 'two.sided');
    setUse(MISSING_VALUE_OPTIONS[0]?.value ?? 'all.obs');
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
    setLoading(true);
    setError(null);
    try {
      await onExecute(selectedVariables, { method, alternative, use });
    } catch (err: unknown) {
      await showAnalysisError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(e) => (e.open ? null : onClose())}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="5xl">
            <Dialog.Header>
              <Dialog.Title>{getAnalysisLabel('correlation')}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap="6" alignItems="start">
                <Stack gap="4">
                  <Text fontWeight="semibold">変数選択</Text>
                  <Box overflowX="auto">
                    <VariableSelector variables={variables} onChange={setSelectedVariables} />
                  </Box>
                </Stack>
                <Stack gap="4">
                  <Text fontWeight="semibold">相関係数</Text>
                  <RadioOptions
                    items={METHOD_OPTIONS}
                    orientation="horizontal"
                    value={method}
                    onChange={setMethod}
                  />
                  <Text fontWeight="semibold">検定</Text>
                  <RadioOptions
                    items={ALTERNATIVE_OPTIONS}
                    orientation="horizontal"
                    value={alternative}
                    onChange={setAlternative}
                  />
                  <MissingValueUse value={use} onChange={setUse} />
                </Stack>
              </SimpleGrid>
              {error ? <Text color="red.500">{error}</Text> : null}
            </Dialog.Body>
            <Dialog.Footer>
              <HStack gap="3" justify="flex-end" w="full">
                <ExecuteButton label="終了" variant="outline" onClick={onClose} />
                <ExecuteButton label="実行" onClick={handleExecute} loading={loading} />
              </HStack>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default CorrTestModal;
