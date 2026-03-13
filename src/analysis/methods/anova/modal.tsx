import { Stack } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import {
  type AnovaVariableSelection,
  AnovaVariableSelector,
} from '../../components/AnovaVariableSelector';
import { ModalFrame } from '../../components/ModalFrame';
import type { AnalysisOptions } from '../../types';
import type { ModalProps } from '../contracts';

export interface AnovaOptions extends AnalysisOptions {
  dependent: string;
  independent: string[];
  factors: string[];
}

const DEFAULT_SELECTION: AnovaVariableSelection = {
  dependent: null,
  factors: [],
  covariates: [],
};

export const AnovaModal = ({ open, onClose, variables, onExecute }: ModalProps<AnovaOptions>) => {
  const [selection, setSelection] = useState<AnovaVariableSelection>(DEFAULT_SELECTION);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const previousVariablesKeyRef = useRef('');

  useEffect(() => {
    if (!open) {
      setSelection(DEFAULT_SELECTION);
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
    setError(null);
  }, [variables]);

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

    setLoading(true);
    setError(null);
    try {
      await onExecute(
        [...new Set([dependent, ...independent])],
        { dependent, independent, factors },
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
      </Stack>
    </ModalFrame>
  );
};
