import { Box, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { ModalFrame } from '../../analysis/components/ModalFrame';
import { BaseButton } from '../../components/BaseButton';
import { BaseNumberInput } from '../../components/BaseNumberInput';
import { BaseRadioButton } from '../../components/BaseRadioButton';
import { DataTable } from '../../components/DataTable';
import { tauriIpc } from '../../ipc';
import type { ParsedDataTable } from '../../types';

export type PowerAnalysisTest = 'anov' | 'chisq' | 'f2' | 'r' | 't' | 'p';

export type PowerAnalysisEffect = 'small' | 'medium' | 'large';

export type PowerAnalysisAlternative = 'two.sided' | 'less' | 'greater';

export interface PowerAnalysisOptions {
  effect: PowerAnalysisEffect;
  test: PowerAnalysisTest;
  sig_level: number;
  power?: number;
  n?: number;
  t_type?: 'one.sample';
  alternative?: PowerAnalysisAlternative;
  k?: number;
  df?: number;
  u?: number;
}

type PowerAnalysisTarget = 'sample_size' | 'power';

const TARGET_OPTIONS = [
  { label: 'サンプルサイズ', value: 'sample_size' },
  { label: '検出力', value: 'power' },
] as const satisfies ReadonlyArray<{ label: string; value: PowerAnalysisTarget }>;

const TEST_OPTIONS = [
  { label: '相関', value: 'r' },
  { label: 't検定', value: 't' },
  { label: '一元配置分散分析', value: 'anov' },
  { label: '回帰分析', value: 'f2' },
  { label: 'カイ2乗検定', value: 'chisq' },
  { label: '比率', value: 'p' },
] as const satisfies ReadonlyArray<{ label: string; value: PowerAnalysisTest }>;

const EFFECT_OPTIONS = [
  { label: '小', value: 'small' },
  { label: '中', value: 'medium' },
  { label: '大', value: 'large' },
] as const satisfies ReadonlyArray<{ label: string; value: PowerAnalysisEffect }>;

const ALTERNATIVE_OPTIONS = [
  { label: '両側', value: 'two.sided' },
  { label: '左片側', value: 'less' },
  { label: '右片側', value: 'greater' },
] as const satisfies ReadonlyArray<{ label: string; value: PowerAnalysisAlternative }>;

const DEFAULT_TARGET = TARGET_OPTIONS[0]?.value ?? 'sample_size';
const DEFAULT_TEST = TEST_OPTIONS[0]?.value ?? 'r';
const DEFAULT_EFFECT = EFFECT_OPTIONS[1]?.value ?? 'medium';
const DEFAULT_ALTERNATIVE = ALTERNATIVE_OPTIONS[0]?.value ?? 'two.sided';
const DEFAULT_SIG_LEVEL = '0.05';
const DEFAULT_POWER = '0.8';
const DEFAULT_GROUP_COUNT = '3';
const DEFAULT_DF = '1';
const DEFAULT_U = '1';
const RESULT_ROW_HEIGHT = 40;
const RESULT_TABLE_BORDER = 2;

const calcTableHeight = (rowCount: number) => {
  return Math.max((rowCount + 1) * RESULT_ROW_HEIGHT + RESULT_TABLE_BORDER, 120);
};

const parsePositiveNumber = (value: string): number | null => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const parseUnitInterval = (value: string): number | null => {
  const parsed = parsePositiveNumber(value);
  if (parsed === null || parsed >= 1) {
    return null;
  }
  return parsed;
};

const parsePositiveInteger = (value: string): number | null => {
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

const isAlternativeRequired = (test: PowerAnalysisTest) => {
  return test === 'r' || test === 't' || test === 'p';
};

const buildFallbackTitle = (target: PowerAnalysisTarget, test: PowerAnalysisTest) => {
  const testLabel = TEST_OPTIONS.find((option) => option.value === test)?.label ?? '検定';
  return `${target === 'sample_size' ? 'サンプルサイズ' : '検出力'}（${testLabel}）`;
};

export const PowerAnalysisDialog = () => {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<PowerAnalysisTarget>(DEFAULT_TARGET);
  const [test, setTest] = useState<PowerAnalysisTest>(DEFAULT_TEST);
  const [effect, setEffect] = useState<PowerAnalysisEffect>(DEFAULT_EFFECT);
  const [sigLevel, setSigLevel] = useState(DEFAULT_SIG_LEVEL);
  const [targetPower, setTargetPower] = useState(DEFAULT_POWER);
  const [sampleSize, setSampleSize] = useState('');
  const [alternative, setAlternative] = useState<PowerAnalysisAlternative>(DEFAULT_ALTERNATIVE);
  const [groupCount, setGroupCount] = useState(DEFAULT_GROUP_COUNT);
  const [degreesOfFreedom, setDegreesOfFreedom] = useState(DEFAULT_DF);
  const [numeratorDf, setNumeratorDf] = useState(DEFAULT_U);
  const [result, setResult] = useState<ParsedDataTable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputSignature = [
    target,
    test,
    effect,
    sigLevel,
    targetPower,
    sampleSize,
    alternative,
    groupCount,
    degreesOfFreedom,
    numeratorDf,
  ].join('\u0000');

  useEffect(() => {
    if (!open) {
      setTarget(DEFAULT_TARGET);
      setTest(DEFAULT_TEST);
      setEffect(DEFAULT_EFFECT);
      setSigLevel(DEFAULT_SIG_LEVEL);
      setTargetPower(DEFAULT_POWER);
      setSampleSize('');
      setAlternative(DEFAULT_ALTERNATIVE);
      setGroupCount(DEFAULT_GROUP_COUNT);
      setDegreesOfFreedom(DEFAULT_DF);
      setNumeratorDf(DEFAULT_U);
      setResult(null);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (inputSignature.length === 0) {
      return;
    }
    setResult(null);
    setError(null);
  }, [inputSignature, open]);

  const handleExecute = async () => {
    const parsedSigLevel = parseUnitInterval(sigLevel);
    if (parsedSigLevel === null) {
      setError('有意水準には 0 より大きく 1 未満の数を入力してください');
      return;
    }

    const options: PowerAnalysisOptions = {
      effect,
      test,
      sig_level: parsedSigLevel,
    };

    if (target === 'sample_size') {
      const parsedPower = parseUnitInterval(targetPower);
      if (parsedPower === null) {
        setError('目標検出力には 0 より大きく 1 未満の数を入力してください');
        return;
      }
      options.power = parsedPower;
    } else {
      const parsedSampleSize = parsePositiveNumber(sampleSize);
      if (parsedSampleSize === null) {
        setError('サンプルサイズには 0 より大きい数を入力してください');
        return;
      }
      options.n = parsedSampleSize;
    }

    if (isAlternativeRequired(test)) {
      options.alternative = alternative;
    }

    if (test === 't') {
      options.t_type = 'one.sample';
    }

    if (test === 'anov') {
      const parsedGroupCount = parsePositiveInteger(groupCount);
      if (parsedGroupCount === null || parsedGroupCount < 2) {
        setError('群の数には 2 以上の整数を入力してください');
        return;
      }
      options.k = parsedGroupCount;
    }

    if (test === 'chisq') {
      const parsedDegreesOfFreedom = parsePositiveInteger(degreesOfFreedom);
      if (parsedDegreesOfFreedom === null) {
        setError('自由度には 1 以上の整数を入力してください');
        return;
      }
      options.df = parsedDegreesOfFreedom;
    }

    if (test === 'f2') {
      const parsedNumeratorDf = parsePositiveInteger(numeratorDf);
      if (parsedNumeratorDf === null) {
        setError('説明変数の数には 1 以上の整数を入力してください');
        return;
      }
      options.u = parsedNumeratorDf;
    }

    setLoading(true);
    setError(null);
    try {
      const nextResult = await tauriIpc.runPowerAnalysis(options);
      setResult(nextResult);
    } catch (executeError: unknown) {
      setError(executeError instanceof Error ? executeError.message : String(executeError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <BaseButton label="検出力分析" onClick={() => setOpen(true)} variant="outline" />
      <ModalFrame
        open={open}
        onClose={() => setOpen(false)}
        title="検出力分析"
        onExecute={handleExecute}
        loading={loading}
        error={error}
        maxW="7xl"
      >
        <SimpleGrid columns={{ base: 1, xl: 2 }} gap="6" alignItems="start">
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
              入力
            </Text>

            <Stack gap="4">
              <Stack gap="2">
                <Text fontWeight="semibold">求める値</Text>
                <BaseRadioButton
                  contents={TARGET_OPTIONS}
                  orientation="horizontal"
                  value={target}
                  onChange={(value) => setTarget(value as PowerAnalysisTarget)}
                />
              </Stack>

              <Stack gap="2">
                <Text fontWeight="semibold">検定</Text>
                <BaseRadioButton
                  contents={TEST_OPTIONS}
                  orientation="vertical"
                  value={test}
                  onChange={(value) => setTest(value as PowerAnalysisTest)}
                />
              </Stack>

              <Stack gap="2">
                <Text fontWeight="semibold">効果量</Text>
                <BaseRadioButton
                  contents={EFFECT_OPTIONS}
                  orientation="horizontal"
                  value={effect}
                  onChange={(value) => setEffect(value as PowerAnalysisEffect)}
                />
              </Stack>

              <Stack gap="2">
                <Text fontWeight="semibold">有意水準</Text>
                <BaseNumberInput
                  step={0.01}
                  value={sigLevel}
                  width="160px"
                  min={0.001}
                  max={0.999}
                  onChange={setSigLevel}
                />
              </Stack>

              {target === 'sample_size' ? (
                <Stack gap="2">
                  <Text fontWeight="semibold">目標検出力</Text>
                  <BaseNumberInput
                    step={0.01}
                    value={targetPower}
                    width="160px"
                    min={0.001}
                    max={0.999}
                    onChange={setTargetPower}
                  />
                </Stack>
              ) : (
                <Stack gap="2">
                  <Text fontWeight="semibold">サンプルサイズ</Text>
                  <BaseNumberInput
                    step={1}
                    value={sampleSize}
                    width="160px"
                    min={1}
                    onChange={setSampleSize}
                  />
                </Stack>
              )}

              {isAlternativeRequired(test) ? (
                <Stack gap="2">
                  <Text fontWeight="semibold">片側・両側</Text>
                  <BaseRadioButton
                    contents={ALTERNATIVE_OPTIONS}
                    orientation="horizontal"
                    value={alternative}
                    onChange={(value) => setAlternative(value as PowerAnalysisAlternative)}
                  />
                </Stack>
              ) : null}

              {test === 't' ? (
                <Stack gap="1">
                  <Text fontWeight="semibold">t検定の種類</Text>
                  <Text fontSize="sm" color="gray.600">
                    現在は 1 標本 t 検定のみ対応しています
                  </Text>
                </Stack>
              ) : null}

              {test === 'anov' ? (
                <Stack gap="2">
                  <Text fontWeight="semibold">群の数</Text>
                  <BaseNumberInput
                    step={1}
                    value={groupCount}
                    width="160px"
                    min={2}
                    onChange={setGroupCount}
                  />
                </Stack>
              ) : null}

              {test === 'chisq' ? (
                <Stack gap="2">
                  <Text fontWeight="semibold">自由度</Text>
                  <BaseNumberInput
                    step={1}
                    value={degreesOfFreedom}
                    width="160px"
                    min={1}
                    onChange={setDegreesOfFreedom}
                  />
                </Stack>
              ) : null}

              {test === 'f2' ? (
                <Stack gap="2">
                  <Text fontWeight="semibold">説明変数の数</Text>
                  <BaseNumberInput
                    step={1}
                    value={numeratorDf}
                    width="160px"
                    min={1}
                    onChange={setNumeratorDf}
                  />
                </Stack>
              ) : null}
            </Stack>
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
              結果
            </Text>

            {result ? (
              <Stack gap="2">
                <Text fontWeight="medium" fontSize="sm">
                  {result.title ?? buildFallbackTitle(target, test)}
                </Text>
                <DataTable
                  table={result}
                  height={calcTableHeight(result.rows.length)}
                  showRowIndex={false}
                />
                {result.note ? (
                  <Text fontSize="sm" color="gray.600">
                    {result.note}
                  </Text>
                ) : null}
              </Stack>
            ) : (
              <Text color="gray.600" fontSize="sm">
                条件を入力して実行すると、ここに結果が表示されます
              </Text>
            )}
          </Box>
        </SimpleGrid>
      </ModalFrame>
    </>
  );
};
