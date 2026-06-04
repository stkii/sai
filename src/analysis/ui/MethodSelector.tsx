import { Button, Menu, Portal } from '@chakra-ui/react';
import type { Method } from '../../shared/types';
import { ANALYSIS_METHODS } from '../methods';

interface Props {
  hasDataset: boolean;
  onSelect: (method: Method) => void;
}

export function MethodSelector({ hasDataset, onSelect }: Props) {
  return (
    <Menu.Root
      onSelect={(d) => onSelect(d.value as Method)}
      positioning={{ placement: 'bottom-start' }}
    >
      <Menu.Trigger asChild>
        <Button size="sm" variant="ghost">
          分析
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            {ANALYSIS_METHODS.map((m) => {
              const requires = m.definition.requiresDataset !== false;
              const disabled = requires && !hasDataset;
              return (
                <Menu.Item key={m.definition.key} value={m.definition.key} disabled={disabled}>
                  {m.definition.label}
                </Menu.Item>
              );
            })}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
