import { type FC, useMemo } from 'react';

import type { ParsedTable } from '../dto';
import DataTable from './DataTable';

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

const MultiBlockTable: FC<Props> = ({ data, className, fluid }) => {
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
      const headerRow = rows[i + 1] ?? [];
      const headers = headerRow.map((v) => mapHeaderToJa(title, String(v ?? '')));
      const blockRows: string[][] = [];
      i += 2;
      // Accumulate until next section or end
      while (i < rows.length && !isSectionLabel(rows[i]?.[0])) {
        blockRows.push((rows[i] ?? []).map((v) => (v == null ? '' : String(v))));
        i += 1;
      }
      blocks.push({ title, table: { headers, rows: blockRows } });
    }
    return blocks;
  }, [data]);

  if (!blocks.length) return null;

  return (
    <div className={className}>
      {blocks.map((b, idx) => (
        <div key={`${b.title}:${idx}`} className={idx > 0 ? 'mt-4' : ''}>
          <div className="text-sm text-gray-600 px-1 py-1">
            {b.title === 'Model Summary'
              ? 'モデル要約'
              : b.title === 'Coefficients'
                ? '係数'
                : b.title === 'ANOVA'
                  ? '分散分析'
                  : b.title}
          </div>
          <DataTable data={b.table} fluid={fluid} />
        </div>
      ))}
    </div>
  );
};

export default MultiBlockTable;
