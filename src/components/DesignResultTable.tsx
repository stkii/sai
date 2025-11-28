import type { FC } from 'react';

import type { ParsedTable } from '../dto';
import DataTable from './DataTable';

export type DesignAnalysisEntry = {
  params?: unknown;
  result: ParsedTable;
};

const DESIGN_HEADERS_JA: string[] = ['N', '効果量', '有意水準', '検出力', '設計の条件'];

const formatDesignAdditional = (
  entry: DesignAnalysisEntry,
  originalRow: unknown[] | null | undefined
): string => {
  const cells = (originalRow ?? []).map((v) => (v == null ? '' : String(v)));
  const additionalRaw = cells[4] ?? '';
  const p = entry.params as Record<string, unknown> | undefined;

  if (typeof additionalRaw === 'string' && additionalRaw.startsWith('ERROR:')) {
    return '計算エラー: 指定された条件ではサンプルサイズを求められませんでした。';
  }

  if (!p || typeof p !== 'object') return '';
  const test = typeof p.test === 'string' ? (p.test as string) : '';

  if (test === 't') {
    const tType = typeof p.tType === 'string' ? (p.tType as string) : '';
    const alt = typeof p.alternative === 'string' ? (p.alternative as string) : '';
    const typeLabel =
      tType === 'one.sample'
        ? '1標本'
        : tType === 'two.sample'
          ? '2標本'
          : tType === 'paired'
            ? '対応あり'
            : '';
    const altLabel = alt === 'two.sided' ? '両側' : alt === 'one.sided' ? '片側' : '';
    const parts: string[] = [];
    if (typeLabel) parts.push(`検定タイプ: ${typeLabel}`);
    if (altLabel) parts.push(`検定の側: ${altLabel}`);
    return parts.join(' / ');
  }

  if (test === 'anov') {
    const k = typeof p.k === 'number' ? (p.k as number) : undefined;
    if (typeof k === 'number') {
      return `群数: ${k}`;
    }
    return '';
  }

  if (test === 'chisq') {
    const categories = typeof p.categories === 'number' ? (p.categories as number) : undefined;
    if (typeof categories === 'number') {
      const df = categories - 1;
      return `カテゴリ数: ${categories} / 自由度: ${df}`;
    }
    return '';
  }

  if (test === 'f2') {
    const u = typeof p.u === 'number' ? (p.u as number) : undefined;
    if (typeof u === 'number') {
      return `パラメータ数: ${u}`;
    }
    return '';
  }

  return '';
};

type Props = {
  entry: DesignAnalysisEntry;
};

const DesignResultTable: FC<Props> = ({ entry }) => {
  const tableData: ParsedTable = {
    headers: DESIGN_HEADERS_JA,
    rows: (entry.result.rows ?? []).map((row) => {
      const cells = (row ?? []).map((v) => (v == null ? '' : String(v)));
      const requiredN = cells[0] ?? '';
      const effect = cells[1] ?? '';
      const alpha = cells[2] ?? '';
      const power = cells[3] ?? '';
      const additionalJa = formatDesignAdditional(entry, row);
      return [requiredN, effect, alpha, power, additionalJa];
    }),
  };

  return <DataTable data={tableData} fluid />;
};

export default DesignResultTable;
