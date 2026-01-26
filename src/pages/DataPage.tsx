import { Box, ChakraProvider, defaultSystem, HStack, Stack } from '@chakra-ui/react';
import { emitTo } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { FC, ReactElement } from 'react';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { AnalysisResultPayload } from '../analysis/analysisEvents';
import { ANALYSIS_ITEMS, getAnalysisLabel, toAnalysisType } from '../analysis/analysisRegistry';
import { createAnalysisHandlers } from '../analysis/handlers/createAnalysisHandlers';
import { createAnalysisRunner } from '../analysis/runner';
import DataTable from '../components/DataTable';
import ExecuteButton from '../components/ExecuteButton';
import PopoverSelect, { type PopoverSelectItem } from '../components/PopoverSelect';
import type { ParsedDataTable } from '../dto';
import tauriIPC from '../tauriIPC';
import CorrTestModal from '../ui/CorrTestModal';
import DataImportModal, { type DataImportSelection } from '../ui/DataImportModal';
import DescriptiveModal from '../ui/DescriptiveModal';
import FactorModal from '../ui/FactorModal';
import PowerTestModal from '../ui/PowerTestModal';
import PreviousAnalysisModal from '../ui/PreviousAnalysisModal';
import RegressionModal from '../ui/RegressionModal';
import ReliabilityModal from '../ui/ReliabilityModal';

const ANALYSIS_MODAL_KEYS = ['descriptive', 'correlation', 'regression', 'reliability', 'factor'] as const;

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
  const [analysisSelectResetKey, setAnalysisSelectResetKey] = useState(0);
  const [powerOpen, setPowerOpen] = useState(false);
  const [previousOpen, setPreviousOpen] = useState(false);
  const analysisDisabled = table === null;
  const analysisRunner = useMemo(
    () =>
      createAnalysisRunner({
        buildNumericDataset: (selection, variables) =>
          tauriIPC.buildNumericDataset(selection.path, selection.sheet, variables),
        analyses: {
          descriptive: ({ datasetCacheId, options }) =>
            tauriIPC.runAnalysis('descriptive', datasetCacheId, options),
          correlation: ({ datasetCacheId, options }) =>
            tauriIPC.runAnalysis('correlation', datasetCacheId, options),
          regression: ({ datasetCacheId, options }) =>
            tauriIPC.runAnalysis('regression', datasetCacheId, options),
          reliability: ({ datasetCacheId, options }) =>
            tauriIPC.runAnalysis('reliability', datasetCacheId, options),
          factor: ({ datasetCacheId, options }) => tauriIPC.runAnalysis('factor', datasetCacheId, options),
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
  const closeAnalysis = useCallback(() => {
    setOpenAnalysis(null);
    setAnalysisSelectResetKey((value) => value + 1);
  }, []);
  const closePower = useCallback(() => {
    setPowerOpen(false);
    setAnalysisSelectResetKey((value) => value + 1);
  }, []);
  const closePrevious = useCallback(() => {
    setPreviousOpen(false);
  }, []);
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
        onCloseFactor: closeAnalysis,
        onClosePower: closePower,
      }),
    [analysisRunner, closeAnalysis, closePower, emitResult, getSelection, openResultWindow]
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
      factor: {
        render: (props) => <FactorModal {...props} onExecute={handlers.runFactor} />,
      },
    }),
    [
      handlers.runCorrelation,
      handlers.runDescriptive,
      handlers.runFactor,
      handlers.runRegression,
      handlers.runReliability,
    ]
  );

  const handleAnalysisSelect = (item: PopoverSelectItem | null) => {
    if (!item?.value) {
      setOpenAnalysis(null);
      return;
    }
    if (item.value === 'power') {
      setOpenAnalysis(null);
      setPowerOpen(true);
      return;
    }
    if (isAnalysisModalKey(item.value)) {
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

  const handleDisplayPrevious = useCallback(
    async (analysisId: string) => {
      const entry = await tauriIPC.getAnalysisLogEntry(analysisId);
      const analysisType = toAnalysisType(entry.analysisType);
      if (!analysisType) {
        throw new Error(`未対応の分析タイプです: ${entry.analysisType}`);
      }
      const payload: AnalysisResultPayload = {
        id: entry.analysisId,
        type: analysisType,
        label: getAnalysisLabel(entry.analysisType),
        timestamp: entry.timestamp,
        result: entry.result,
      };
      await openResultWindow();
      await emitResult(payload);
    },
    [emitResult, openResultWindow]
  );

  return (
    <Box p="6">
      <Stack gap="4">
        <HStack gap="3">
          <DataImportModal onLoaded={handleLoaded} />
          <ExecuteButton label="以前の分析" variant="outline" onClick={() => setPreviousOpen(true)} />
          <PopoverSelect
            items={ANALYSIS_ITEMS}
            placeholder="分析を選択"
            onSelect={handleAnalysisSelect}
            disabled={analysisDisabled}
            resetKey={analysisSelectResetKey}
          />
          <ExecuteButton label="検定力分析" variant="outline" onClick={() => setPowerOpen(true)} />
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
        <PowerTestModal open={powerOpen} onClose={closePower} onExecute={handlers.runPowerTest} />
        <PreviousAnalysisModal
          open={previousOpen}
          onClose={closePrevious}
          onDisplay={handleDisplayPrevious}
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
