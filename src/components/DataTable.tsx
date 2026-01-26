import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { forwardRef } from 'react';
import type { TableComponents } from 'react-virtuoso';
import { TableVirtuoso } from 'react-virtuoso';
import type { ParsedDataTable } from '../dto';

type RowData = ParsedDataTable['rows'][number];

interface DataTableProps {
  table: ParsedDataTable | null;
  height?: number;
  showRowIndex?: boolean;
  emptyMessage?: string;
  highlightAbsThreshold?: number;
}

const CELL_WIDTH = 80;
const ROW_HEIGHT = 40;

const formatCellValue = (value: RowData[number]): string => {
  if (value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return '';
};

const DataTable = ({
  table,
  height = 400,
  showRowIndex = true,
  emptyMessage = 'データを選択して読み込んでください',
  highlightAbsThreshold,
}: DataTableProps) => {
  if (!table) {
    return (
      <Paper
        sx={{
          height,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {emptyMessage}
      </Paper>
    );
  }

  const headers = showRowIndex ? ['ID', ...table.headers] : table.headers;
  const rows = table.rows;
  const minTableWidth = Math.max(headers.length * CELL_WIDTH, 600);
  const dataOffset = showRowIndex ? 1 : 0;

  const VirtuosoTableComponents: TableComponents<RowData> = {
    Scroller: forwardRef<HTMLDivElement>((props, ref) => (
      <TableContainer
        component={Paper}
        {...props}
        ref={ref}
        sx={{ border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}
      />
    )),
    Table: (props) => (
      <Table
        {...props}
        sx={{
          borderCollapse: 'separate',
          borderSpacing: 0,
          tableLayout: 'fixed',
          minWidth: minTableWidth,
        }}
      />
    ),
    TableHead: (props) => (
      <TableHead
        {...props}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          backgroundColor: 'background.paper',
        }}
      />
    ),
    TableRow,
    TableBody: forwardRef<HTMLTableSectionElement>((props, ref) => <TableBody {...props} ref={ref} />),
  };

  return (
    <Paper sx={{ height, width: '100%' }}>
      <TableVirtuoso
        data={rows}
        components={VirtuosoTableComponents}
        fixedHeaderContent={() => (
          <TableRow>
            {headers.map((header) => (
              <TableCell
                key={header}
                variant="head"
                align="left"
                sx={{
                  height: ROW_HEIGHT,
                  backgroundColor: 'grey.100',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  borderRight: '1px solid',
                  borderRightColor: 'divider',
                  fontWeight: 600,
                  py: 0,
                  '&:last-of-type': {
                    borderRight: 'none',
                  },
                }}
              >
                {header}
              </TableCell>
            ))}
          </TableRow>
        )}
        itemContent={(_index, row) =>
          headers.map((header, columnIndex) => {
            const dataIndex = columnIndex - dataOffset;
            const value =
              showRowIndex && columnIndex === 0
                ? String(_index + 1)
                : formatCellValue(row[dataIndex] ?? null);
            const rawValue = row[dataIndex] ?? null;
            const numericValue =
              typeof rawValue === 'number'
                ? rawValue
                : typeof rawValue === 'string'
                  ? Number.parseFloat(rawValue)
                  : Number.NaN;
            const isHighlight =
              typeof highlightAbsThreshold === 'number' &&
              dataIndex >= 1 &&
              Number.isFinite(numericValue) &&
              Math.abs(numericValue) >= highlightAbsThreshold;
            return (
              <TableCell
                key={header}
                align="left"
                sx={{
                  height: ROW_HEIGHT,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  borderRight: '1px solid',
                  borderRightColor: 'divider',
                  fontWeight: isHighlight ? 700 : undefined,
                  py: 0,
                  '&:last-of-type': {
                    borderRight: 'none',
                  },
                }}
              >
                {value}
              </TableCell>
            );
          })
        }
      />
    </Paper>
  );
};

export default DataTable;
