import type { Method } from '../../shared/types';
import { anovaModule } from './anova';
import type { MethodModule } from './contracts';
import { correlationModule } from './correlation';
import { describeModule } from './describe';
import { distanceModule } from './distance';
import { factorModule } from './factor';
import { mdsModule } from './mds';
import { powerModule } from './power';
import { regressionModule } from './regression';
import { reliabilityModule } from './reliability';

export const ANALYSIS_METHODS: MethodModule[] = [
  describeModule,
  correlationModule,
  regressionModule,
  reliabilityModule,
  factorModule,
  anovaModule,
  distanceModule,
  mdsModule,
  powerModule,
];

export function findMethod(key: Method): MethodModule | undefined {
  return ANALYSIS_METHODS.find((m) => m.definition.key === key);
}
