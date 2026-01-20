import { Stack, Text } from '@chakra-ui/react';

import RadioOptions from './RadioOptions';

export const MISSING_VALUE_OPTIONS = [
  { label: '許可しない', value: 'all.obs' },
  { label: 'リストワイズ', value: 'complete.obs' },
  { label: 'ペアワイズ', value: 'pairwise.complete.obs' },
];

interface MissingValueUseProps {
  value?: string;
  onChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  label?: string;
}

const MissingValueUse = ({
  value,
  onChange,
  orientation = 'horizontal',
  label = '欠損値',
}: MissingValueUseProps) => (
  <Stack gap="3">
    <Text fontWeight="semibold">{label}</Text>
    <RadioOptions items={MISSING_VALUE_OPTIONS} orientation={orientation} value={value} onChange={onChange} />
  </Stack>
);

export const isMissingValueUse = (value: string) =>
  MISSING_VALUE_OPTIONS.some((option) => option.value === value);

export default MissingValueUse;
