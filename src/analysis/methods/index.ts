import { anovaMethod } from './anova';
import type { MethodModule } from './contracts';
import { correlationMethod } from './correlation';
import { descriptiveMethod } from './descriptive';
import { factorMethod } from './factor';
import { regressionMethod } from './regression';
import { reliabilityMethod } from './reliability';

export const ANALYSIS_METHODS = [
  anovaMethod,
  correlationMethod,
  descriptiveMethod,
  factorMethod,
  regressionMethod,
  reliabilityMethod,
] as const satisfies readonly MethodModule[];

export { anovaMethod } from './anova';
export type {
  MethodDefinition,
  MethodModule,
  MethodModule as AnalysisMethod,
  ModalProps,
  ModalRenderArgs,
} from './contracts';
export { correlationMethod } from './correlation';
export { descriptiveMethod } from './descriptive';
export { factorMethod } from './factor';
export { regressionMethod } from './regression';
export { reliabilityMethod } from './reliability';
export { buildExportSectionsFromResult, getSingleSection } from './utils';
