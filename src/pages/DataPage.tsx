import { Box, ChakraProvider, defaultSystem, HStack, Stack } from '@chakra-ui/react';
import { emitTo } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { FC, ReactElement } from 'react';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import type { AnalysisResultPayload } from '../analysisEvents';
import DataTable from '../components/DataTable';
import PopoverSelect, { type PopoverSelectItem } from '../components/PopoverSelect';
import type { ParsedDataTable } from '../dto';
import { createAnalysisHandlers } from '../handlers/createAnalysisHandlers';
import { createAnalysisRunner } from '../runner';
import tauriIPC from '../tauriIPC';
import CorrTestModal from '../ui/CorrTestModal';
import DataImportModal, { type DataImportSelection } from '../ui/DataImportModal';
import DescriptiveModal from '../ui/DescriptiveModal';
import RegressionModal from '../ui/RegressionModal';
import ReliabilityModal from '../ui/ReliabilityModal';

const ANALYSIS_ITEMS: PopoverSelectItem[] = [
  { label: '記述統計', value: 'descriptive' },
  { label: '相関', value: 'correlation' },
  { label: '回帰', value: 'regression' },
  { label: '信頼性', value: 'reliability' },
];

const ANALYSIS_MODAL_KEYS = ['descriptive', 'correlation', 'regression', 'reliability'] as const;

type AnalysisModalKey = (typeof ANALYSIS_MODAL_KEYS)[number];

interface AnalysisModalRenderProps {
  open: boolean;
  onClose: () => void;
  variables: string[];
}

interface AnalysisModalConfig {
  render: (props: AnalysisModalRenderProps) => ReactElement;
}

const isAnalysisModalKey = (value: string): value is AnalysisModalKey =>
  ANALYSIS_MODAL_KEYS.includes(value as AnalysisModalKey);

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
  const [openAnalysis, setOpenAnalysis] = useState<AnalysisModalKey | null>(null);
  const analysisDisabled = table === null;
  const analysisRunner = useMemo(
    () =>
      createAnalysisRunner({
        buildNumericDataset: (selection, variables) =>
          tauriIPC.buildNumericDataset(selection.path, selection.sheet, variables),
        analyses: {
          descriptive: ({ datasetId, options }) => tauriIPC.runAnalysis('descriptive', datasetId, options),
          correlation: ({ datasetId, options }) => tauriIPC.runAnalysis('correlation', datasetId, options),
          regression: ({ datasetId, options }) => tauriIPC.runAnalysis('regression', datasetId, options),
          reliability: ({ datasetId, options }) => tauriIPC.runAnalysis('reliability', datasetId, options),
        },
      }),
    []
  );

  const openResultWindow = useCallback(async () => {
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
      title: 'SAI (結果ビュー)',
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
  }, []);

  const emitResult = useCallback(async (payload: AnalysisResultPayload) => {
    await emitTo('resultView', 'analysis:result', payload);
  }, []);

  const getSelection = useCallback(() => dataSelection, [dataSelection]);
  const closeAnalysis = useCallback(() => setOpenAnalysis(null), []);
  const handlers = useMemo(
    () =>
      createAnalysisHandlers({
        analysisRunner,
        getSelection,
        openResultWindow,
        emitResult,
        onCloseDescriptive: closeAnalysis,
        onCloseCorrelation: closeAnalysis,
        onCloseRegression: closeAnalysis,
        onCloseReliability: closeAnalysis,
      }),
    [analysisRunner, closeAnalysis, emitResult, getSelection, openResultWindow]
  );

  const analysisModalConfigs = useMemo<Record<AnalysisModalKey, AnalysisModalConfig>>(
    () => ({
      descriptive: {
        render: (props) => <DescriptiveModal {...props} onExecute={handlers.runDescriptive} />,
      },
      correlation: {
        render: (props) => <CorrTestModal {...props} onExecute={handlers.runCorrelation} />,
      },
      regression: {
        render: (props) => <RegressionModal {...props} onExecute={handlers.runRegression} />,
      },
      reliability: {
        render: (props) => <ReliabilityModal {...props} onExecute={handlers.runReliability} />,
      },
    }),
    [handlers.runCorrelation, handlers.runDescriptive, handlers.runRegression, handlers.runReliability]
  );

  const handleAnalysisSelect = (item: PopoverSelectItem | null) => {
    if (item?.value && isAnalysisModalKey(item.value)) {
      setOpenAnalysis(item.value);
      return;
    }
    setOpenAnalysis(null);
  };

  const handleLoaded = (loadedTable: ParsedDataTable, selection: DataImportSelection) => {
    setTable(loadedTable);
    setDataSelection(selection);
    analysisRunner.clearCache();
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
        {ANALYSIS_MODAL_KEYS.map((key) => (
          <Fragment key={key}>
            {analysisModalConfigs[key].render({
              open: openAnalysis === key,
              onClose: closeAnalysis,
              variables: table?.headers ?? [],
            })}
          </Fragment>
        ))}
      </Stack>
    </Box>
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(
  <ChakraProvider value={defaultSystem}>
    <DataPage />
  </ChakraProvider>
);
