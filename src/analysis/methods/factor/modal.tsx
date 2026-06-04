import {
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  NativeSelect,
  NumberInput,
  RadioGroup,
  VStack,
} from '@chakra-ui/react';
import { useState } from 'react';
import { FieldFrame } from '../../../shared/ui/FieldFrame';
import { VariablePicker } from '../../ui/VariablePicker';
import type { ModalProps } from '../contracts';

type Rotation = 'none' | 'varimax' | 'promax';
type NfactorsMode = 'guttman' | 'fixed';
type Method = 'PAF' | 'ML' | 'ULS';

interface FactorOptions {
  method: Method;
  nfactorsMode: NfactorsMode;
  nfactors: number;
  rotation: Rotation;
  sortByFactor: boolean;
}

const MODE_OPTIONS: { value: NfactorsMode; label: string }[] = [
  { value: 'guttman', label: '固有値に基づく' },
  { value: 'fixed', label: '任意の固定数' },
];

const ROTATION_OPTIONS: { value: Rotation; label: string }[] = [
  { value: 'none', label: '回転なし' },
  { value: 'varimax', label: 'バリマックス (直交)' },
  { value: 'promax', label: 'プロマックス (斜交)' },
];

const METHOD_OPTIONS: { value: Method; label: string }[] = [
  { value: 'PAF', label: '主因子法 (PAF)' },
  { value: 'ML', label: '最尤法 (ML)' },
  { value: 'ULS', label: '最小二乗法 (ULS)' },
];

export function FactorModal({ headers, busy, onCancel, onExecute }: ModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [method, setMethod] = useState<Method>('PAF');
  const [mode, setMode] = useState<NfactorsMode>('guttman');
  const [nfactors, setNfactors] = useState<number>(1);
  const [rotation, setRotation] = useState<Rotation>('none');
  const [sortByFactor, setSortByFactor] = useState(false);

  function handleSubmit() {
    if (selected.length < 3) return;
    if (mode === 'fixed' && nfactors < 1) return;
    onExecute(selected, {
      method,
      nfactorsMode: mode,
      nfactors,
      rotation,
      sortByFactor,
    } satisfies FactorOptions);
  }

  return (
    <VStack align="stretch" gap={4}>
      <Flex gap={5} align="stretch">
        <Box flex={1} minW={0}>
          <FieldFrame label="変数選択 (3つ以上)">
            <VariablePicker headers={headers} selected={selected} onChange={setSelected} />
          </FieldFrame>
        </Box>
        <Box width="260px" flexShrink={0}>
          <VStack align="stretch" gap={3}>
            <FieldFrame label="抽出法">
              <NativeSelect.Root size="sm">
                <NativeSelect.Field
                  value={method}
                  onChange={(e) => setMethod(e.currentTarget.value as Method)}
                >
                  {METHOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </FieldFrame>
            <FieldFrame label="因子数">
              <VStack align="stretch" gap={2}>
                <RadioGroup.Root
                  size="sm"
                  value={mode}
                  onValueChange={(d) => setMode(d.value as NfactorsMode)}
                >
                  <Flex wrap="wrap" rowGap={2} columnGap={4}>
                    {MODE_OPTIONS.map((opt) => (
                      <RadioGroup.Item key={opt.value} value={opt.value}>
                        <RadioGroup.ItemHiddenInput />
                        <RadioGroup.ItemIndicator />
                        <RadioGroup.ItemText fontSize="sm">{opt.label}</RadioGroup.ItemText>
                      </RadioGroup.Item>
                    ))}
                  </Flex>
                </RadioGroup.Root>
                <NumberInput.Root
                  size="sm"
                  min={1}
                  step={1}
                  value={String(nfactors)}
                  disabled={mode !== 'fixed'}
                  onValueChange={(d) => {
                    const v = d.valueAsNumber;
                    if (Number.isFinite(v)) {
                      setNfactors(Math.max(1, Math.floor(v)));
                    }
                  }}
                >
                  <NumberInput.Control>
                    <NumberInput.IncrementTrigger />
                    <NumberInput.DecrementTrigger />
                  </NumberInput.Control>
                  <NumberInput.Input />
                </NumberInput.Root>
              </VStack>
            </FieldFrame>
            <FieldFrame label="回転">
              <RadioGroup.Root
                size="sm"
                value={rotation}
                onValueChange={(d) => setRotation(d.value as Rotation)}
              >
                <Flex wrap="wrap" rowGap={2} columnGap={4}>
                  {ROTATION_OPTIONS.map((opt) => (
                    <RadioGroup.Item key={opt.value} value={opt.value}>
                      <RadioGroup.ItemHiddenInput />
                      <RadioGroup.ItemIndicator />
                      <RadioGroup.ItemText fontSize="sm">{opt.label}</RadioGroup.ItemText>
                    </RadioGroup.Item>
                  ))}
                </Flex>
              </RadioGroup.Root>
            </FieldFrame>
            <FieldFrame label="表示">
              <Checkbox.Root
                size="sm"
                checked={sortByFactor}
                onCheckedChange={(d) => setSortByFactor(d.checked === true)}
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label fontSize="sm">因子ごとにソート</Checkbox.Label>
              </Checkbox.Root>
            </FieldFrame>
          </VStack>
        </Box>
      </Flex>
      <HStack justify="flex-end" gap={2}>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          キャンセル
        </Button>
        <Button
          size="sm"
          colorPalette="blue"
          onClick={handleSubmit}
          loading={busy}
          disabled={selected.length < 3 || (mode === 'fixed' && nfactors < 1)}
        >
          実行
        </Button>
      </HStack>
    </VStack>
  );
}
