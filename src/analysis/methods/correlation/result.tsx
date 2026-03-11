import { Stack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { DataTable } from '../../../components/DataTable';
import type { AnalysisResult, AnalysisSection } from '../../types';
import { buildExportSectionsFromResult, getSingleSection } from '../utils';

const RESULT_ROW_HEIGHT = 40;
const RESULT_TABLE_BORDER = 2;

const calcTableHeight = (rowCount: number) => {
  return (rowCount + 1) * RESULT_ROW_HEIGHT + RESULT_TABLE_BORDER;
};

export const buildCorrelationExportSections = (result: AnalysisResult): AnalysisSection[] => {
  return buildExportSectionsFromResult(result);
};

export const renderCorrelationResult = (result: AnalysisResult): ReactNode => {
  const section = getSingleSection(result);
  if (!section) {
    return (
      <Text fontSize="sm" color="red.500">
        相関分析の結果がありません
      </Text>
    );
  }

  const table = section.table;
  return (
    <Stack gap="2">
      <Text fontWeight="medium" fontSize="sm">
        {section.label}
      </Text>
      <DataTable table={table} height={calcTableHeight(table.rows.length)} showRowIndex={false} />
      {table.note ? (
        <Text fontSize="sm" color="gray.600">
          {table.note}
        </Text>
      ) : null}
    </Stack>
  );
};
