import { type FC, useMemo } from 'react';

import type { ParsedTable } from '../dto';
import DataTable from './DataTable';

type Props = {
  data: ParsedTable | null;
  className?: string;
  fluid?: boolean;
};

type Section = {
  title: string | null;
  corr: string[][];
  p: string[][];
};

const isSectionLabel = (s: unknown): s is string => {
  return typeof s === 'string' && /^---\s.*\s---$/.test(s);
};

const normalizeTitle = (s: string): string => s.replace(/^---\s*/, '').replace(/\s*---$/, '');

const mapHeader = (h: string): string => {
  if (h === 'Variable') return '変数';
  return h;
};

const CorrelationTables: FC<Props> = ({ data, className, fluid }) => {
  const sections = useMemo<Section[]>(() => {
    if (!data || !data.rows?.length) return [];

    const out: Section[] = [];
    let cur: Section = { title: null, corr: [], p: [] };
    let inP = false;
    for (const r of data.rows) {
      const first = r?.[0];
      if (isSectionLabel(first)) {
        if (cur.corr.length || cur.p.length) out.push(cur);
        cur = { title: normalizeTitle(String(first)), corr: [], p: [] };
        inP = false;
        continue;
      }
      if (String(first) === 'p-value') {
        inP = true;
        continue;
      }
      const row = (r ?? []).map((v) => (v == null ? '' : String(v)));
      if (!inP) cur.corr.push(row);
      else cur.p.push(row);
    }
    if (cur.corr.length || cur.p.length) out.push(cur);
    return out;
  }, [data]);

  const headers = useMemo(() => (data?.headers ?? []).map((h) => mapHeader(String(h ?? ''))), [data]);

  if (!data || sections.length === 0) return null;

  return (
    <div className={className}>
      {sections.map((s, idx) => (
        <div key={`${s.title ?? 'corr'}:${idx}`} className={idx > 0 ? 'mt-6' : ''}>
          {s.title && <div className="text-sm text-gray-600 px-1 py-1">{s.title}</div>}
          <div className="text-sm text-gray-600 px-1 py-1">相関係数</div>
          <DataTable data={{ headers, rows: s.corr }} fluid={fluid} />
          <div className="text-sm text-gray-600 px-1 py-1 mt-3">p値</div>
          <DataTable data={{ headers, rows: s.p }} fluid={fluid} />
        </div>
      ))}
    </div>
  );
};

export default CorrelationTables;

