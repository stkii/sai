import { Box, ChakraProvider, defaultSystem, HStack, Stack, Text } from '@chakra-ui/react';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ANALYSIS_METHODS,
  type AnalysisOptions,
  createAnalysisRunner,
  type MethodModule,
  MethodSelector,
  type SupportedAnalysisType,
} from '../analysis/api';
import { DataTable } from '../components/DataTable';
import { tauriIpc } from '../ipc';
import type { Dataset, ParsedDataTable } from '../types';
import { DataImportDialog } from './components/DataImportDialog';
import { createAnalyzeService } from './services/AnalyzeService';
import {
  buildAnalysisResultPayload,
  buildMethodItems,
  buildSelectedLabel,
  findMethodLabel,
} from './services/DisplayFormatter';
import { emitResultToResultWindow, openResultWindow } from './services/ToResultWindow';

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
    async (type: SupportedAnalysisType, selectedVariables: string[], options: AnalysisOptions) => {
      const execution = await analyzeService.run({
        selection,
        type,
        variables: selectedVariables,
        options,
      });
      const label = findMethodLabel(METHODS, type);
      const payload = buildAnalysisResultPayload({
        execution,
        type,
        label,
        options,
      });
      await openResultWindow();
      await emitResultToResultWindow(payload);
      closeAnalysis();
    },
    [analyzeService, closeAnalysis, selection]
  );

  const selectedLabel = buildSelectedLabel(selection);

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
        {selectedLabel ? (
          <Text
            color="gray.600"
            fontSize="sm"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            読み込み中データ: {selectedLabel}
          </Text>
        ) : null}
      </Stack>

      <Box h="80vh" minH="400px" mt="auto">
        <DataTable table={table} emptyMessage="データを読み込んでください" height="100%" />
      </Box>

      {METHODS.map((method) => (
        <Fragment key={method.definition.key}>
          {method.renderModal({
            open: openAnalysis === method.definition.key,
            onClose: closeAnalysis,
            variables,
            onExecute: async (selectedVariables, options) => {
              await runAnalysis(method.definition.key, selectedVariables, options);
            },
          })}
        </Fragment>
      ))}
    </Stack>
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(
  <ChakraProvider value={defaultSystem}>
    <DataWindow />
  </ChakraProvider>
);
