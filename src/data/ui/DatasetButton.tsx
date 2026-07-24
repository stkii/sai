import { Button, CloseButton, Dialog, Portal, Stack, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { toaster } from '../../shared/ui/toaster';
import { type LoadResult, loadFile, pickFile } from '../loadFile';
import { useDataset } from '../state/DatasetContext';

export function DatasetButton() {
  const { summary, setSummary } = useDataset();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ path: string; sheets: string[] } | null>(null);

  function handleResult(result: LoadResult) {
    if (result.kind === 'loaded') {
      setSummary(result.summary);
      setPending(null);
    } else {
      setPending({ path: result.path, sheets: result.sheets });
    }
  }

  async function handlePick() {
    setBusy(true);
    try {
      const path = await pickFile();
      if (!path) return;
      const result = await loadFile(path);
      handleResult(result);
    } catch (e) {
      // ダイアログ外のエラーはヘッダにインライン表示せずトーストで通知する
      toaster.create({
        type: 'error',
        title: 'データセットを開けませんでした',
        description: String(e),
        meta: { closable: true },
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleSheet(sheet: string) {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const result = await loadFile(pending.path, sheet);
      handleResult(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  const sheetDialogOpen = Boolean(pending);

  return (
    <>
      <Button size="sm" variant="ghost" onClick={handlePick} loading={busy && !sheetDialogOpen}>
        {summary ? 'データセット変更' : 'データセットを開く'}
      </Button>

      <Dialog.Root
        open={sheetDialogOpen}
        onOpenChange={(d) => {
          if (!d.open && !busy) {
            setPending(null);
            setError(null);
          }
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxWidth="360px">
              <Dialog.Header>
                <Dialog.Title>シートを選択</Dialog.Title>
              </Dialog.Header>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" disabled={busy} />
              </Dialog.CloseTrigger>
              <Dialog.Body>
                <Stack gap={2}>
                  {pending?.sheets.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      onClick={() => handleSheet(s)}
                      loading={busy}
                    >
                      {s}
                    </Button>
                  ))}
                  {error && (
                    <Text fontSize="xs" color="fg.error" role="alert">
                      {error}
                    </Text>
                  )}
                </Stack>
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}
