import { Box, Heading, Table, Text, VStack } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import type { AnalysisResult } from '../types';

const NUMBER_RE = /^-?\d+(\.\d+)?(e[+-]?\d+)?\*{0,2}$/i;
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

function renderCellContent(s: string): ReactNode {
  const { text, bold } = parseBold(s);
  if (bold) {
    return (
      <Text as="span" fontWeight="bold">
        {text}
      </Text>
    );
  }
  return text;
}

export function SectionsView({ result }: { result: AnalysisResult }) {
  if (result.sections.length === 0) {
    return (
      <Text fontSize="sm" color="gray.500">
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
            <Box borderWidth="1px" borderRadius="md" overflow="auto" maxWidth="100%">
              <Table.Root size="sm" variant="line">
                <Table.Header>
                  <Table.Row bg="gray.50">
                    {section.table.headers.map((h, j) => (
                      <Table.ColumnHeader
                        key={h}
                        fontSize="xs"
                        whiteSpace="nowrap"
                        fontWeight="bold"
                        minW="60px"
                        h="37px"
                        textAlign="center"
                        verticalAlign="middle"
                        fontFamily={numericCols[j] ? 'mono' : undefined}
                        position={j === 0 ? 'sticky' : undefined}
                        left={j === 0 ? 0 : undefined}
                        bg={j === 0 ? 'gray.50' : undefined}
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
                          fontSize="xs"
                          whiteSpace="nowrap"
                          minW="60px"
                          h="37px"
                          textAlign="right"
                          verticalAlign="middle"
                          fontFamily={numericCols[j] ? 'mono' : undefined}
                          position={j === 0 ? 'sticky' : undefined}
                          left={j === 0 ? 0 : undefined}
                          bg={j === 0 ? 'white' : undefined}
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
              <Text fontSize="xs" color="gray.600">
                {section.table.note}
              </Text>
            )}
          </VStack>
        );
      })}
      {result.n !== undefined && (
        <Text fontSize="xs" color="gray.600">
          有効サンプルサイズ: n = {result.n}
        </Text>
      )}
      {result.nNote && (
        <Text fontSize="xs" color="orange.600">
          {result.nNote}
        </Text>
      )}
    </VStack>
  );
}
