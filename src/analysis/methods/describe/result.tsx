import { Text, VStack } from '@chakra-ui/react';
import { sentenceOfDiagnostic } from '../../../result/presentation/diagnostics';
import { formatCount, formatStatistic } from '../../../result/presentation/number';
import type {
  AnalysisResult,
  AnalysisSection,
  DescriptiveColumn,
  DescriptiveReport,
} from '../../../shared/types';
import { SectionsView } from '../../../shared/ui/SectionsView';

const BASE_HEADERS = ['変数', 'n', '平均', '標準偏差', '最小値', '中央値', '最大値'];

/**
 * 記述統計の結果。エンジンからは丸める前の値が届くので、桁と見出しはここで決める。
 * 型付き結果を持たない記録 (R が返した表を保存した履歴) は共通表示へ回す。
 */
export function DescribeResult({ result }: { result: AnalysisResult }) {
  const report = result.typed?.method === 'describe' ? result.typed : null;
  if (!report) {
    return <SectionsView result={result} />;
  }
  const notes = report.columns.flatMap((column) =>
    column.diagnostics.map((d) => `${column.variable} — ${sentenceOfDiagnostic(d)}`)
  );
  return (
    <VStack align="stretch" gap={2}>
      <SectionsView result={{ sections: [sectionOf(report)] }} />
      {/* 値が返らなかった理由。空欄の意味が分からないままにしない */}
      {notes.map((note) => (
        <Text key={note} fontSize="xs" color="fg.warning">
          {note}
        </Text>
      ))}
    </VStack>
  );
}

function sectionOf(report: DescriptiveReport): AnalysisSection {
  const headers = [...BASE_HEADERS];
  if (report.appliedOptions.includeSkewness) headers.push('歪度');
  if (report.appliedOptions.includeKurtosis) headers.push('尖度');

  return {
    id: 'descriptive',
    title: '記述統計',
    table: {
      headers,
      rows: report.columns.map((column) => rowOf(column, report.appliedOptions)),
      note: missingNote(report.columns) ?? undefined,
    },
  };
}

function rowOf(column: DescriptiveColumn, options: DescriptiveReport['appliedOptions']): string[] {
  const row = [
    column.variable,
    formatCount(column.validCount),
    formatStatistic(column.mean),
    formatStatistic(column.standardDeviation),
    formatStatistic(column.minimum),
    formatStatistic(column.median),
    formatStatistic(column.maximum),
  ];
  if (options.includeSkewness) row.push(formatStatistic(column.skewness));
  if (options.includeKurtosis) row.push(formatStatistic(column.kurtosis));
  return row;
}

/**
 * 欠測は変数ごとに除かれるため、表の n はどの変数でも同じとは限らない。
 * 総行数を下回った変数を挙げて、少ない n が誤りに見えないようにする。
 */
function missingNote(columns: DescriptiveColumn[]): string | null {
  const affected = columns.filter((c) => c.missingCount > 0);
  if (affected.length === 0) return null;
  const total = columns[0].totalCount;
  const listed = affected.map((c) => `${c.variable} (n = ${c.validCount})`).join(', ');
  return `欠測は変数ごとに除外しました。有効数が総行数 (${total}) を下回る変数があります: ${listed}`;
}
