import type { MethodModule } from './contracts';
import { descriptiveMethod } from './descriptive';

export const ANALYSIS_METHODS = [descriptiveMethod] as const satisfies readonly MethodModule[];

export type {
  MethodDefinition,
  MethodModule,
  MethodModule as AnalysisMethod,
  ModalProps,
  ModalRenderArgs,
} from './contracts';
export { descriptiveMethod } from './descriptive';
export { buildExportSectionsFromResult, getSingleSection } from './utils';
