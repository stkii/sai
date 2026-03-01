import { CloseButton, Dialog, HStack, Portal, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import BaseButton from './BaseButton';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onExecute: () => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
  maxW?: string;
}

const AnalysisDialogShell = ({
  open,
  onClose,
  title,
  children,
  onExecute,
  loading = false,
  error = null,
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

export default AnalysisDialogShell;
