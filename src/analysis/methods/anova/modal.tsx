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

type AnovaInteractionMode = 'factor_only' | 'manual';

export type AnovaInteractions = 'factor_only' | InteractionTerm[];

export interface AnovaOptions extends AnalysisOptions {
  dependent: string;
  independent: string[];
  factors: string[];
  covariates: string[];
  interactions: AnovaInteractions;
}

const INTERACTION_MODE_OPTIONS = [
  { label: '因子間のみ（標準）', value: 'factor_only' },
  { label: '作成して投入', value: 'manual' },
] as const satisfies ReadonlyArray<{ label: string; value: AnovaInteractionMode }>;

const DEFAULT_SELECTION: AnovaVariableSelection = {
  dependent: null,
  factors: [],
  covariates: [],
};

const DEFAULT_INTERACTION_MODE: AnovaInteractionMode = 'factor_only';

export const AnovaModal = ({ open, onClose, variables, onExecute }: ModalProps<AnovaOptions>) => {
  const [selection, setSelection] = useState<AnovaVariableSelection>(DEFAULT_SELECTION);
  const [interactionMode, setInteractionMode] =
    useState<AnovaInteractionMode>(DEFAULT_INTERACTION_MODE);
  const [manualTerms, setManualTerms] = useState<InteractionTerm[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const previousVariablesKeyRef = useRef('');

  useEffect(() => {
    if (!open) {
      setSelection(DEFAULT_SELECTION);
      setInteractionMode(DEFAULT_INTERACTION_MODE);
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
    const allIndependent = new Set([...selection.factors, ...selection.covariates]);
    setManualTerms((prev) => {
      const next = prev.filter((term) => term.every((v) => allIndependent.has(v)));
      return next.length === prev.length ? prev : next;
    });
  }, [selection.factors, selection.covariates]);

  const handleExecute = async () => {
    const dependent = selection.dependent;
    if (!dependent) {
      setError('従属変数を選択してください');
      return;
    }

    const factors = selection.factors;
    const covariates = selection.covariates;
    if (factors.length === 0 && covariates.length === 0) {
      setError('因子または共変量を1つ以上選択してください');
      return;
    }

    if (!onExecute) {
      return;
    }

    const independent = [...factors, ...covariates];
    const interactions: AnovaInteractions =
      interactionMode === 'manual' ? manualTerms : interactionMode;

    setLoading(true);
    setError(null);
    try {
      await onExecute(
        [...new Set([dependent, ...independent])],
        { dependent, independent, factors, covariates, interactions },
        factors.length > 0 ? 'string_mixed' : undefined
      );
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
                  independentVariables={[...selection.factors, ...selection.covariates]}
                  terms={manualTerms}
                  onChange={setManualTerms}
                />
              )}
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </ModalFrame>
  );
};
