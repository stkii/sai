import type { VariableKind, VariableModule } from './contracts';
import { customModule } from './custom';
import { reverseModule } from './reverse';

export const VARIABLE_KINDS: VariableModule[] = [customModule, reverseModule];

export function findVariableKind(key: VariableKind): VariableModule | undefined {
  return VARIABLE_KINDS.find((v) => v.definition.key === key);
}
