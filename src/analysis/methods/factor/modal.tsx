import { NumberInput, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { FieldFrame } from '../../../shared/ui/FieldFrame';
import {
  CheckField,
  type Choice,
  RadioChoices,
  RadioField,
  SelectField,
} from '../../../shared/ui/fields';
import { GoldenSplit } from '../../../shared/ui/GoldenSplit';
import { ModalActions } from '../../../shared/ui/ModalActions';
import { VariablePicker } from '../../../shared/ui/VariablePicker';
import { labelOf, type ModalProps } from '../contracts';

type Rotation = 'none' | 'varimax' | 'promax';
type NfactorsMode = 'guttman' | 'fixed';
type Method = 'PAF' | 'ML' | 'ULS';
type NaMode = 'complete.obs' | 'pairwise.complete.obs';

export type FactorOptions = {
  method: Method;
  nfactorsMode: NfactorsMode;
  nfactors: number;
  rotation: Rotation;
  na: NaMode;
  sortByFactor: boolean;
};

const MODE_OPTIONS: Choice<NfactorsMode>[] = [
  { value: 'guttman', label: '固有値に基づく' },
  { value: 'fixed', label: '任意の固定数' },
];

const NA_OPTIONS: Choice<NaMode>[] = [
  { value: 'complete.obs', label: 'リストワイズ削除' },
  { value: 'pairwise.complete.obs', label: 'ペアワイズ削除' },
];

const ROTATION_OPTIONS: Choice<Rotation>[] = [
  { value: 'none', label: '回転なし' },
  { value: 'varimax', label: 'バリマックス (直交)' },
  { value: 'promax', label: 'プロマックス (斜交)' },
];

const METHOD_OPTIONS: Choice<Method>[] = [
  { value: 'PAF', label: '主因子法 (PAF)' },
  { value: 'ML', label: '最尤法 (ML)' },
  { value: 'ULS', label: '最小二乗法 (ULS)' },
];

export function formatFactorOptions(o: Partial<FactorOptions>): string | null {
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

export function FactorModal({ headers, busy, onCancel, onExecute }: ModalProps<FactorOptions>) {
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
    });
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
            <SelectField
              label="抽出法"
              options={METHOD_OPTIONS}
              value={method}
              onChange={(v) => setMethod(v as Method)}
            />
            <FieldFrame label="因子数">
              <VStack align="stretch" gap={2}>
                <RadioChoices options={MODE_OPTIONS} value={mode} onChange={setMode} />
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
                  <NumberInput.Input aria-label="因子数" />
                </NumberInput.Root>
              </VStack>
            </FieldFrame>
            <RadioField
              label="回転"
              options={ROTATION_OPTIONS}
              value={rotation}
              onChange={setRotation}
            />
            <RadioField label="欠測値の扱い" options={NA_OPTIONS} value={na} onChange={setNa} />
            <FieldFrame label="表示">
              <CheckField
                label="因子ごとにソート"
                checked={sortByFactor}
                onChange={setSortByFactor}
              />
            </FieldFrame>
          </VStack>
        }
      />
      <ModalActions
        busy={busy}
        disabled={selected.length < 3 || (mode === 'fixed' && nfactors < 1)}
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </VStack>
  );
}
