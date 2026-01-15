import { Box, ChakraProvider, defaultSystem, Flex, Stack, Text } from '@chakra-ui/react';
import { emitTo } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import type { AnalysisReadyPayload, AnalysisResultPayload } from '../analysisEvents';
import DataTable from '../components/DataTable';

const RESULT_ROW_HEIGHT = 40;
const RESULT_TABLE_BORDER = 2;

const ResultPage: FC = () => {
  const [logs, setLogs] = useState<AnalysisResultPayload[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    const setup = async () => {
      const webview = getCurrentWebviewWindow();
      unlisten = await webview.listen<AnalysisResultPayload>('analysis:result', (event) => {
        const entry = event.payload;
        setLogs((prev) => [...prev, entry]);
        setSelectedId(entry.id);
      });
      await emitTo<AnalysisReadyPayload>('dataView', 'analysis:ready', { label: 'resultView' });
    };
    void setup();
    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const selected = useMemo(() => logs.find((log) => log.id === selectedId) ?? null, [logs, selectedId]);
  const rowCount = selected?.result?.rows.length ?? 0;
  const resultTableHeight = selected ? (rowCount + 1) * RESULT_ROW_HEIGHT + RESULT_TABLE_BORDER : 560;

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
            <Text fontWeight="semibold">分析結果</Text>
            <DataTable
              table={selected?.result ?? null}
              height={resultTableHeight}
              showRowIndex={false}
              emptyMessage="分析結果がまだありません"
            />
          </Stack>
        </Box>
      </Flex>
    </Box>
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(
  <ChakraProvider value={defaultSystem}>
    <ResultPage />
  </ChakraProvider>
);
