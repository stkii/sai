'use client';

import {
  Center,
  createListCollection,
  Flex,
  HStack,
  IconButton,
  Listbox,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { LuChevronRight, LuX } from 'react-icons/lu';

export type InteractionTerm = string[];

interface Item {
  label: string;
  value: string;
}

interface Props {
  independentVariables: string[];
  terms: InteractionTerm[];
  onChange: (terms: InteractionTerm[]) => void;
}

const termKey = (term: InteractionTerm): string => [...term].sort().join('\0');

export const InteractionBuilder = ({ independentVariables, terms, onChange }: Props) => {
  const [selected, setSelected] = useState<Item[]>([]);

  const collection = useMemo(
    () =>
      createListCollection<Item>({
        items: independentVariables.map((v) => ({ label: v, value: v })),
      }),
    [independentVariables]
  );

  useEffect(() => {
    const valid = new Set(independentVariables);
    setSelected((prev) => prev.filter((item) => valid.has(item.value)));
  }, [independentVariables]);

  const canAdd = selected.length >= 2;

  const handleAdd = () => {
    if (!canAdd) return;
    const newTerm = selected.map((item) => item.value);
    if (terms.some((t) => termKey(t) === termKey(newTerm))) return;
    onChange([...terms, newTerm]);
    setSelected([]);
  };

  const handleRemove = (index: number) => {
    onChange(terms.filter((_, i) => i !== index));
  };

  return (
    <Flex gap="2" align="stretch">
      <Listbox.Root
        collection={collection}
        selectionMode="multiple"
        value={selected.map((i) => i.value)}
        onValueChange={(e) => setSelected(e.items)}
        flex="1"
        minW={0}
      >
        <Listbox.Content minH="28">
          {collection.items.map((item) => {
            const v = collection.getItemValue(item);
            return (
              <Listbox.Item item={item} key={v} flex="0">
                <Listbox.ItemText>{collection.stringifyItem(item)}</Listbox.ItemText>
                <Listbox.ItemIndicator />
              </Listbox.Item>
            );
          })}
        </Listbox.Content>
      </Listbox.Root>

      <VStack justify="center" px="1">
        <IconButton
          size="xs"
          variant="subtle"
          disabled={!canAdd}
          onClick={handleAdd}
          aria-label="交互作用を追加"
        >
          <LuChevronRight />
        </IconButton>
      </VStack>

      <Stack
        gap="1"
        flex="1"
        minW={0}
        borderWidth="1px"
        borderColor="border"
        rounded="md"
        p="2"
        minH="28"
      >
        {terms.length > 0 ? (
          terms.map((term, index) => (
            <HStack key={termKey(term)} justify="space-between" gap="2">
              <Text fontSize="sm" truncate>
                {term.join(' × ')}
              </Text>
              <IconButton
                size="2xs"
                variant="ghost"
                onClick={() => handleRemove(index)}
                aria-label={`${term.join(' × ')} を削除`}
              >
                <LuX />
              </IconButton>
            </HStack>
          ))
        ) : (
          <Center boxSize="full" p="2" color="fg.muted" textStyle="sm">
            交互作用項なし
          </Center>
        )}
      </Stack>
    </Flex>
  );
};
