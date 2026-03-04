import { RadioGroup, Stack } from '@chakra-ui/react';

interface Contents {
  label: string;
  value: string;
  disabled?: boolean;
}

interface Props {
  contents: ReadonlyArray<Contents>;
  orientation: 'horizontal' | 'vertical';
  value?: string;
  onChange?: (value: string) => void;
}

const BaseRadioButton = ({ contents, orientation, value, onChange }: Props) => {
  const direction = orientation === 'vertical' ? 'column' : 'row';
  const defaultValue = contents[0]?.value;
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
      <Stack gap="4" direction={direction} align="flex-start">
        {contents.map((c) => (
          <RadioGroup.Item key={c.value} value={c.value} disabled={c.disabled}>
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemIndicator />
            <RadioGroup.ItemText>{c.label}</RadioGroup.ItemText>
          </RadioGroup.Item>
        ))}
      </Stack>
    </RadioGroup.Root>
  );
};

export default BaseRadioButton;
