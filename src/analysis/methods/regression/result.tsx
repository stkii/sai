import { Stack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { DataTable } from '../../../components/DataTable';
import type { AnalysisResult, AnalysisSection } from '../../types';
import { buildExportSectionsFromResult } from '../utils';

const RESULT_ROW_HEIGHT = 40;
const RESULT_TABLE_BORDER = 2;
const MAX_TABLE_HEIGHT = 420;

const calcTableHeight = (rowCount: number): number => {
  const rawHeight = (rowCount + 1) * RESULT_ROW_HEIGHT + RESULT_TABLE_BORDER;
  return Math.min(rawHeight, MAX_TABLE_HEIGHT);
};

const formatRegressionLabel = (value: string): string => {
  if (!value.includes(':') && !value.includes('`')) {
    return value;
  }

  const parts: string[] = [];
  let current = '';
  let inQuotedName = false;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];

    if (char === '`') {
      if (inQuotedName && value[i + 1] === '`') {
        current += '`';
        i += 1;
      } else {
        inQuotedName = !inQuotedName;
      }
      continue;
    }

    if (char === ':' && !inQuotedName) {
      parts.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  if (inQuotedName) {
    return value;
  }

  parts.push(current);
  if (parts.some((part) => part.length === 0)) {
    return value;
  }

  return parts.join(' × ');
};

const formatRegressionTableForDisplay = (
  table: AnalysisSection['table']
): AnalysisSection['table'] => {
  return {
    ...table,
    rows: table.rows.map((row) => {
      const [firstCell, ...rest] = row;
      if (typeof firstCell !== 'string') {
        return row;
      }
      return [formatRegressionLabel(firstCell), ...rest];
    }),
  };
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
        const table = formatRegressionTableForDisplay(section.table);
        return (
          <Stack key={section.key} gap="2">
            <Text fontWeight="medium" fontSize="sm">
              {section.label}
            </Text>
            <DataTable
              table={table}
              height={calcTableHeight(table.rows.length)}
              showRowIndex={false}
              virtualize={false}
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
