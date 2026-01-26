import { Box, Button, CloseButton, Dialog, HStack, Input, Portal, Stack, Text } from '@chakra-ui/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAnalysisLabel } from '../analysis/analysisRegistry';
import type { AnalysisLogSummary } from '../dto';
import tauriIPC from '../tauriIPC';

const RECENT_LIMIT = 20;
const PERIOD_LIMIT = 200;

interface PreviousAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  onDisplay: (analysisId: string) => Promise<void>;
}

const formatDataSource = (entry: AnalysisLogSummary): string => {
  const path = entry.filePath?.trim() ?? '';
  if (!path || path === '-') {
    return 'データなし';
  }
  const parts = path.split(/[\\/]/);
  const fileName = parts[parts.length - 1] ?? path;
  const sheet = entry.sheetName?.trim() ?? '';
  if (!sheet || sheet === '-') {
    return fileName;
  }
  return `${fileName} / ${sheet}`;
};

const buildPeriodLabel = (fromDate: string, toDate: string): string => {
  if (fromDate && toDate) {
    return `${fromDate} 〜 ${toDate} の分析`;
  }
  if (fromDate) {
    return `${fromDate} 以降の分析`;
  }
  if (toDate) {
    return `${toDate} 以前の分析`;
  }
  return '期間指定の分析';
};

const PreviousAnalysisModal = ({ open, onClose, onDisplay }: PreviousAnalysisModalProps) => {
  const [logs, setLogs] = useState<AnalysisLogSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState<string>('最近の分析');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [displaying, setDisplaying] = useState(false);

  const resetState = useCallback(() => {
    setLogs([]);
    setSelectedId(null);
    setActiveLabel('最近の分析');
    setFromDate('');
    setToDate('');
    setError(null);
    setLoading(false);
    setDisplaying(false);
  }, []);

  const loadRecent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entries = await tauriIPC.listRecentAnalysisLogs(RECENT_LIMIT);
      setLogs(entries);
      setSelectedId(null);
      setActiveLabel(`最近の分析（最新${RECENT_LIMIT}件）`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadByPeriod = useCallback(async () => {
    if (!fromDate && !toDate) {
      setError('開始日または終了日を指定してください');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const entries = await tauriIPC.listAnalysisLogsByPeriod(fromDate || null, toDate || null, PERIOD_LIMIT);
      setLogs(entries);
      setSelectedId(null);
      const label = buildPeriodLabel(fromDate, toDate);
      setActiveLabel(`${label}（最大${PERIOD_LIMIT}件）`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    if (open) {
      void loadRecent();
      return;
    }
    resetState();
  }, [open, loadRecent, resetState]);

  const handleDisplay = async () => {
    if (!selectedId) {
      setError('表示する分析を選択してください');
      return;
    }
    setDisplaying(true);
    setError(null);
    try {
      await onDisplay(selectedId);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDisplaying(false);
    }
  };

  const selected = useMemo(
    () => logs.find((log) => log.analysisId === selectedId) ?? null,
    [logs, selectedId]
  );

  return (
    <Dialog.Root open={open} onOpenChange={(e) => (e.open ? null : onClose())}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="720px">
            <Dialog.Header>
              <Dialog.Title>以前の分析</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="4">
                <Stack gap="2">
                  <Text fontWeight="semibold">{activeLabel}</Text>
                  <HStack gap="3" wrap="wrap">
                    <Button variant="outline" size="sm" onClick={loadRecent} loading={loading}>
                      最近の分析を再読み込み
                    </Button>
                    <HStack gap="2">
                      <Input
                        type="date"
                        size="sm"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                      />
                      <Text fontSize="sm" color="gray.500">
                        〜
                      </Text>
                      <Input
                        type="date"
                        size="sm"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={loadByPeriod}
                        loading={loading}
                        disabled={!fromDate && !toDate}
                      >
                        期間で検索
                      </Button>
                    </HStack>
                  </HStack>
                </Stack>
                {error ? (
                  <Text color="red.500" fontSize="sm">
                    {error}
                  </Text>
                ) : null}
                <Box
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  p="3"
                  maxH="320px"
                  overflowY="auto"
                >
                  <Stack gap="2">
                    {logs.length === 0 ? (
                      <Text fontSize="sm" color="gray.500">
                        該当する分析がありません
                      </Text>
                    ) : (
                      logs.map((log) => {
                        const isSelected = log.analysisId === selectedId;
                        const dataSource = formatDataSource(log);
                        return (
                          <Box
                            key={log.analysisId}
                            as="button"
                            onClick={() => setSelectedId(log.analysisId)}
                            textAlign="left"
                            borderWidth="1px"
                            borderColor={isSelected ? 'blue.400' : 'gray.200'}
                            bg={isSelected ? 'blue.50' : 'transparent'}
                            borderRadius="md"
                            px="3"
                            py="2"
                          >
                            <Text fontWeight="semibold" fontSize="sm">
                              {getAnalysisLabel(log.analysisType)}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {log.timestamp} ・ {dataSource}
                            </Text>
                          </Box>
                        );
                      })
                    )}
                  </Stack>
                </Box>
                {selected ? (
                  <Text fontSize="sm" color="gray.600">
                    選択中: {getAnalysisLabel(selected.analysisType)} / {formatDataSource(selected)}
                  </Text>
                ) : null}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">キャンセル</Button>
              </Dialog.ActionTrigger>
              <Button onClick={handleDisplay} loading={displaying} disabled={!selectedId}>
                表示
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default PreviousAnalysisModal;
