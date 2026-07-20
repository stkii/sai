import { Box, Button, HStack, IconButton, Text, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { LuX } from 'react-icons/lu';
import type { AnalysisOptions } from '../../../shared/types';
import { FieldFrame } from '../../../shared/ui/FieldFrame';
import { CheckField, SelectField, SelectInput, toChoices } from '../../../shared/ui/fields';
import { GoldenSplit } from '../../../shared/ui/GoldenSplit';
import { ModalActions } from '../../../shared/ui/ModalActions';
import { VariablePicker } from '../../ui/VariablePicker';
import type { ModalProps } from '../contracts';

interface RegressionOptions {
  dependent: string;
  allInteractions: boolean;
  interactions: [string, string][];
}

export function formatRegressionOptions(options: AnalysisOptions): string | null {
  const o = options as Partial<RegressionOptions>;
  const parts: string[] = [];
  if (o.dependent) parts.push(`目的変数: ${o.dependent}`);
  if (o.allInteractions) {
    parts.push('交互作用: 全ての2次の交互作用');
  } else if (o.interactions && o.interactions.length > 0) {
    parts.push(`交互作用: ${o.interactions.map(([a, b]) => `${a} × ${b}`).join(', ')}`);
  }
  return parts.length > 0 ? parts.join(' / ') : null;
}

export function RegressionModal({ headers, busy, onCancel, onExecute }: ModalProps) {
  const [dependent, setDependent] = useState<string>('');
  const [predictors, setPredictors] = useState<string[]>([]);
  const [allInteractions, setAllInteractions] = useState(false);
  const [interactions, setInteractions] = useState<[string, string][]>([]);
  const [pairA, setPairA] = useState<string>('');
  const [pairB, setPairB] = useState<string>('');

  // 独立変数から外れた変数を参照する交互作用ペアは無効になるため間引く
  function updatePredictors(next: string[]) {
    setPredictors(next);
    setInteractions((prev) => prev.filter(([a, b]) => next.includes(a) && next.includes(b)));
    setPairA((prev) => (next.includes(prev) ? prev : ''));
    setPairB((prev) => (next.includes(prev) ? prev : ''));
  }

  function handleSubmit() {
    if (!dependent || predictors.length === 0) return;
    const variables = [dependent, ...predictors.filter((p) => p !== dependent)];
    onExecute(variables, {
      dependent,
      allInteractions,
      interactions,
    } satisfies RegressionOptions);
  }

  function addInteraction() {
    if (!pairA || !pairB || pairA === pairB) return;
    const dup = interactions.some(
      ([a, b]) => (a === pairA && b === pairB) || (a === pairB && b === pairA)
    );
    if (dup) return;
    setInteractions([...interactions, [pairA, pairB]]);
    setPairA('');
    setPairB('');
  }

  function removeInteraction(idx: number) {
    setInteractions(interactions.filter((_, i) => i !== idx));
  }

  const canAddInteraction = predictors.length >= 2;

  return (
    <VStack align="stretch" gap={4}>
      <GoldenSplit
        primary={
          <FieldFrame label="独立変数 (1つ以上)">
            <VariablePicker
              headers={headers}
              selected={predictors}
              exclude={dependent ? [dependent] : []}
              onChange={updatePredictors}
            />
          </FieldFrame>
        }
        secondary={
          <SelectField
            label="目的変数"
            options={toChoices(headers)}
            value={dependent}
            placeholder="-- 選択 --"
            onChange={(v) => {
              setDependent(v);
              updatePredictors(predictors.filter((p) => p !== v));
            }}
          />
        }
      />
      <FieldFrame label="交互作用">
        <VStack align="stretch" gap={3}>
          <CheckField
            label="全ての2次の交互作用を投入する"
            checked={allInteractions}
            onChange={setAllInteractions}
          />
          {!allInteractions && (
            <VStack align="stretch" gap={2}>
              <HStack gap={2} align="center">
                <Box flex={1} minW={0}>
                  <SelectInput
                    options={toChoices(predictors)}
                    value={pairA}
                    onChange={setPairA}
                    placeholder="-- 変数A --"
                    disabled={!canAddInteraction}
                  />
                </Box>
                <Text fontSize="sm" color="fg.muted">
                  ×
                </Text>
                <Box flex={1} minW={0}>
                  <SelectInput
                    options={toChoices(predictors.filter((p) => p !== pairA))}
                    value={pairB}
                    onChange={setPairB}
                    placeholder="-- 変数B --"
                    disabled={!canAddInteraction}
                  />
                </Box>
                <Button
                  size="sm"
                  variant="subtle"
                  disabled={!pairA || !pairB || pairA === pairB}
                  onClick={addInteraction}
                >
                  追加
                </Button>
              </HStack>
              {!canAddInteraction && (
                <Text fontSize="xs" color="fg.subtle">
                  独立変数を 2 つ以上選択してください
                </Text>
              )}
              {interactions.length > 0 && (
                <VStack align="stretch" gap={1}>
                  {interactions.map(([a, b], i) => (
                    <HStack
                      key={`${a}-${b}`}
                      justify="space-between"
                      px={2}
                      py={1}
                      borderWidth="1px"
                      borderRadius="md"
                      bg="bg.subtle"
                    >
                      <Text fontSize="sm">
                        {a} × {b}
                      </Text>
                      <IconButton
                        size="xs"
                        variant="ghost"
                        aria-label={`交互作用 ${a} × ${b} を削除`}
                        onClick={() => removeInteraction(i)}
                      >
                        <LuX />
                      </IconButton>
                    </HStack>
                  ))}
                </VStack>
              )}
            </VStack>
          )}
        </VStack>
      </FieldFrame>
      <ModalActions
        busy={busy}
        disabled={!dependent || predictors.length === 0}
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </VStack>
  );
}
