import { anovaMethod } from './anova';
import type { MethodModule } from './contracts';
import { correlationMethod } from './correlation';
import { descriptiveMethod } from './descriptive';
import { factorMethod } from './factor';
import { regressionMethod } from './regression';
import { reliabilityMethod } from './reliability';

// UI向けに意図的に辞書式に並べない
export const ANALYSIS_METHODS = [
  descriptiveMethod,
  correlationMethod,
  regressionMethod,
  anovaMethod,
  factorMethod,
  reliabilityMethod,
] as const satisfies readonly MethodModule[];

export type { MethodDefinition, MethodModule } from './contracts';
export { buildExportSectionsFromResult, getSingleSection } from './utils';
