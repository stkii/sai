import { Box, Button, CloseButton, Dialog, Portal, Stack, Text } from '@chakra-ui/react';
import { open } from '@tauri-apps/plugin-dialog';
import { useEffect, useState } from 'react';

import FileSelector from '../components/FileSelector';
import PopoverSelect, { type PopoverSelectItem } from '../components/PopoverSelect';
import type { ParsedDataTable } from '../dto';
import tauriIPC from '../tauriIPC';

export interface DataImportSelection {
  path: string;
  sheet: string;
}

interface DataImportModalProps {
  onLoaded: (table: ParsedDataTable, selection: DataImportSelection) => void;
}

const DataImportModal = ({ onLoaded }: DataImportModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [sheetOptions, setSheetOptions] = useState<PopoverSelectItem[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<PopoverSelectItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const canLoad = Boolean(filePath && selectedSheet && !loading);

  useEffect(() => {
    if (!filePath) {
      setSheetOptions([]);
      setSelectedSheet(null);
      return;
    }

    let cancelled = false;
    setError(null);
    setSelectedSheet(null);
    setSheetOptions([]);

    tauriIPC
      .getSheets(filePath)
      .then((sheets) => {
        if (cancelled) {
          return;
        }
        setSheetOptions(
          sheets.map((sheet) => ({
            label: sheet,
            value: filePath,
          }))
        );
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  const handlePick = async () => {
    const result = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    });

    if (!result) {
      return;
    }

    const path = Array.isArray(result) ? result[0] : result;
    setFilePath(path ?? null);
  };

  const handleLoad = async () => {
    if (!canLoad) {
      return;
    }
    if (!filePath || !selectedSheet) {
      setError('ファイルとシートを選択してください');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await tauriIPC.parseExcel(filePath, selectedSheet.label);
      onLoaded(data, { path: filePath, sheet: selectedSheet.label });
      setIsOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
      <Dialog.Trigger asChild>
        <Button variant="outline">データを選択</Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>データを選択</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="4">
                <FileSelector
                  selectedPath={filePath}
                  onPick={handlePick}
                  buttonLabel="ファイルを選択"
                  placeholder="ファイル未選択"
                />
                <Box alignSelf="flex-start">
                  <PopoverSelect
                    items={sheetOptions}
                    placeholder="シートを選択"
                    onSelect={setSelectedSheet}
                  />
                </Box>
                {error ? <Text color="red.500">{error}</Text> : null}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">キャンセル</Button>
              </Dialog.ActionTrigger>
              <Button onClick={handleLoad} disabled={!canLoad}>
                {loading ? '読み込み中...' : '読み込む'}
              </Button>
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

export default DataImportModal;
