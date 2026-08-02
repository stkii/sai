import { Text, VStack } from '@chakra-ui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type CSSProperties, memo, useCallback, useRef } from 'react';
import type { LoadedDataset } from '../../shared/types';

// スタイルは Chakra props ではなくモジュール定数の inline style で持つ。
// 仮想スクロール中にセルごとの emotion スタイル生成を走らせないため。

interface Props {
  dataset: LoadedDataset;
}

const ROW_HEIGHT = 37;
/** データ列の下限幅。余った横幅は全列に均等配分され、下回るときは横スクロールに切り替わる。 */
const COL_MIN_WIDTH = 60;
const ROW_NUM_WIDTH = 48;

/** inline style から参照するテーマトークン。第 2 引数は未定義時のフォールバック。 */
const token = {
  bgSubtle: 'var(--chakra-colors-bg-subtle, #f9fafb)',
  bgMuted: 'var(--chakra-colors-bg-muted, #f3f4f6)',
  bgEmphasized: 'var(--chakra-colors-bg-emphasized, #e5e7eb)',
  border: 'var(--chakra-colors-border, #e5e7eb)',
  borderMuted: 'var(--chakra-colors-border-muted, #f3f4f6)',
  borderEmphasized: 'var(--chakra-colors-border-emphasized, #d1d5db)',
  fgMuted: 'var(--chakra-colors-fg-muted, #6b7280)',
} as const;

const headerStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  display: 'flex',
  alignItems: 'center',
  background: token.bgMuted,
  borderBottom: `1px solid ${token.border}`,
  zIndex: 2,
  height: `${ROW_HEIGHT}px`,
};

const cornerCellStyle: CSSProperties = {
  position: 'sticky',
  left: 0,
  flex: `0 0 ${ROW_NUM_WIDTH}px`,
  padding: '4px 8px',
  fontSize: '12px',
  fontWeight: 600,
  textAlign: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  background: token.bgEmphasized,
  borderRight: `1px solid ${token.borderEmphasized}`,
  boxSizing: 'border-box',
  zIndex: 3,
};

const headerCellStyle: CSSProperties = {
  flex: `1 0 ${COL_MIN_WIDTH}px`,
  padding: '4px 8px',
  fontSize: '12px',
  fontWeight: 600,
  textAlign: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  borderRight: `1px solid ${token.border}`,
  boxSizing: 'border-box',
};

const rowNumCellStyle: CSSProperties = {
  position: 'sticky',
  left: 0,
  flex: `0 0 ${ROW_NUM_WIDTH}px`,
  padding: '4px 8px',
  fontSize: '12px',
  fontWeight: 500,
  color: token.fgMuted,
  textAlign: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  background: token.bgSubtle,
  borderRight: `1px solid ${token.border}`,
  borderBottom: `1px solid ${token.borderMuted}`,
  boxSizing: 'border-box',
  zIndex: 1,
};

const cellStyle: CSSProperties = {
  flex: `1 0 ${COL_MIN_WIDTH}px`,
  padding: '4px 8px',
  fontSize: '12px',
  textAlign: 'right',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  borderRight: `1px solid ${token.borderMuted}`,
  borderBottom: `1px solid ${token.borderMuted}`,
  boxSizing: 'border-box',
};

interface RowProps {
  rowNumber: number;
  row: string[];
  top: number;
  height: number;
}

const Row = memo(function Row({ rowNumber, row, top, height }: RowProps) {
  return (
    <tr
      // 見出し行が 1 行目なので、データ行は 2 始まり
      aria-rowindex={rowNumber + 1}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: `${height}px`,
        transform: `translateY(${top}px)`,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <th scope="row" style={rowNumCellStyle}>
        {rowNumber}
      </th>
      {row.map((cell, j) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: column index is stable within a row
        <td key={j} style={cellStyle}>
          {cell}
        </td>
      ))}
    </tr>
  );
});

export function DataPreview({ dataset }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const getScrollElement = useCallback(() => parentRef.current, []);

  const rowVirtualizer = useVirtualizer({
    count: dataset.rows.length,
    getScrollElement,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const colCount = dataset.headers.length;
  const minTableWidth = ROW_NUM_WIDTH + colCount * COL_MIN_WIDTH;
  const totalHeight = rowVirtualizer.getTotalSize();
  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <VStack align="stretch" gap={2} px={3} py={2} flex={1} overflow="hidden" minHeight={0}>
      <Text fontSize="xs" color="fg.muted">
        {dataset.rows.length.toLocaleString()} 行 × {colCount} 列
      </Text>
      <div
        ref={parentRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          border: `1px solid ${token.border}`,
          borderRadius: '6px',
          contain: 'strict',
        }}
      >
        <table
          aria-label="データセットのプレビュー"
          aria-rowcount={dataset.rows.length + 1}
          aria-colcount={colCount + 1}
          style={{
            width: '100%',
            minWidth: `${minTableWidth}px`,
            position: 'relative',
            display: 'block',
            borderCollapse: 'collapse',
          }}
        >
          <thead style={{ display: 'block' }}>
            <tr aria-rowindex={1} style={headerStyle}>
              <th scope="col" style={cornerCellStyle}>
                #
              </th>
              {dataset.headers.map((h) => (
                <th scope="col" key={h} style={headerCellStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ display: 'block', height: `${totalHeight}px`, position: 'relative' }}>
            {virtualItems.map((virtualRow) => (
              <Row
                key={virtualRow.key}
                rowNumber={virtualRow.index + 1}
                row={dataset.rows[virtualRow.index]}
                top={virtualRow.start}
                height={virtualRow.size}
              />
            ))}
          </tbody>
        </table>
      </div>
    </VStack>
  );
}
