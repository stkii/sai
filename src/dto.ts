/**
 * Data Transfer Object shared with the Rust side.
 *
 * DTO 値表現仕様
 * - NaN: "NaN!"
 * - +Inf/-Inf: "Inf!" / "-Inf!"
 * - Excel エラー: 「#DIV/0!」「#N/A」「#NAME?」「#NULL!」「#NUM!」「#REF!」「#VALUE!」「#GETTING」をそのまま
 * - 欠損/未定義: null（undefined は受信時に null）
 * - 相関 p の対角: "-"
 *
 * セル型: string | number | boolean | null のみ。
 * 禁止: "NA!" を使用しない（失敗・欠損は null）。
 */
import { z } from 'zod';

const zCellValue = z
  .union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])
  .transform((v) => (typeof v === 'undefined' ? null : v));

export const zParsedTable = z
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

export type ParsedTable = z.infer<typeof zParsedTable>;

export const zNumericDataset = z.record(z.string(), z.array(z.number().nullable())).brand<'NumericDataset'>();
export type NumericDataset = z.infer<typeof zNumericDataset>;

export const zResultPayload = z.object({
  token: z.string().min(1).optional(),
  analysis: z.string().optional(),
  path: z.string().optional(),
  sheet: z.string().optional(),
  variables: z.array(z.string()).optional(),
  params: z.unknown().optional(),
});
export type ResultPayload = z.infer<typeof zResultPayload>;
