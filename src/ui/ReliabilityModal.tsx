import { Box, CloseButton, Dialog, HStack, Portal, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

import ExecuteButton from '../components/ExecuteButton';
import RadioOptions from '../components/RadioOptions';
import VariableSelector from '../components/VariableSelector';
import type { AnalysisOptions } from '../runner';

const MODEL_OPTIONS = [
  { label: 'Alpha', value: 'alpha' },
  { label: 'Omega', value: 'omega' },
];

export interface ReliabilityModalOptions extends AnalysisOptions {
  model: string;
}

interface ReliabilityModalProps {
  open: boolean;
  onClose: () => void;
  variables: string[];
  onExecute?: (variables: string[], options: ReliabilityModalOptions) => Promise<void>;
}

const ReliabilityModal = ({ open, onClose, onExecute, variables }: ReliabilityModalProps) => {
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(MODEL_OPTIONS[0]?.value ?? 'alpha');

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
    setModel(MODEL_OPTIONS[0]?.value ?? 'alpha');
  }, [open]);

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
      await onExecute(selectedVariables, { model });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
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
              <Dialog.Title>信頼性分析</Dialog.Title>
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
                  <Text fontWeight="semibold">モデル</Text>
                  <RadioOptions
                    items={MODEL_OPTIONS}
                    orientation="vertical"
                    value={model}
                    onChange={setModel}
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

export default ReliabilityModal;
