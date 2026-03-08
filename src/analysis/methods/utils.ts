import type { AnalysisResult, AnalysisSection } from '../types';

export const buildExportSectionsFromResult = (result: AnalysisResult): AnalysisSection[] => {
  return result.sections;
};

export const getSingleSection = (result: AnalysisResult): AnalysisSection | null => {
  return result.sections[0] ?? null;
};
