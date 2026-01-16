import { Box, CloseButton, Dialog, HStack, Portal, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';

import ExecuteButton from '../components/ExecuteButton';
import InteractionSelector from '../components/InteractionSelector';
import RegressionVariableSelector, {
  type RegressionVariableSelection,
} from '../components/RegressionVariableSelector';
import type { AnalysisOptions } from '../runner';

export interface RegressionModalOptions extends AnalysisOptions {
  dependent: string;
  independent: string[];
  interactions?: string[] | 'auto';
  center?: boolean;
}

interface RegressionModalProps {
  open: boolean;
  onClose: () => void;
  variables: string[];
  onExecute?: (variables: string[], options: RegressionModalOptions) => Promise<void>;
}

const RegressionModal = ({ open, onClose, onExecute, variables }: RegressionModalProps) => {
  const [selection, setSelection] = useState<RegressionVariableSelection>({ dependent: '', independent: [] });
  const [interactionTerms, setInteractionTerms] = useState<string[]>([]);
  const [includeAllInteractions, setIncludeAllInteractions] = useState(false);
  const [center, setCenter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInteractionChange = useCallback((value: string[]) => {
    setInteractionTerms(value);
  }, []);

  const handleIncludeAllChange = useCallback((checked: boolean) => {
    setIncludeAllInteractions(checked);
  }, []);

  const handleCenterChange = useCallback((checked: boolean) => {
    setCenter(checked);
  }, []);

  useEffect(() => {
    if (!open) {
      setSelection({ dependent: '', independent: [] });
      setInteractionTerms([]);
      setIncludeAllInteractions(false);
      setCenter(false);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    setSelection({ dependent: '', independent: [] });
    setInteractionTerms([]);
    setIncludeAllInteractions(false);
    setCenter(false);
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
      const interactions: string[] | 'auto' | undefined = includeAllInteractions
        ? 'auto'
        : interactionTerms.length > 0
          ? interactionTerms
          : undefined;
      await onExecute(allVariables, {
        dependent: selection.dependent,
        independent: selection.independent,
        interactions,
        center: center || undefined,
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
                <Stack gap="4">
                  <InteractionSelector
                    independentVars={selection.independent}
                    value={interactionTerms}
                    onValueChange={handleInteractionChange}
                    includeAll={includeAllInteractions}
                    onIncludeAllChange={handleIncludeAllChange}
                    center={center}
                    onCenterChange={handleCenterChange}
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

export default RegressionModal;
