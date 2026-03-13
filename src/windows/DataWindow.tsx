import { Box, ChakraProvider, defaultSystem, HStack, Stack } from '@chakra-ui/react';
import { useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ANALYSIS_METHODS,
  type AnalysisOptions,
  createAnalysisRunner,
  type DatasetKind,
  type MethodModule,
  MethodSelector,
  type SupportedAnalysisType,
} from '../analysis/api';
import { DataTable } from '../components/DataTable';
import { tauriIpc } from '../ipc';
import type { Dataset, ParsedDataTable } from '../types';
import { AnalysisModalHost } from './components/AnalysisModalHost';
import { DataImportDialog } from './components/DataImportDialog';
import { LoadedDatasetBar } from './components/LoadedDatasetBar';
import { createAnalyzeService } from './services/analyzeService';
import { buildMethodItems } from './services/displayFormatter';
import { runAnalysisFlow } from './services/runAnalysisFlow';

const METHODS: readonly MethodModule[] = ANALYSIS_METHODS;

export const DataWindow = () => {
  const [table, setTable] = useState<ParsedDataTable | null>(null);
  const [selection, setSelection] = useState<Dataset | null>(null);
  const [openAnalysis, setOpenAnalysis] = useState<SupportedAnalysisType | null>(null);
  const [analysisSelectResetKey, setAnalysisSelectResetKey] = useState(0);
  const variables = table?.headers ?? [];

  const methodItems = useMemo(() => buildMethodItems(METHODS), []);

  const analysisRunner = useMemo(() => {
    return createAnalysisRunner({
      buildNumericDataset: tauriIpc.buildNumericDataset.bind(tauriIpc),
      buildStringMixedDataset: tauriIpc.buildStringMixedDataset.bind(tauriIpc),
      runAnalysis: tauriIpc.runAnalysis.bind(tauriIpc),
    });
  }, []);
  const analyzeService = useMemo(() => {
    return createAnalyzeService({
      analysisRunner,
      clearNumericDatasetCache: tauriIpc.clearNumericDatasetCache.bind(tauriIpc),
    });
  }, [analysisRunner]);
  const closeAnalysis = useCallback(() => {
    setOpenAnalysis(null);
    setAnalysisSelectResetKey((value) => value + 1);
  }, []);

  const handleLoaded = useCallback(
    (loadedTable: ParsedDataTable, nextSelection: Dataset) => {
      setTable(loadedTable);
      setSelection(nextSelection);
      setOpenAnalysis(null);
      analyzeService.clearCache();
      setAnalysisSelectResetKey((value) => value + 1);
    },
    [analyzeService]
  );

  const runAnalysis = useCallback(
    async (
      type: SupportedAnalysisType,
      selectedVariables: string[],
      options: AnalysisOptions,
      datasetKind?: DatasetKind
    ) => {
      await runAnalysisFlow({
        analyzeService,
        methods: METHODS,
        selection,
        type,
        variables: selectedVariables,
        options,
        datasetKind,
        onCompleted: closeAnalysis,
      });
    },
    [analyzeService, closeAnalysis, selection]
  );

  return (
    <Stack p="4" gap="4" h="100vh">
      <Stack gap="3">
        <HStack gap="2" flexWrap="wrap">
          <DataImportDialog onLoaded={handleLoaded} />
          <MethodSelector
            items={methodItems}
            disabled={variables.length === 0}
            resetKey={analysisSelectResetKey}
            onSelect={setOpenAnalysis}
          />
        </HStack>
        <LoadedDatasetBar selection={selection} onSheetLoaded={handleLoaded} />
      </Stack>

      <Box h="80vh" minH="400px" mt="auto">
        <DataTable table={table} emptyMessage="データを読み込んでください" height="100%" />
      </Box>

      <AnalysisModalHost
        methods={METHODS}
        openAnalysis={openAnalysis}
        onClose={closeAnalysis}
        variables={variables}
        onExecute={runAnalysis}
      />
    </Stack>
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(
  <ChakraProvider value={defaultSystem}>
    <DataWindow />
  </ChakraProvider>
);
