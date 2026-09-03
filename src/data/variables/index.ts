import type { VariableKind, VariableModule } from './contracts';
import { reverseModule } from './reverse';

export const VARIABLE_KINDS: VariableModule[] = [reverseModule];

export function findVariableKind(key: VariableKind): VariableModule | undefined {
  return VARIABLE_KINDS.find((v) => v.definition.key === key);
}
