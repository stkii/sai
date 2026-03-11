import { Box, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { BaseRadioButton } from '../../../components/BaseRadioButton';
import { VariableSelector } from '../../../components/VariableSelector';
import { ModalFrame } from '../../components/ModalFrame';
import type { AnalysisOptions } from '../../types';
import type { ModalProps } from '../contracts';

export type ReliabilityModel = 'alpha';

export interface ReliabilityOptions extends AnalysisOptions {
  model: ReliabilityModel;
}

const MODEL_OPTIONS = [
  { label: 'Cronbach の alpha', value: 'alpha' },
] as const satisfies ReadonlyArray<{ label: string; value: ReliabilityModel }>;

const DEFAULT_MODEL = MODEL_OPTIONS[0]?.value ?? 'alpha';

export const ReliabilityModal = ({
  open,
  onClose,
  variables,
  onExecute,
}: ModalProps<ReliabilityOptions>) => {
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [model, setModel] = useState<ReliabilityModel>(DEFAULT_MODEL);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const previousVariablesKeyRef = useRef('');

  useEffect(() => {
    if (!open) {
      setSelectedVariables([]);
      setModel(DEFAULT_MODEL);
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
    if (selectedVariables.length < 2) {
      setError('2つ以上の変数を選択してください');
      return;
    }
    if (!onExecute) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onExecute(selectedVariables, { model });
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
      title="信頼性分析"
      onExecute={handleExecute}
      loading={loading}
      error={error}
      maxW="6xl"
    >
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap="6" alignItems="start">
        <Box overflowX="auto" maxW="full" minW={0}>
          <VariableSelector variables={variables} onChange={setSelectedVariables} />
        </Box>

        <Box
          position="relative"
          borderWidth="1px"
          borderColor="gray.200"
          rounded="md"
          px="4"
          pt="6"
          pb="4"
          minW={0}
        >
          <Text
            position="absolute"
            top="0"
            left="3"
            transform="translateY(-50%)"
            px="2"
            bg="bg"
            fontSize="sm"
            fontWeight="semibold"
            color="gray.600"
          >
            分析オプション
          </Text>

          <Stack gap="2">
            <Text fontWeight="semibold">モデル</Text>
            <BaseRadioButton
              contents={MODEL_OPTIONS}
              orientation="horizontal"
              value={model}
              onChange={(value) => setModel(value as ReliabilityModel)}
            />
          </Stack>
        </Box>
      </SimpleGrid>
    </ModalFrame>
  );
};
