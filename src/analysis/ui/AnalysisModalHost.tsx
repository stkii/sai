import { CloseButton, Dialog, Portal, Text } from '@chakra-ui/react';
import { useDataset } from '../../data/state/DatasetContext';
import type { AnalysisOptions, Method } from '../../shared/types';
import { findMethod } from '../methods';
import { useRunAnalysis } from '../useRunAnalysis';

interface Props {
  method: Method | null;
  onClose: () => void;
}

export function AnalysisModalHost({ method, onClose }: Props) {
  const { dataset } = useDataset();
  const { busy, error, run, clearError } = useRunAnalysis();

  // 実行エラーを次に開いたモーダルへ持ち越さないよう、閉じる時に必ず消す
  function handleClose() {
    clearError();
    onClose();
  }

  const mod = method ? findMethod(method) : undefined;
  const requiresDataset = mod?.definition.requiresDataset !== false;
  const open = Boolean(method && mod && (!requiresDataset || dataset));

  async function handleExecute(variables: string[], options: AnalysisOptions) {
    if (!method) return;
    if (await run({ method, variables, options })) handleClose();
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
