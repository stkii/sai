import { Button, Menu, Portal } from '@chakra-ui/react';
import { useState } from 'react';
import { useDataset } from '../state/DatasetContext';
import { VARIABLE_KINDS } from '../variables';
import type { VariableKind } from '../variables/contracts';
import { VariableBuilderHost } from './VariableBuilderHost';

export function VariableBuilderMenu() {
  const { dataset } = useDataset();
  const [kind, setKind] = useState<VariableKind | null>(null);

  return (
    <>
      <Menu.Root
        onSelect={(d) => setKind(d.value as VariableKind)}
        positioning={{ placement: 'bottom-start' }}
      >
        <Menu.Trigger asChild>
          <Button size="sm" variant="ghost" disabled={!dataset}>
            変数作成
          </Button>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content>
              {VARIABLE_KINDS.map((v) => (
                <Menu.Item key={v.definition.key} value={v.definition.key}>
                  {v.definition.label}
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>

      <VariableBuilderHost kind={kind} onClose={() => setKind(null)} />
    </>
  );
}
