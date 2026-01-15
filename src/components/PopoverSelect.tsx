'use client';

import { Button, Listbox, Popover, Portal, useFilter, useListbox, useListCollection } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { LuChevronDown } from 'react-icons/lu';

export interface PopoverSelectItem {
  label: string;
  value: string;
}

interface PopoverSelectProps {
  items: PopoverSelectItem[];
  placeholder?: string;
  onSelect?: (item: PopoverSelectItem | null) => void;
  disabled?: boolean;
}

const PopoverSelect = ({ items, placeholder = 'Select', onSelect, disabled = false }: PopoverSelectProps) => {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);

  const { contains } = useFilter({ sensitivity: 'base' });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const prevItemsRef = useRef<PopoverSelectItem[] | null>(null);

  const { collection, filter, set } = useListCollection<PopoverSelectItem>({
    initialItems: items,
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
    if (prevItemsRef.current === items) {
      return;
    }

    set(items);
    listbox.setValue([]);
    setInputValue('');
    filter('');
    setOpen(false);
    prevItemsRef.current = items;
  }, [filter, items, listbox.setValue, set]);

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
                  minH="10"
                  px="3"
                  roundedTop="l2"
                  bg="transparent"
                  outline="0"
                  value={inputValue}
                  onChange={(e) => setInputValueFn(e.currentTarget.value)}
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

export default PopoverSelect;
