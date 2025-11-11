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
  const DEFAULT_COL_WIDTH = 140; // px（固定幅。実測は廃止）
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
    <div
      ref={scrollRef}
      className={`${className ?? ''} bg-white border border-gray-300 max-h-[90vh] my-2.5 overflow-auto ${fluid ? 'w-full' : 'w-[calc(100vw-5vh)]'}`.trim()}
    >
      <table
        className="border-separate border-spacing-0"
        style={{ width: Math.max(containerWidth, rowNumColWidth + effectiveTotalColWidth) }}
      >
        <thead>
          <tr>
            <th
              className="
                border-b border-gray-100 border-r px-2.5 py-1.5 text-left text-sm whitespace-nowrap
                bg-gray-50 font-semibold sticky top-0 z-[1] border-b-gray-300 text-gray-600 w-16
              "
              key="rownum"
            >
              {/* 行番号列のヘッダー（空欄）*/}
            </th>
            {/* 左スペーサ（横方向） */}
            {leftSpacer > 0 && (
              <th
                aria-hidden
                key="col-left-spacer"
                style={{ width: leftSpacer, padding: 0, border: 'none' }}
                className="sticky top-0 bg-gray-50"
              />
            )}
            {/* 可視列のみ描画 */}
            {visibleCols.map((vc) => {
              const item = headerItems[vc.index];
              return (
                <th
                  className="
                    border-b border-gray-100 border-r px-2.5 py-1.5 text-left text-sm whitespace-nowrap
                    bg-gray-50 font-semibold sticky top-0 z-[1] border-b-gray-300 overflow-hidden text-ellipsis
                  "
                  key={`head:${vc.index}`}
                  title={item.h}
                  style={{ width: fitMode ? fittedColWidth : vc.size }}
                >
                  {item.h}
                </th>
              );
            })}
            {/* 右スペーサ */}
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
        <tbody>
          {/* 上部スペーサ（仮想オフセット） */}
          {topSpacer > 0 && (
            <tr aria-hidden>
              <td
                colSpan={(virtualCols.length || colCount) + 3}
                style={{ height: topSpacer, border: 'none', padding: 0 }}
              />
            </tr>
          )}
          {/* 可視行のみ描画 */}
          {virtualRows.map((vr) => {
            const rIdx = vr.index;
            const row = rows[rIdx] ?? [];
            const rowKey = `row:${rIdx}`;
            return (
              <tr key={rowKey} style={{ height: vr.size }}>
                <td
                  className="border-b border-gray-100 border-r px-2.5 py-1 text-left text-sm whitespace-nowrap text-gray-600 w-16 sticky left-0 bg-white"
                  key="rownum"
                >
                  {rIdx + 1}
                </td>
                {/* 左スペーサ（横方向） */}
                {leftSpacer > 0 && (
                  <td
                    aria-hidden
                    key={`lsp:${rIdx}`}
                    style={{ width: leftSpacer, padding: 0, border: 'none' }}
                  />
                )}
                {/* 可視列のみ描画 */}
                {visibleCols.map((vc) => {
                  const cIdx = vc.index;
                  const colKey = `cell:${rIdx}:${cIdx}`;
                  return (
                    <td
                      className="border-b border-gray-100 border-r px-2.5 py-1 text-left text-sm whitespace-nowrap overflow-hidden text-ellipsis"
                      key={colKey}
                      style={{ width: fitMode ? fittedColWidth : vc.size }}
                      title={row[cIdx] == null ? '' : String(row[cIdx])}
                    >
                      {String(row[cIdx] ?? '')}
                    </td>
                  );
                })}
                {/* 右スペーサ */}
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
          {/* 下部スペーサ */}
          {bottomSpacer > 0 && (
            <tr aria-hidden>
              <td
                colSpan={(virtualCols.length || colCount) + 3}
                style={{ height: bottomSpacer, border: 'none', padding: 0 }}
              />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
