import { Button, HStack } from '@chakra-ui/react';

interface Props {
  busy: boolean;
  /** 入力が要件を満たさず実行できない状態 */
  disabled?: boolean;
  /** 実行ボタンの文言。分析以外の操作 (変数作成など) で差し替える */
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: () => void;
}

/** モーダル共通のフッター (キャンセル / 実行)。 */
export function ModalActions({ busy, disabled, submitLabel = '実行', onCancel, onSubmit }: Props) {
  return (
    <HStack justify="flex-end" gap={2}>
      <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
        キャンセル
      </Button>
      <Button size="sm" colorPalette="blue" onClick={onSubmit} loading={busy} disabled={disabled}>
        {submitLabel}
      </Button>
    </HStack>
  );
}
