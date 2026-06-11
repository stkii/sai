import { Box, Button, Flex, HStack, NativeSelect, RadioGroup, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import type { AnalysisOptions } from '../../../shared/types';
import { FieldFrame } from '../../../shared/ui/FieldFrame';
import { VariablePicker } from '../../ui/VariablePicker';
import { labelOf, type ModalProps } from '../contracts';

type Design = 'between' | 'within';

// onExecute の AnalysisOptions (Record<string, unknown>) に直接代入できるよう
// interface ではなく type で定義する (interface は implicit index signature を持たない)
type AnovaOptions = {
  dependent: string;
  factors: string[];
  design: Design;
  subject?: string;
};

const DESIGN_OPTIONS: { value: Design; label: string }[] = [
  { value: 'between', label: '被験者間' },
  { value: 'within', label: '反復測定' },
];

export function formatAnovaOptions(options: AnalysisOptions): string | null {
  const o = options as Partial<AnovaOptions>;
  const parts: string[] = [];
  if (o.design) parts.push(`デザイン: ${labelOf(DESIGN_OPTIONS, o.design)}`);
  if (o.dependent) parts.push(`従属変数: ${o.dependent}`);
  if (o.factors && o.factors.length > 0) parts.push(`要因: ${o.factors.join(', ')}`);
  if (o.subject) parts.push(`被験者ID列: ${o.subject}`);
  return parts.length > 0 ? parts.join(' / ') : null;
}

export function AnovaModal({ headers, busy, onCancel, onExecute }: ModalProps) {
  const [dependent, setDependent] = useState<string>('');
  const [factors, setFactors] = useState<string[]>([]);
  const [design, setDesign] = useState<Design>('between');
  const [subject, setSubject] = useState<string>('');

  function handleSubmit() {
    if (!dependent || factors.length === 0) return;
    if (design === 'within' && !subject) return;
    const options: AnovaOptions = { dependent, factors, design };
    if (design === 'within') options.subject = subject;
    onExecute([dependent, ...factors], options);
  }

  return (
    <VStack align="stretch" gap={4}>
      <Flex gap={5} align="stretch">
        <Box flex={1} minW={0}>
          <FieldFrame label="要因 (カテゴリ変数, 複数選択可)">
            <VariablePicker
              headers={headers}
              selected={factors}
              exclude={[dependent, subject].filter(Boolean)}
              onChange={setFactors}
            />
          </FieldFrame>
        </Box>
        <Box width="260px" flexShrink={0}>
          <VStack align="stretch" gap={3}>
            <FieldFrame label="デザイン">
              <RadioGroup.Root
                size="sm"
                value={design}
                onValueChange={(d) => setDesign(d.value as Design)}
              >
                <Flex wrap="wrap" rowGap={2} columnGap={4}>
                  {DESIGN_OPTIONS.map((opt) => (
                    <RadioGroup.Item key={opt.value} value={opt.value}>
                      <RadioGroup.ItemHiddenInput />
                      <RadioGroup.ItemIndicator />
                      <RadioGroup.ItemText fontSize="sm">{opt.label}</RadioGroup.ItemText>
                    </RadioGroup.Item>
                  ))}
                </Flex>
              </RadioGroup.Root>
            </FieldFrame>
            <FieldFrame label="従属変数 (数値)">
              <NativeSelect.Root size="sm">
                <NativeSelect.Field
                  value={dependent}
                  onChange={(e) => setDependent(e.currentTarget.value)}
                >
                  <option value="">-- 選択 --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </FieldFrame>
            {design === 'within' && (
              <FieldFrame label="被験者ID列">
                <NativeSelect.Root size="sm">
                  <NativeSelect.Field
                    value={subject}
                    onChange={(e) => setSubject(e.currentTarget.value)}
                  >
                    <option value="">-- 選択 --</option>
                    {headers
                      .filter((h) => h !== dependent && !factors.includes(h))
                      .map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </FieldFrame>
            )}
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
          disabled={!dependent || factors.length === 0 || (design === 'within' && !subject)}
        >
          実行
        </Button>
      </HStack>
    </VStack>
  );
}
