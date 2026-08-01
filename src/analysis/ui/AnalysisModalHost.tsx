import { CloseButton, Dialog, Portal, Text } from '@chakra-ui/react';
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
  const { dataset } = useDataset();
  const { addResult } = useResult();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 実行エラーを次に開いたモーダルへ持ち越さないよう、閉じる時に必ず消す
  function handleClose() {
    setError(null);
    onClose();
  }

  const mod = method ? findMethod(method) : undefined;
  const requiresDataset = mod?.definition.requiresDataset !== false;
  const open = Boolean(method && mod && (!requiresDataset || dataset));

  async function handleExecute(variables: string[], options: Record<string, unknown>) {
    if (!method || !mod) return;
    if (requiresDataset && !dataset) return;
    setBusy(true);
    setError(null);
    try {
      const result = await runAnalysis({
        datasetKey: requiresDataset && dataset ? dataset.key : null,
        method,
        variables,
        options,
      });
      addResult({
        method,
        variables,
        options,
        result,
        persist: mod.definition.persistHistory !== false,
      });
      handleClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(d) => !d.open && !busy && handleClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxWidth="760px">
            <Dialog.Header>
              <Dialog.Title>{mod?.definition.label}</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" disabled={busy} />
            </Dialog.CloseTrigger>
            <Dialog.Body>
              {mod ? (
                <>
                  {mod.renderModal({
                    headers: dataset?.headers ?? [],
                    busy,
                    onCancel: handleClose,
                    onExecute: handleExecute,
                  })}
                  {error && (
                    <Text mt={2} fontSize="xs" color="fg.error" role="alert">
                      {error}
                    </Text>
                  )}
                </>
              ) : null}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
