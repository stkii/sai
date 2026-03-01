import { Alert, Box, Button, CloseButton, Dialog, HStack, Portal, Stack } from '@chakra-ui/react';
import { open } from '@tauri-apps/plugin-dialog';
import { useEffect, useMemo, useState } from 'react';
import BasePopoverList from '../../components/BasePopoverList';
import FileSelect from '../../components/FileSelect';
import tauriIpc from '../../tauriIpc';
import type { DataImportSelection, ParsedDataTable } from '../../types';

interface Props {
  onLoaded: (table: ParsedDataTable, selection: DataImportSelection) => void;
}

const DataImportDialog = ({ onLoaded }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSheets = sheetNames.length > 0;
  const canLoad = Boolean(selectedPath) && (!hasSheets || selectedSheet !== null) && !loadingTable;
  const sheetItems = useMemo(() => sheetNames.map((sheet) => ({ label: sheet, value: sheet })), [sheetNames]);

  const resetForm = () => {
    setSelectedPath(null);
    setSheetNames([]);
    setSelectedSheet(null);
    setLoadingSheets(false);
    setLoadingTable(false);
    setError(null);
  };

  useEffect(() => {
    if (!selectedPath) {
      setSheetNames([]);
      setSelectedSheet(null);
      return;
    }

    let cancelled = false;
    setError(null);
    setLoadingSheets(true);
    setSheetNames([]);
    setSelectedSheet(null);

    tauriIpc
      .getSheets(selectedPath)
      .then((sheets) => {
        if (cancelled) {
          return;
        }
        setSheetNames(sheets);
        setSelectedSheet(sheets[0] ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSheets(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPath]);

  const handlePick = async () => {
    const result = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'Data files', extensions: ['xlsx', 'csv'] }],
    });
    if (!result) {
      return;
    }
    const path = Array.isArray(result) ? result[0] : result;
    setSelectedPath(path ?? null);
  };

  const handleLoad = async () => {
    if (!selectedPath || !canLoad) {
      return;
    }

    setLoadingTable(true);
    setError(null);
    try {
      const sheet = hasSheets ? (selectedSheet ?? undefined) : undefined;
      const table = await tauriIpc.parseTable(selectedPath, sheet);
      onLoaded(table, { path: selectedPath, sheet });
      setIsOpen(false);
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingTable(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => (e.open ? setIsOpen(true) : handleClose())}>
      <Dialog.Trigger asChild>
        <Button variant="outline">データを選択</Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>データ読み込み</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="3">
                <FileSelect selectedPath={selectedPath} onPick={handlePick} />
                {hasSheets ? (
                  <Box alignSelf="flex-start">
                    <BasePopoverList
                      contents={sheetItems}
                      placeholder="シートを選択"
                      disabled={loadingSheets || loadingTable}
                      onSelect={(item) => setSelectedSheet(item?.label ?? null)}
                    />
                  </Box>
                ) : null}
                {error ? (
                  <Alert.Root status="error" size="sm">
                    <Alert.Indicator />
                    <Alert.Content>{error}</Alert.Content>
                  </Alert.Root>
                ) : null}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <HStack gap="2" justify="flex-end" w="full">
                <Button variant="outline" onClick={handleClose}>
                  キャンセル
                </Button>
                <Button onClick={handleLoad} loading={loadingTable} disabled={!canLoad || loadingSheets}>
                  読み込む
                </Button>
              </HStack>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default DataImportDialog;
