'use client';

import {
  Box,
  Center,
  type CollectionOptions,
  createListCollection,
  Flex,
  IconButton,
  Listbox,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

interface Item {
  label: string;
  value: string;
}

export interface RegressionVariableSelection {
  dependent: string;
  independent: string[];
}

interface RegressionVariableSelectorProps {
  variables: string[];
  onChange?: (selection: RegressionVariableSelection) => void;
}

interface ListboxRenderProps<T> extends Listbox.RootProps<T> {
  contentRef: React.RefObject<HTMLDivElement | null>;
  minH?: string;
  emptyMessage?: string;
}

function ListboxRender<T>(props: ListboxRenderProps<T>) {
  const { collection, contentRef, minH = '96', emptyMessage = '変数が選択されていません', ...rest } = props;
  return (
    <Listbox.Root {...rest} collection={collection}>
      <Listbox.Content minH={minH} ref={contentRef}>
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
            {emptyMessage}
          </Center>
        )}
      </Listbox.Content>
    </Listbox.Root>
  );
}

const RegressionVariableSelector = ({ variables, onChange }: RegressionVariableSelectorProps) => {
  const items = useMemo(
    () => variables.map((variable) => ({ label: variable, value: variable })),
    [variables]
  );
  const state = useRegressionTransferState<Item>(items);

  useEffect(() => {
    const dependentItem = state.dependent.items[0];
    onChange?.({
      dependent: dependentItem ? (state.dependent.getItemValue(dependentItem) ?? '') : '',
      independent: state.independent.items
        .map((item) => state.independent.getItemValue(item))
        .filter((v): v is string => v !== null),
    });
  }, [onChange, state.dependent, state.independent]);

  const hasDependent = state.dependent.items.length > 0;

  return (
    <Flex gap="4" maxW="700px" align="stretch">
      {/* Source list */}
      <Box flex="1">
        <Text fontWeight="medium" mb="2">
          利用可能な変数
        </Text>
        <ListboxRender
          contentRef={state.sourceContentRef}
          collection={state.source}
          selectionMode="multiple"
          value={state.selectedSource.map((item) => item.value)}
          onValueChange={(e) => state.setSelectedSource(e.items)}
        />
      </Box>

      {/* Transfer buttons and target lists */}
      <Flex gap="4" flex="1" direction="column">
        {/* Dependent variable section */}
        <Box>
          <Text fontWeight="medium" mb="2">
            従属変数
          </Text>
          <Flex gap="2" align="center">
            <VStack justify="center" gap="2">
              {hasDependent ? (
                <IconButton size="xs" variant="subtle" onClick={() => state.moveDependentToSource()}>
                  <LuChevronLeft />
                </IconButton>
              ) : (
                <IconButton
                  size="xs"
                  variant="subtle"
                  disabled={state.selectedSource.length === 0}
                  onClick={() => {
                    if (state.selectedSource.length > 0) {
                      state.moveToDependent(state.selectedSource[0]);
                    }
                  }}
                >
                  <LuChevronRight />
                </IconButton>
              )}
            </VStack>
            <Box flex="1">
              <ListboxRender
                contentRef={state.dependentContentRef}
                collection={state.dependent}
                selectionMode="single"
                minH="12"
                emptyMessage=""
                value={state.selectedDependent ? [state.selectedDependent.value] : []}
                onValueChange={(e) => state.setSelectedDependent(e.items[0] ?? null)}
              />
            </Box>
          </Flex>
        </Box>

        {/* Independent variables section */}
        <Box flex="1">
          <Text fontWeight="medium" mb="2">
            独立変数
          </Text>
          <Flex gap="2" align="stretch" h="full">
            <VStack justify="center" gap="2">
              <IconButton
                size="xs"
                variant="subtle"
                disabled={state.selectedSource.length === 0}
                onClick={() => state.moveToIndependent(state.selectedSource)}
              >
                <LuChevronRight />
              </IconButton>
              <IconButton
                size="xs"
                variant="subtle"
                disabled={state.selectedIndependent.length === 0}
                onClick={() => state.moveIndependentToSource(state.selectedIndependent)}
              >
                <LuChevronLeft />
              </IconButton>
            </VStack>
            <Box flex="1">
              <ListboxRender
                contentRef={state.independentContentRef}
                collection={state.independent}
                selectionMode="multiple"
                minH="48"
                emptyMessage=""
                value={state.selectedIndependent.map((item) => item.value)}
                onValueChange={(e) => state.setSelectedIndependent(e.items)}
              />
            </Box>
          </Flex>
        </Box>
      </Flex>
    </Flex>
  );
};

function useRegressionTransferState<T extends Item>(
  items: T[],
  options?: Omit<CollectionOptions<T>, 'items'>
) {
  const sourceContentRef = useRef<HTMLDivElement | null>(null);
  const dependentContentRef = useRef<HTMLDivElement | null>(null);
  const independentContentRef = useRef<HTMLDivElement | null>(null);

  const emptyItems = useMemo(() => [] as T[], []);
  const buildCollection = useCallback(
    (nextItems: T[]) => createListCollection<T>({ ...(options ?? {}), items: nextItems }),
    [options]
  );

  const [source, setSource] = useState(() => buildCollection(items));
  const [dependent, setDependent] = useState(() => buildCollection(emptyItems));
  const [independent, setIndependent] = useState(() => buildCollection(emptyItems));

  const [selectedSource, setSelectedSource] = useState<T[]>([]);
  const [selectedDependent, setSelectedDependent] = useState<T | null>(null);
  const [selectedIndependent, setSelectedIndependent] = useState<T[]>([]);

  useEffect(() => {
    setSource(buildCollection(items));
    setDependent(buildCollection(emptyItems));
    setIndependent(buildCollection(emptyItems));
    setSelectedSource([]);
    setSelectedDependent(null);
    setSelectedIndependent([]);
  }, [buildCollection, emptyItems, items]);

  const scrollToItem = (
    container: HTMLDivElement | null,
    collection: ReturnType<typeof buildCollection>,
    item: T
  ) => {
    if (!container) return;
    requestAnimationFrame(() => {
      const itemValue = collection.getItemValue(item);
      const itemElement = container.querySelector(`[data-value="${itemValue}"]`);
      itemElement?.scrollIntoView({ block: 'nearest' });
    });
  };

  const moveToDependent = (item: T) => {
    if (dependent.items.length > 0) return;
    setSource((prev) => prev.remove(item));
    setDependent(buildCollection([item]));
    setSelectedSource([]);
    scrollToItem(dependentContentRef.current, dependent, item);
  };

  const moveDependentToSource = () => {
    const item = dependent.items[0];
    if (!item) return;
    setSource((prev) => prev.append(item));
    setDependent(buildCollection(emptyItems));
    setSelectedDependent(null);
    scrollToItem(sourceContentRef.current, source, item);
  };

  const moveToIndependent = (transferItems: T[]) => {
    if (transferItems.length === 0) return;
    setSource((prev) => prev.remove(...transferItems));
    setIndependent((prev) => prev.append(...transferItems));
    setSelectedSource([]);
    scrollToItem(independentContentRef.current, independent, transferItems[transferItems.length - 1]);
  };

  const moveIndependentToSource = (transferItems: T[]) => {
    if (transferItems.length === 0) return;
    setSource((prev) => prev.append(...transferItems));
    setIndependent((prev) => prev.remove(...transferItems));
    setSelectedIndependent([]);
    scrollToItem(sourceContentRef.current, source, transferItems[transferItems.length - 1]);
  };

  return {
    source,
    dependent,
    independent,
    selectedSource,
    selectedDependent,
    selectedIndependent,
    setSelectedSource,
    setSelectedDependent,
    setSelectedIndependent,
    moveToDependent,
    moveDependentToSource,
    moveToIndependent,
    moveIndependentToSource,
    sourceContentRef,
    dependentContentRef,
    independentContentRef,
  };
}

export default RegressionVariableSelector;
