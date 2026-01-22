import { Field, NumberInput } from '@chakra-ui/react';

interface ValueInputProps {
  width: string;
  min?: number;
  max?: number;
  step?: number;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helperText?: string;
  errText?: string;
  placeholder?: string;
  disabled?: boolean;
}

const ValueInput = ({
  width,
  min,
  max,
  step,
  value,
  onChange,
  label,
  helperText,
  errText,
  placeholder,
  disabled = false,
}: ValueInputProps) => {
  return (
    <Field.Root disabled={disabled}>
      {label ? <Field.Label>{label}</Field.Label> : null}
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
        <NumberInput.Input placeholder={placeholder} disabled={disabled} />
      </NumberInput.Root>
      {errText ? <Field.ErrorText>{errText}</Field.ErrorText> : null}
      {helperText ? <Field.HelperText>{helperText}</Field.HelperText> : null}
    </Field.Root>
  );
};

export default ValueInput;
