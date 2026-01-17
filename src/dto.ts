/**
 * Data Transfer Object shapes mirrored from the Rust backend.
 *
 */
import { z } from 'zod';

export type ParsedDataTable = z.infer<typeof zParsedDataTable>;
export type AnalysisRunResult = z.infer<typeof zAnalysisRunResult>;

const zCellValue = z
  .union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])
  .transform((v) => (typeof v === 'undefined' ? null : v));

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

export const zDatasetId = z.string();

export const zSheetNames = z.array(z.string());

// 回帰分析のモデル情報スキーマ
export const zRegressionModelInfo = z.object({
  r_squared: z.string().nullable(),
  adj_r_squared: z.string().nullable(),
  n: z.number().nullable(),
  f_statistic: z.string().nullable(),
  f_df1: z.number().nullable(),
  f_df2: z.number().nullable(),
  f_pvalue: z.string().nullable(),
});

// 回帰分析結果スキーマ（係数テーブル + 分散分析テーブル + モデル情報）
export const zRegressionResult = z.object({
  coefficients: zParsedDataTable,
  anova: zParsedDataTable,
  model: zRegressionModelInfo,
});

// 分析結果はParsedDataTable（単一テーブル）またはRegressionResult（回帰分析）
export const zAnalysisResult = z.union([zRegressionResult, zParsedDataTable]);

export type RegressionModelInfo = z.infer<typeof zRegressionModelInfo>;
export type RegressionResult = z.infer<typeof zRegressionResult>;
export type AnalysisResult = z.infer<typeof zAnalysisResult>;

export const zAnalysisRunResult = z.object({
  result: zAnalysisResult,
  loggedAt: z.string(),
});
