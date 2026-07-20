import { VStack } from '@chakra-ui/react';
import { useState } from 'react';
import type { AnalysisOptions } from '../../../shared/types';
import { FieldFrame } from '../../../shared/ui/FieldFrame';
import { type Choice, RadioField, SelectField, toChoices } from '../../../shared/ui/fields';
import { GoldenSplit } from '../../../shared/ui/GoldenSplit';
import { ModalActions } from '../../../shared/ui/ModalActions';
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

const DESIGN_OPTIONS: Choice<Design>[] = [
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
      <GoldenSplit
        primary={
          <FieldFrame label="要因 (カテゴリ変数, 複数選択可)">
            <VariablePicker
              headers={headers}
              selected={factors}
              exclude={[dependent, subject].filter(Boolean)}
              onChange={setFactors}
            />
          </FieldFrame>
        }
        secondary={
          <VStack align="stretch" gap={3}>
            <RadioField
              label="デザイン"
              options={DESIGN_OPTIONS}
              value={design}
              onChange={setDesign}
            />
            <SelectField
              label="従属変数 (数値)"
              options={toChoices(headers)}
              value={dependent}
              onChange={setDependent}
              placeholder="-- 選択 --"
            />
            {design === 'within' && (
              <SelectField
                label="被験者ID列"
                options={toChoices(headers.filter((h) => h !== dependent && !factors.includes(h)))}
                value={subject}
                onChange={setSubject}
                placeholder="-- 選択 --"
              />
            )}
          </VStack>
        }
      />
      <ModalActions
        busy={busy}
        disabled={!dependent || factors.length === 0 || (design === 'within' && !subject)}
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </VStack>
  );
}
