import { Box, Button, Center, HStack, IconButton, Stack, Text, VStack } from '@chakra-ui/react';
import { confirm } from '@tauri-apps/plugin-dialog';
import { LuX } from 'react-icons/lu';
import { findMethod } from '../../analysis/methods';
import { formatTimestampShort } from '../../shared/format';
import { type ResultEntry, useResult } from '../state/ResultContext';

function HistoryItem({
  entry,
  selected,
  onSelect,
  onRemove,
}: {
  entry: ResultEntry;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const mod = findMethod(entry.method);
  const label = mod?.definition.label ?? entry.method;
  return (
    <Box
      // 削除ボタンの表示は CSS の group hover に任せる
      className="group"
      colorPalette="blue"
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      borderWidth="1px"
      borderRadius="md"
      borderColor={selected ? 'colorPalette.emphasized' : 'border'}
      bg={selected ? 'colorPalette.subtle' : 'bg.panel'}
      px={3}
      py={2}
      cursor="pointer"
      position="relative"
      _hover={{ bg: selected ? 'colorPalette.subtle' : 'bg.subtle' }}
    >
      <HStack justify="space-between" align="baseline">
        <Text fontSize="sm" fontWeight="bold">
          {label}
        </Text>
        <HStack gap={1} align="center">
          <Text fontSize="xs" color="fg.muted">
            {formatTimestampShort(entry.createdAt)}
          </Text>
          <IconButton
            aria-label={`${label}の履歴を削除`}
            size="2xs"
            variant="ghost"
            color="fg.muted"
            opacity={0}
            _groupHover={{ opacity: 1 }}
            _focusVisible={{ opacity: 1 }}
            _hover={{ color: 'fg.error', bg: 'bg.error' }}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <LuX />
          </IconButton>
        </HStack>
      </HStack>
      {entry.variables.length > 0 && (
        <Text fontSize="xs" color="fg.muted" mt={1}>
          {entry.variables.join(', ')}
        </Text>
      )}
    </Box>
  );
}

export function HistoryPane() {
  const { results, currentId, selectResult, clearResults, removeResult } = useResult();

  async function handleClearAll() {
    const ok = await confirm('すべての分析履歴を削除します。この操作は元に戻せません。', {
      title: '履歴の全削除',
      kind: 'warning',
    });
    if (ok) clearResults();
  }

  if (results.length === 0) {
    return (
      <Center height="100%" px={4} py={3}>
        <Text fontSize="sm" color="fg.subtle">
          過去の分析履歴はここに表示されます
        </Text>
      </Center>
    );
  }

  const reversed = [...results].reverse();

  return (
    <VStack align="stretch" gap={2} px={3} py={2} height="100%">
      <HStack justify="space-between">
        <Text fontSize="xs" color="fg.muted">
          {results.length} 件
        </Text>
        <Button size="xs" variant="ghost" onClick={handleClearAll}>
          全削除
        </Button>
      </HStack>
      <Stack gap={2} overflow="auto" flex={1}>
        {reversed.map((entry) => (
          <HistoryItem
            key={entry.id}
            entry={entry}
            selected={entry.id === currentId}
            onSelect={() => selectResult(entry.id)}
            onRemove={() => removeResult(entry.id)}
          />
        ))}
      </Stack>
    </VStack>
  );
}
