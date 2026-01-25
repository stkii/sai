import { Stack, Text } from '@chakra-ui/react';

import RadioOptions from './RadioOptions';

export const MISSING_VALUE_OPTIONS = [
  { label: 'リスト（行）ごとに除外', value: 'complete.obs' },
  { label: 'ペアごとに除外', value: 'pairwise.complete.obs' },
  { label: '平均値で置換', value: 'mean_imp' },
];

interface MissingValueUseProps {
  value?: string;
  onChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  disabledValues?: string[];
}

const MissingValueUse = ({
  value,
  onChange,
  orientation = 'horizontal',
  label = '欠損値',
  disabledValues = [],
}: MissingValueUseProps) => (
  <Stack gap="3">
    <Text fontWeight="semibold">{label}</Text>
    <RadioOptions
      items={MISSING_VALUE_OPTIONS.map((option) => ({
        ...option,
        disabled: disabledValues.includes(option.value),
      }))}
      orientation={orientation}
      value={value}
      onChange={onChange}
    />
  </Stack>
);

export const isMissingValueUse = (value: string) =>
  MISSING_VALUE_OPTIONS.some((option) => option.value === value);

export default MissingValueUse;
