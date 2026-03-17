'use client';

import {
  Center,
  createListCollection,
  Flex,
  IconButton,
  Listbox,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

interface Contents {
  label: string;
  value: string;
}

export interface AnovaVariableSelection {
  dependent: string | null;
  factors: string[];
  covariates: string[];
}

interface Props {
  variables: string[];
  onChange?: (selection: AnovaVariableSelection) => void;
}

export const AnovaVariableSelector = ({ variables, onChange }: Props) => {
  const items = useMemo(() => variables.map((v) => ({ label: v, value: v })), [variables]);
  const state = useAnovaTransferState(items);

  useEffect(() => {
    onChange?.({
      dependent: state.dependent.items.length > 0 ? state.dependent.items[0].value : null,
      factors: state.factors.items.map((item) => item.value),
      covariates: state.covariates.items.map((item) => item.value),
    });
  }, [onChange, state.dependent, state.factors, state.covariates]);

  return (
    <Flex gap="0" maxW="700px" align="stretch">
      <Listbox.Root
        collection={state.source}
        selectionMode="multiple"
        value={state.selectedSource.map((i) => i.value)}
        onValueChange={(e) => state.setSelectedSource(e.items)}
        flex="1"
        minW={0}
      >
        <Listbox.Content minH="72" h="full" ref={state.sourceContentRef}>
          {state.source.items.map((item) => {
            const v = state.source.getItemValue(item);
            return (
              <Listbox.Item item={item} key={v} flex="0">
                <Listbox.ItemText>{state.source.stringifyItem(item)}</Listbox.ItemText>
                <Listbox.ItemIndicator />
              </Listbox.Item>
            );
          })}
        </Listbox.Content>
      </Listbox.Root>

      <VStack gap="4" flex="1" minW={0}>
        <Flex align="stretch" w="full">
          <TransferButtons
            onForward={() => state.moveToDependent(state.selectedSource)}
            onBackward={() => state.moveFromDependent(state.selectedDependent)}
            forwardDisabled={state.selectedSource.length === 0}
            backwardDisabled={state.selectedDependent.length === 0}
          />
          <TargetPanel
            label="従属変数"
            contentRef={state.dependentContentRef}
            collection={state.dependent}
            value={state.selectedDependent.map((i) => i.value)}
            onValueChange={(e) => state.setSelectedDependent(e.items)}
            minH="12"
          />
        </Flex>

        <Flex align="stretch" w="full" flex="1">
          <TransferButtons
            onForward={() => state.moveToFactors(state.selectedSource)}
            onBackward={() => state.moveFromFactors(state.selectedFactors)}
            forwardDisabled={state.selectedSource.length === 0}
            backwardDisabled={state.selectedFactors.length === 0}
          />
          <TargetPanel
            label="主効果"
            contentRef={state.factorsContentRef}
            collection={state.factors}
            value={state.selectedFactors.map((i) => i.value)}
            onValueChange={(e) => state.setSelectedFactors(e.items)}
            minH="36"
            emptyText="変数が選択されていません"
          />
        </Flex>

        <Flex align="stretch" w="full" flex="1">
          <TransferButtons
            onForward={() => state.moveToCovariates(state.selectedSource)}
            onBackward={() => state.moveFromCovariates(state.selectedCovariates)}
            forwardDisabled={state.selectedSource.length === 0}
            backwardDisabled={state.selectedCovariates.length === 0}
          />
          <TargetPanel
            label="共変量"
            contentRef={state.covariatesContentRef}
            collection={state.covariates}
            value={state.selectedCovariates.map((i) => i.value)}
            onValueChange={(e) => state.setSelectedCovariates(e.items)}
            minH="24"
            emptyText="変数が選択されていません"
          />
        </Flex>
      </VStack>
    </Flex>
  );
};

interface TransferButtonsProps {
  onForward: () => void;
  onBackward: () => void;
  forwardDisabled: boolean;
  backwardDisabled: boolean;
}

function TransferButtons({
  onForward,
  onBackward,
  forwardDisabled,
  backwardDisabled,
}: TransferButtonsProps) {
  return (
    <VStack justify="center" gap="2" px="2">
      <IconButton size="xs" variant="subtle" disabled={forwardDisabled} onClick={onForward}>
        <LuChevronRight />
      </IconButton>
      <IconButton size="xs" variant="subtle" disabled={backwardDisabled} onClick={onBackward}>
        <LuChevronLeft />
      </IconButton>
    </VStack>
  );
}

interface TargetPanelProps
  extends Pick<Listbox.RootProps<Contents>, 'collection' | 'value' | 'onValueChange'> {
  label: string;
  contentRef: React.RefObject<HTMLDivElement | null>;
  minH: string;
  emptyText?: string;
}

function TargetPanel({
  label,
  contentRef,
  collection,
  value,
  onValueChange,
  minH,
  emptyText,
}: TargetPanelProps) {
  return (
    <VStack gap="1" flex="1" align="stretch" minW={0}>
      <Text fontSize="xs" fontWeight="semibold" color="fg.muted" pl="1">
        {label}
      </Text>
      <Listbox.Root
        collection={collection}
        selectionMode="multiple"
        value={value}
        onValueChange={onValueChange}
      >
        <Listbox.Content minH={minH} h="full" ref={contentRef}>
          {collection.items.length > 0
            ? collection.items.map((item) => {
                const v = collection.getItemValue(item);
                return (
                  <Listbox.Item item={item} key={v} flex="0">
                    <Listbox.ItemText>{collection.stringifyItem(item)}</Listbox.ItemText>
                    <Listbox.ItemIndicator />
                  </Listbox.Item>
                );
              })
            : emptyText && (
                <Center boxSize="full" p="4" color="fg.muted" textStyle="sm">
                  {emptyText}
                </Center>
              )}
        </Listbox.Content>
      </Listbox.Root>
    </VStack>
  );
}

function useAnovaTransferState(items: Contents[]) {
  const sourceContentRef = useRef<HTMLDivElement | null>(null);
  const dependentContentRef = useRef<HTMLDivElement | null>(null);
  const factorsContentRef = useRef<HTMLDivElement | null>(null);
  const covariatesContentRef = useRef<HTMLDivElement | null>(null);

  const emptyItems = useMemo(() => [] as Contents[], []);
  const build = useCallback(
    (nextItems: Contents[]) => createListCollection<Contents>({ items: nextItems }),
    []
  );

  const [source, setSource] = useState(() => build(items));
  const [dependent, setDependent] = useState(() => build(emptyItems));
  const [factors, setFactors] = useState(() => build(emptyItems));
  const [covariates, setCovariates] = useState(() => build(emptyItems));

  const [selectedSource, setSelectedSource] = useState<Contents[]>([]);
  const [selectedDependent, setSelectedDependent] = useState<Contents[]>([]);
  const [selectedFactors, setSelectedFactors] = useState<Contents[]>([]);
  const [selectedCovariates, setSelectedCovariates] = useState<Contents[]>([]);

  useEffect(() => {
    setSource(build(items));
    setDependent(build(emptyItems));
    setFactors(build(emptyItems));
    setCovariates(build(emptyItems));
    setSelectedSource([]);
    setSelectedDependent([]);
    setSelectedFactors([]);
    setSelectedCovariates([]);
  }, [build, emptyItems, items]);

  const scrollToItem = (container: HTMLDivElement | null, item: Contents) => {
    if (!container) return;
    requestAnimationFrame(() => {
      const el = container.querySelector(`[data-value="${item.value}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    });
  };

  const moveToDependent = (selected: Contents[]) => {
    const item = selected[0];
    if (!item) return;
    const displaced = [...dependent.items];
    setSource((prev) => {
      let next = prev.remove(item);
      for (const old of displaced) {
        next = next.append(old);
      }
      return next;
    });
    setDependent(build([item]));
    setSelectedSource([]);
    setSelectedDependent([]);
  };

  const moveFromDependent = (selected: Contents[]) => {
    setDependent((prev) => prev.remove(...selected));
    setSource((prev) => prev.append(...selected));
    setSelectedDependent([]);
    scrollToItem(sourceContentRef.current, selected[selected.length - 1]);
  };

  const moveToFactors = (selected: Contents[]) => {
    setSource((prev) => prev.remove(...selected));
    setFactors((prev) => prev.append(...selected));
    setSelectedSource([]);
    scrollToItem(factorsContentRef.current, selected[selected.length - 1]);
  };

  const moveFromFactors = (selected: Contents[]) => {
    setFactors((prev) => prev.remove(...selected));
    setSource((prev) => prev.append(...selected));
    setSelectedFactors([]);
    scrollToItem(sourceContentRef.current, selected[selected.length - 1]);
  };

  const moveToCovariates = (selected: Contents[]) => {
    setSource((prev) => prev.remove(...selected));
    setCovariates((prev) => prev.append(...selected));
    setSelectedSource([]);
    scrollToItem(covariatesContentRef.current, selected[selected.length - 1]);
  };

  const moveFromCovariates = (selected: Contents[]) => {
    setCovariates((prev) => prev.remove(...selected));
    setSource((prev) => prev.append(...selected));
    setSelectedCovariates([]);
    scrollToItem(sourceContentRef.current, selected[selected.length - 1]);
  };

  return {
    source,
    dependent,
    factors,
    covariates,
    selectedSource,
    selectedDependent,
    selectedFactors,
    selectedCovariates,
    setSelectedSource,
    setSelectedDependent,
    setSelectedFactors,
    setSelectedCovariates,
    moveToDependent,
    moveFromDependent,
    moveToFactors,
    moveFromFactors,
    moveToCovariates,
    moveFromCovariates,
    sourceContentRef,
    dependentContentRef,
    factorsContentRef,
    covariatesContentRef,
  };
}
