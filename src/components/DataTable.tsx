import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { forwardRef } from 'react';
import { type TableComponents, TableVirtuoso } from 'react-virtuoso';
import type { ParsedCell, ParsedDataTable } from '../types';

type RowData = ParsedDataTable['rows'][number];

interface BodyCellArgs {
  dataOffset: number;
  headers: string[];
  row: RowData;
  rowIndex: number;
  showRowIndex: boolean;
  boldValueThreshold?: number;
}

interface Props {
  table: ParsedDataTable | null;
  boldValueThreshold?: number;
  emptyMessage?: string;
  height?: number | string;
  showRowIndex?: boolean;
  virtualize?: boolean;
}

const CELL_WIDTH = 80 as const;
const ROW_HEIGHT = 40 as const;

const CELL_BASE_SX = {
  borderBottom: '1px solid',
  borderColor: 'divider',
  borderRight: '1px solid',
  borderRightColor: 'divider',
  fontWeight: 600,
  height: ROW_HEIGHT,
  py: 0,
  '&:last-of-type': {
    borderRight: 'none',
  },
} as const;

export const DataTable = ({
  table,
  boldValueThreshold,
  emptyMessage = 'No data',
  height = 400,
  showRowIndex = true,
  virtualize = true,
}: Props) => {
  if (!table) {
    return (
      <Paper
        style={{
          alignItems: 'center',
          display: 'flex',
          height,
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {emptyMessage}
      </Paper>
    );
  }

  const dataOffset = showRowIndex ? 1 : 0;
  const headers = showRowIndex ? ['ID', ...table.headers] : table.headers;
  const minTableWidth = Math.max(headers.length * CELL_WIDTH, 600);
  const rows = table.rows;
  const tableSx = {
    borderCollapse: 'separate',
    borderSpacing: 0,
    minWidth: minTableWidth,
    tableLayout: 'fixed',
  } as const;
  const scrollerSx = {
    border: '1px solid',
    borderColor: 'divider',
    overflowX: 'auto',
  } as const;

  if (!virtualize) {
    const rowKeyCounts = new Map<string, number>();

    return (
      <TableContainer
        component={Paper}
        sx={{
          ...scrollerSx,
          maxHeight: height,
          width: '100%',
        }}
      >
        <Table stickyHeader sx={tableSx}>
          <TableHead>{createHeaderRow(headers)}</TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => {
              const baseKey = buildRowKey(row);
              const duplicateCount = rowKeyCounts.get(baseKey) ?? 0;
              rowKeyCounts.set(baseKey, duplicateCount + 1);
              const rowKey = duplicateCount === 0 ? baseKey : `${baseKey}:${duplicateCount}`;

              return (
                <TableRow key={rowKey}>
                  {createBodyCells({
                    dataOffset,
                    headers,
                    row,
                    rowIndex,
                    showRowIndex,
                    boldValueThreshold,
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  const VirtuosoTableComponents: TableComponents<RowData> = {
    Scroller: forwardRef<HTMLDivElement>((props, ref) => (
      <TableContainer component={Paper} {...props} ref={ref} sx={scrollerSx} />
    )),
    Table: (props) => <Table {...props} sx={tableSx} />,
  };

  return (
    <Paper style={{ height, width: '100%' }}>
      <TableVirtuoso
        data={rows}
        components={VirtuosoTableComponents}
        fixedHeaderContent={() => createHeaderRow(headers)}
        itemContent={(rowIndex, row) =>
          createBodyCells({
            dataOffset,
            headers,
            row,
            rowIndex,
            showRowIndex,
            boldValueThreshold,
          })
        }
      />
    </Paper>
  );
};

const createBodyCells = ({
  dataOffset,
  headers,
  row,
  rowIndex,
  showRowIndex,
  boldValueThreshold,
}: BodyCellArgs) => {
  return headers.map((header, columnIndex) => {
    const dataIndex = columnIndex - dataOffset;
    const value =
      showRowIndex && columnIndex === 0
        ? String(rowIndex + 1)
        : showCellValue(row[dataIndex] ?? null);
    const rawValue = row[dataIndex] ?? null;
    const numericValue =
      typeof rawValue === 'number'
        ? rawValue
        : typeof rawValue === 'string'
          ? Number(rawValue)
          : Number.NaN;
    const isBold =
      typeof boldValueThreshold === 'number' &&
      dataIndex >= 1 &&
      Number.isFinite(numericValue) &&
      Math.abs(numericValue) >= boldValueThreshold;

    return (
      <TableCell
        key={header}
        align="left"
        sx={{
          ...CELL_BASE_SX,
          fontWeight: isBold ? 700 : undefined,
        }}
      >
        {value}
      </TableCell>
    );
  });
};

const createHeaderRow = (headers: string[]) => {
  return (
    <TableRow>
      {headers.map((header) => (
        <TableCell
          key={header}
          variant="head"
          align="left"
          sx={{
            ...CELL_BASE_SX,
            backgroundColor: 'grey.100',
            fontWeight: 600,
          }}
        >
          {header}
        </TableCell>
      ))}
    </TableRow>
  );
};

const showCellValue = (value: ParsedCell) => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value === null) {
    return '';
  }
  return '';
};

const buildRowKey = (row: RowData) => {
  return row.map((cell) => showCellValue(cell)).join('\u001f');
};
