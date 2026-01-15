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

export const zAnalysisRunResult = z.object({
  result: zParsedDataTable,
  loggedAt: z.string(),
});
