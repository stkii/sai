import { Button, HStack } from '@chakra-ui/react';

interface Props {
  busy: boolean;
  /** 入力が要件を満たさず実行できない状態 */
  disabled?: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

/** 全分析モーダル共通のフッター (キャンセル / 実行)。 */
export function ModalActions({ busy, disabled, onCancel, onSubmit }: Props) {
  return (
    <HStack justify="flex-end" gap={2}>
      <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
        キャンセル
      </Button>
      <Button size="sm" colorPalette="blue" onClick={onSubmit} loading={busy} disabled={disabled}>
        実行
      </Button>
    </HStack>
  );
}
