import { Box, Flex, Stack, Text } from '@chakra-ui/react';
import { useMemo } from 'react';
import type { MethodModule, SupportedAnalysisType } from '../../analysis/api';
import { buildSelectedLabel, findMethodLabel } from '../services/display';
import { useAnalysisLogBrowser } from '../state/useAnalysisLogBrowser';
import { type AnalysisLogBrowserOptions, LOG_SOURCE_LABEL, PERSISTENT_LOG_LIMIT } from '../types';
import { AnalysisLogDetail } from './AnalysisLogDetail';
import { AnalysisLogHeader } from './AnalysisLogHeader';
import { AnalysisLogSidebar } from './AnalysisLogSidebar';

export const AnalysisLogBrowser = (options: AnalysisLogBrowserOptions = {}) => {
  const browser = useAnalysisLogBrowser(options);

  const methodsByType = useMemo(() => {
    return new Map<SupportedAnalysisType, MethodModule>(
      browser.methods.map((method) => [method.definition.key, method] as const)
    );
  }, [browser.methods]);

  const selectedType = browser.selectedSummary?.type ?? browser.selectedRecord?.type ?? null;
  const selectedLabel = selectedType ? findMethodLabel(browser.methods, selectedType) : '分析結果';
  const datasetLabel = buildSelectedLabel(
    browser.selectedSummary?.dataset ?? browser.selectedRecord?.dataset ?? null
  );
  const variablesLabel = browser.selectedRecord?.variables.join(', ') || 'なし';
  const formattedOptions =
    browser.selectedRecord && Object.keys(browser.selectedRecord.options).length > 0
      ? JSON.stringify(browser.selectedRecord.options, null, 2)
      : 'オプション指定なし';
  const sourceDescription =
    browser.source === 'session'
      ? '起動中のセッションで実行した分析を表示しています'
      : `保存済みの分析履歴を表示しています（最新${PERSISTENT_LOG_LIMIT}件）`;
  const title = options.title ?? '分析ログ';

  const renderResult = () => {
    if (browser.detailLoading && !browser.selectedRecord) {
      return (
        <Text color="gray.600" fontSize="sm">
          分析ログを読み込んでいます
        </Text>
      );
    }

    if (!browser.visibleSelectedId) {
      if (browser.listError) {
        return (
          <Text color="red.500" fontSize="sm">
            {browser.listError}
          </Text>
        );
      }

      if (browser.analysisFilter !== 'all' || browser.normalizedSearchQuery.length > 0) {
        return (
          <Text color="gray.600" fontSize="sm">
            条件に一致する分析結果がありません
          </Text>
        );
      }

      return (
        <Text color="gray.600" fontSize="sm">
          {browser.source === 'session'
            ? 'このセッションではまだ分析結果がありません'
            : '保存された分析結果がありません'}
        </Text>
      );
    }

    if (browser.detailError && !browser.selectedRecord) {
      return (
        <Text color="red.500" fontSize="sm">
          {browser.detailError}
        </Text>
      );
    }

    if (!browser.selectedRecord) {
      return (
        <Text color="gray.600" fontSize="sm">
          分析結果を読み込めませんでした
        </Text>
      );
    }

    const method = methodsByType.get(browser.selectedRecord.type);
    if (!method) {
      return (
        <Text color="red.500" fontSize="sm">
          この分析結果の表示に対応していません
        </Text>
      );
    }

    return method.renderResult(browser.selectedRecord.result);
  };

  return (
    <Box p="6" h="100vh">
      <Stack gap="4" h="full">
        <AnalysisLogHeader
          availableSources={browser.availableSources}
          sessionUpdateCount={browser.sessionUpdateCount}
          source={browser.source}
          sourceDescription={sourceDescription}
          title={title}
          onChangeSource={browser.setSource}
        />

        <Flex gap="6" h="full" minH={0}>
          <AnalysisLogSidebar
            analysisFilter={browser.analysisFilter}
            currentSummariesCount={browser.currentSummariesCount}
            emptyStateAction={options.emptyStateAction}
            filteredSummaries={browser.filteredSummaries}
            listError={browser.listError}
            listLoading={browser.listLoading}
            methods={browser.methods}
            searchQuery={browser.searchQuery}
            source={browser.source}
            visibleSelectedId={browser.visibleSelectedId}
            onAnalysisFilterChange={browser.setAnalysisFilter}
            onSearchQueryChange={browser.setSearchQuery}
            onSelectRecord={browser.selectRecord}
          />

          <AnalysisLogDetail
            datasetLabel={datasetLabel}
            formattedOptions={formattedOptions}
            sourceLabel={LOG_SOURCE_LABEL[browser.source]}
            timestamp={browser.selectedSummary?.timestamp ?? null}
            variablesLabel={variablesLabel}
          >
            <Stack gap="3">
              <Text fontWeight="semibold">{selectedLabel}</Text>
              {renderResult()}
            </Stack>
          </AnalysisLogDetail>
        </Flex>
      </Stack>
    </Box>
  );
};
