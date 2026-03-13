import { Stack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { DataTable } from '../../../components/DataTable';
import type { AnalysisResult, AnalysisSection } from '../../types';
import { buildExportSectionsFromResult } from '../utils';

const RESULT_ROW_HEIGHT = 40;
const RESULT_TABLE_BORDER = 2;
const MIN_TABLE_HEIGHT = 160;
const MAX_TABLE_HEIGHT = 420;

const calcTableHeight = (rowCount: number): number => {
  const rawHeight = (rowCount + 1) * RESULT_ROW_HEIGHT + RESULT_TABLE_BORDER;
  return Math.max(MIN_TABLE_HEIGHT, Math.min(rawHeight, MAX_TABLE_HEIGHT));
};

export const buildRegressionExportSections = (result: AnalysisResult): AnalysisSection[] => {
  return buildExportSectionsFromResult(result);
};

export const renderRegressionResult = (result: AnalysisResult): ReactNode => {
  if (result.sections.length === 0) {
    return (
      <Text fontSize="sm" color="red.500">
        回帰分析の結果がありません
      </Text>
    );
  }

  return (
    <Stack gap="5">
      {result.sections.map((section) => {
        const table = section.table;
        return (
          <Stack key={section.key} gap="2">
            <Text fontWeight="medium" fontSize="sm">
              {section.label}
            </Text>
            <DataTable
              table={table}
              height={calcTableHeight(table.rows.length)}
              showRowIndex={false}
            />
            {table.note ? (
              <Text fontSize="sm" color="gray.600">
                {table.note}
              </Text>
            ) : null}
          </Stack>
        );
      })}
    </Stack>
  );
};
