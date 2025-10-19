import { useMemo, type FC } from 'react';

import { type ParsedTable } from '../dto';

type Props = {
  data: ParsedTable | null;
  className?: string;
};

// Merge and sort class names lexicographically
const cx = (...parts: Array<string | null | undefined | false>): string =>
  parts
    .flatMap((p) => (typeof p === 'string' ? p.trim().split(/\s+/) : []))
    .filter(Boolean)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .join(' ');

const DataTable: FC<Props> = ({ data, className }) => {
  if (!data || data.rows.length === 0) {
    return null;
  }

  const { headers, rows } = data;

  const colCount = useMemo(() => {
    const maxRowLength = rows.reduce((max, row) => Math.max(max, row.length), 0);
    return Math.max(headers.length, maxRowLength);
  }, [headers, rows]);
  const displayHeaders = useMemo(() => {
    return Array.from({ length: colCount }, (_, i) => headers[i] ?? `列${i + 1}`); // 不足しているヘッダーは自動生成
  }, [headers, colCount]);

  const wrapCls = cx(
    className,
    'bg-white',
    'border',
    'border-gray-300',
    'max-h-[90vh]',
    'my-2.5',
    'overflow-auto',
    'w-[calc(100vw-5vh)]'
  );

  const tableCls = cx('border-separate', 'border-spacing-0', 'w-full');

  const cellBaseCls = cx(
    'border-b',
    'border-gray-100',
    'border-r',
    'px-2.5',
    'py-1.5',
    'text-left',
    'text-sm',
    'whitespace-nowrap'
  );

  const headerCellCls = cx(
    cellBaseCls,
    'bg-gray-50',
    'font-semibold',
    'sticky',
    'top-0',
    'z-[1]',
    // Heavier bottom border for header
    'border-b-gray-300'
  );

  const rownumCellExtraCls = cx('text-gray-600', 'text-right', 'w-16');

  return (
    <div className={wrapCls}>
      <table className={tableCls}>
        <thead>
          <tr>
            <th className={cx(headerCellCls, rownumCellExtraCls)} key="rownum">
              {/* 行番号列のヘッダー（空欄）*/}
            </th>
            {displayHeaders.map((h, idx) => (
              <th className={cx(headerCellCls)} key={idx} title={h}>
                {h} {/* データ列のヘッダーを表示 */}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              <td className={cx(cellBaseCls, rownumCellExtraCls)} key="rownum">
                {rIdx + 1} {/* 行番号を表示 */}
              </td>
              {Array.from({ length: colCount }, (_, cIdx) => {
                return (
                  <td className={cx(cellBaseCls)} key={cIdx}>
                    {row[cIdx]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
