import { Box, Heading, Text, VStack } from '@chakra-ui/react';
import type { AnalysisResult, AnalysisTable } from '../../../shared/types';
import { MDS_PLOT } from '../../../shared/ui/golden';
import { SectionsView } from '../../../shared/ui/SectionsView';

const CONFIG_TITLE = '布置座標';

interface Point {
  label: string;
  x: number;
  y: number;
}

/**
 * 布置座標のテーブルから次元1・次元2を取り出す。
 * 3次元以上でも図に描けるのは2次元までなので、先頭2列だけを読む。
 */
function toPoints(table: AnalysisTable): Point[] {
  const points: Point[] = [];
  for (const row of table.rows) {
    const x = Number(row[1]);
    const y = Number(row[2]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
    points.push({ label: row[0], x, y });
  }
  return points;
}

/** 対象数に応じた一辺。点が増えるほど広い描画領域を割り当てる。 */
function plotSize(count: number): number {
  const { size, sizeThreshold } = MDS_PLOT;
  if (count <= sizeThreshold.small) return size.small;
  if (count <= sizeThreshold.medium) return size.medium;
  return size.large;
}

/**
 * 両軸を同じ倍率で写す変換を作る。
 * 軸ごとに引き伸ばすと点間の距離が歪み、布置図として読めなくなるため、
 * 広い方の範囲に合わせて正方形に収める。
 */
function makeProjection(points: Point[], size: number) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const span = Math.max(maxX - minX, maxY - minY) || 1;

  const inner = size - MDS_PLOT.padding * 2;
  const scale = inner / span;
  const half = size / 2;
  return {
    // SVG の y 軸は下向きなので符号を反転し、数学的な向きに揃える
    toX: (x: number) => half + (x - centerX) * scale,
    toY: (y: number) => half - (y - centerY) * scale,
  };
}

function ConfigurationPlot({ points, dimCount }: { points: Point[]; dimCount: number }) {
  const size = plotSize(points.length);
  const { toX, toY } = makeProjection(points, size);
  const half = size / 2;

  return (
    <VStack align="stretch" gap={2}>
      <Heading size="sm">布置図</Heading>
      {/* svg は px 実寸で描く。width="100%" だと狭いペインで文字まで縮んで読めなくなる */}
      <Box
        borderWidth="1px"
        borderColor="border"
        borderRadius="md"
        overflow="auto"
        width="fit-content"
        maxWidth="100%"
      >
        <svg
          role="img"
          aria-label="多次元尺度構成法の布置図"
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          style={{ display: 'block' }}
        >
          <line
            x1={MDS_PLOT.padding / 2}
            y1={half}
            x2={size - MDS_PLOT.padding / 2}
            y2={half}
            stroke="var(--chakra-colors-border)"
            strokeWidth={1}
          />
          <line
            x1={half}
            y1={MDS_PLOT.padding / 2}
            x2={half}
            y2={size - MDS_PLOT.padding / 2}
            stroke="var(--chakra-colors-border)"
            strokeWidth={1}
          />
          {points.map((p) => {
            const cx = toX(p.x);
            const cy = toY(p.y);
            // ラベルは常に図の内側へ伸ばす。外向きだと viewBox の外に出て切れる
            const rightward = cx < half;
            return (
              <g key={p.label}>
                <circle cx={cx} cy={cy} r={MDS_PLOT.pointRadius} fill="var(--chakra-colors-fg)" />
                <text
                  x={cx + (rightward ? MDS_PLOT.labelOffset : -MDS_PLOT.labelOffset)}
                  y={cy - MDS_PLOT.labelOffset / 2}
                  textAnchor={rightward ? 'start' : 'end'}
                  fontSize={MDS_PLOT.fontSize}
                  fill="var(--chakra-colors-fg-muted)"
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </Box>
      {dimCount > 2 && (
        <Text fontSize="xs" color="fg.muted">
          次元1 と 次元2 のみを描画しています (全 {dimCount} 次元)
        </Text>
      )}
    </VStack>
  );
}

export function MdsResult({ result }: { result: AnalysisResult }) {
  const config = result.sections.find((s) => s.title === CONFIG_TITLE);
  const points = config ? toPoints(config.table) : [];
  const dimCount = config ? config.table.headers.length - 1 : 0;

  return (
    <VStack align="stretch" gap={4}>
      {points.length > 0 && <ConfigurationPlot points={points} dimCount={dimCount} />}
      <SectionsView result={result} />
    </VStack>
  );
}
