import { Box, Button, Stack, Text } from '@chakra-ui/react';
import type { AnalysisLogSummary, MethodModule } from '../../analysis/api';
import {
  buildSelectedLabel,
  filterControlStyle,
  findMethodLabel,
  getDatasetFileName,
} from '../services/display';
import {
  ALL_ANALYSIS_FILTER,
  type AnalysisFilter,
  type AnalysisLogEmptyStateAction,
  LOG_SOURCE_LABEL,
  type LogSource,
} from '../types';

interface AnalysisLogSidebarProps {
  analysisFilter: AnalysisFilter;
  currentSummariesCount: number;
  emptyStateAction?: AnalysisLogEmptyStateAction | null;
  filteredSummaries: AnalysisLogSummary[];
  listError: string | null;
  listLoading: boolean;
  methods: readonly MethodModule[];
  searchQuery: string;
  source: LogSource;
  visibleSelectedId: string | null;
  onAnalysisFilterChange: (value: AnalysisFilter) => void;
  onSearchQueryChange: (value: string) => void;
  onSelectRecord: (id: string) => void;
}

export const AnalysisLogSidebar = ({
  analysisFilter,
  currentSummariesCount,
  emptyStateAction,
  filteredSummaries,
  listError,
  listLoading,
  methods,
  searchQuery,
  source,
  visibleSelectedId,
  onAnalysisFilterChange,
  onSearchQueryChange,
  onSelectRecord,
}: AnalysisLogSidebarProps) => {
  return (
    <Box
      w="320px"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      p="4"
      overflow="hidden"
    >
      <Stack gap="3" h="full">
        <Text fontWeight="semibold">{LOG_SOURCE_LABEL[source]}</Text>

        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="分析名やデータ名で検索"
          aria-label="分析ログ検索"
          style={filterControlStyle}
        />

        <select
          value={analysisFilter}
          onChange={(event) => onAnalysisFilterChange(event.target.value as AnalysisFilter)}
          aria-label="分析手法フィルタ"
          style={{ ...filterControlStyle, background: 'white' }}
        >
          <option value={ALL_ANALYSIS_FILTER}>すべての分析</option>
          {methods.map((method) => (
            <option key={method.definition.key} value={method.definition.key}>
              {method.definition.label}
            </option>
          ))}
        </select>

        <Stack gap="2" flex="1" overflowY="auto">
          {listLoading ? (
            <Text color="gray.500" fontSize="sm">
              分析ログを読み込んでいます
            </Text>
          ) : listError ? (
            <Text color="red.500" fontSize="sm">
              {listError}
            </Text>
          ) : filteredSummaries.length === 0 ? (
            <Stack gap="3" align="flex-start">
              <Text color="gray.500" fontSize="sm">
                {currentSummariesCount === 0
                  ? source === 'session'
                    ? 'このセッションではまだ分析結果がありません'
                    : '保存された分析結果がありません'
                  : '条件に一致する分析結果がありません'}
              </Text>
              {currentSummariesCount === 0 && emptyStateAction ? (
                <Button size="sm" variant="outline" onClick={emptyStateAction.onClick}>
                  {emptyStateAction.label}
                </Button>
              ) : null}
            </Stack>
          ) : (
            filteredSummaries.map((item) => {
              const selectedState = item.id === visibleSelectedId;
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
                  onClick={() => onSelectRecord(item.id)}
                >
                  <Text fontWeight="semibold" fontSize="sm">
                    {findMethodLabel(methods, item.type)}
                  </Text>
                  <Text color="gray.700" fontSize="xs">
                    {getDatasetFileName(item.dataset)}
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
  );
};
