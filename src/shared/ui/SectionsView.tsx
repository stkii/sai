import { Box, Heading, Table, Text, VStack } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import type { AnalysisResult } from '../types';
import { TABLE } from './golden';

// "< 0.001" のような p 値の上限表記も数値セルとして扱う
const NUMBER_RE = /^(?:< ?)?-?\d+(\.\d+)?(e[+-]?\d+)?\*{0,3}$/i;
const BOLD_RE = /^\*\*(.+)\*\*$/;

function parseBold(s: string): { text: string; bold: boolean } {
  const m = s.match(BOLD_RE);
  if (m) return { text: m[1], bold: true };
  return { text: s, bold: false };
}

function isNumericCell(v: string): boolean {
  return NUMBER_RE.test(parseBold(v).text.trim());
}

const SKIP_TOKENS = new Set(['', 'NA', 'NaN', '—', '–', '-', 'N/A']);

function detectNumericColumns(rows: string[][], colCount: number): boolean[] {
  const flags = new Array(colCount).fill(false);
  for (let j = 1; j < colCount; j++) {
    for (const row of rows) {
      const raw = row[j];
      if (raw === undefined) continue;
      const t = parseBold(raw).text.trim();
      if (SKIP_TOKENS.has(t)) continue;
      flags[j] = isNumericCell(raw);
      break;
    }
  }
  return flags;
}

// 有意性の星付き数値 (例: "0.087**", "< 0.001***")。星は上付きで右肩に表示する
const SIGNIF_STARS_RE = /^((?:< ?)?-?\d+(\.\d+)?(e[+-]?\d+)?)(\*{1,3})$/i;

function renderCellContent(s: string): ReactNode {
  const { text, bold } = parseBold(s);
  const starred = text.trim().match(SIGNIF_STARS_RE);
  const content = starred ? (
    <>
      {starred[1]}
      <sup>{starred[4]}</sup>
    </>
  ) : (
    text
  );
  if (bold) {
    return (
      <Text as="span" fontWeight="bold">
        {content}
      </Text>
    );
  }
  return content;
}

/** 見出しセルとデータセルで共通の寸法・体裁。1 マスの形を黄金比に保つ */
const CELL_BASE = {
  fontSize: 'sm',
  whiteSpace: 'nowrap',
  minW: TABLE.cellMinW,
  h: TABLE.rowHeight,
  verticalAlign: 'middle',
} as const;

export function SectionsView({ result }: { result: AnalysisResult }) {
  if (result.sections.length === 0) {
    return (
      <Text fontSize="sm" color="fg.muted">
        結果が空です
      </Text>
    );
  }
  return (
    <VStack align="stretch" gap={4}>
      {result.sections.map((section, idx) => {
        const colCount = section.table.headers.length;
        const numericCols = detectNumericColumns(section.table.rows, colCount);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: section order is stable per result
          <VStack key={`s-${idx}`} align="stretch" gap={2}>
            <Heading size="sm">{section.title}</Heading>
            <Box
              borderWidth="1px"
              borderColor="border"
              borderRadius="md"
              overflow="auto"
              width="100%"
              maxWidth={TABLE.maxWidth}
            >
              <Table.Root size="sm" variant="line" width="100%">
                <Table.Header>
                  <Table.Row bg="bg.subtle">
                    {section.table.headers.map((h, j) => (
                      // 1 列目は変数名。横スクロールしても消えないよう左に固定する
                      <Table.ColumnHeader
                        key={h}
                        {...CELL_BASE}
                        fontWeight="bold"
                        textAlign="center"
                        fontFamily={numericCols[j] ? 'mono' : undefined}
                        position={j === 0 ? 'sticky' : undefined}
                        left={j === 0 ? 0 : undefined}
                        bg={j === 0 ? 'bg.subtle' : undefined}
                        zIndex={j === 0 ? 1 : undefined}
                      >
                        {h}
                      </Table.ColumnHeader>
                    ))}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {section.table.rows.map((row, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: result rows are immutable
                    <Table.Row key={`r-${idx}-${i}`}>
                      {row.map((cell, j) => (
                        <Table.Cell
                          // biome-ignore lint/suspicious/noArrayIndexKey: column index stable
                          key={`c-${idx}-${i}-${j}`}
                          {...CELL_BASE}
                          textAlign="right"
                          fontFamily={numericCols[j] ? 'mono' : undefined}
                          position={j === 0 ? 'sticky' : undefined}
                          left={j === 0 ? 0 : undefined}
                          bg={j === 0 ? 'bg.panel' : undefined}
                        >
                          {renderCellContent(cell)}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
            {section.table.note && (
              <Text fontSize="xs" color="fg.muted">
                {section.table.note}
              </Text>
            )}
          </VStack>
        );
      })}
    </VStack>
  );
}
