import { Box, Dialog, Portal, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { useDataset } from '../../data/state/DatasetContext';
import { useResult } from '../../result/state/ResultContext';
import { runAnalysis } from '../../shared/ipc/analysis';
import type { Method } from '../../shared/types';
import { findMethod } from '../methods';

interface Props {
  method: Method | null;
  onClose: () => void;
}

export function AnalysisModalHost({ method, onClose }: Props) {
  const { summary } = useDataset();
  const { addResult } = useResult();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mod = method ? findMethod(method) : undefined;
  const requiresDataset = mod?.definition.requiresDataset !== false;
  const open = Boolean(method && mod && (!requiresDataset || summary));

  async function handleExecute(variables: string[], options: Record<string, unknown>) {
    if (!method || !mod) return;
    if (requiresDataset && !summary) return;
    setBusy(true);
    setError(null);
    try {
      const result = await runAnalysis({
        datasetKey: requiresDataset && summary ? summary.key : null,
        method,
        variables,
        options,
      });
      addResult({ method, variables, options, result });
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(d) => !d.open && !busy && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxWidth="760px">
            <Dialog.Header>
              <Dialog.Title>{mod?.definition.label}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {mod ? (
                <Box>
                  {mod.renderModal({
                    headers: summary?.headers ?? [],
                    busy,
                    onCancel: onClose,
                    onExecute: handleExecute,
                  })}
                  {error && (
                    <Text mt={2} fontSize="xs" color="red.500">
                      {error}
                    </Text>
                  )}
                </Box>
              ) : null}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
