import { Box, Stack, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { BaseRadioButton } from '../../../components/BaseRadioButton';
import {
  type AnovaVariableSelection,
  AnovaVariableSelector,
} from '../../components/AnovaVariableSelector';
import { InteractionBuilder, type InteractionTerm } from '../../components/InteractionBuilder';
import { ModalFrame } from '../../components/ModalFrame';
import type { AnalysisOptions } from '../../types';
import type { ModalProps } from '../contracts';

type AnovaInteractionMode = 'all' | 'manual';

export type AnovaInteractions = 'all' | InteractionTerm[];

type EffectSizeType = 'peta' | 'eta' | 'omega' | 'none';

export interface AnovaOptions extends AnalysisOptions {
  dependent?: string;
  subject?: string;
  between_factors: string[];
  within_factor_name?: string;
  within_factor_levels: string[];
  covariates: string[];
  interactions: AnovaInteractions;
  effect_size: EffectSizeType;
}

const INTERACTION_MODE_OPTIONS = [
  { label: '全て投入', value: 'all' },
  { label: '作成して投入', value: 'manual' },
] as const satisfies ReadonlyArray<{ label: string; value: AnovaInteractionMode }>;

const EFFECT_SIZE_OPTIONS = [
  { label: '偏η²', value: 'peta' },
  { label: 'η²', value: 'eta' },
  { label: 'ω²', value: 'omega' },
  { label: 'なし', value: 'none' },
] as const satisfies ReadonlyArray<{ label: string; value: EffectSizeType }>;

const DEFAULT_SELECTION: AnovaVariableSelection = {
  dependent: null,
  subject: null,
  betweenFactors: [],
  withinFactorName: '',
  withinFactorLevels: [],
  covariates: [],
};

const DEFAULT_INTERACTION_MODE: AnovaInteractionMode = 'all';
const DEFAULT_EFFECT_SIZE: EffectSizeType = 'peta';

export const AnovaModal = ({ open, onClose, variables, onExecute }: ModalProps<AnovaOptions>) => {
  const [selection, setSelection] = useState<AnovaVariableSelection>(DEFAULT_SELECTION);
  const [interactionMode, setInteractionMode] =
    useState<AnovaInteractionMode>(DEFAULT_INTERACTION_MODE);
  const [effectSize, setEffectSize] = useState<EffectSizeType>(DEFAULT_EFFECT_SIZE);
  const [manualTerms, setManualTerms] = useState<InteractionTerm[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const previousVariablesKeyRef = useRef('');

  useEffect(() => {
    if (!open) {
      setSelection(DEFAULT_SELECTION);
      setInteractionMode(DEFAULT_INTERACTION_MODE);
      setEffectSize(DEFAULT_EFFECT_SIZE);
      setManualTerms([]);
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
    const allFactors = new Set([
      ...selection.betweenFactors,
      ...(selection.withinFactorLevels.length > 0 && selection.withinFactorName
        ? [selection.withinFactorName]
        : []),
      ...selection.covariates,
    ]);
    setManualTerms((prev) => {
      const next = prev.filter((term) => term.every((v) => allFactors.has(v)));
      return next.length === prev.length ? prev : next;
    });
  }, [
    selection.betweenFactors,
    selection.withinFactorName,
    selection.withinFactorLevels,
    selection.covariates,
  ]);

  const handleExecute = async () => {
    const betweenFactors = selection.betweenFactors;
    const withinFactorLevels = selection.withinFactorLevels;
    const withinFactorName = selection.withinFactorName.trim();
    const covariates = selection.covariates;
    const hasWithin = withinFactorLevels.length > 0;

    if (!hasWithin && !selection.dependent) {
      setError('従属変数を選択してください');
      return;
    }

    if (betweenFactors.length === 0 && !hasWithin) {
      setError('被験者間要因または被験者内水準を1つ以上選択してください');
      return;
    }

    if (hasWithin && !withinFactorName) {
      setError('被験者内要因の要因名を入力してください');
      return;
    }

    if (hasWithin && !selection.subject) {
      setError('被験者内水準を使用する場合は被験者IDを選択してください');
      return;
    }

    if (!onExecute) {
      return;
    }

    const interactions: AnovaInteractions =
      interactionMode === 'manual' ? manualTerms : interactionMode;

    // Build list of columns to send to R
    const allVariables = [
      ...new Set([
        ...(selection.dependent ? [selection.dependent] : []),
        ...(selection.subject ? [selection.subject] : []),
        ...betweenFactors,
        ...withinFactorLevels,
        ...covariates,
      ]),
    ];

    setLoading(true);
    setError(null);
    try {
      await onExecute(
        allVariables,
        {
          dependent: selection.dependent ?? undefined,
          subject: selection.subject ?? undefined,
          between_factors: betweenFactors,
          within_factor_name: hasWithin ? withinFactorName : undefined,
          within_factor_levels: withinFactorLevels,
          covariates,
          interactions,
          effect_size: effectSize,
        },
        'string_mixed'
      );
    } catch (executeError: unknown) {
      setError(executeError instanceof Error ? executeError.message : String(executeError));
    } finally {
      setLoading(false);
    }
  };

  const allIndependent = [
    ...selection.betweenFactors,
    ...(selection.withinFactorLevels.length > 0 && selection.withinFactorName
      ? [selection.withinFactorName]
      : []),
    ...selection.covariates,
  ];

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="分散分析"
      onExecute={handleExecute}
      loading={loading}
      error={error}
      maxW="6xl"
    >
      <Stack gap="6" minW={0}>
        <AnovaVariableSelector variables={variables} onChange={setSelection} />

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
                onChange={(value) => setInteractionMode(value as AnovaInteractionMode)}
              />
              {interactionMode === 'manual' && (
                <InteractionBuilder
                  independentVariables={allIndependent}
                  terms={manualTerms}
                  onChange={setManualTerms}
                />
              )}
            </Stack>

            <Stack gap="2">
              <Text fontWeight="semibold">効果量</Text>
              <BaseRadioButton
                contents={EFFECT_SIZE_OPTIONS}
                orientation="horizontal"
                value={effectSize}
                onChange={(value) => setEffectSize(value as EffectSizeType)}
              />
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </ModalFrame>
  );
};
