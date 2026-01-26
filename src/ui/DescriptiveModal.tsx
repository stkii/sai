import { Box, CloseButton, Dialog, HStack, Portal, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { getAnalysisLabel } from '../analysisRegistry';
import ExecuteButton from '../components/ExecuteButton';
import RadioOptions from '../components/RadioOptions';
import VariableSelector from '../components/VariableSelector';
import { useDialogError } from '../hooks/useDialogError';

const SORT_OPTIONS = [
  { label: '変数リスト順', value: 'default' },
  { label: '平均値による昇順', value: 'mean_asc' },
  { label: '平均値による降順', value: 'mean_desc' },
];

interface DescriptiveModalProps {
  open: boolean;
  onClose: () => void;
  variables: string[];
  onExecute?: (variables: string[], order: string) => Promise<void>;
}

const DescriptiveModal = ({ open, onClose, onExecute, variables }: DescriptiveModalProps) => {
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(SORT_OPTIONS[0]?.value ?? 'default');

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
    setOrder(SORT_OPTIONS[0]?.value ?? 'default');
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
    setLoading(true);
    setError(null);
    try {
      await onExecute(selectedVariables, order);
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
              <Dialog.Title>{getAnalysisLabel('descriptive')}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap="6" alignItems="start">
                <Stack gap="3">
                  <Text fontWeight="semibold">変数選択</Text>
                  <Box overflowX="auto">
                    <VariableSelector variables={variables} onChange={setSelectedVariables} />
                  </Box>
                </Stack>
                <Stack gap="3">
                  <Text fontWeight="semibold">ソート</Text>
                  <RadioOptions
                    items={SORT_OPTIONS}
                    orientation="vertical"
                    value={order}
                    onChange={setOrder}
                  />
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

export default DescriptiveModal;
