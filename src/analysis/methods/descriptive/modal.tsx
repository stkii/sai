import { Box, Button, Checkbox, Flex, HStack, RadioGroup, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { FieldFrame } from '../../../shared/ui/FieldFrame';
import { VariablePicker } from '../../ui/VariablePicker';
import type { ModalProps } from '../contracts';

type SortMode = 'default' | 'mean_desc' | 'mean_asc';

interface DescribeOptions {
  sort: SortMode;
  extras: {
    skewness: boolean;
    kurtosis: boolean;
  };
}

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'default', label: '変数リスト順' },
  { value: 'mean_desc', label: '平均値による降順' },
  { value: 'mean_asc', label: '平均値による昇順' },
];

export function DescriptiveModal({ headers, busy, onCancel, onExecute }: ModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [sort, setSort] = useState<SortMode>('default');
  const [skewness, setSkewness] = useState(false);
  const [kurtosis, setKurtosis] = useState(false);

  function handleSubmit() {
    if (selected.length === 0) return;
    onExecute(selected, {
      sort,
      extras: { skewness, kurtosis },
    } satisfies DescribeOptions);
  }

  return (
    <VStack align="stretch" gap={4}>
      <Flex gap={5} align="stretch">
        <Box flex={1} minW={0}>
          <FieldFrame label="変数選択">
            <VariablePicker headers={headers} selected={selected} onChange={setSelected} />
          </FieldFrame>
        </Box>
        <Box width="260px" flexShrink={0}>
          <VStack align="stretch" gap={3}>
            <FieldFrame label="表示順">
              <RadioGroup.Root
                size="sm"
                value={sort}
                onValueChange={(d) => setSort(d.value as SortMode)}
              >
                <Flex wrap="wrap" rowGap={2} columnGap={4}>
                  {SORT_OPTIONS.map((opt) => (
                    <RadioGroup.Item key={opt.value} value={opt.value}>
                      <RadioGroup.ItemHiddenInput />
                      <RadioGroup.ItemIndicator />
                      <RadioGroup.ItemText fontSize="sm">{opt.label}</RadioGroup.ItemText>
                    </RadioGroup.Item>
                  ))}
                </Flex>
              </RadioGroup.Root>
            </FieldFrame>
            <FieldFrame label="追加の代表値">
              <Flex wrap="wrap" rowGap={2} columnGap={4}>
                <Checkbox.Root
                  size="sm"
                  checked={skewness}
                  onCheckedChange={(d) => setSkewness(d.checked === true)}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label fontSize="sm">歪度</Checkbox.Label>
                </Checkbox.Root>
                <Checkbox.Root
                  size="sm"
                  checked={kurtosis}
                  onCheckedChange={(d) => setKurtosis(d.checked === true)}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label fontSize="sm">尖度</Checkbox.Label>
                </Checkbox.Root>
              </Flex>
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
          disabled={selected.length === 0}
        >
          実行
        </Button>
      </HStack>
    </VStack>
  );
}
