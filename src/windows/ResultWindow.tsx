import { Box, ChakraProvider, defaultSystem, Flex, HStack, Stack, Text } from '@chakra-ui/react';
import { save } from '@tauri-apps/plugin-dialog';
import type { FC, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import BasePopoverList from '../components/BasePopoverList';
import DataTable from '../components/DataTable';
import { useAnalysisResultStream } from '../hooks/useAnalysisResultStream';
import tauriIpc from '../tauriIpc';
import type { AnalysisExportLog, AnalysisResult, AnalysisResultPayload, ParsedDataTable } from '../types';
import { analysisCatalog } from './analysisCatalog';

const EXPORT_ITEMS = [{ label: 'Excel', value: 'xlsx' }] as const;
const RESULT_ROW_HEIGHT = 40;
const RESULT_TABLE_BORDER = 2;

const calcTableHeight = (table: ParsedDataTable): number => {
  return (table.rows.length + 1) * RESULT_ROW_HEIGHT + RESULT_TABLE_BORDER;
};

const buildFallbackExportSections = (result: AnalysisResult) => {
  if (result.kind === 'table') {
    return [{ table: result.table }];
  }
  return [];
};

const renderFallbackResult = (result: AnalysisResult): ReactNode => {
  if (result.kind !== 'table') {
    return (
      <Text fontSize="sm" color="red.500">
        この分析結果は現在の表示対象外です
      </Text>
    );
  }

  const table = result.table;
  return (
    <>
      {table.title ? (
        <Text fontWeight="medium" fontSize="sm" mb="2">
          {table.title}
        </Text>
      ) : null}
      <DataTable table={table} height={calcTableHeight(table)} showRowIndex={false} />
      {table.note ? (
        <Text fontSize="sm" color="gray.600" textAlign="left">
          {table.note}
        </Text>
      ) : null}
    </>
  );
};

const ResultWindow: FC = () => {
  const [logs, setLogs] = useState<AnalysisResultPayload[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportResetKey, setExportResetKey] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const { getMethodByKey } = analysisCatalog;

  useAnalysisResultStream({
    onReceiveResult: (payload) => {
      setLogs((prev) => [...prev, payload]);
      setSelectedId(payload.id);
    },
  });

  const selected = useMemo(() => logs.find((log) => log.id === selectedId) ?? null, [logs, selectedId]);
  const canExport = logs.length > 0 && !isExporting;

  const buildExportLogs = (entries: AnalysisResultPayload[]): AnalysisExportLog[] => {
    return entries.map((entry) => {
      const method = getMethodByKey(entry.type);
      const sections = method
        ? method.buildExportSections(entry.result)
        : buildFallbackExportSections(entry.result);
      return {
        label: entry.label,
        timestamp: entry.timestamp,
        sections,
      };
    });
  };

  const handleExport = async (item: { label: string; value: string } | null) => {
    if (!item || item.value !== 'xlsx') {
      return;
    }

    setExportError(null);

    if (logs.length === 0) {
      setExportError('エクスポートする分析結果がありません');
      setExportResetKey((prev) => prev + 1);
      return;
    }

    const filePath = await save({
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });

    if (!filePath) {
      setExportResetKey((prev) => prev + 1);
      return;
    }

    const resolvedPath = filePath.toLowerCase().endsWith('.xlsx') ? filePath : `${filePath}.xlsx`;

    setIsExporting(true);
    try {
      await tauriIpc.exportAnalysisToXlsx(resolvedPath, buildExportLogs(logs));
    } catch (error: unknown) {
      setExportError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsExporting(false);
      setExportResetKey((prev) => prev + 1);
    }
  };

  const renderResult = () => {
    if (!selected) {
      return (
        <DataTable table={null} height={560} showRowIndex={false} emptyMessage="分析結果がまだありません" />
      );
    }

    const method = getMethodByKey(selected.type);
    if (method) {
      return method.renderResult(selected.result);
    }

    return renderFallbackResult(selected.result);
  };

  return (
    <Box p="6" height="100vh">
      <Flex gap="6" height="full">
        <Box w="260px" borderWidth="1px" borderColor="gray.200" borderRadius="md" p="4" overflow="hidden">
          <Stack gap="3" height="full">
            <Text fontWeight="semibold">分析ログ</Text>
            <Stack gap="2" flex="1" overflowY="auto">
              {logs.length === 0 ? (
                <Text fontSize="sm" color="gray.500">
                  まだ分析がありません
                </Text>
              ) : (
                logs.map((log) => {
                  const isSelected = log.id === selectedId;
                  return (
                    <Box
                      key={log.id}
                      as="button"
                      onClick={() => setSelectedId(log.id)}
                      textAlign="left"
                      borderWidth="1px"
                      borderColor={isSelected ? 'blue.400' : 'gray.200'}
                      bg={isSelected ? 'blue.50' : 'transparent'}
                      borderRadius="md"
                      px="3"
                      py="2"
                    >
                      <Text fontWeight="semibold" fontSize="sm">
                        {log.label}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {log.timestamp}
                      </Text>
                    </Box>
                  );
                })
              )}
            </Stack>
          </Stack>
        </Box>
        <Box flex="1" borderWidth="1px" borderColor="gray.200" borderRadius="md" p="4" overflow="hidden">
          <Stack gap="3" height="full">
            <Stack gap="1">
              <HStack justify="space-between" align="center">
                <Text fontWeight="semibold">{selected?.label ?? '分析結果'}</Text>
                <BasePopoverList
                  contents={Array.from(EXPORT_ITEMS)}
                  placeholder="エクスポート"
                  onSelect={handleExport}
                  disabled={!canExport}
                  resetKey={exportResetKey}
                />
              </HStack>
              {exportError ? (
                <Text fontSize="sm" color="red.500">
                  {exportError}
                </Text>
              ) : null}
            </Stack>
            {renderResult()}
          </Stack>
        </Box>
      </Flex>
    </Box>
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(
  <ChakraProvider value={defaultSystem}>
    <ResultWindow />
  </ChakraProvider>
);
