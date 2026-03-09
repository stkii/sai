import { Field, NumberInput } from '@chakra-ui/react';

interface Props {
  step: number;
  value: string;
  width: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  errText?: string;
  max?: number;
  min?: number;
}

export const BaseNumberInput = ({
  step,
  value,
  width,
  onChange,
  disabled = false,
  errText,
  max,
  min,
}: Props) => {
  return (
    <Field.Root disabled={disabled}>
      <NumberInput.Root
        width={width}
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={(e) => onChange(e.value)}
        disabled={disabled}
      >
        <NumberInput.Control />
        <NumberInput.Input disabled={disabled} />
      </NumberInput.Root>
      {errText ? <Field.ErrorText>{errText}</Field.ErrorText> : null}
    </Field.Root>
  );
};
