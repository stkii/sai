'use client';

import {
  Center,
  type CollectionOptions,
  createListCollection,
  Flex,
  IconButton,
  Listbox,
  VStack,
} from '@chakra-ui/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

interface Contents {
  label: string;
  value: string;
}

interface Props {
  variables: string[];
  onChange?: (selected: string[]) => void;
}

interface ListboxRenderProps<T> extends Listbox.RootProps<T> {
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export const VariableSelector = ({ variables, onChange }: Props) => {
  const items = useMemo(
    () => variables.map((variable) => ({ label: variable, value: variable })),
    [variables]
  );
  const state = useTransferListState<Contents>(items);

  useEffect(() => {
    onChange?.(state.target.items.map((item) => item.value));
  }, [onChange, state.target]);

  return (
    <Flex gap="4" maxW="600px" align="stretch">
      <ListboxRender
        contentRef={state.sourceContentRef}
        collection={state.source}
        value={state.selectedSource.map((item) => item.value)}
        onValueChange={(e) => state.setSelectedSource(e.items)}
      />
      <VStack justify="center" gap="2" py="8">
        <IconButton
          size="xs"
          variant="subtle"
          disabled={state.selectedSource.length === 0}
          onClick={() => {
            state.moveToTarget(state.selectedSource);
          }}
        >
          <LuChevronRight />
        </IconButton>
        <IconButton
          size="xs"
          variant="subtle"
          disabled={state.selectedTarget.length === 0}
          onClick={() => {
            state.moveToSource(state.selectedTarget);
          }}
        >
          <LuChevronLeft />
        </IconButton>
      </VStack>
      <ListboxRender
        contentRef={state.targetContentRef}
        collection={state.target}
        value={state.selectedTarget.map((item) => item.value)}
        onValueChange={(e) => state.setSelectedTarget(e.items)}
      />
    </Flex>
  );
};

function ListboxRender<T>(props: ListboxRenderProps<T>) {
  const { collection, contentRef, ...rest } = props;
  return (
    <Listbox.Root {...rest} collection={collection} selectionMode="multiple">
      <Listbox.Content minH="96" ref={contentRef}>
        {collection.items.length > 0 ? (
          collection.items.map((item) => {
            const itemValue = collection.getItemValue(item);
            const itemLabel = collection.stringifyItem(item);
            return (
              <Listbox.Item item={item} key={itemValue} flex="0">
                <Listbox.ItemText>{itemLabel}</Listbox.ItemText>
                <Listbox.ItemIndicator />
              </Listbox.Item>
            );
          })
        ) : (
          <Center boxSize="full" p="4" color="fg.muted" textStyle="sm">
            変数が選択されていません
          </Center>
        )}
      </Listbox.Content>
    </Listbox.Root>
  );
}

function useTransferListState<T>(items: T[], options?: Omit<CollectionOptions<T>, 'items'>) {
  const sourceContentRef = useRef<HTMLDivElement | null>(null);
  const targetContentRef = useRef<HTMLDivElement | null>(null);
  const emptyItems = useMemo(() => [] as T[], []);
  const buildCollection = useCallback(
    (nextItems: T[]) => createListCollection<T>({ ...(options ?? {}), items: nextItems }),
    [options]
  );

  const [source, setSource] = useState(() => buildCollection(items));
  const [target, setTarget] = useState(() => buildCollection(emptyItems));
  const [selectedSource, setSelectedSource] = useState<T[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<T[]>([]);

  useEffect(() => {
    setSource(buildCollection(items));
    setTarget(buildCollection(emptyItems));
    setSelectedSource([]);
    setSelectedTarget([]);
  }, [buildCollection, emptyItems, items]);

  const scrollToItem = (container: HTMLDivElement | null, item: T) => {
    if (!container) return;
    requestAnimationFrame(() => {
      const itemValue = target.getItemValue(item);
      const itemElement = container.querySelector(`[data-value="${itemValue}"]`);
      itemElement?.scrollIntoView({ block: 'nearest' });
    });
  };

  const moveToTarget = (items: T[]) => {
    setSource((prev) => prev.remove(...items));
    setTarget((prev) => prev.append(...items));
    setSelectedSource([]);
    scrollToItem(targetContentRef.current, items[items.length - 1]);
  };

  const moveToSource = (items: T[]) => {
    setSource((prev) => prev.append(...items));
    setTarget((prev) => prev.remove(...items));
    setSelectedTarget([]);
    scrollToItem(sourceContentRef.current, items[items.length - 1]);
  };

  return {
    source,
    target,
    selectedSource,
    selectedTarget,
    setSelectedSource,
    setSelectedTarget,
    moveToTarget,
    moveToSource,
    sourceContentRef,
    targetContentRef,
  };
}
