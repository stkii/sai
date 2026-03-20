import { Stack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { DataTable } from '../../../components/DataTable';
import type { AnalysisResult, AnalysisSection } from '../../types';
import { buildExportSectionsFromResult } from '../utils';

const RESULT_ROW_HEIGHT = 40;
const RESULT_TABLE_BORDER = 2;

const calcTableHeight = (rowCount: number) => {
  return (rowCount + 1) * RESULT_ROW_HEIGHT + RESULT_TABLE_BORDER;
};

export const buildCorrelationExportSections = (result: AnalysisResult): AnalysisSection[] => {
  return buildExportSectionsFromResult(result);
};

export const renderCorrelationResult = (result: AnalysisResult): ReactNode => {
  if (result.sections.length === 0) {
    return (
      <Text fontSize="sm" color="red.500">
        相関分析の結果がありません
      </Text>
    );
  }

  return (
    <Stack gap="5">
      {result.sections.map((section) => (
        <Stack key={section.key} gap="2">
          <Text fontWeight="medium" fontSize="sm">
            {section.label}
          </Text>
          <DataTable
            table={section.table}
            height={calcTableHeight(section.table.rows.length)}
            showRowIndex={false}
            virtualize={false}
          />
          {section.table.note ? (
            <Text fontSize="sm" color="gray.600">
              {section.table.note}
            </Text>
          ) : null}
        </Stack>
      ))}
    </Stack>
  );
};
