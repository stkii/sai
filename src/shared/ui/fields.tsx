/** 分析モーダル共通の入力プリミティブ。Chakra の compound component を最小の props で包む。 */

import { Checkbox, Field, Flex, Input, NativeSelect, RadioGroup } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { FieldFrame } from './FieldFrame';

/** 選択肢定数の共通形。`labelOf()` が引く構造と同じ。 */
export interface Choice<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/** 変数名の配列 (headers 等) をそのまま選択肢に変換する。 */
export function toChoices(values: readonly string[]): Choice[] {
  return values.map((v) => ({ value: v, label: v }));
}

interface RadioChoicesProps<T extends string> {
  options: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 選択肢群ごと無効化する。他の選択によって設問自体が意味を持たない場合に使う */
  disabled?: boolean;
}

/** 単一選択の選択肢群 (枠なし)。枠内に他の入力を同居させる場合に使う。 */
export function RadioChoices<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: RadioChoicesProps<T>) {
  return (
    <RadioGroup.Root
      size="sm"
      value={value}
      disabled={disabled}
      onValueChange={(d) => onChange(d.value as T)}
    >
      <Flex wrap="wrap" rowGap={2} columnGap={4}>
        {options.map((opt) => (
          <RadioGroup.Item key={opt.value} value={opt.value} disabled={disabled || opt.disabled}>
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemIndicator />
            <RadioGroup.ItemText fontSize="sm">{opt.label}</RadioGroup.ItemText>
          </RadioGroup.Item>
        ))}
      </Flex>
    </RadioGroup.Root>
  );
}

/** 枠付きの単一選択フィールド。 */
export function RadioField<T extends string>({
  label,
  ...rest
}: RadioChoicesProps<T> & { label: string }) {
  return (
    <FieldFrame label={label}>
      <RadioChoices {...rest} />
    </FieldFrame>
  );
}

interface CheckFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** 複数選択の 1 項目。枠は呼び出し側で付ける。 */
export function CheckField({ label, checked, onChange }: CheckFieldProps) {
  return (
    <Checkbox.Root
      size="sm"
      checked={checked}
      onCheckedChange={(d) => onChange(d.checked === true)}
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control />
      <Checkbox.Label fontSize="sm">{label}</Checkbox.Label>
    </Checkbox.Root>
  );
}

interface SelectInputProps {
  options: readonly Choice[];
  value: string;
  onChange: (value: string) => void;
  /** 未選択を表す先頭の option。省略すると空選択肢を出さない */
  placeholder?: string;
  disabled?: boolean;
}

/** 選択肢が多い場合のドロップダウン (枠なし)。 */
export function SelectInput({
  options,
  value,
  onChange,
  placeholder,
  disabled,
}: SelectInputProps) {
  return (
    <NativeSelect.Root size="sm" disabled={disabled}>
      <NativeSelect.Field
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  );
}

/** 枠付きのドロップダウン。 */
export function SelectField({ label, ...rest }: SelectInputProps & { label: string }) {
  return (
    <FieldFrame label={label}>
      <SelectInput {...rest} />
    </FieldFrame>
  );
}

/** ラベルと入力を id で紐付ける最小の Field。label が空なら枠側の見出しに任せる。 */
function LabeledField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Field.Root>
      {label !== '' && (
        <Field.Label fontSize="xs" color="fg.muted">
          {label}
        </Field.Label>
      )}
      {children}
    </Field.Root>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** 自由入力の1行テキスト。 */
export function TextField({ label, value, onChange, placeholder }: TextFieldProps) {
  return (
    <LabeledField label={label}>
      <Input
        size="sm"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.currentTarget.value)}
      />
    </LabeledField>
  );
}

interface NumberFieldProps {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  step?: string;
  disabled?: boolean;
}

/** 空欄を undefined として扱う数値入力。NumberInput は制御値 (number) との往復で "0." など小数の途中入力が消えるため、素の input[type=number] を使う。 */
export function NumberField({ label, value, onChange, step = 'any', disabled }: NumberFieldProps) {
  return (
    <LabeledField label={label}>
      <Input
        size="sm"
        type="number"
        step={step}
        disabled={disabled}
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.currentTarget.value;
          onChange(raw === '' ? undefined : Number(raw));
        }}
      />
    </LabeledField>
  );
}
