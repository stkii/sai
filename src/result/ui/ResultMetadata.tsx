import { Box, Heading, HStack, Text, VStack } from '@chakra-ui/react';
import { findMethod } from '../../analysis/methods';
import { formatTimestamp } from '../../shared/format';
import type { AnalysisOptions } from '../../shared/types';
import type { ResultEntry } from '../state/ResultContext';

function isEmptyValue(v: unknown): boolean {
  return v === null || v === undefined || v === '' || v === false;
}

function formatValue(v: unknown): string | null {
  if (isEmptyValue(v)) return null;
  if (v === true) return 'true';
  if (typeof v === 'number' || typeof v === 'string') return String(v);
  if (Array.isArray(v)) {
    const items = v.filter((x) => !isEmptyValue(x)).map((x) => String(x));
    return items.length > 0 ? items.join(', ') : null;
  }
  if (typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>)
      .filter(([, vv]) => !isEmptyValue(vv))
      .map(([k, vv]) => (vv === true ? k : `${k}=${formatValue(vv)}`));
    return entries.length > 0 ? entries.join(', ') : null;
  }
  return null;
}

function formatOptions(options: AnalysisOptions): string | null {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(options)) {
    const formatted = formatValue(v);
    if (formatted !== null) parts.push(`${k}: ${formatted}`);
  }
  return parts.length > 0 ? parts.join(' / ') : null;
}

export function ResultMetadata({ entry }: { entry: ResultEntry }) {
  const mod = findMethod(entry.method);
  const label = mod?.definition.label ?? entry.method;
  const optionsText = mod?.formatOptions
    ? mod.formatOptions(entry.options)
    : formatOptions(entry.options);
  return (
    <Box borderWidth="1px" borderRadius="md" borderColor="border" p={3} bg="bg.subtle">
      <HStack gap={4} wrap="wrap" align="baseline">
        <Heading as="h2" size="sm" fontWeight="bold">
          {label}
        </Heading>
        <Text fontSize="xs" color="fg.muted">
          {formatTimestamp(entry.createdAt)}
        </Text>
      </HStack>
      <VStack align="stretch" gap={1} mt={1}>
        {entry.variables.length > 0 && (
          <Text fontSize="xs" color="fg.muted">
            変数: {entry.variables.join(', ')}
          </Text>
        )}
        {optionsText && (
          <Text fontSize="xs" color="fg.muted">
            設定: {optionsText}
          </Text>
        )}
        {entry.result.n !== undefined && (
          <Text fontSize="xs" color="fg.muted">
            有効サンプルサイズ: n = {entry.result.n}
          </Text>
        )}
        {/* n がユーザーの期待とずれる場合の注記。誤読を防ぐため色を変える */}
        {entry.result.nNote && (
          <Text fontSize="xs" color="fg.warning">
            {entry.result.nNote}
          </Text>
        )}
      </VStack>
    </Box>
  );
}
