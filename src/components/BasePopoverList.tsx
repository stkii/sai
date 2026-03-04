'use client';

import { Button, Listbox, Popover, Portal, useFilter, useListbox, useListCollection } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { LuChevronDown } from 'react-icons/lu';

interface Contents {
  label: string;
  value: string;
}

interface Props {
  contents: Contents[];
  disabled?: boolean;
  placeholder?: string;
  resetKey?: number;
  onSelect?: (item: Contents | null) => void;
}

const BasePopoverList = ({ contents, disabled = false, placeholder, resetKey, onSelect }: Props) => {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);

  const { contains } = useFilter({ sensitivity: 'base' });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const prevItemsRef = useRef<ReadonlyArray<Contents> | null>(null);
  const prevResetKeyRef = useRef<number | undefined>(resetKey);

  const { collection, filter, set } = useListCollection<Contents>({
    initialItems: Array.from(contents),
    filter: contains,
    itemToString: (item) => item.label,
    itemToValue: (item) => item.label,
  });

  const listbox = useListbox({
    collection,
    onValueChange(details) {
      setOpen(false);
      setInputValueFn('');
      triggerRef.current?.focus();
      const selectedLabel = details.value[0];
      const selectedItem = collection.items.find((item) => item.label === selectedLabel) ?? null;
      onSelect?.(selectedItem);
    },
  });

  useEffect(() => {
    if (prevItemsRef.current === contents) {
      return;
    }

    set(Array.from(contents));
    listbox.setValue([]);
    setInputValue('');
    filter('');
    setOpen(false);
    prevItemsRef.current = contents;
  }, [filter, contents, listbox, set]);

  useEffect(() => {
    if (prevResetKeyRef.current === resetKey) {
      return;
    }
    prevResetKeyRef.current = resetKey;
    listbox.setValue([]);
    setInputValue('');
    filter('');
    setOpen(false);
    onSelect?.(null);
  }, [filter, listbox, onSelect, resetKey]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  const setInputValueFn = (value: string) => {
    setInputValue(value);
    filter(value);
  };

  const selectedItem = listbox.selectedItems[0];

  return (
    <Popover.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
      <Popover.Trigger asChild>
        <Button size="sm" ref={triggerRef} variant="outline" disabled={disabled}>
          {selectedItem ? selectedItem.label : placeholder} <LuChevronDown />
        </Button>
      </Popover.Trigger>

      <Portal>
        <Popover.Positioner>
          <Popover.Content _closed={{ animation: 'none' }}>
            <Popover.Body p="0">
              <Listbox.RootProvider value={listbox} gap="0" overflow="hidden">
                <Listbox.Input
                  bg="transparent"
                  minH="10"
                  onChange={(e) => setInputValueFn(e.currentTarget.value)}
                  outline="0"
                  px="3"
                  roundedTop="l2"
                  value={inputValue}
                />
                <Listbox.Content borderWidth="0" borderTopWidth="1px" roundedTop="0" gap="0">
                  {collection.items.map((framework) => (
                    <Listbox.Item item={framework} key={framework.label}>
                      <Listbox.ItemText>{framework.label}</Listbox.ItemText>
                      <Listbox.ItemIndicator />
                    </Listbox.Item>
                  ))}
                </Listbox.Content>
              </Listbox.RootProvider>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
};

export default BasePopoverList;
