import { Box, ChakraProvider, defaultSystem, Flex, Separator, Stack, Text } from '@chakra-ui/react';
import { emitTo } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ANALYSIS_METHODS,
  type AnalysisLogSummary,
  type AnalysisResultPayload,
  type MethodModule,
  type SupportedAnalysisType,
} from '../analysis/api';
import { tauriIpc } from '../ipc';
import {
  ANALYSIS_READY_EVENT,
  ANALYSIS_RESULT_EVENT,
  type AnalysisReadyPayload,
  DATA_WINDOW_LABEL,
  RESULT_WINDOW_LABEL,
} from './events';
import { buildSelectedLabel, findMethodLabel } from './services/displayFormatter';

const METHODS: readonly MethodModule[] = ANALYSIS_METHODS;

export const ResultWindow = () => {
  const [summaries, setSummaries] = useState<AnalysisLogSummary[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AnalysisResultPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const methodsByType = useMemo(() => {
    return new Map<SupportedAnalysisType, MethodModule>(
      METHODS.map((method) => [method.definition.key, method] as const)
    );
  }, []);
  const summariesById = useMemo(() => {
    return new Map(summaries.map((item) => [item.id, item] as const));
  }, [summaries]);
  const selected = useMemo(
    () => (selectedRecord?.id === selectedId ? selectedRecord : null),
    [selectedId, selectedRecord]
  );
  const selectedSummary = useMemo(
    () => (selectedId ? (summariesById.get(selectedId) ?? null) : null),
    [selectedId, summariesById]
  );

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let active = true;

    const setup = async () => {
      try {
        const webview = getCurrentWebviewWindow();
        unlisten = await webview.listen<AnalysisResultPayload>(ANALYSIS_RESULT_EVENT, (event) => {
          setSummaries((prev) => {
            const nextSummary: AnalysisLogSummary = {
              id: event.payload.id,
              type: event.payload.type,
              timestamp: event.payload.timestamp,
              dataset: event.payload.dataset,
            };
            return [nextSummary, ...prev.filter((item) => item.id !== nextSummary.id)];
          });
          setSelectedRecord(event.payload);
          setSelectedId(event.payload.id);
          setDetailError(null);
        });

        await emitTo<AnalysisReadyPayload>(DATA_WINDOW_LABEL, ANALYSIS_READY_EVENT, {
          label: RESULT_WINDOW_LABEL,
        });

        const initialSummaries = await tauriIpc.listSessionAnalysisLogs();

        if (!active) {
          if (unlisten) {
            unlisten();
            unlisten = null;
          }
          return;
        }

        setSummaries(initialSummaries);
        setSelectedId((prev) => prev ?? initialSummaries[0]?.id ?? null);
      } catch (error: unknown) {
        if (active) {
          setDetailError(error instanceof Error ? error.message : String(error));
        }
      }
    };

    void setup();

    return () => {
      active = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedId || selectedRecord?.id === selectedId) {
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    void tauriIpc
      .getSessionAnalysisLog(selectedId)
      .then((record) => {
        if (cancelled) {
          return;
        }
        if (!record) {
          setDetailError('分析ログが見つかりません');
          return;
        }
        setSelectedRecord(record);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setDetailError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, selectedRecord]);

  const renderResult = () => {
    if (detailLoading && !selected) {
      return (
        <Text color="gray.600" fontSize="sm">
          分析ログを読み込んでいます
        </Text>
      );
    }

    if (detailError && !selected) {
      return (
        <Text color="red.500" fontSize="sm">
          {detailError}
        </Text>
      );
    }

    if (!selected) {
      return (
        <Text color="gray.600" fontSize="sm">
          分析結果がまだありません
        </Text>
      );
    }

    const method = methodsByType.get(selected.type);
    if (!method) {
      return (
        <Text color="red.500" fontSize="sm">
          この分析結果の表示に対応していません
        </Text>
      );
    }

    return method.renderResult(selected.result);
  };

  const selectedType = selectedSummary?.type ?? selected?.type ?? null;
  const selectedLabel = selectedType ? findMethodLabel(METHODS, selectedType) : '分析結果';
  const datasetLabel = buildSelectedLabel(selectedSummary?.dataset ?? selected?.dataset ?? null);
  const variablesLabel = selected?.variables.join(', ') || 'なし';
  const formattedOptions =
    selected && Object.keys(selected.options).length > 0
      ? JSON.stringify(selected.options, null, 2)
      : 'オプション指定なし';

  return (
    <Box p="6" h="100vh">
      <Flex gap="6" h="full">
        <Box
          w="280px"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          p="4"
          overflow="hidden"
        >
          <Stack gap="3" h="full">
            <Text fontWeight="semibold">分析ログ</Text>
            <Stack gap="2" flex="1" overflowY="auto">
              {summaries.length === 0 ? (
                <Text color="gray.500" fontSize="sm">
                  分析結果がまだありません
                </Text>
              ) : (
                summaries.map((item) => {
                  const selectedState = item.id === selectedId;
                  return (
                    <Box
                      key={item.id}
                      as="button"
                      textAlign="left"
                      borderWidth="1px"
                      borderColor={selectedState ? 'blue.400' : 'gray.200'}
                      bg={selectedState ? 'blue.50' : 'transparent'}
                      borderRadius="md"
                      px="3"
                      py="2"
                      onClick={() => setSelectedId(item.id)}
                    >
                      <Text fontWeight="semibold" fontSize="sm">
                        {findMethodLabel(METHODS, item.type)}
                      </Text>
                      <Text color="gray.500" fontSize="xs">
                        {item.timestamp}
                      </Text>
                      <Text color="gray.500" fontSize="xs" truncate>
                        {buildSelectedLabel(item.dataset) ?? 'データ不明'}
                      </Text>
                    </Box>
                  );
                })
              )}
            </Stack>
          </Stack>
        </Box>

        <Box
          flex="1"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          p="4"
          overflow="auto"
        >
          <Stack gap="3">
            <Text fontWeight="semibold">{selectedLabel}</Text>
            <Stack gap="1">
              <Text color="gray.600" fontSize="sm">
                データ: {datasetLabel ?? '不明'}
              </Text>
              <Text color="gray.600" fontSize="sm">
                変数: {variablesLabel}
              </Text>
            </Stack>
            <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p="3">
              <Stack gap="2">
                <Text fontWeight="semibold" fontSize="sm">
                  分析条件
                </Text>
                <Box
                  as="pre"
                  bg="gray.50"
                  borderRadius="md"
                  p="3"
                  overflowX="auto"
                  fontSize="xs"
                  whiteSpace="pre-wrap"
                >
                  {formattedOptions}
                </Box>
              </Stack>
            </Box>
            <Separator />
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
