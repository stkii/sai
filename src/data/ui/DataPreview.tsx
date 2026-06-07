import { Text, VStack } from '@chakra-ui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type CSSProperties, memo, useCallback, useRef } from 'react';
import type { DatasetSummary } from '../../shared/types';

interface Props {
  summary: DatasetSummary;
}

const ROW_HEIGHT = 37;
const COL_WIDTH = 60;
const ROW_NUM_WIDTH = 48;

const headerStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  display: 'flex',
  alignItems: 'center',
  background: '#f3f4f6',
  borderBottom: '1px solid #e5e7eb',
  zIndex: 2,
  height: `${ROW_HEIGHT}px`,
};

const cornerCellStyle: CSSProperties = {
  position: 'sticky',
  left: 0,
  width: `${ROW_NUM_WIDTH}px`,
  padding: '4px 8px',
  fontSize: '12px',
  fontWeight: 600,
  textAlign: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  background: '#e5e7eb',
  borderRight: '1px solid #d1d5db',
  boxSizing: 'border-box',
  zIndex: 3,
};

const headerCellStyle: CSSProperties = {
  width: `${COL_WIDTH}px`,
  padding: '4px 8px',
  fontSize: '12px',
  fontWeight: 600,
  textAlign: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  borderRight: '1px solid #e5e7eb',
  boxSizing: 'border-box',
};

const rowNumCellStyle: CSSProperties = {
  position: 'sticky',
  left: 0,
  width: `${ROW_NUM_WIDTH}px`,
  padding: '4px 8px',
  fontSize: '12px',
  fontWeight: 500,
  color: '#6b7280',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  background: '#f9fafb',
  borderRight: '1px solid #e5e7eb',
  borderBottom: '1px solid #f3f4f6',
  boxSizing: 'border-box',
  zIndex: 1,
};

const cellStyle: CSSProperties = {
  width: `${COL_WIDTH}px`,
  padding: '4px 8px',
  fontSize: '12px',
  textAlign: 'right',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  borderRight: '1px solid #f3f4f6',
  borderBottom: '1px solid #f3f4f6',
  boxSizing: 'border-box',
};

interface RowProps {
  rowNumber: number;
  row: string[];
  top: number;
  height: number;
  totalWidth: number;
}

const Row = memo(function Row({ rowNumber, row, top, height, totalWidth }: RowProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${totalWidth}px`,
        height: `${height}px`,
        transform: `translateY(${top}px)`,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div style={rowNumCellStyle}>{rowNumber}</div>
      {row.map((cell, j) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: column index is stable within a row
        <div key={j} style={cellStyle}>
          {cell}
        </div>
      ))}
    </div>
  );
});

export function DataPreview({ summary }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const getScrollElement = useCallback(() => parentRef.current, []);

  const rowVirtualizer = useVirtualizer({
    count: summary.preview.length,
    getScrollElement,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const colCount = summary.headers.length;
  const totalWidth = ROW_NUM_WIDTH + colCount * COL_WIDTH;
  const totalHeight = rowVirtualizer.getTotalSize();
  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <VStack align="stretch" gap={2} px={3} py={2} flex={1} overflow="hidden" minHeight={0}>
      <Text fontSize="xs" color="gray.600">
        {summary.rowCount.toLocaleString()} 行 × {colCount} 列
      </Text>
      <div
        ref={parentRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          contain: 'strict',
        }}
      >
        <div style={{ width: `${totalWidth}px`, position: 'relative' }}>
          <div style={headerStyle}>
            <div style={cornerCellStyle}>#</div>
            {summary.headers.map((h) => (
              <div key={h} style={headerCellStyle}>
                {h}
              </div>
            ))}
          </div>
          <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
            {virtualItems.map((virtualRow) => (
              <Row
                key={virtualRow.key}
                rowNumber={virtualRow.index + 1}
                row={summary.preview[virtualRow.index]}
                top={virtualRow.start}
                height={virtualRow.size}
                totalWidth={totalWidth}
              />
            ))}
          </div>
        </div>
      </div>
    </VStack>
  );
}
