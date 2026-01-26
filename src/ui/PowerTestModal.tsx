import { Box, CloseButton, Dialog, HStack, Portal, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { getAnalysisLabel } from '../analysis/analysisRegistry';
import type { AnalysisOptions } from '../analysis/runner';
import ExecuteButton from '../components/ExecuteButton';
import PopoverSelect, { type PopoverSelectItem } from '../components/PopoverSelect';
import RadioOptions from '../components/RadioOptions';
import ValueInput from '../components/ValueInput';
import { useDialogError } from '../hooks/useDialogError';

const TEST_OPTIONS: PopoverSelectItem[] = [
  { label: '相関', value: 'r' },
  { label: 't検定（1標本）', value: 't' },
  { label: '一元配置分散分析', value: 'anov' },
  { label: '回帰分析（f2）', value: 'f2' },
  { label: '比率（1標本）', value: 'p' },
  { label: 'カイ二乗（適合度）', value: 'chisq' },
];

const EFFECT_OPTIONS = [
  { label: '小', value: 'small' },
  { label: '中', value: 'medium' },
  { label: '大', value: 'large' },
];

const TARGET_OPTIONS = [
  { label: 'サンプルサイズ', value: 'sample' },
  { label: '検出力', value: 'power' },
];

const ALTERNATIVE_OPTIONS = [
  { label: '両側', value: 'two.sided' },
  { label: '左側', value: 'less' },
  { label: '右側', value: 'greater' },
];

export interface PowerTestModalOptions extends AnalysisOptions {
  test: string;
  effect: string;
  sig_level: number;
  power?: number;
  n?: number;
  t_type?: string;
  alternative?: string;
  k?: number;
  df?: number;
  u?: number;
}

interface PowerTestModalProps {
  open: boolean;
  onClose: () => void;
  onExecute?: (options: PowerTestModalOptions) => Promise<void>;
}

const PowerTestModal = ({ open, onClose, onExecute }: PowerTestModalProps) => {
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [testResetKey, setTestResetKey] = useState(0);
  const [target, setTarget] = useState(TARGET_OPTIONS[0]?.value ?? 'sample');
  const [effect, setEffect] = useState(EFFECT_OPTIONS[1]?.value ?? 'medium');
  const [sigLevel, setSigLevel] = useState('0.05');
  const [power, setPower] = useState('0.8');
  const [sampleSize, setSampleSize] = useState('');
  const [alternative, setAlternative] = useState(ALTERNATIVE_OPTIONS[0]?.value ?? 'two.sided');
  const [kValue, setKValue] = useState('');
  const [dfValue, setDfValue] = useState('');
  const [uValue, setUValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { showValidationError, showAnalysisError } = useDialogError(setError);

  useEffect(() => {
    if (!open) {
      setSelectedTest(null);
      setTestResetKey((value) => value + 1);
      setTarget(TARGET_OPTIONS[0]?.value ?? 'sample');
      setEffect(EFFECT_OPTIONS[1]?.value ?? 'medium');
      setSigLevel('0.05');
      setPower('0.8');
      setSampleSize('');
      setAlternative(ALTERNATIVE_OPTIONS[0]?.value ?? 'two.sided');
      setKValue('');
      setDfValue('');
      setUValue('');
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const isAnov = selectedTest === 'anov';
  const isChisq = selectedTest === 'chisq';
  const isF2 = selectedTest === 'f2';
  const needsAlternative = selectedTest === 'r' || selectedTest === 't' || selectedTest === 'p';
  const isPowerTarget = target === 'power';
  const sampleSizeHasValue = sampleSize.trim().length > 0;
  const kHasValue = kValue.trim().length > 0;
  const dfHasValue = dfValue.trim().length > 0;
  const uHasValue = uValue.trim().length > 0;

  const handleExecute = async () => {
    if (!selectedTest || !TEST_OPTIONS.some((option) => option.value === selectedTest)) {
      await showValidationError('分析方法を選択してください');
      return;
    }
    if (!EFFECT_OPTIONS.some((option) => option.value === effect)) {
      await showValidationError('効果量の指定が不正です');
      return;
    }
    if (needsAlternative && !ALTERNATIVE_OPTIONS.some((option) => option.value === alternative)) {
      await showValidationError('検定の指定が不正です');
      return;
    }

    const sigLevelValue = Number(sigLevel);
    if (!Number.isFinite(sigLevelValue) || sigLevelValue <= 0 || sigLevelValue >= 1) {
      await showValidationError('有意水準を正しく入力してください');
      return;
    }

    let powerValue: number | undefined;
    if (!isPowerTarget) {
      const parsed = Number(power);
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed >= 1) {
        await showValidationError('検出力を正しく入力してください');
        return;
      }
      powerValue = parsed;
    }

    let k: number | undefined;
    if (isAnov) {
      const parsed = Number(kValue);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 2) {
        await showValidationError('群数kは2以上で入力してください');
        return;
      }
      k = parsed;
    }

    let u: number | undefined;
    if (isF2) {
      const parsed = Number(uValue);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
        await showValidationError('説明変数数uは1以上で入力してください');
        return;
      }
      u = parsed;
    }

    let df: number | undefined;
    if (isChisq) {
      const parsed = Number(dfValue);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
        await showValidationError('自由度dfは1以上で入力してください');
        return;
      }
      df = parsed;
    }

    let n: number | undefined;
    if (isPowerTarget) {
      if (!sampleSizeHasValue) {
        await showValidationError('サンプルサイズを入力してください');
        return;
      }
      const parsed = Number(sampleSize);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        await showValidationError('サンプルサイズを正しく入力してください');
        return;
      }
      if (isF2 && typeof u === 'number' && parsed <= u + 1) {
        await showValidationError('サンプルサイズは説明変数数u+1より大きく入力してください');
        return;
      }
      n = parsed;
    }

    if (!onExecute) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onExecute({
        test: selectedTest,
        effect,
        sig_level: sigLevelValue,
        ...(isPowerTarget ? { n } : { power: powerValue }),
        t_type: selectedTest === 't' ? 'one.sample' : undefined,
        alternative: needsAlternative ? alternative : undefined,
        k,
        df,
        u,
      });
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
              <Dialog.Title>{getAnalysisLabel('power')}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap="6" alignItems="start">
                <Stack gap="4">
                  <Text fontWeight="semibold">出力</Text>
                  <RadioOptions
                    items={TARGET_OPTIONS}
                    orientation="horizontal"
                    value={target}
                    onChange={setTarget}
                  />
                  <Text fontWeight="semibold">分析方法</Text>
                  <Box alignSelf="flex-start">
                    <PopoverSelect
                      items={TEST_OPTIONS}
                      placeholder="分析方法を選択"
                      onSelect={(item) => setSelectedTest(item?.value ?? null)}
                      resetKey={testResetKey}
                    />
                  </Box>
                  <Text fontWeight="semibold">効果量</Text>
                  <RadioOptions
                    items={EFFECT_OPTIONS}
                    orientation="horizontal"
                    value={effect}
                    onChange={setEffect}
                  />
                  {needsAlternative ? (
                    <>
                      <Text fontWeight="semibold">検定</Text>
                      <RadioOptions
                        items={ALTERNATIVE_OPTIONS}
                        orientation="horizontal"
                        value={alternative}
                        onChange={setAlternative}
                      />
                    </>
                  ) : null}
                </Stack>
                <Stack gap="4">
                  <ValueInput
                    width="160px"
                    min={0.001}
                    max={0.999}
                    step={0.01}
                    value={sigLevel}
                    onChange={setSigLevel}
                    label="有意水準"
                    placeholder="0.05"
                  />
                  <ValueInput
                    width="160px"
                    min={0.001}
                    max={0.999}
                    step={0.01}
                    value={power}
                    onChange={setPower}
                    label="検出力"
                    placeholder="0.8"
                    disabled={isPowerTarget}
                  />
                  <ValueInput
                    width="160px"
                    min={isPowerTarget && sampleSizeHasValue ? 1 : undefined}
                    step={isPowerTarget ? 1 : undefined}
                    value={sampleSize}
                    onChange={setSampleSize}
                    label="サンプルサイズ"
                    placeholder=""
                    disabled={!isPowerTarget}
                  />
                  {isAnov ? (
                    <ValueInput
                      width="160px"
                      min={kHasValue ? 2 : undefined}
                      step={1}
                      value={kValue}
                      onChange={setKValue}
                      label="水準の数"
                      placeholder=""
                    />
                  ) : null}
                  {isF2 ? (
                    <ValueInput
                      width="160px"
                      min={uHasValue ? 1 : undefined}
                      step={1}
                      value={uValue}
                      onChange={setUValue}
                      label="説明変数の数"
                      placeholder=""
                    />
                  ) : null}
                  {isChisq ? (
                    <ValueInput
                      width="160px"
                      min={dfHasValue ? 1 : undefined}
                      step={1}
                      value={dfValue}
                      onChange={setDfValue}
                      label="自由度"
                      placeholder=""
                    />
                  ) : null}
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

export default PowerTestModal;
