import { CloseButton, Dialog, Portal, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { createVariable } from '../../shared/ipc/dataset';
import type { VariableSpec } from '../../shared/types';
import { toaster } from '../../shared/ui/toaster';
import { useDataset } from '../state/DatasetContext';
import { findVariableKind } from '../variables';
import type { VariableKind } from '../variables/contracts';

interface Props {
  kind: VariableKind | null;
  onClose: () => void;
}

export function VariableBuilderHost({ kind, onClose }: Props) {
  const { dataset, setDataset } = useDataset();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 作成エラーを次に開いたモーダルへ持ち越さないよう、閉じる時に必ず消す
  function handleClose() {
    setError(null);
    onClose();
  }

  const mod = kind ? findVariableKind(kind) : undefined;
  const open = Boolean(mod && dataset);

  async function handleSubmit(spec: VariableSpec) {
    if (!dataset) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createVariable(dataset.key, spec);
      setDataset(result.dataset);
      // 追加した列は表の右端に増えるため、横スクロールせずに済むよう列名を通知する
      const created = spec.names.join('、');
      toaster.create({
        type: result.note ? 'warning' : 'success',
        title: `変数を作成しました: ${created}`,
        description: result.note,
        meta: { closable: Boolean(result.note) },
      });
      handleClose();
    } catch (e) {
      // 入力のやり直しが要るエラーなので、閉じずにダイアログ内へ表示する
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
              <Dialog.Title>{mod && `${mod.definition.label}の作成`}</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" disabled={busy} />
            </Dialog.CloseTrigger>
            <Dialog.Body>
              {/* 閉じたらアンマウントし、次に開いたとき前回の入力が残らないようにする */}
              {mod ? (
                <>
                  {mod.renderModal({
                    headers: dataset?.headers ?? [],
                    busy,
                    onCancel: handleClose,
                    onSubmit: handleSubmit,
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
