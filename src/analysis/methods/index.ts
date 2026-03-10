import type { MethodModule } from './contracts';
import { correlationMethod } from './correlation';
import { descriptiveMethod } from './descriptive';

export const ANALYSIS_METHODS = [
  correlationMethod,
  descriptiveMethod,
] as const satisfies readonly MethodModule[];

export type {
  MethodDefinition,
  MethodModule,
  MethodModule as AnalysisMethod,
  ModalProps,
  ModalRenderArgs,
} from './contracts';
export { correlationMethod } from './correlation';
export { descriptiveMethod } from './descriptive';
export { buildExportSectionsFromResult, getSingleSection } from './utils';
