import {
  Box,
  CloseButton,
  Dialog,
  HStack,
  Portal,
  RadioGroup,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';

import ExecuteButton from '../components/ExecuteButton';
import MissingValueUse, { MISSING_VALUE_OPTIONS } from '../components/MissingValueUse';
import PopoverSelect, { type PopoverSelectItem } from '../components/PopoverSelect';
import RadioOptions from '../components/RadioOptions';
import ValueInput from '../components/ValueInput';
import VariableSelector from '../components/VariableSelector';
import { useDialogError } from '../hooks/useDialogError';
import type { AnalysisOptions } from '../runner';

const METHOD_OPTIONS: PopoverSelectItem[] = [{ label: '最尤法', value: 'ml' }];

const CRITERION_OPTIONS = [
  { label: 'ガットマン基準', value: 'guttman' },
  { label: '固定（因子数）', value: 'fixed' },
];

const ROTATION_OPTIONS = [
  { label: 'バリマックス', value: 'varimax' },
  { label: 'プロマックス', value: 'promax' },
];

interface FactorModalOptions extends AnalysisOptions {
  method: string;
  n_factors_auto: boolean;
  n_factors?: number;
  rotation: string;
  corr_use: string;
  power?: number;
}

interface FactorModalProps {
  open: boolean;
  onClose: () => void;
  variables: string[];
  onExecute?: (variables: string[], options: FactorModalOptions) => Promise<void>;
}

const FactorModal = ({ open, onClose, onExecute, variables }: FactorModalProps) => {
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PopoverSelectItem | null>(METHOD_OPTIONS[0] ?? null);
  const [criterion, setCriterion] = useState(CRITERION_OPTIONS[0]?.value ?? 'guttman');
  const [fixedFactors, setFixedFactors] = useState('');
  const [rotation, setRotation] = useState(ROTATION_OPTIONS[0]?.value ?? 'varimax');
  const [power, setPower] = useState('4');
  const [use, setUse] = useState(MISSING_VALUE_OPTIONS[0]?.value ?? 'all.obs');

  const { showValidationError, showAnalysisError } = useDialogError(setError);
  const isFixed = criterion === 'fixed';
  const isPromax = rotation === 'promax';
  const fixedFactorsHasValue = fixedFactors.trim().length > 0;
  const powerHasValue = power.trim().length > 0;

  useEffect(() => {
    if (!open) {
      setSelectedVariables([]);
      setError(null);
      setLoading(false);
      setSelectedMethod(METHOD_OPTIONS[0] ?? null);
      setCriterion(CRITERION_OPTIONS[0]?.value ?? 'guttman');
      setFixedFactors('');
      setRotation(ROTATION_OPTIONS[0]?.value ?? 'varimax');
      setPower('4');
      setUse(MISSING_VALUE_OPTIONS[0]?.value ?? 'all.obs');
    }
  }, [open]);

  useEffect(() => {
    setSelectedVariables([]);
    setError(null);
    setSelectedMethod(METHOD_OPTIONS[0] ?? null);
    setCriterion(CRITERION_OPTIONS[0]?.value ?? 'guttman');
    setFixedFactors('');
    setRotation(ROTATION_OPTIONS[0]?.value ?? 'varimax');
    setPower('4');
    setUse(MISSING_VALUE_OPTIONS[0]?.value ?? 'all.obs');
    if (variables.length === 0) {
      return;
    }
  }, [variables]);

  const handleExecute = async () => {
    if (selectedVariables.length === 0) {
      await showValidationError('変数を選択してください');
      return;
    }
    if (!CRITERION_OPTIONS.some((option) => option.value === criterion)) {
      await showValidationError('因子数の基準が不正です');
      return;
    }
    if (criterion === 'fixed') {
      const parsed = Number(fixedFactors);
      if (!Number.isFinite(parsed) || parsed < 1) {
        await showValidationError('因子数を1以上で入力してください');
        return;
      }
    }
    if (!ROTATION_OPTIONS.some((option) => option.value === rotation)) {
      await showValidationError('回転の指定が不正です');
      return;
    }
    if (rotation === 'promax') {
      const parsedPower = Number(power);
      if (!Number.isFinite(parsedPower) || parsedPower <= 0) {
        await showValidationError('プロマックスのpowerを正しく入力してください');
        return;
      }
    }
    if (!MISSING_VALUE_OPTIONS.some((option) => option.value === use)) {
      await showValidationError('欠損値の指定が不正です');
      return;
    }
    if (!onExecute) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const method = selectedMethod?.value ?? METHOD_OPTIONS[0]?.value ?? 'ml';
      const n_factors_auto = criterion === 'guttman';
      const n_factors = criterion === 'fixed' ? Number(fixedFactors) : undefined;
      const powerValue = rotation === 'promax' ? Number(power) : undefined;
      await onExecute(selectedVariables, {
        method,
        n_factors_auto,
        n_factors,
        rotation,
        corr_use: use,
        power: powerValue,
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
              <Dialog.Title>因子分析</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap="6" alignItems="start">
                <Stack gap="3">
                  <Text fontWeight="semibold">変数選択</Text>
                  <Box overflowX="auto">
                    <VariableSelector variables={variables} onChange={setSelectedVariables} />
                  </Box>
                </Stack>
                <Stack gap="4">
                  <Stack gap="2">
                    <Text fontWeight="semibold">因子抽出</Text>
                    <Stack gap="2">
                      <Text fontWeight="semibold">方法</Text>
                      <Box alignSelf="flex-start" w="200px">
                        <PopoverSelect
                          items={METHOD_OPTIONS}
                          placeholder={METHOD_OPTIONS[0]?.label ?? '最尤法'}
                          onSelect={setSelectedMethod}
                        />
                      </Box>
                    </Stack>
                    <Stack gap="2">
                      <Text fontWeight="semibold">基準</Text>
                      <RadioGroup.Root
                        value={criterion}
                        onValueChange={(e) => {
                          if (e.value) {
                            setCriterion(e.value);
                          }
                        }}
                        orientation="vertical"
                      >
                        <Stack gap="3" align="flex-start">
                          <RadioGroup.Item value={CRITERION_OPTIONS[0]?.value ?? 'guttman'}>
                            <RadioGroup.ItemHiddenInput />
                            <RadioGroup.ItemIndicator />
                            <RadioGroup.ItemText>
                              {CRITERION_OPTIONS[0]?.label ?? 'ガットマン基準'}
                            </RadioGroup.ItemText>
                          </RadioGroup.Item>
                          <RadioGroup.Item value={CRITERION_OPTIONS[1]?.value ?? 'fixed'}>
                            <RadioGroup.ItemHiddenInput />
                            <HStack gap="3" align="center">
                              <RadioGroup.ItemIndicator />
                              <RadioGroup.ItemText>
                                {CRITERION_OPTIONS[1]?.label ?? '固定（因子数）'}
                              </RadioGroup.ItemText>
                              <Box ml="4">
                                <ValueInput
                                  width="140px"
                                  min={isFixed && fixedFactorsHasValue ? 1 : undefined}
                                  max={isFixed && fixedFactorsHasValue ? 100 : undefined}
                                  step={isFixed ? 1 : undefined}
                                  value={fixedFactors}
                                  onChange={setFixedFactors}
                                  placeholder="例: 3"
                                  disabled={!isFixed}
                                />
                              </Box>
                            </HStack>
                          </RadioGroup.Item>
                        </Stack>
                      </RadioGroup.Root>
                    </Stack>
                  </Stack>
                  <Stack gap="2">
                    <Text fontWeight="semibold">回転</Text>
                    <RadioOptions
                      items={ROTATION_OPTIONS}
                      orientation="horizontal"
                      value={rotation}
                      onChange={setRotation}
                    />
                    <ValueInput
                      width="140px"
                      min={isPromax && powerHasValue ? 0.1 : undefined}
                      max={isPromax && powerHasValue ? 10 : undefined}
                      step={isPromax ? 0.1 : undefined}
                      value={power}
                      onChange={setPower}
                      label="power"
                      placeholder="例: 4"
                      disabled={!isPromax}
                    />
                  </Stack>
                  <MissingValueUse value={use} onChange={setUse} />
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

export default FactorModal;
