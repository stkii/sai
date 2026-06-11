import {
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  IconButton,
  NativeSelect,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useState } from 'react';
import { LuX } from 'react-icons/lu';
import type { AnalysisOptions } from '../../../shared/types';
import { FieldFrame } from '../../../shared/ui/FieldFrame';
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
      <Flex gap={5} align="stretch">
        <Box flex={1} minW={0}>
          <FieldFrame label="独立変数 (1つ以上)">
            <VariablePicker
              headers={headers}
              selected={predictors}
              exclude={dependent ? [dependent] : []}
              onChange={updatePredictors}
            />
          </FieldFrame>
        </Box>
        <Box width="260px" flexShrink={0}>
          <FieldFrame label="目的変数">
            <NativeSelect.Root size="sm">
              <NativeSelect.Field
                value={dependent}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  setDependent(v);
                  updatePredictors(predictors.filter((p) => p !== v));
                }}
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
        </Box>
      </Flex>
      <FieldFrame label="交互作用">
        <VStack align="stretch" gap={3}>
          <Checkbox.Root
            size="sm"
            checked={allInteractions}
            onCheckedChange={(d) => setAllInteractions(d.checked === true)}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label fontSize="sm">全ての2次の交互作用を投入する</Checkbox.Label>
          </Checkbox.Root>
          {!allInteractions && (
            <VStack align="stretch" gap={2}>
              <HStack gap={2} align="center">
                <Box flex={1} minW={0}>
                  <NativeSelect.Root size="sm" disabled={!canAddInteraction}>
                    <NativeSelect.Field
                      value={pairA}
                      onChange={(e) => setPairA(e.currentTarget.value)}
                    >
                      <option value="">-- 変数A --</option>
                      {predictors.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Box>
                <Text fontSize="sm" color="gray.600">
                  ×
                </Text>
                <Box flex={1} minW={0}>
                  <NativeSelect.Root size="sm" disabled={!canAddInteraction}>
                    <NativeSelect.Field
                      value={pairB}
                      onChange={(e) => setPairB(e.currentTarget.value)}
                    >
                      <option value="">-- 変数B --</option>
                      {predictors
                        .filter((p) => p !== pairA)
                        .map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
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
                <Text fontSize="xs" color="gray.500">
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
                      bg="gray.50"
                    >
                      <Text fontSize="sm">
                        {a} × {b}
                      </Text>
                      <IconButton
                        size="xs"
                        variant="ghost"
                        aria-label="削除"
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
      <HStack justify="flex-end" gap={2}>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          キャンセル
        </Button>
        <Button
          size="sm"
          colorPalette="blue"
          onClick={handleSubmit}
          loading={busy}
          disabled={!dependent || predictors.length === 0}
        >
          実行
        </Button>
      </HStack>
    </VStack>
  );
}
