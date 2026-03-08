import { Box, ChakraProvider, defaultSystem, Flex, Stack, Text } from '@chakra-ui/react';
import { emitTo } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ANALYSIS_METHODS,
  type AnalysisResultPayload,
  type MethodModule,
  type SupportedAnalysisType,
} from '../analysis/api';
import {
  ANALYSIS_READY_EVENT,
  ANALYSIS_RESULT_EVENT,
  type AnalysisReadyPayload,
  DATA_WINDOW_LABEL,
  RESULT_WINDOW_LABEL,
} from './events';

const METHODS: readonly MethodModule[] = ANALYSIS_METHODS;

export const ResultWindow = () => {
  const [logs, setLogs] = useState<AnalysisResultPayload[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const methodsByType = useMemo(() => {
    return new Map<SupportedAnalysisType, MethodModule>(
      METHODS.map((method) => [method.definition.key, method] as const)
    );
  }, []);
  const selected = useMemo(
    () => logs.find((item) => item.id === selectedId) ?? null,
    [logs, selectedId]
  );

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let active = true;

    const setup = async () => {
      const webview = getCurrentWebviewWindow();
      unlisten = await webview.listen<AnalysisResultPayload>(ANALYSIS_RESULT_EVENT, (event) => {
        setLogs((prev) => [...prev, event.payload]);
        setSelectedId(event.payload.id);
      });

      if (!active) {
        if (unlisten) {
          unlisten();
          unlisten = null;
        }
        return;
      }

      await emitTo<AnalysisReadyPayload>(DATA_WINDOW_LABEL, ANALYSIS_READY_EVENT, {
        label: RESULT_WINDOW_LABEL,
      });
    };

    void setup();

    return () => {
      active = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const renderResult = () => {
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
              {logs.length === 0 ? (
                <Text color="gray.500" fontSize="sm">
                  分析結果がまだありません
                </Text>
              ) : (
                logs.map((item) => {
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
                        {item.label}
                      </Text>
                      <Text color="gray.500" fontSize="xs">
                        {item.timestamp}
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
            <Text fontWeight="semibold">{selected?.label ?? '分析結果'}</Text>
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
