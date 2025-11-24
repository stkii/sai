import { type FC, useMemo } from 'react';

import type { ParsedTable } from '../dto';
import DataTable from './DataTable';
import LazyBlock from './LazyBlock';

type Props = {
  data: ParsedTable | null;
  className?: string;
  fluid?: boolean;
};

type Block = {
  title: string;
  table: ParsedTable;
};

const isSectionLabel = (s: unknown): s is string => {
  if (typeof s !== 'string') return false;
  return /^---\s.*\s---$/.test(s);
};

const mapHeaderToJa = (_title: string, h: string): string => {
  // Generic English -> Japanese header label mapping
  const dict: Record<string, string> = {
    // Model Summary
    N: 'N',
    'R-squared': 'R2乗',
    'Adj. R-squared': '調整済みR2乗',
    'Residual Std. Error': '残差標準誤差',
    'Residual DF': '残差自由度',
    'F-statistic': 'F値',
    'Pr(>F)': '有意確率',
    // Coefficients
    Term: '項目',
    Estimate: '推定値',
    'Std. Error': '標準誤差',
    't value': 't値',
    'Pr(>|t|)': '有意確率',
    VIF: 'VIF',
    Beta: '標準化係数β',
    // ANOVA
    Source: '変動要因',
    'Sum Sq': '平方和',
    Df: '自由度',
    'Mean Sq': '平均平方',
    'F value': 'F値',
  };
  return dict[h] ?? h;
};

const mapTitleToJa = (title: string): string => {
  switch (title) {
    case 'Model Summary':
      return 'モデル要約';
    case 'Coefficients':
      return '係数';
    case 'ANOVA':
      return '分散分析';
    default:
      return title;
  }
};

const MultiBlockTable: FC<Props> = ({ data, className, fluid }) => {
  const ROW_HEIGHT = 32;
  const HEADER_HEIGHT = 36;
  const blocks = useMemo<Block[]>(() => {
    if (!data || !data.rows?.length) return [];
    const rows = data.rows;
    const blocks: Block[] = [];

    let i = 0;
    while (i < rows.length) {
      const row = rows[i] as unknown[];
      const label = row?.[0];
      if (!isSectionLabel(label)) {
        // Skip until we find a section label row
        i += 1;
        continue;
      }
      const title = String(label)
        .replace(/^---\s*/, '')
        .replace(/\s*---$/, '');
      // Next row expected to be headers for this block
      const headerRowRaw = rows[i + 1] ?? [];
      const headerRow = headerRowRaw.map((v) => mapHeaderToJa(title, String(v ?? '')));
      const blockRowsRaw: string[][] = [];
      i += 2;
      // Accumulate until next section or end
      while (i < rows.length && !isSectionLabel(rows[i]?.[0])) {
        blockRowsRaw.push((rows[i] ?? []).map((v) => (v == null ? '' : String(v))));
        i += 1;
      }
      const isTrailingEmpty = (col: number): boolean => {
        const headerEmpty = (headerRow[col] ?? '').trim() === '';
        if (!headerEmpty) return false;
        return blockRowsRaw.every((r) => (r[col] ?? '').trim() === '');
      };
      let width = headerRow.length;
      while (width > 0 && isTrailingEmpty(width - 1)) {
        width -= 1;
      }
      if (width === 0) {
        width = Math.max(0, ...blockRowsRaw.map((r) => r.length));
      }
      let headers = headerRow.slice(0, width);
      if (headers.length < width) {
        headers = headers.concat(
          Array.from({ length: width - headers.length }, (_, idx) => `列${headers.length + idx + 1}`)
        );
      }
      const blockRows = blockRowsRaw.map((row) => {
        if (row.length >= width) {
          return row.slice(0, width);
        }
        return row.concat(Array.from({ length: width - row.length }, () => ''));
      });
      blocks.push({ title, table: { headers, rows: blockRows } });
    }
    return blocks;
  }, [data]);

  if (!blocks.length) return null;

  return (
    <div className={className}>
      {blocks.map((b, idx) => (
        <div key={`${b.title}:${idx}`} className={idx > 0 ? 'mt-4' : ''}>
          <LazyBlock estimatedHeight={(b.table.rows.length + 1) * ROW_HEIGHT + HEADER_HEIGHT}>
            <DataTable data={b.table} fluid={fluid} caption={mapTitleToJa(b.title)} />
          </LazyBlock>
        </div>
      ))}
    </div>
  );
};

export default MultiBlockTable;
