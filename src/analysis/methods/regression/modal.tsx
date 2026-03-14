import { Box, Stack, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { BaseRadioButton } from '../../../components/BaseRadioButton';
import { InteractionBuilder, type InteractionTerm } from '../../components/InteractionBuilder';
import { ModalFrame } from '../../components/ModalFrame';
import {
  type RegressionVariableSelection,
  RegressionVariableSelector,
} from '../../components/RegressionVariableSelector';
import type { AnalysisOptions } from '../../types';
import type { ModalProps } from '../contracts';

type InteractionMode = 'none' | 'auto' | 'manual';

export type RegressionInteractions = 'none' | 'auto' | string[];

type BinaryToggle = 'on' | 'off';

export interface RegressionOptions extends AnalysisOptions {
  dependent: string;
  independent: string[];
  interactions: RegressionInteractions;
  intercept: boolean;
  center: boolean;
}

const INTERACTION_MODE_OPTIONS = [
  { label: 'なし', value: 'none' },
  { label: '全て投入', value: 'auto' },
  { label: '作成して投入', value: 'manual' },
] as const satisfies ReadonlyArray<{ label: string; value: InteractionMode }>;

const INTERCEPT_OPTIONS = [
  { label: '含める', value: 'on' },
  { label: '含めない', value: 'off' },
] as const satisfies ReadonlyArray<{ label: string; value: BinaryToggle }>;

const CENTER_OPTIONS = [
  { label: 'しない', value: 'off' },
  { label: 'する', value: 'on' },
] as const satisfies ReadonlyArray<{ label: string; value: BinaryToggle }>;

const DEFAULT_SELECTION: RegressionVariableSelection = {
  dependent: null,
  independent: [],
};

const DEFAULT_INTERACTION_MODE: InteractionMode = 'none';
const DEFAULT_INTERCEPT = INTERCEPT_OPTIONS[0]?.value ?? 'on';
const DEFAULT_CENTER = CENTER_OPTIONS[0]?.value ?? 'off';

export const RegressionModal = ({
  open,
  onClose,
  variables,
  onExecute,
}: ModalProps<RegressionOptions>) => {
  const [selection, setSelection] = useState<RegressionVariableSelection>(DEFAULT_SELECTION);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(DEFAULT_INTERACTION_MODE);
  const [manualTerms, setManualTerms] = useState<InteractionTerm[]>([]);
  const [intercept, setIntercept] = useState<BinaryToggle>(DEFAULT_INTERCEPT);
  const [center, setCenter] = useState<BinaryToggle>(DEFAULT_CENTER);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const previousVariablesKeyRef = useRef('');

  useEffect(() => {
    if (!open) {
      setSelection(DEFAULT_SELECTION);
      setInteractionMode(DEFAULT_INTERACTION_MODE);
      setManualTerms([]);
      setIntercept(DEFAULT_INTERCEPT);
      setCenter(DEFAULT_CENTER);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    const nextVariablesKey = variables.join('\u0000');
    if (previousVariablesKeyRef.current === nextVariablesKey) {
      return;
    }
    previousVariablesKeyRef.current = nextVariablesKey;
    setSelection(DEFAULT_SELECTION);
    setManualTerms([]);
    setError(null);
  }, [variables]);

  useEffect(() => {
    const independentSet = new Set(selection.independent);
    setManualTerms((prev) => {
      const next = prev.filter((term) => term.every((v) => independentSet.has(v)));
      return next.length === prev.length ? prev : next;
    });
  }, [selection.independent]);

  const handleExecute = async () => {
    const dependent = selection.dependent;
    if (!dependent) {
      setError('従属変数を選択してください');
      return;
    }

    const independent = selection.independent.filter((variable) => variable !== dependent);
    if (independent.length === 0) {
      setError('独立変数を1つ以上選択してください');
      return;
    }

    if (!onExecute) {
      return;
    }

    const interactions: RegressionInteractions =
      interactionMode === 'manual' ? manualTerms.map((term) => term.join(':')) : interactionMode;

    setLoading(true);
    setError(null);
    try {
      await onExecute([...new Set([dependent, ...independent])], {
        dependent,
        independent,
        interactions,
        intercept: intercept === 'on',
        center: center === 'on',
      });
    } catch (executeError: unknown) {
      setError(executeError instanceof Error ? executeError.message : String(executeError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="回帰分析"
      onExecute={handleExecute}
      loading={loading}
      error={error}
      maxW="7xl"
    >
      <Stack gap="6" minW={0}>
        <RegressionVariableSelector variables={variables} onChange={setSelection} />

        <Box
          position="relative"
          borderWidth="1px"
          borderColor="gray.200"
          rounded="md"
          px="4"
          pt="6"
          pb="4"
          minW={0}
        >
          <Text
            position="absolute"
            top="0"
            left="3"
            transform="translateY(-50%)"
            px="2"
            bg="bg"
            fontSize="sm"
            fontWeight="semibold"
            color="gray.600"
          >
            分析オプション
          </Text>

          <Stack gap="4">
            <Stack gap="2">
              <Text fontWeight="semibold">交互作用</Text>
              <BaseRadioButton
                contents={INTERACTION_MODE_OPTIONS}
                orientation="horizontal"
                value={interactionMode}
                onChange={(value) => setInteractionMode(value as InteractionMode)}
              />
              {interactionMode === 'manual' && (
                <InteractionBuilder
                  independentVariables={selection.independent}
                  terms={manualTerms}
                  onChange={setManualTerms}
                />
              )}
            </Stack>

            <Stack gap="2">
              <Text fontWeight="semibold">切片</Text>
              <BaseRadioButton
                contents={INTERCEPT_OPTIONS}
                orientation="horizontal"
                value={intercept}
                onChange={(value) => setIntercept(value as BinaryToggle)}
              />
            </Stack>

            <Stack gap="2">
              <Text fontWeight="semibold">中心化</Text>
              <BaseRadioButton
                contents={CENTER_OPTIONS}
                orientation="horizontal"
                value={center}
                onChange={(value) => setCenter(value as BinaryToggle)}
              />
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </ModalFrame>
  );
};
