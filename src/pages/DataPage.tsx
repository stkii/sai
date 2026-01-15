import { Box, ChakraProvider, defaultSystem, HStack, Stack } from '@chakra-ui/react';
import { emitTo } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import type { AnalysisResultPayload } from '../analysisEvents';
import DataTable from '../components/DataTable';
import PopoverSelect, { type PopoverSelectItem } from '../components/PopoverSelect';
import type { ParsedDataTable } from '../dto';
import { createAnalysisRunner } from '../runner';
import tauriIPC from '../tauriIPC';
import DataImportModal, { type DataImportSelection } from '../ui/DataImportModal';
import DescriptiveModal from '../ui/DescriptiveModal';

const ANALYSIS_ITEMS: PopoverSelectItem[] = [
  { label: '記述統計', value: 'descriptive' },
  { label: '相関', value: 'correlation' },
  { label: '回帰', value: 'regression' },
];

const formatWindowError = (event: { payload?: unknown }) => {
  const payload = event?.payload;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.message === 'string') {
      return record.message;
    }
    if (typeof record.error === 'string') {
      return record.error;
    }
    try {
      return JSON.stringify(payload);
    } catch {
      return '結果ウィンドウの作成に失敗しました';
    }
  }
  if (typeof payload === 'string') {
    return payload;
  }
  try {
    return JSON.stringify(event);
  } catch {
    return '結果ウィンドウの作成に失敗しました';
  }
};

const DataPage: FC = () => {
  const [table, setTable] = useState<ParsedDataTable | null>(null);
  const [dataSelection, setDataSelection] = useState<DataImportSelection | null>(null);
  const [isDescriptiveOpen, setIsDescriptiveOpen] = useState(false);
  const analysisDisabled = table === null;
  const analysisRunner = useMemo(
    () =>
      createAnalysisRunner({
        buildNumericDataset: (selection, variables) =>
          tauriIPC.buildNumericDataset(selection.path, selection.sheet, variables),
        analyses: {
          descriptive: ({ datasetId, options }) => tauriIPC.runAnalysis('descriptive', datasetId, options),
        },
      }),
    []
  );

  const openResultWindow = async () => {
    const existing = await WebviewWindow.getByLabel('resultView');
    if (existing) {
      await existing.show();
      await existing.setFocus();
      return;
    }
    const ready = new Promise<void>((resolve) => {
      void WebviewWindow.getCurrent().once('analysis:ready', () => resolve());
    });
    const resultWindow = new WebviewWindow('resultView', {
      url: '/pages/result.html',
      title: 'SAI (結果)',
      width: 960,
      height: 720,
      minWidth: 860,
      minHeight: 600,
    });
    await new Promise<void>((resolve, reject) => {
      resultWindow.once('tauri://created', () => resolve());
      resultWindow.once('tauri://error', (event) => reject(new Error(formatWindowError(event))));
    });
    await ready;
  };

  const handleAnalysisSelect = (item: PopoverSelectItem | null) => {
    if (item?.value === 'descriptive') {
      setIsDescriptiveOpen(true);
    } else {
      setIsDescriptiveOpen(false);
    }
  };

  const handleLoaded = (loadedTable: ParsedDataTable, selection: DataImportSelection) => {
    setTable(loadedTable);
    setDataSelection(selection);
    analysisRunner.clearCache();
  };

  const handleRunDescriptive = async (variables: string[], order: string) => {
    if (!dataSelection) {
      throw new Error('データが選択されていません');
    }
    const analysis = await analysisRunner.run({
      type: 'descriptive',
      selection: dataSelection,
      variables,
      options: { order },
    });
    const payload: AnalysisResultPayload = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: 'descriptive',
      label: '記述統計',
      timestamp: analysis.loggedAt,
      result: analysis.result,
    };
    await openResultWindow();
    await emitTo('resultView', 'analysis:result', payload);
    setIsDescriptiveOpen(false);
  };

  return (
    <Box p="6">
      <Stack gap="4">
        <HStack gap="3">
          <DataImportModal onLoaded={handleLoaded} />
          <PopoverSelect
            items={ANALYSIS_ITEMS}
            placeholder="分析を選択"
            onSelect={handleAnalysisSelect}
            disabled={analysisDisabled}
          />
        </HStack>
        <DataTable table={table} height={600} />
        <DescriptiveModal
          open={isDescriptiveOpen}
          onClose={() => setIsDescriptiveOpen(false)}
          variables={table?.headers ?? []}
          onExecute={handleRunDescriptive}
        />
      </Stack>
    </Box>
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(
  <ChakraProvider value={defaultSystem}>
    <DataPage />
  </ChakraProvider>
);
