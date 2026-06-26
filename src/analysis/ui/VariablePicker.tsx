import {
  Box,
  Center,
  createListCollection,
  Flex,
  IconButton,
  Listbox,
  VStack,
} from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { PICKER_HEIGHT } from '../../shared/ui/golden';

interface Item {
  label: string;
  value: string;
}

interface Props {
  headers: string[];
  selected: string[];
  exclude?: string[];
  onChange: (next: string[]) => void;
  minHeight?: string;
  maxHeight?: string;
}

export function VariablePicker({
  headers,
  selected,
  exclude,
  onChange,
  minHeight = PICKER_HEIGHT.min,
  maxHeight = PICKER_HEIGHT.max,
}: Props) {
  const excludeSet = useMemo(() => new Set(exclude ?? []), [exclude]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const sourceItems = useMemo<Item[]>(
    () =>
      headers
        .filter((h) => !excludeSet.has(h) && !selectedSet.has(h))
        .map((h) => ({ label: h, value: h })),
    [headers, excludeSet, selectedSet]
  );

  const targetItems = useMemo<Item[]>(
    () => selected.filter((h) => !excludeSet.has(h)).map((h) => ({ label: h, value: h })),
    [selected, excludeSet]
  );

  const sourceCollection = useMemo(
    () => createListCollection({ items: sourceItems }),
    [sourceItems]
  );
  const targetCollection = useMemo(
    () => createListCollection({ items: targetItems }),
    [targetItems]
  );

  const [highlightedSource, setHighlightedSource] = useState<string[]>([]);
  const [highlightedTarget, setHighlightedTarget] = useState<string[]>([]);

  function moveToTarget() {
    if (highlightedSource.length === 0) return;
    const additions = highlightedSource.filter((v) => !selectedSet.has(v));
    setHighlightedSource([]);
    if (additions.length === 0) return;
    onChange([...selected, ...additions]);
  }

  function moveToSource() {
    if (highlightedTarget.length === 0) return;
    const removed = new Set(highlightedTarget);
    setHighlightedTarget([]);
    onChange(selected.filter((v) => !removed.has(v)));
  }

  return (
    <Flex gap={2} align="stretch">
      <Box flex={1} minW={0}>
        <Listbox.Root
          collection={sourceCollection}
          selectionMode="multiple"
          value={highlightedSource}
          onValueChange={(e) => setHighlightedSource(e.value)}
        >
          <Listbox.Content minH={minHeight} maxH={maxHeight} overflow="auto">
            {sourceCollection.items.length > 0 ? (
              sourceCollection.items.map((item) => (
                <Listbox.Item item={item} key={item.value} flex="0">
                  <Listbox.ItemText fontSize="sm">{item.label}</Listbox.ItemText>
                  <Listbox.ItemIndicator />
                </Listbox.Item>
              ))
            ) : (
              <Center boxSize="full" p={4} color="fg.muted" fontSize="sm">
                変数なし
              </Center>
            )}
          </Listbox.Content>
        </Listbox.Root>
      </Box>
      <VStack justify="center" gap={2} py={4}>
        <IconButton
          size="xs"
          variant="subtle"
          aria-label="選択へ移動"
          disabled={highlightedSource.length === 0}
          onClick={moveToTarget}
        >
          <LuChevronRight />
        </IconButton>
        <IconButton
          size="xs"
          variant="subtle"
          aria-label="候補へ戻す"
          disabled={highlightedTarget.length === 0}
          onClick={moveToSource}
        >
          <LuChevronLeft />
        </IconButton>
      </VStack>
      <Box flex={1} minW={0}>
        <Listbox.Root
          collection={targetCollection}
          selectionMode="multiple"
          value={highlightedTarget}
          onValueChange={(e) => setHighlightedTarget(e.value)}
        >
          <Listbox.Content minH={minHeight} maxH={maxHeight} overflow="auto">
            {targetCollection.items.length > 0 ? (
              targetCollection.items.map((item) => (
                <Listbox.Item item={item} key={item.value} flex="0">
                  <Listbox.ItemText fontSize="sm">{item.label}</Listbox.ItemText>
                  <Listbox.ItemIndicator />
                </Listbox.Item>
              ))
            ) : (
              <Center boxSize="full" p={4} color="fg.muted" fontSize="sm">
                未選択
              </Center>
            )}
          </Listbox.Content>
        </Listbox.Root>
      </Box>
    </Flex>
  );
}
