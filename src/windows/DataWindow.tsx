import { Box, ChakraProvider, defaultSystem, HStack, Stack, Text } from '@chakra-ui/react';
import type { FC } from 'react';
import { Fragment, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type {
  AnalysisOptions,
  AnalysisResultPayload,
  AnalysisRunner,
  SupportedAnalysisType,
} from '../analysis/api';
import { analysisCatalog } from '../analysis/api';
import AnalysisSelect from '../components/AnalysisSelect';
import DataTable from '../components/DataTable';
import { useAnalysisRunner } from '../hooks/useAnalysisRunner';
import { useResultWindowBridge } from '../hooks/useResultWindowBridge';
import tauriIpc from '../tauriIpc';
import type { ImportDataset, ParsedDataTable } from '../types';
import DataImportDialog from './views/DataImportDialog';

interface ExecuteAnalysisArgs {
  analysisRunner: AnalysisRunner;
  selection: ImportDataset | null;
  type: SupportedAnalysisType;
  variables: string[];
  options: AnalysisOptions;
  openResultWindow: () => Promise<void>;
  emitResult: (payload: AnalysisResultPayload) => Promise<void>;
  onCloseAnalysis: () => void;
}

/**
 * 選択済みデータに対して分析を実行し、結果ウィンドウへ結果イベントを送信する
 */
const executeAnalysis = async ({
  analysisRunner,
  selection,
  type,
  variables,
  options,
  openResultWindow,
  emitResult,
  onCloseAnalysis,
}: ExecuteAnalysisArgs): Promise<void> => {
  if (!selection) {
    throw new Error('データが選択されていません');
  }

  const analysis = await analysisRunner.run({
    type,
    selection,
    variables,
    options,
  });

  const payload: AnalysisResultPayload = {
    id: analysis.analysisId,
    type,
    label: analysisCatalog.getLabelByKey(type),
    timestamp: analysis.loggedAt,
    result: analysis.result,
  };

  await openResultWindow();
  await emitResult(payload);
  onCloseAnalysis();
};

const DataWindow: FC = () => {
  const [table, setTable] = useState<ParsedDataTable | null>(null);
  const [selection, setSelection] = useState<ImportDataset | null>(null);
  const [openAnalysis, setOpenAnalysis] = useState<SupportedAnalysisType | null>(null);
  const [analysisSelectResetKey, setAnalysisSelectResetKey] = useState(0);

  const analysisRunner = useAnalysisRunner();
  const { openResultWindow, emitResult } = useResultWindowBridge();
  const { items, methods } = analysisCatalog;

  const closeAnalysis = useCallback(() => {
    setOpenAnalysis(null);
    setAnalysisSelectResetKey((value) => value + 1);
  }, []);

  /**
   * モーダルから受け取った分析条件を executeAnalysis に渡す画面側ハンドラ
   */
  const runAnalysis = useCallback(
    async (type: SupportedAnalysisType, variables: string[], options: AnalysisOptions) => {
      await executeAnalysis({
        analysisRunner,
        selection,
        type,
        variables,
        options,
        openResultWindow,
        emitResult,
        onCloseAnalysis: closeAnalysis,
      });
    },
    [analysisRunner, closeAnalysis, emitResult, openResultWindow, selection]
  );

  const variables = table?.headers ?? [];

  const handleLoaded = (nextTable: ParsedDataTable, nextSelection: ImportDataset) => {
    setTable(nextTable);
    setSelection(nextSelection);
    setOpenAnalysis(null);
    analysisRunner.clearCache();
    void tauriIpc.clearNumericDatasetCache().catch(() => {
      // Rust側の数値データセットキャッシュのクリア
      // 失敗しても次回 buildNumericDataset 呼び出し時に再構築されるため、エラーは無視する
    });
    setAnalysisSelectResetKey((value) => value + 1);
  };

  const selectedLabel = selection
    ? selection.sheet
      ? `${selection.path}（${selection.sheet}）`
      : selection.path
    : null;

  return (
    <Stack p="4" gap="4" h="100vh">
      <HStack gap="2" flexWrap="wrap">
        <DataImportDialog onLoaded={handleLoaded} />
        <AnalysisSelect
          items={items}
          disabled={variables.length === 0}
          resetKey={analysisSelectResetKey}
          onSelect={setOpenAnalysis}
        />
      </HStack>
      {selectedLabel ? (
        <Text color="gray.600" fontSize="sm" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
          読み込み中データ: {selectedLabel}
        </Text>
      ) : null}
      {/*
        ----- DataTable のサイズ調整 -----
        既定値 400px は他画面でも使うため DataTable 側のデフォルトとして維持
        DataWindow では下側領域を 80vh（最小 400px）とし、
        さらに height="100%" を渡し、このラッパー高に追従させる
      */}
      <Box h="80vh" minH="400px" mt="auto">
        <DataTable table={table} emptyMessage="データを読み込んでください" height="100%" />
      </Box>
      {methods.map((method) => (
        <Fragment key={method.definition.key}>
          {method.renderModal({
            open: openAnalysis === method.definition.key,
            onClose: closeAnalysis,
            variables,
            onExecute: async (selectedVariables, options) => {
              await runAnalysis(method.definition.key as SupportedAnalysisType, selectedVariables, options);
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
