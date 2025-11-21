import { useVirtualizer } from '@tanstack/react-virtual';
import { type FC, useEffect, useMemo, useRef, useState } from 'react';

import type { ParsedTable } from '../dto';

type Props = {
  data: ParsedTable | null;
  className?: string;
  fluid?: boolean;
};
const DataTable: FC<Props> = ({ data, className, fluid }) => {
  const headers = data?.headers ?? [];
  const rows = data?.rows ?? [];
  // 仮想化用の設定（行・列）
  const ROW_HEIGHT = 32; // px（概ねの高さ。セルのpaddingとline-heightに合わせる）
  const DEFAULT_COL_WIDTH = 100; // px（固定幅。実測は廃止）
  const ROW_OVERSCAN = 10;
  const COL_OVERSCAN = 5;
  const MIN_COL_WIDTH = 100; // UIが崩れない最小幅

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const colCount = useMemo(() => {
    const maxRowLength = rows.reduce((max, row) => Math.max(max, row.length), 0);
    return Math.max(headers.length, maxRowLength);
  }, [headers, rows]);
  const displayHeaders = useMemo(() => {
    return Array.from({ length: colCount }, (_, i) => headers[i] ?? `列${i + 1}`); // 不足しているヘッダーは自動生成
  }, [headers, colCount]);

  const headerItems = useMemo(() => {
    return displayHeaders.map((h, i) => ({ h, key: `head:${h}:${i}` }));
  }, [displayHeaders]);

  // 列幅は固定（実測は廃止）。少列時はフィットモードで均等配分。
  const COL_WIDTH = DEFAULT_COL_WIDTH;

  // 行・列の仮想化
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: ROW_OVERSCAN,
  });
  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: colCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => COL_WIDTH,
    overscan: COL_OVERSCAN,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const virtualCols = colVirtualizer.getVirtualItems();
  const totalRowHeight = rowVirtualizer.getTotalSize();
  const totalColWidth = colVirtualizer.getTotalSize();
  const rowNumColWidth = 64; // w-16 (4rem)
  const baseTotalWidth = rowNumColWidth + totalColWidth;

  // 列数が少なく、総幅がコンテナを下回るときは「フィットモード」へ
  const fitMode = containerWidth > 0 && baseTotalWidth < containerWidth;

  const topSpacer = virtualRows.length ? virtualRows[0].start : 0;
  const bottomSpacer = virtualRows.length
    ? Math.max(
        0,
        totalRowHeight -
          (virtualRows[virtualRows.length - 1].start + virtualRows[virtualRows.length - 1].size)
      )
    : 0;
  let leftSpacer = virtualCols.length ? virtualCols[0].start : 0;
  let rightSpacer = virtualCols.length
    ? Math.max(
        0,
        totalColWidth - (virtualCols[virtualCols.length - 1].start + virtualCols[virtualCols.length - 1].size)
      )
    : 0;
  // ボーダー等のサブピクセル誤差を丸めて微小な空白列を抑制
  leftSpacer = Math.max(0, Math.round(leftSpacer));
  rightSpacer = Math.max(0, Math.round(rightSpacer));

  // フィットモードではスペーサを無効化し、列幅を均等配分
  const fittedColWidth = fitMode
    ? Math.max(MIN_COL_WIDTH, Math.floor((containerWidth - rowNumColWidth) / Math.max(1, colCount)))
    : COL_WIDTH;
  if (fitMode) {
    leftSpacer = 0;
    rightSpacer = 0;
  }

  // 可視列集合（フィットモード時は全列）
  const visibleCols = fitMode
    ? Array.from({ length: colCount }, (_, i) => ({
        index: i,
        size: fittedColWidth,
        start: i * fittedColWidth,
      }))
    : virtualCols;
  const effectiveTotalColWidth = fitMode ? fittedColWidth * colCount : totalColWidth;

  if (!data || rows.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col ${className ?? ''}`.trim()}>
      <div
        ref={scrollRef}
        className={`-m-1.5 overflow-auto bg-white border border-gray-300 max-h-[90vh] my-2.5 ${
          fluid ? 'w-full' : 'w-[calc(100vw-5vh)]'
        }`.trim()}
      >
        <div className="p-1.5 min-w-full inline-block align-middle">
          <div className="overflow-hidden">
            <table
              className="min-w-full border-separate border-spacing-0 divide-y divide-gray-200"
              style={{ width: Math.max(containerWidth, rowNumColWidth + effectiveTotalColWidth) }}
            >
              <thead>
                <tr>
                  <th
                    className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase bg-gray-50 sticky left-0 top-0 z-[2] border-b border-gray-300"
                    key="rownum"
                  >
                    {/* 行番号 */}
                  </th>
                  {leftSpacer > 0 && (
                    <th
                      aria-hidden
                      key="col-left-spacer"
                      style={{ width: leftSpacer, padding: 0, border: 'none' }}
                      className="sticky top-0 bg-gray-50"
                    />
                  )}
                  {visibleCols.map((vc) => {
                    const item = headerItems[vc.index];
                    return (
                      <th
                        className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase bg-gray-50 sticky top-0 z-[1] border-b border-gray-300 overflow-hidden text-ellipsis"
                        key={`head:${vc.index}`}
                        title={item.h}
                        style={{ width: fitMode ? fittedColWidth : vc.size }}
                      >
                        {item.h}
                      </th>
                    );
                  })}
                  {rightSpacer > 0 && (
                    <th
                      aria-hidden
                      key="col-right-spacer"
                      style={{ width: rightSpacer, padding: 0, border: 'none' }}
                      className="sticky top-0 bg-gray-50"
                    />
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topSpacer > 0 && (
                  <tr aria-hidden>
                    <td
                      colSpan={(visibleCols.length || colCount) + 3}
                      style={{ height: topSpacer, border: 'none', padding: 0 }}
                    />
                  </tr>
                )}
                {virtualRows.map((vr) => {
                  const rIdx = vr.index;
                  const row = rows[rIdx] ?? [];
                  const rowKey = `row:${rIdx}`;
                  return (
                    <tr key={rowKey} style={{ height: vr.size }}>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 sticky left-0 bg-white"
                        key="rownum"
                      >
                        {rIdx + 1}
                      </td>
                      {leftSpacer > 0 && (
                        <td
                          aria-hidden
                          key={`lsp:${rIdx}`}
                          style={{ width: leftSpacer, padding: 0, border: 'none' }}
                        />
                      )}
                      {visibleCols.map((vc) => {
                        const cIdx = vc.index;
                        const colKey = `cell:${rIdx}:${cIdx}`;
                        const cell = row[cIdx];
                        return (
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 overflow-hidden text-ellipsis"
                            key={colKey}
                            style={{ width: fitMode ? fittedColWidth : vc.size }}
                            title={cell == null ? '' : String(cell)}
                          >
                            {String(cell ?? '')}
                          </td>
                        );
                      })}
                      {rightSpacer > 0 && (
                        <td
                          aria-hidden
                          key={`rsp:${rIdx}`}
                          style={{ width: rightSpacer, padding: 0, border: 'none' }}
                        />
                      )}
                    </tr>
                  );
                })}
                {bottomSpacer > 0 && (
                  <tr aria-hidden>
                    <td
                      colSpan={(visibleCols.length || colCount) + 3}
                      style={{ height: bottomSpacer, border: 'none', padding: 0 }}
                    />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
