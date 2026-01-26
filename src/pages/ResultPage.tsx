import { Box, ChakraProvider, defaultSystem, Flex, HStack, Stack, Text } from '@chakra-ui/react';
import { emitTo } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { save } from '@tauri-apps/plugin-dialog';
import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import type { AnalysisReadyPayload, AnalysisResultPayload } from '../analysisEvents';
import DataTable from '../components/DataTable';
import PopoverSelect, { type PopoverSelectItem } from '../components/PopoverSelect';
import type { AnalysisResult, ParsedDataTable } from '../dto';
import tauriIPC, { type AnalysisExportLog, type AnalysisExportSection } from '../tauriIPC';

const RESULT_ROW_HEIGHT = 40;
const RESULT_TABLE_BORDER = 2;
const EXPORT_ITEMS: PopoverSelectItem[] = [{ label: 'Excel', value: 'xlsx' }];

// テーブルの高さを計算
const calcTableHeight = (table: ParsedDataTable): number => {
  return (table.rows.length + 1) * RESULT_ROW_HEIGHT + RESULT_TABLE_BORDER;
};

const ResultPage: FC = () => {
  const [logs, setLogs] = useState<AnalysisResultPayload[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportKey, setExportKey] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

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
  const canExport = logs.length > 0 && !isExporting;

  const buildExportSections = (result: AnalysisResult): AnalysisExportSection[] => {
    if (result.kind === 'regression') {
      return [
        { sectionTitle: 'モデルの要約', table: result.regression.model_summary },
        { sectionTitle: '回帰係数', table: result.regression.coefficients },
        { sectionTitle: '分散分析表', table: result.regression.anova },
      ];
    }
    if (result.kind === 'factor') {
      const sections: AnalysisExportSection[] = [
        { sectionTitle: '固有値と寄与率', table: result.factor.eigen },
        { sectionTitle: '因子負荷量', table: result.factor.pattern },
        { sectionTitle: '回転行列', table: result.factor.rotmat },
      ];
      if (result.factor.structure) {
        sections.push({ sectionTitle: '構造行列', table: result.factor.structure });
      }
      if (result.factor.phi) {
        sections.push({ sectionTitle: '因子間相関 (Phi)', table: result.factor.phi });
      }
      return sections;
    }
    return [{ table: result.table }];
  };

  const buildExportLogs = (entries: AnalysisResultPayload[]): AnalysisExportLog[] =>
    entries.map((entry) => ({
      label: entry.label,
      timestamp: entry.timestamp,
      sections: buildExportSections(entry.result),
    }));

  const handleExport = async (item: PopoverSelectItem | null) => {
    if (!item || item.value !== 'xlsx') {
      return;
    }

    setExportError(null);

    if (logs.length === 0) {
      setExportError('エクスポートする分析結果がありません');
      setExportKey((prev) => prev + 1);
      return;
    }

    const filePath = await save({
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });

    if (!filePath) {
      setExportKey((prev) => prev + 1);
      return;
    }

    const normalized = filePath.toLowerCase();
    const resolvedPath = normalized.endsWith('.xlsx') ? filePath : `${filePath}.xlsx`;

    setIsExporting(true);
    try {
      await tauriIPC.exportAnalysisToXlsx(resolvedPath, buildExportLogs(logs));
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExporting(false);
      setExportKey((prev) => prev + 1);
    }
  };

  // 結果の表示コンポーネントを生成
  const renderResult = () => {
    if (!selected) {
      return (
        <DataTable table={null} height={560} showRowIndex={false} emptyMessage="分析結果がまだありません" />
      );
    }

    const result = selected.result;

    if (result.kind === 'regression') {
      const regression = result.regression;
      // 回帰分析: モデル要約 + 係数テーブル + 分散分析テーブルの3つを表示
      const modelSummaryHeight = calcTableHeight(regression.model_summary);
      const coeffHeight = calcTableHeight(regression.coefficients);
      const anovaHeight = calcTableHeight(regression.anova);
      return (
        <Stack gap="4" flex="1" overflowY="auto">
          <Box>
            <Text fontWeight="medium" fontSize="sm" mb="2">
              モデルの要約
            </Text>
            <DataTable table={regression.model_summary} height={modelSummaryHeight} showRowIndex={false} />
          </Box>
          <Box>
            <Text fontWeight="medium" fontSize="sm" mb="2">
              回帰係数
            </Text>
            <DataTable table={regression.coefficients} height={coeffHeight} showRowIndex={false} />
            {regression.coefficients.note ? (
              <Text fontSize="sm" color="gray.600" textAlign="left" mt="1">
                {regression.coefficients.note}
              </Text>
            ) : null}
          </Box>
          <Box>
            <Text fontWeight="medium" fontSize="sm" mb="2">
              分散分析表
            </Text>
            <DataTable table={regression.anova} height={anovaHeight} showRowIndex={false} />
            {regression.anova.note ? (
              <Text fontSize="sm" color="gray.600" textAlign="left" mt="1">
                {regression.anova.note}
              </Text>
            ) : null}
          </Box>
        </Stack>
      );
    }

    if (result.kind === 'factor') {
      const factor = result.factor;
      const eigenHeight = calcTableHeight(factor.eigen);
      const patternHeight = calcTableHeight(factor.pattern);
      const rotmatHeight = calcTableHeight(factor.rotmat);
      const structureHeight = factor.structure ? calcTableHeight(factor.structure) : 0;
      const phiHeight = factor.phi ? calcTableHeight(factor.phi) : 0;

      return (
        <Stack gap="4" flex="1" overflowY="auto">
          <Box>
            <Text fontWeight="medium" fontSize="sm" mb="2">
              固有値と寄与率
            </Text>
            <DataTable table={factor.eigen} height={eigenHeight} showRowIndex={false} />
          </Box>
          <Box>
            <Text fontWeight="medium" fontSize="sm" mb="2">
              パターン行列
            </Text>
            <DataTable
              table={factor.pattern}
              height={patternHeight}
              showRowIndex={false}
              highlightAbsThreshold={0.4}
            />
          </Box>
          <Box>
            <Text fontWeight="medium" fontSize="sm" mb="2">
              回転行列
            </Text>
            <DataTable table={factor.rotmat} height={rotmatHeight} showRowIndex={false} />
          </Box>
          {factor.structure ? (
            <Box>
              <Text fontWeight="medium" fontSize="sm" mb="2">
                構造行列
              </Text>
              <DataTable table={factor.structure} height={structureHeight} showRowIndex={false} />
            </Box>
          ) : null}
          {factor.phi ? (
            <Box>
              <Text fontWeight="medium" fontSize="sm" mb="2">
                因子間相関 (Phi)
              </Text>
              <DataTable table={factor.phi} height={phiHeight} showRowIndex={false} />
            </Box>
          ) : null}
        </Stack>
      );
    }

    // 通常の単一テーブル結果
    const table = result.table;
    const tableHeight = calcTableHeight(table);
    return (
      <>
        {table.title ? (
          <Text fontWeight="medium" fontSize="sm" mb="2">
            {table.title}
          </Text>
        ) : null}
        <DataTable table={table} height={tableHeight} showRowIndex={false} />
        {table.note ? (
          <Text fontSize="sm" color="gray.600" textAlign="left">
            {table.note}
          </Text>
        ) : null}
      </>
    );
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
                <PopoverSelect
                  key={`export-${exportKey}`}
                  items={EXPORT_ITEMS}
                  placeholder="エクスポート"
                  onSelect={handleExport}
                  disabled={!canExport}
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
    <ResultPage />
  </ChakraProvider>
);
