/**
 * Data Transfer Object shapes mirrored from the Rust backend.
 *
 */
import { z } from 'zod';

export type ParsedDataTable = z.infer<typeof zParsedDataTable>;
export type AnalysisRunResult = z.infer<typeof zAnalysisRunResult>;

const zCellValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const zParsedDataTable = z
  .object({
    headers: z.array(z.string()),
    rows: z.array(z.array(zCellValue)),
    note: z.string().optional(),
    title: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const w = val.headers.length;
    for (let i = 0; i < val.rows.length; i++) {
      if (val.rows[i].length !== w) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `row ${i} length ${val.rows[i].length} != headers ${w}`,
          path: ['rows', i],
        });
      }
    }
  });

export const zDatasetCacheId = z.string();

export const zSheetNames = z.array(z.string());

export const zRegressionResult = z.object({
  model_summary: zParsedDataTable,
  coefficients: zParsedDataTable,
  anova: zParsedDataTable,
});

export const zFactorResult = z.object({
  eigen: zParsedDataTable,
  pattern: zParsedDataTable,
  rotmat: zParsedDataTable,
  structure: zParsedDataTable.optional(),
  phi: zParsedDataTable.optional(),
});

// 分析結果は kind 付きの判別ユニオン
export const zAnalysisTableResult = z.object({
  kind: z.literal('table'),
  table: zParsedDataTable,
});

export const zAnalysisRegressionResult = z.object({
  kind: z.literal('regression'),
  regression: zRegressionResult,
});

export const zAnalysisFactorResult = z.object({
  kind: z.literal('factor'),
  factor: zFactorResult,
});

export const zAnalysisResult = z.union([
  zAnalysisTableResult,
  zAnalysisRegressionResult,
  zAnalysisFactorResult,
]);

export type RegressionResult = z.infer<typeof zRegressionResult>;
export type FactorResult = z.infer<typeof zFactorResult>;
export type AnalysisTableResult = z.infer<typeof zAnalysisTableResult>;
export type AnalysisRegressionResult = z.infer<typeof zAnalysisRegressionResult>;
export type AnalysisFactorResult = z.infer<typeof zAnalysisFactorResult>;
export type AnalysisResult = z.infer<typeof zAnalysisResult>;

export const zAnalysisRunResult = z.object({
  result: zAnalysisResult,
  loggedAt: z.string(),
  analysisId: z.string(),
});

export const zAnalysisLogSummary = z.object({
  analysisId: z.string(),
  timestamp: z.string(),
  analysisType: z.string(),
  filePath: z.string(),
  sheetName: z.string(),
  variables: z.array(z.string()),
});

export const zAnalysisLogEntry = z.object({
  analysisId: z.string(),
  timestamp: z.string(),
  analysisType: z.string(),
  filePath: z.string(),
  sheetName: z.string(),
  variables: z.array(z.string()),
  options: z.record(z.string(), z.unknown()),
  result: zAnalysisResult,
});

export type AnalysisLogSummary = z.infer<typeof zAnalysisLogSummary>;
export type AnalysisLogEntry = z.infer<typeof zAnalysisLogEntry>;
