import { Box, Checkbox, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { BaseRadioButton } from '../../../components/BaseRadioButton';
import { VariableSelector } from '../../../components/VariableSelector';
import { ModalFrame } from '../../components/ModalFrame';
import type { AnalysisOptions } from '../../types';
import type { ModalProps } from '../contracts';

export type DescriptiveOrder = 'default' | 'mean_asc' | 'mean_desc';
export type HistogramMode = 'none' | 'all' | 'selected';
export type BreaksMethod = 'Sturges' | 'Scott' | 'FD';

export interface DescriptiveOptions extends AnalysisOptions {
  order: DescriptiveOrder;
  skewness: boolean;
  kurtosis: boolean;
  histogram: HistogramMode;
  histogram_variables?: string[];
  breaks?: BreaksMethod;
}

const SORT_OPTIONS = [
  { label: '変数リスト', value: 'default' },
  { label: '平均値による昇順', value: 'mean_asc' },
  { label: '平均値による降順', value: 'mean_desc' },
] as const satisfies ReadonlyArray<{ label: string; value: DescriptiveOrder }>;

const HISTOGRAM_SCOPE_OPTIONS = [
  { label: '全ての変数', value: 'all' },
  { label: '個別に選択', value: 'selected' },
] as const;

const BREAKS_OPTIONS = [
  { label: 'Sturges', value: 'Sturges' },
  { label: 'Scott', value: 'Scott' },
  { label: 'Freedman-Diaconis', value: 'FD' },
] as const;

const DEFAULT_ORDER = SORT_OPTIONS[0]?.value ?? 'default';

export const DescriptiveModal = ({
  open,
  onClose,
  variables,
  onExecute,
}: ModalProps<DescriptiveOptions>) => {
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [order, setOrder] = useState<DescriptiveOrder>(DEFAULT_ORDER);
  const [skewness, setSkewness] = useState(false);
  const [kurtosis, setKurtosis] = useState(false);
  const [showHistogram, setShowHistogram] = useState(false);
  const [histogramScope, setHistogramScope] = useState<'all' | 'selected'>('all');
  const [histogramVariables, setHistogramVariables] = useState<string[]>([]);
  const [breaks, setBreaks] = useState<BreaksMethod>('Sturges');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const previousVariablesKeyRef = useRef('');

  useEffect(() => {
    if (!open) {
      setSelectedVariables([]);
      setOrder(DEFAULT_ORDER);
      setSkewness(false);
      setKurtosis(false);
      setShowHistogram(false);
      setHistogramScope('all');
      setHistogramVariables([]);
      setBreaks('Sturges');
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

  const handleHistogramVarToggle = (varName: string, checked: boolean) => {
    setHistogramVariables((prev) =>
      checked ? [...prev, varName] : prev.filter((v) => v !== varName)
    );
  };

  const handleExecute = async () => {
    if (selectedVariables.length === 0) {
      setError('変数を選択してください');
      return;
    }
    if (!onExecute) {
      return;
    }

    const histogram: HistogramMode = showHistogram
      ? histogramScope === 'all'
        ? 'all'
        : 'selected'
      : 'none';

    setLoading(true);
    setError(null);
    try {
      await onExecute(selectedVariables, {
        order,
        skewness,
        kurtosis,
        histogram,
        ...(histogram === 'selected' ? { histogram_variables: histogramVariables } : {}),
        ...(histogram !== 'none' ? { breaks } : {}),
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
      title="記述統計"
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
              <Text fontWeight="semibold">表示順</Text>
              <BaseRadioButton
                contents={SORT_OPTIONS}
                orientation="horizontal"
                value={order}
                onChange={(value) => setOrder(value as DescriptiveOrder)}
              />
            </Stack>

            <Stack gap="2">
              <Text fontWeight="semibold">統計量</Text>
              <HStack gap="4">
                <Checkbox.Root checked={skewness} onCheckedChange={(e) => setSkewness(!!e.checked)}>
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>歪度</Checkbox.Label>
                </Checkbox.Root>
                <Checkbox.Root checked={kurtosis} onCheckedChange={(e) => setKurtosis(!!e.checked)}>
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>尖度</Checkbox.Label>
                </Checkbox.Root>
              </HStack>
            </Stack>

            <Stack gap="2">
              <Text fontWeight="semibold">グラフ</Text>
              <Checkbox.Root
                checked={showHistogram}
                onCheckedChange={(e) => setShowHistogram(!!e.checked)}
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>ヒストグラム</Checkbox.Label>
              </Checkbox.Root>
              {showHistogram ? (
                <Stack gap="3" pl="2">
                  <Stack gap="1">
                    <Text fontSize="sm" color="gray.600">
                      対象
                    </Text>
                    <BaseRadioButton
                      contents={HISTOGRAM_SCOPE_OPTIONS}
                      orientation="horizontal"
                      value={histogramScope}
                      onChange={(value) => setHistogramScope(value as 'all' | 'selected')}
                    />
                    {histogramScope === 'selected' ? (
                      <HStack gap="3" flexWrap="wrap" pt="1">
                        {selectedVariables.map((v) => (
                          <Checkbox.Root
                            key={v}
                            checked={histogramVariables.includes(v)}
                            onCheckedChange={(e) => handleHistogramVarToggle(v, !!e.checked)}
                          >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control />
                            <Checkbox.Label>{v}</Checkbox.Label>
                          </Checkbox.Root>
                        ))}
                        {selectedVariables.length === 0 ? (
                          <Text fontSize="sm" color="gray.500">
                            変数を選択してください
                          </Text>
                        ) : null}
                      </HStack>
                    ) : null}
                  </Stack>
                  <Stack gap="1">
                    <Text fontSize="sm" color="gray.600">
                      階級幅
                    </Text>
                    <BaseRadioButton
                      contents={BREAKS_OPTIONS}
                      orientation="horizontal"
                      value={breaks}
                      onChange={(value) => setBreaks(value as BreaksMethod)}
                    />
                  </Stack>
                </Stack>
              ) : null}
            </Stack>
          </Stack>
        </Box>
      </SimpleGrid>
    </ModalFrame>
  );
};
