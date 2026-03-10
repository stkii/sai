import { Box, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { BaseRadioButton } from '../../../components/BaseRadioButton';
import { VariableSelector } from '../../../components/VariableSelector';
import { ModalFrame } from '../../components/ModalFrame';
import type { AnalysisOptions } from '../../types';
import type { ModalProps } from '../contracts';

export type CorrelationMethod = 'pearson' | 'spearman' | 'kendall';
export type CorrelationUse = 'complete.obs' | 'pairwise.complete.obs' | 'mean_imp';
export type CorrelationAlternative = 'two.sided' | 'less' | 'greater';

export interface CorrelationOptions extends AnalysisOptions {
  method: CorrelationMethod;
  use: CorrelationUse;
  alternative: CorrelationAlternative;
  view: 'matrix';
}

const METHOD_OPTIONS = [
  { label: 'Pearson', value: 'pearson' },
  { label: 'Spearman', value: 'spearman' },
  { label: 'Kendall', value: 'kendall' },
] as const satisfies ReadonlyArray<{ label: string; value: CorrelationMethod }>;

const USE_OPTIONS = [
  { label: '行ごとに除外', value: 'complete.obs' },
  { label: 'ペアごとに除外', value: 'pairwise.complete.obs' },
] as const satisfies ReadonlyArray<{ label: string; value: CorrelationUse }>;

const ALTERNATIVE_OPTIONS = [
  { label: '両側', value: 'two.sided' },
  { label: '左片側', value: 'less' },
  { label: '右片側', value: 'greater' },
] as const satisfies ReadonlyArray<{ label: string; value: CorrelationAlternative }>;

const DEFAULT_METHOD = METHOD_OPTIONS[0]?.value ?? 'pearson';
const DEFAULT_USE = USE_OPTIONS[0]?.value ?? 'complete.obs';
const DEFAULT_ALTERNATIVE = ALTERNATIVE_OPTIONS[0]?.value ?? 'two.sided';

export const CorrelationModal = ({
  open,
  onClose,
  variables,
  onExecute,
}: ModalProps<CorrelationOptions>) => {
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [method, setMethod] = useState<CorrelationMethod>(DEFAULT_METHOD);
  const [use, setUse] = useState<CorrelationUse>(DEFAULT_USE);
  const [alternative, setAlternative] = useState<CorrelationAlternative>(DEFAULT_ALTERNATIVE);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const previousVariablesKeyRef = useRef('');

  useEffect(() => {
    if (!open) {
      setSelectedVariables([]);
      setMethod(DEFAULT_METHOD);
      setUse(DEFAULT_USE);
      setAlternative(DEFAULT_ALTERNATIVE);
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
      await onExecute(selectedVariables, {
        method,
        use,
        alternative,
        view: 'matrix',
      });
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
      title="相関分析"
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

          <Stack gap="4">
            <Stack gap="2">
              <Text fontWeight="semibold">相関係数</Text>
              <BaseRadioButton
                contents={METHOD_OPTIONS}
                orientation="horizontal"
                value={method}
                onChange={(value) => setMethod(value as CorrelationMethod)}
              />
            </Stack>

            <Stack gap="2">
              <Text fontWeight="semibold">欠損値の扱い</Text>
              <BaseRadioButton
                contents={USE_OPTIONS}
                orientation="horizontal"
                value={use}
                onChange={(value) => setUse(value as CorrelationUse)}
              />
            </Stack>

            <Stack gap="2">
              <Text fontWeight="semibold">検定</Text>
              <BaseRadioButton
                contents={ALTERNATIVE_OPTIONS}
                orientation="horizontal"
                value={alternative}
                onChange={(value) => setAlternative(value as CorrelationAlternative)}
              />
            </Stack>
          </Stack>
        </Box>
      </SimpleGrid>
    </ModalFrame>
  );
};
