import { Text, VStack } from '@chakra-ui/react';
import { FieldFrame } from '../../shared/ui/FieldFrame';
import { ModalActions } from '../../shared/ui/ModalActions';
import type { VariableModalProps, VariableModule } from './contracts';

/** 任意の変数を作るモーダルのダミー。作成処理はまだ無いため実行ボタンは常に無効。 */
export function CustomVariableModal({ busy, onCancel }: VariableModalProps) {
  return (
    <VStack align="stretch" gap={4}>
      <FieldFrame label="計算式">
        <Text fontSize="sm" color="fg.muted">
          任意の変数の作成は準備中です。
        </Text>
      </FieldFrame>
      {/* disabled のため onSubmit は呼ばれない */}
      <ModalActions
        busy={busy}
        disabled
        submitLabel="作成"
        onCancel={onCancel}
        onSubmit={() => undefined}
      />
    </VStack>
  );
}

export const customModule: VariableModule = {
  definition: { key: 'custom', label: '任意の変数' },
  renderModal: (props) => <CustomVariableModal {...props} />,
};
