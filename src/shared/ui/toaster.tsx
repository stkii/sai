import { Toaster as ChakraToaster, createToaster, Portal, Stack, Toast } from '@chakra-ui/react';

/** アプリ全体で共有するトーストインスタンス。ダイアログ外の非同期エラー通知に使う。 */
export const toaster = createToaster({
  placement: 'bottom-end',
  pauseOnPageIdle: true,
});

/** `toaster.create()` の描画先。アプリルートに 1 度だけ置く。 */
export function Toaster() {
  return (
    <Portal>
      <ChakraToaster toaster={toaster}>
        {(toast) => (
          <Toast.Root width={{ md: 'sm' }}>
            <Toast.Indicator />
            <Stack gap={1} flex={1} maxWidth="100%">
              {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
              {toast.description && <Toast.Description>{toast.description}</Toast.Description>}
            </Stack>
            {toast.meta?.closable && <Toast.CloseTrigger />}
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  );
}
