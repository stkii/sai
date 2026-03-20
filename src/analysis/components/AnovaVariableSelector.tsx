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
  subject: string | null;
  betweenFactors: string[];
  withinFactorName: string;
  withinFactorLevels: string[];
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
      subject: state.subject.items.length > 0 ? state.subject.items[0].value : null,
      betweenFactors: state.betweenFactors.items.map((item) => item.value),
      withinFactorName: state.withinFactorName,
      withinFactorLevels: state.withinFactors.items.map((item) => item.value),
      covariates: state.covariates.items.map((item) => item.value),
    });
  }, [
    onChange,
    state.dependent,
    state.subject,
    state.betweenFactors,
    state.withinFactors,
    state.withinFactorName,
    state.covariates,
  ]);

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
            forwardDisabled={state.dependentDisabled || state.selectedSource.length === 0}
            backwardDisabled={state.dependentDisabled || state.selectedDependent.length === 0}
          />
          <TargetPanel
            label="従属変数"
            contentRef={state.dependentContentRef}
            collection={state.dependent}
            value={state.selectedDependent.map((i) => i.value)}
            onValueChange={(e) => state.setSelectedDependent(e.items)}
            minH="12"
            emptyText={state.dependentDisabled ? '被験者内水準で指定' : undefined}
          />
        </Flex>

        <Flex align="stretch" w="full">
          <TransferButtons
            onForward={() => state.moveToSubject(state.selectedSource)}
            onBackward={() => state.moveFromSubject(state.selectedSubject)}
            forwardDisabled={state.selectedSource.length === 0}
            backwardDisabled={state.selectedSubject.length === 0}
          />
          <TargetPanel
            label="被験者ID"
            contentRef={state.subjectContentRef}
            collection={state.subject}
            value={state.selectedSubject.map((i) => i.value)}
            onValueChange={(e) => state.setSelectedSubject(e.items)}
            minH="12"
          />
        </Flex>

        <Flex align="stretch" w="full" flex="1">
          <TransferButtons
            onForward={() => state.moveToBetweenFactors(state.selectedSource)}
            onBackward={() => state.moveFromBetweenFactors(state.selectedBetweenFactors)}
            forwardDisabled={state.selectedSource.length === 0}
            backwardDisabled={state.selectedBetweenFactors.length === 0}
          />
          <TargetPanel
            label="被験者間要因"
            contentRef={state.betweenFactorsContentRef}
            collection={state.betweenFactors}
            value={state.selectedBetweenFactors.map((i) => i.value)}
            onValueChange={(e) => state.setSelectedBetweenFactors(e.items)}
            minH="24"
            emptyText="変数が選択されていません"
          />
        </Flex>

        <Flex align="stretch" w="full" flex="1">
          <TransferButtons
            onForward={() => state.moveToWithinFactors(state.selectedSource)}
            onBackward={() => state.moveFromWithinFactors(state.selectedWithinFactors)}
            forwardDisabled={state.selectedSource.length === 0}
            backwardDisabled={state.selectedWithinFactors.length === 0}
          />
          <VStack gap="1" flex="1" align="stretch" minW={0}>
            <Flex align="center" gap="2" pl="1">
              <Text fontSize="xs" fontWeight="semibold" color="fg.muted" flexShrink={0}>
                被験者内水準
              </Text>
              <input
                type="text"
                value={state.withinFactorName}
                onChange={(e) => state.setWithinFactorName(e.target.value)}
                placeholder="要因名 (例: time)"
                autoCapitalize="off"
                autoCorrect="off"
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: '1px solid var(--chakra-colors-gray-200)',
                  borderRadius: '0.25rem',
                  padding: '0.125rem 0.5rem',
                  fontSize: '0.75rem',
                }}
              />
            </Flex>
            <Listbox.Root
              collection={state.withinFactors}
              selectionMode="multiple"
              value={state.selectedWithinFactors.map((i) => i.value)}
              onValueChange={(e) => state.setSelectedWithinFactors(e.items)}
            >
              <Listbox.Content minH="24" h="full" ref={state.withinFactorsContentRef}>
                {state.withinFactors.items.length > 0 ? (
                  state.withinFactors.items.map((item) => {
                    const v = state.withinFactors.getItemValue(item);
                    return (
                      <Listbox.Item item={item} key={v} flex="0">
                        <Listbox.ItemText>
                          {state.withinFactors.stringifyItem(item)}
                        </Listbox.ItemText>
                        <Listbox.ItemIndicator />
                      </Listbox.Item>
                    );
                  })
                ) : (
                  <Center boxSize="full" p="4" color="fg.muted" textStyle="sm">
                    水準列を選択してください
                  </Center>
                )}
              </Listbox.Content>
            </Listbox.Root>
          </VStack>
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
  const subjectContentRef = useRef<HTMLDivElement | null>(null);
  const betweenFactorsContentRef = useRef<HTMLDivElement | null>(null);
  const withinFactorsContentRef = useRef<HTMLDivElement | null>(null);
  const covariatesContentRef = useRef<HTMLDivElement | null>(null);

  const emptyItems = useMemo(() => [] as Contents[], []);
  const build = useCallback(
    (nextItems: Contents[]) => createListCollection<Contents>({ items: nextItems }),
    []
  );

  const [source, setSource] = useState(() => build(items));
  const [dependent, setDependent] = useState(() => build(emptyItems));
  const [subject, setSubject] = useState(() => build(emptyItems));
  const [betweenFactors, setBetweenFactors] = useState(() => build(emptyItems));
  const [withinFactors, setWithinFactors] = useState(() => build(emptyItems));
  const [covariates, setCovariates] = useState(() => build(emptyItems));

  const [selectedSource, setSelectedSource] = useState<Contents[]>([]);
  const [selectedDependent, setSelectedDependent] = useState<Contents[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Contents[]>([]);
  const [selectedBetweenFactors, setSelectedBetweenFactors] = useState<Contents[]>([]);
  const [selectedWithinFactors, setSelectedWithinFactors] = useState<Contents[]>([]);
  const [selectedCovariates, setSelectedCovariates] = useState<Contents[]>([]);

  const [withinFactorName, setWithinFactorName] = useState('');

  useEffect(() => {
    setSource(build(items));
    setDependent(build(emptyItems));
    setSubject(build(emptyItems));
    setBetweenFactors(build(emptyItems));
    setWithinFactors(build(emptyItems));
    setCovariates(build(emptyItems));
    setSelectedSource([]);
    setSelectedDependent([]);
    setSelectedSubject([]);
    setSelectedBetweenFactors([]);
    setSelectedWithinFactors([]);
    setSelectedCovariates([]);
    setWithinFactorName('');
  }, [build, emptyItems, items]);

  const scrollToItem = (container: HTMLDivElement | null, item: Contents) => {
    if (!container) return;
    requestAnimationFrame(() => {
      const el = container.querySelector(`[data-value="${item.value}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    });
  };

  // --- Dependent (single) ---
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

  // --- Subject (single) ---
  const moveToSubject = (selected: Contents[]) => {
    const item = selected[0];
    if (!item) return;
    const displaced = [...subject.items];
    setSource((prev) => {
      let next = prev.remove(item);
      for (const old of displaced) {
        next = next.append(old);
      }
      return next;
    });
    setSubject(build([item]));
    setSelectedSource([]);
    setSelectedSubject([]);
  };

  const moveFromSubject = (selected: Contents[]) => {
    setSubject((prev) => prev.remove(...selected));
    setSource((prev) => prev.append(...selected));
    setSelectedSubject([]);
    scrollToItem(sourceContentRef.current, selected[selected.length - 1]);
  };

  // --- Between Factors (multi) ---
  const moveToBetweenFactors = (selected: Contents[]) => {
    setSource((prev) => prev.remove(...selected));
    setBetweenFactors((prev) => prev.append(...selected));
    setSelectedSource([]);
    scrollToItem(betweenFactorsContentRef.current, selected[selected.length - 1]);
  };

  const moveFromBetweenFactors = (selected: Contents[]) => {
    setBetweenFactors((prev) => prev.remove(...selected));
    setSource((prev) => prev.append(...selected));
    setSelectedBetweenFactors([]);
    scrollToItem(sourceContentRef.current, selected[selected.length - 1]);
  };

  // --- Within Factors (multi) ---
  // Auto-clears dependent when within levels are selected (wide-format: dependent is derived)
  const moveToWithinFactors = (selected: Contents[]) => {
    const displacedDependent = [...dependent.items];
    setSource((prev) => {
      let next = prev.remove(...selected);
      for (const old of displacedDependent) {
        next = next.append(old);
      }
      return next;
    });
    setWithinFactors((prev) => prev.append(...selected));
    setSelectedSource([]);
    if (displacedDependent.length > 0) {
      setDependent(build([]));
      setSelectedDependent([]);
    }
    scrollToItem(withinFactorsContentRef.current, selected[selected.length - 1]);
  };

  const moveFromWithinFactors = (selected: Contents[]) => {
    setWithinFactors((prev) => prev.remove(...selected));
    setSource((prev) => prev.append(...selected));
    setSelectedWithinFactors([]);
    scrollToItem(sourceContentRef.current, selected[selected.length - 1]);
  };

  // --- Covariates (multi) ---
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

  const dependentDisabled = withinFactors.items.length > 0;

  return {
    source,
    dependent,
    dependentDisabled,
    subject,
    betweenFactors,
    withinFactors,
    withinFactorName,
    setWithinFactorName,
    covariates,
    selectedSource,
    selectedDependent,
    selectedSubject,
    selectedBetweenFactors,
    selectedWithinFactors,
    selectedCovariates,
    setSelectedSource,
    setSelectedDependent,
    setSelectedSubject,
    setSelectedBetweenFactors,
    setSelectedWithinFactors,
    setSelectedCovariates,
    moveToDependent,
    moveFromDependent,
    moveToSubject,
    moveFromSubject,
    moveToBetweenFactors,
    moveFromBetweenFactors,
    moveToWithinFactors,
    moveFromWithinFactors,
    moveToCovariates,
    moveFromCovariates,
    sourceContentRef,
    dependentContentRef,
    subjectContentRef,
    betweenFactorsContentRef,
    withinFactorsContentRef,
    covariatesContentRef,
  };
}
