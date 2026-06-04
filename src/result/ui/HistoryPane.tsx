import { Box, Button, Center, HStack, IconButton, Stack, Text, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { findMethod } from '../../analysis/methods';
import { type ResultEntry, useResult } from '../state/ResultContext';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

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
  const [hovered, setHovered] = useState(false);
  const mod = findMethod(entry.method);
  const label = mod?.definition.label ?? entry.method;
  return (
    <Box
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      borderWidth="1px"
      borderRadius="md"
      borderColor={selected ? 'blue.400' : 'gray.200'}
      bg={selected ? 'blue.50' : 'white'}
      px={3}
      py={2}
      cursor="pointer"
      position="relative"
      _hover={{ bg: selected ? 'blue.50' : 'gray.50' }}
    >
      <HStack justify="space-between" align="baseline">
        <Text fontSize="sm" fontWeight="bold">
          {label}
        </Text>
        <HStack gap={1} align="center">
          <Text fontSize="xs" color="gray.500">
            {formatTime(entry.createdAt)}
          </Text>
          <IconButton
            aria-label="この履歴を削除"
            size="2xs"
            variant="ghost"
            color="gray.500"
            visibility={hovered ? 'visible' : 'hidden'}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            _hover={{ color: 'red.500', bg: 'red.50' }}
          >
            ×
          </IconButton>
        </HStack>
      </HStack>
      {entry.variables.length > 0 && (
        <Text fontSize="xs" color="gray.600" mt={1}>
          {entry.variables.join(', ')}
        </Text>
      )}
    </Box>
  );
}

export function HistoryPane() {
  const { results, currentId, selectResult, clearResults, removeResult } = useResult();

  if (results.length === 0) {
    return (
      <Box height="100%" px={4} py={3}>
        <Center height="100%">
          <Text fontSize="sm" color="gray.400">
            過去の分析履歴はここに表示されます
          </Text>
        </Center>
      </Box>
    );
  }

  const reversed = [...results].reverse();

  return (
    <VStack align="stretch" gap={2} px={3} py={2} height="100%">
      <HStack justify="space-between">
        <Text fontSize="xs" color="gray.600">
          {results.length} 件
        </Text>
        <Button size="xs" variant="ghost" onClick={clearResults}>
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
