import { RadioGroup, Stack } from '@chakra-ui/react';

interface RadioOptionItem {
  label: string;
  value: string;
}

interface RadioOptionsProps {
  items: RadioOptionItem[];
  orientation: 'horizontal' | 'vertical';
  value?: string;
  onChange?: (value: string) => void;
}

const RadioOptions = ({ items, orientation, value, onChange }: RadioOptionsProps) => {
  const direction = orientation === 'vertical' ? 'column' : 'row';
  const defaultValue = items[0]?.value;
  const isControlled = typeof value !== 'undefined';

  return (
    <RadioGroup.Root
      defaultValue={isControlled ? undefined : defaultValue}
      value={isControlled ? value : undefined}
      onValueChange={(e) => {
        if (e.value) {
          onChange?.(e.value);
        }
      }}
      orientation={orientation}
    >
      <Stack gap="4" direction={direction} align={orientation === 'vertical' ? 'flex-start' : 'center'}>
        {items.map((item) => (
          <RadioGroup.Item key={item.value} value={item.value}>
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemIndicator />
            <RadioGroup.ItemText>{item.label}</RadioGroup.ItemText>
          </RadioGroup.Item>
        ))}
      </Stack>
    </RadioGroup.Root>
  );
};

export default RadioOptions;
