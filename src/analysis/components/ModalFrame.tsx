import { CloseButton, Dialog, HStack, Portal, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { BaseButton } from '../../components/BaseButton';

interface Props {
  children: ReactNode;
  open: boolean;
  title: string;
  onClose: () => void;
  onExecute: () => void | Promise<void>;
  error?: string | null;
  loading?: boolean;
  maxW?: string;
}

export const ModalFrame = ({
  children,
  open,
  title,
  onClose,
  onExecute,
  error = null,
  loading = false,
  maxW = '5xl',
}: Props) => {
  return (
    <Dialog.Root open={open} onOpenChange={(e) => (e.open ? null : onClose())}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW={maxW}>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {children}
              {error ? <Text color="red.500">{error}</Text> : null}
            </Dialog.Body>
            <Dialog.Footer>
              <HStack gap="3" justify="flex-end" w="full">
                <BaseButton label="終了" variant="outline" onClick={onClose} />
                <BaseButton label="実行" onClick={onExecute} loading={loading} />
              </HStack>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
