import type { AnalysisResult } from '../../../shared/types';
import { SectionsView } from '../../../shared/ui/SectionsView';

export function CorrelationResult({ result }: { result: AnalysisResult }) {
  return <SectionsView result={result} />;
}
