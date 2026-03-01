import { Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import DataTable from '../../../components/DataTable';
import type { AnalysisResult } from '../../../types';
import { createSingleTableExportSections, renderSingleTableResult } from '../../registry/types';

const RESULT_ROW_HEIGHT = 40;
const RESULT_TABLE_BORDER = 2;

const calcTableHeight = (rowCount: number): number => {
  return (rowCount + 1) * RESULT_ROW_HEIGHT + RESULT_TABLE_BORDER;
};

export const buildDescriptiveExportSections = (result: AnalysisResult) => {
  return createSingleTableExportSections(result);
};

export const renderDescriptiveResult = (result: AnalysisResult): ReactNode => {
  const table = renderSingleTableResult(result);
  if (!table) {
    return (
      <Text fontSize="sm" color="red.500">
        結果の形式が想定と異なります
      </Text>
    );
  }

  return (
    <>
      {table.title ? (
        <Text fontWeight="medium" fontSize="sm" mb="2">
          {table.title}
        </Text>
      ) : null}
      <DataTable table={table} height={calcTableHeight(table.rows.length)} showRowIndex={false} />
      {table.note ? (
        <Text fontSize="sm" color="gray.600" textAlign="left">
          {table.note}
        </Text>
      ) : null}
    </>
  );
};
