import { Box, Checkbox, HStack, RadioGroup, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { BaseNumberInput } from '../../../components/BaseNumberInput';
import { BaseRadioButton } from '../../../components/BaseRadioButton';
import { VariableSelector } from '../../../components/VariableSelector';
import { ModalFrame } from '../../components/ModalFrame';
import type { AnalysisOptions } from '../../types';
import type { ModalProps } from '../contracts';

export type FactorMethod = 'ml';
export type FactorNumberCriterion = 'guttman' | 'fixed';
export type FactorRotation = 'none' | 'varimax' | 'oblimin' | 'quartimax' | 'equamax' | 'promax';
export type FactorCorrUse = 'all.obs' | 'complete.obs' | 'pairwise.complete.obs';

export interface FactorOptions extends AnalysisOptions {
  method: FactorMethod;
  n_factors_auto: boolean;
  n_factors?: number;
  rotation: FactorRotation;
  corr_use: FactorCorrUse;
  power?: number;
  sort_loadings: boolean;
}

const METHOD_OPTIONS = [{ label: '最尤法', value: 'ml' }] as const satisfies ReadonlyArray<{
  label: string;
  value: FactorMethod;
}>;

const FACTOR_NUMBER_CRITERION_OPTIONS = [
  { label: 'ガットマン基準', value: 'guttman' },
  { label: '任意の固定数', value: 'fixed' },
] as const satisfies ReadonlyArray<{ label: string; value: FactorNumberCriterion }>;

const ROTATION_OPTIONS = [
  { label: 'なし', value: 'none' },
  { label: 'バリマックス', value: 'varimax' },
  { label: 'オブリミン', value: 'oblimin' },
  { label: 'クオータマックス', value: 'quartimax' },
  { label: 'エカマックス', value: 'equamax' },
  { label: 'プロマックス', value: 'promax' },
] as const satisfies ReadonlyArray<{ label: string; value: FactorRotation }>;
const ROTATION_LEFT_OPTIONS = ROTATION_OPTIONS.slice(0, 3);
const ROTATION_RIGHT_OPTIONS = ROTATION_OPTIONS.slice(3);

const CORR_USE_OPTIONS = [
  { label: '行ごとに除外', value: 'complete.obs' },
  { label: 'ペアごとに除外', value: 'pairwise.complete.obs' },
] as const satisfies ReadonlyArray<{ label: string; value: FactorCorrUse }>;

const DEFAULT_METHOD = METHOD_OPTIONS[0]?.value ?? 'ml';
const DEFAULT_FACTOR_NUMBER_CRITERION = FACTOR_NUMBER_CRITERION_OPTIONS[0]?.value ?? 'guttman';
const DEFAULT_ROTATION = ROTATION_OPTIONS[0]?.value ?? 'none';
const DEFAULT_CORR_USE = CORR_USE_OPTIONS[1]?.value ?? 'complete.obs';
const DEFAULT_FIXED_FACTOR_COUNT = '2';
const DEFAULT_PROMAX_POWER = '4';

const validateInputNumber = (value: string): number | null => {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
};

export const FactorModal = ({ open, onClose, variables, onExecute }: ModalProps<FactorOptions>) => {
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [method, setMethod] = useState<FactorMethod>(DEFAULT_METHOD);
  const [factorNumberCriterion, setFactorNumberCriterion] = useState<FactorNumberCriterion>(
    DEFAULT_FACTOR_NUMBER_CRITERION
  );
  const [fixedFactorCount, setFixedFactorCount] = useState(DEFAULT_FIXED_FACTOR_COUNT);
  const [rotation, setRotation] = useState<FactorRotation>(DEFAULT_ROTATION);
  const [corrUse, setCorrUse] = useState<FactorCorrUse>(DEFAULT_CORR_USE);
  const [promaxPower, setPromaxPower] = useState(DEFAULT_PROMAX_POWER);
  const [sortLoadings, setSortLoadings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const previousVariablesKeyRef = useRef('');

  useEffect(() => {
    if (!open) {
      setSelectedVariables([]);
      setMethod(DEFAULT_METHOD);
      setFactorNumberCriterion(DEFAULT_FACTOR_NUMBER_CRITERION);
      setFixedFactorCount(DEFAULT_FIXED_FACTOR_COUNT);
      setRotation(DEFAULT_ROTATION);
      setCorrUse(DEFAULT_CORR_USE);
      setPromaxPower(DEFAULT_PROMAX_POWER);
      setSortLoadings(false);
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

    const options: FactorOptions = {
      method,
      n_factors_auto: factorNumberCriterion === 'guttman',
      rotation,
      corr_use: corrUse,
      sort_loadings: sortLoadings,
    };

    if (factorNumberCriterion === 'fixed') {
      const parsedFactorCount = validateInputNumber(fixedFactorCount);
      if (!parsedFactorCount) {
        setError('固定因子数には1以上の整数を入力してください');
        return;
      }
      if (parsedFactorCount > selectedVariables.length) {
        setError('固定因子数は選択した変数数以下にしてください');
        return;
      }
      options.n_factors = parsedFactorCount;
    }

    if (rotation === 'promax') {
      options.power = Number(promaxPower);
    }

    setLoading(true);
    setError(null);
    try {
      await onExecute(selectedVariables, options);
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
      title="因子分析"
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
              <Text fontWeight="semibold">抽出方法</Text>
              <BaseRadioButton
                contents={METHOD_OPTIONS}
                orientation="horizontal"
                value={method}
                onChange={(value) => setMethod(value as FactorMethod)}
              />
            </Stack>

            <Stack gap="2">
              <Text fontWeight="semibold">因子数</Text>
              <RadioGroup.Root
                value={factorNumberCriterion}
                onValueChange={(event) => {
                  if (event.value) {
                    setFactorNumberCriterion(event.value as FactorNumberCriterion);
                  }
                }}
              >
                <Stack gap="2" align="flex-start">
                  <RadioGroup.Item value="guttman">
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemIndicator />
                    <RadioGroup.ItemText>
                      {FACTOR_NUMBER_CRITERION_OPTIONS[0].label}
                    </RadioGroup.ItemText>
                  </RadioGroup.Item>

                  <HStack gap="3" align="center">
                    <RadioGroup.Item value="fixed">
                      <RadioGroup.ItemHiddenInput />
                      <RadioGroup.ItemIndicator />
                      <RadioGroup.ItemText whiteSpace="nowrap">
                        {FACTOR_NUMBER_CRITERION_OPTIONS[1].label}
                      </RadioGroup.ItemText>
                    </RadioGroup.Item>
                    {factorNumberCriterion === 'fixed' ? (
                      <BaseNumberInput
                        step={1}
                        value={fixedFactorCount}
                        width="120px"
                        min={1}
                        max={Math.max(selectedVariables.length, 1)}
                        onChange={setFixedFactorCount}
                      />
                    ) : null}
                  </HStack>
                </Stack>
              </RadioGroup.Root>
            </Stack>

            <Stack gap="2">
              <Text fontWeight="semibold">回転</Text>
              <RadioGroup.Root
                value={rotation}
                onValueChange={(event) => {
                  if (event.value) {
                    setRotation(event.value as FactorRotation);
                  }
                }}
              >
                <SimpleGrid columns={2} gapX="1" gapY="1">
                  <Stack gap="2" align="flex-start">
                    {ROTATION_LEFT_OPTIONS.map((option) => (
                      <RadioGroup.Item key={option.value} value={option.value}>
                        <RadioGroup.ItemHiddenInput />
                        <RadioGroup.ItemIndicator />
                        <RadioGroup.ItemText>{option.label}</RadioGroup.ItemText>
                      </RadioGroup.Item>
                    ))}
                  </Stack>
                  <Stack gap="2" align="flex-start">
                    {ROTATION_RIGHT_OPTIONS.map((option) => (
                      <Stack key={option.value} gap="1" align="flex-start">
                        <RadioGroup.Item value={option.value}>
                          <RadioGroup.ItemHiddenInput />
                          <RadioGroup.ItemIndicator />
                          <RadioGroup.ItemText>{option.label}</RadioGroup.ItemText>
                        </RadioGroup.Item>
                        {option.value === 'promax' && rotation === 'promax' ? (
                          <Box pl="6">
                            <BaseNumberInput
                              step={1}
                              value={promaxPower}
                              width="120px"
                              min={1}
                              onChange={setPromaxPower}
                            />
                          </Box>
                        ) : null}
                      </Stack>
                    ))}
                  </Stack>
                </SimpleGrid>
              </RadioGroup.Root>
            </Stack>

            <Stack gap="2">
              <Text fontWeight="semibold">欠損値の扱い</Text>
              <BaseRadioButton
                contents={CORR_USE_OPTIONS}
                orientation="horizontal"
                value={corrUse}
                onChange={(value) => setCorrUse(value as FactorCorrUse)}
              />
            </Stack>

            <Checkbox.Root
              checked={sortLoadings}
              onCheckedChange={(e) => setSortLoadings(!!e.checked)}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label fontWeight="semibold">負荷量をソート</Checkbox.Label>
            </Checkbox.Root>
          </Stack>
        </Box>
      </SimpleGrid>
    </ModalFrame>
  );
};
