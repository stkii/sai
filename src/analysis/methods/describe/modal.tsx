import { Flex, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { FieldFrame } from '../../../shared/ui/FieldFrame';
import { CheckField, type Choice, RadioField } from '../../../shared/ui/fields';
import { GoldenSplit } from '../../../shared/ui/GoldenSplit';
import { ModalActions } from '../../../shared/ui/ModalActions';
import { VariablePicker } from '../../ui/VariablePicker';
import { labelOf, type ModalProps } from '../contracts';

type SortMode = 'default' | 'mean_desc' | 'mean_asc';

export type DescribeOptions = {
  sort: SortMode;
  extras: {
    skewness: boolean;
    kurtosis: boolean;
  };
};

const SORT_OPTIONS: Choice<SortMode>[] = [
  { value: 'default', label: '変数リスト順' },
  { value: 'mean_desc', label: '平均値による降順' },
  { value: 'mean_asc', label: '平均値による昇順' },
];

export function formatDescribeOptions(o: Partial<DescribeOptions>): string | null {
  const parts: string[] = [];
  if (o.sort) parts.push(`表示順: ${labelOf(SORT_OPTIONS, o.sort)}`);
  const extras: string[] = [];
  if (o.extras?.skewness) extras.push('歪度');
  if (o.extras?.kurtosis) extras.push('尖度');
  if (extras.length > 0) parts.push(`追加の代表値: ${extras.join(', ')}`);
  return parts.length > 0 ? parts.join(' / ') : null;
}

export function DescribeModal({
  headers,
  busy,
  onCancel,
  onExecute,
}: ModalProps<DescribeOptions>) {
  const [selected, setSelected] = useState<string[]>([]);
  const [sort, setSort] = useState<SortMode>('default');
  const [skewness, setSkewness] = useState(false);
  const [kurtosis, setKurtosis] = useState(false);

  function handleSubmit() {
    if (selected.length === 0) return;
    onExecute(selected, { sort, extras: { skewness, kurtosis } });
  }

  return (
    <VStack align="stretch" gap={4}>
      <GoldenSplit
        primary={
          <FieldFrame label="変数選択">
            <VariablePicker headers={headers} selected={selected} onChange={setSelected} />
          </FieldFrame>
        }
        secondary={
          <VStack align="stretch" gap={3}>
            <RadioField label="表示順" options={SORT_OPTIONS} value={sort} onChange={setSort} />
            <FieldFrame label="追加の代表値">
              <Flex wrap="wrap" rowGap={2} columnGap={4}>
                <CheckField label="歪度" checked={skewness} onChange={setSkewness} />
                <CheckField label="尖度" checked={kurtosis} onChange={setKurtosis} />
              </Flex>
            </FieldFrame>
          </VStack>
        }
      />
      <ModalActions
        busy={busy}
        disabled={selected.length === 0}
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </VStack>
  );
}
