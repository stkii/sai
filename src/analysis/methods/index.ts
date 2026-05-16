import type { Method } from '../../shared/types';
import { anovaModule } from './anova';
import type { MethodModule } from './contracts';
import { correlationModule } from './correlation';
import { descriptiveModule } from './descriptive';
import { factorModule } from './factor';
import { powerModule } from './power';
import { regressionModule } from './regression';
import { reliabilityModule } from './reliability';

export const ANALYSIS_METHODS: MethodModule[] = [
  descriptiveModule,
  correlationModule,
  regressionModule,
  reliabilityModule,
  factorModule,
  anovaModule,
  powerModule,
];

export function findMethod(key: Method): MethodModule | undefined {
  return ANALYSIS_METHODS.find((m) => m.definition.key === key);
}
