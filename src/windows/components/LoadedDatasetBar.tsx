import { Alert, HStack, Stack, Text } from '@chakra-ui/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BasePopoverList } from '../../components/BasePopoverList';
import type { Dataset, ParsedDataTable } from '../../types';
import { getSheetNamesByPath, switchSheet } from '../services/sheetSwitchService';

interface Props {
  selection: Dataset | null;
  rowCount: number;
  columnCount: number;
  onSheetLoaded: (table: ParsedDataTable, selection: Dataset) => void;
}

export const LoadedDatasetBar = ({ selection, rowCount, columnCount, onSheetLoaded }: Props) => {
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [changingSheet, setChangingSheet] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetSelectResetKey, setSheetSelectResetKey] = useState(0);

  const selectedPath = selection?.path ?? null;
  const selectedSheet = selection?.sheet ?? null;
  const selectionKey = `${selectedPath ?? ''}\u0000${selectedSheet ?? ''}`;

  const sheetItems = useMemo(
    () => sheetNames.map((sheet) => ({ label: sheet, value: sheet })),
    [sheetNames]
  );

  const handleSheetChange = useCallback(
    async (nextSheet: string) => {
      if (!selection || selection.sheet === nextSheet) {
        return;
      }

      setChangingSheet(true);
      setSheetError(null);
      try {
        const result = await switchSheet(selection, nextSheet);
        onSheetLoaded(result.table, result.selection);
      } catch (err: unknown) {
        setSheetError(err instanceof Error ? err.message : String(err));
      } finally {
        setChangingSheet(false);
      }
    },
    [onSheetLoaded, selection]
  );

  useEffect(() => {
    if (selectionKey.length === 0) {
      setSheetSelectResetKey((value) => value + 1);
      setSheetError(null);
      return;
    }
    setSheetSelectResetKey((value) => value + 1);
    setSheetError(null);
  }, [selectionKey]);

  useEffect(() => {
    if (!selectedPath) {
      setSheetNames([]);
      setLoadingSheets(false);
      setSheetError(null);
      return;
    }

    let cancelled = false;
    setLoadingSheets(true);
    setSheetError(null);
    getSheetNamesByPath(selectedPath)
      .then((names) => {
        if (cancelled) {
          return;
        }
        setSheetNames(names);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setSheetNames([]);
        setSheetError(err instanceof Error ? err.message : String(err));
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

  if (!selectedPath) {
    return null;
  }

  return (
    <Stack gap="1">
      <HStack gap="2" flexWrap="wrap">
        <Text color="gray.600" fontSize="sm">
          読み込み中データ: {selectedPath}（{rowCount}行 × {columnCount}列）
        </Text>
        {sheetNames.length > 0 ? (
          <>
            <Text color="gray.600" fontSize="sm">
              シート: {selectedSheet ?? '-'}
            </Text>
            <BasePopoverList
              contents={sheetItems}
              placeholder={selectedSheet ?? 'シートを選択'}
              resetKey={sheetSelectResetKey}
              disabled={loadingSheets || changingSheet}
              onSelect={(item) => {
                if (!item) {
                  return;
                }
                void handleSheetChange(item.label);
              }}
            />
          </>
        ) : null}
      </HStack>
      {loadingSheets ? (
        <Text color="gray.500" fontSize="xs">
          シート一覧を取得中...
        </Text>
      ) : null}
      {sheetError ? (
        <Alert.Root status="error" size="sm">
          <Alert.Indicator />
          <Alert.Content>{sheetError}</Alert.Content>
        </Alert.Root>
      ) : null}
    </Stack>
  );
};
