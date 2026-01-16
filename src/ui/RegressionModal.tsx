import { Box, CloseButton, Dialog, HStack, Portal, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

import ExecuteButton from '../components/ExecuteButton';
import RegressionVariableSelector, {
  type RegressionVariableSelection,
} from '../components/RegressionVariableSelector';
import type { AnalysisOptions } from '../runner';

export interface RegressionModalOptions extends AnalysisOptions {
  dependent: string;
  independent: string[];
}

interface RegressionModalProps {
  open: boolean;
  onClose: () => void;
  variables: string[];
  onExecute?: (variables: string[], options: RegressionModalOptions) => Promise<void>;
}

const RegressionModal = ({ open, onClose, onExecute, variables }: RegressionModalProps) => {
  const [selection, setSelection] = useState<RegressionVariableSelection>({ dependent: '', independent: [] });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelection({ dependent: '', independent: [] });
      setError(null);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    setSelection({ dependent: '', independent: [] });
    setError(null);
    if (variables.length === 0) {
      return;
    }
  }, [variables]);

  const handleExecute = async () => {
    if (!selection.dependent) {
      setError('従属変数を選択してください');
      return;
    }
    if (selection.independent.length === 0) {
      setError('独立変数を選択してください');
      return;
    }
    if (!onExecute) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const allVariables = [selection.dependent, ...selection.independent];
      await onExecute(allVariables, {
        dependent: selection.dependent,
        independent: selection.independent,
      });
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
              <Dialog.Title>回帰分析</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap="6" alignItems="start">
                <Stack gap="3">
                  <Text fontWeight="semibold">変数選択</Text>
                  <Box overflowX="auto">
                    <RegressionVariableSelector variables={variables} onChange={setSelection} />
                  </Box>
                </Stack>
                <Stack gap="4">{/* 将来的にここにオプション（交互作用など）を追加 */}</Stack>
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

export default RegressionModal;
