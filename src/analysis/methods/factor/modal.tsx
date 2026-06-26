import {
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
import type { AnalysisOptions } from '../../../shared/types';
import { FieldFrame } from '../../../shared/ui/FieldFrame';
import { GoldenSplit } from '../../../shared/ui/GoldenSplit';
import { VariablePicker } from '../../ui/VariablePicker';
import { labelOf, type ModalProps } from '../contracts';

type Rotation = 'none' | 'varimax' | 'promax';
type NfactorsMode = 'guttman' | 'fixed';
type Method = 'PAF' | 'ML' | 'ULS';
type NaMode = 'complete.obs' | 'pairwise.complete.obs';

interface FactorOptions {
  method: Method;
  nfactorsMode: NfactorsMode;
  nfactors: number;
  rotation: Rotation;
  na: NaMode;
  sortByFactor: boolean;
}

const MODE_OPTIONS: { value: NfactorsMode; label: string }[] = [
  { value: 'guttman', label: '固有値に基づく' },
  { value: 'fixed', label: '任意の固定数' },
];

const NA_OPTIONS: { value: NaMode; label: string }[] = [
  { value: 'complete.obs', label: 'リストワイズ削除' },
  { value: 'pairwise.complete.obs', label: 'ペアワイズ削除' },
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

export function formatFactorOptions(options: AnalysisOptions): string | null {
  const o = options as Partial<FactorOptions>;
  const parts: string[] = [];
  if (o.method) parts.push(`抽出法: ${labelOf(METHOD_OPTIONS, o.method)}`);
  if (o.nfactorsMode === 'fixed') {
    parts.push(`因子数: ${labelOf(MODE_OPTIONS, o.nfactorsMode)} (${o.nfactors ?? '?'})`);
  } else if (o.nfactorsMode) {
    parts.push(`因子数: ${labelOf(MODE_OPTIONS, o.nfactorsMode)}`);
  }
  if (o.rotation) parts.push(`回転: ${labelOf(ROTATION_OPTIONS, o.rotation)}`);
  if (o.na) parts.push(`欠測値の扱い: ${labelOf(NA_OPTIONS, o.na)}`);
  if (o.sortByFactor) parts.push('表示: 因子ごとにソート');
  return parts.length > 0 ? parts.join(' / ') : null;
}

export function FactorModal({ headers, busy, onCancel, onExecute }: ModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [method, setMethod] = useState<Method>('PAF');
  const [mode, setMode] = useState<NfactorsMode>('guttman');
  const [nfactors, setNfactors] = useState<number>(1);
  const [rotation, setRotation] = useState<Rotation>('none');
  const [na, setNa] = useState<NaMode>('complete.obs');
  const [sortByFactor, setSortByFactor] = useState(false);

  function handleSubmit() {
    if (selected.length < 3) return;
    if (mode === 'fixed' && nfactors < 1) return;
    onExecute(selected, {
      method,
      nfactorsMode: mode,
      nfactors,
      rotation,
      na,
      sortByFactor,
    } satisfies FactorOptions);
  }

  return (
    <VStack align="stretch" gap={4}>
      <GoldenSplit
        primary={
          <FieldFrame label="変数選択 (3つ以上)">
            <VariablePicker headers={headers} selected={selected} onChange={setSelected} />
          </FieldFrame>
        }
        secondary={
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
            <FieldFrame label="欠測値の扱い">
              <RadioGroup.Root
                size="sm"
                value={na}
                onValueChange={(d) => setNa(d.value as NaMode)}
              >
                <Flex wrap="wrap" rowGap={2} columnGap={4}>
                  {NA_OPTIONS.map((opt) => (
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
        }
      />
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
