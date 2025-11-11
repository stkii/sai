import { type FC, useMemo } from 'react';

import type { ParsedTable } from '../dto';

type Props = {
  data: ParsedTable | null;
  className?: string;
  fluid?: boolean;
};
const DataTable: FC<Props> = ({ data, className, fluid }) => {
  const headers = data?.headers ?? [];
  const rows = data?.rows ?? [];

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

  if (!data || rows.length === 0) {
    return null;
  }

  return (
    <div
      className={`${className ?? ''} bg-white border border-gray-300 max-h-[90vh] my-2.5 overflow-auto ${fluid ? 'w-full' : 'w-[calc(100vw-5vh)]'}`.trim()}
    >
      <table className="border-separate border-spacing-0 w-full">
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
            {headerItems.map((item) => (
              <th
                className="
                  border-b border-gray-100 border-r px-2.5 py-1.5 text-left text-sm whitespace-nowrap
                  bg-gray-50 font-semibold sticky top-0 z-[1] border-b-gray-300
                "
                key={item.key}
                title={item.h}
              >
                {item.h} {/* データ列のヘッダーを表示 */}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => {
            // Use row index for a stable, collision-free key to preserve order
            const rowKey = `row:${rIdx}`;
            return (
              <tr key={rowKey}>
                <td
                  className="border-b border-gray-100 border-r px-2.5 py-1.5 text-left text-sm whitespace-nowrap text-gray-600 w-16"
                  key="rownum"
                >
                  {rIdx + 1} {/* 行番号を表示 */}
                </td>
                {Array.from({ length: colCount }, (_, cIdx) => {
                  // Compose cell key from row/col index to avoid collisions
                  const colKey = `cell:${rIdx}:${cIdx}`;
                  return (
                    <td
                      className="border-b border-gray-100 border-r px-2.5 py-1.5 text-left text-sm whitespace-nowrap"
                      key={colKey}
                    >
                      {String(row[cIdx] ?? '')} {/* フォールバックは boolean のため */}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
