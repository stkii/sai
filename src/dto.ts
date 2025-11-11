/**
 * Data Transfer Object shared with the Rust side.
 *
 * セル値の特別表現（表示層の解釈ルール）
 * - "NaN!": 数値NaNをExcel由来で検出した場合の表記（文字列）。表示はそのまま。
 * - "Inf!" / "-Inf!": 正または負の無限大。表示はそのまま。
 * - Excelエラー記号: "#DIV/0!", "#N/A", "#NAME?", "#NULL!", "#NUM!", "#REF!", "#VALUE!", "#GETTING"。表示はそのまま。
 * - 相関分析 p 値の対角成分: "-"（未定義の意味）。表示はそのまま。
 * - その他の未定義/欠損: null（undefined は受信時に null へ正規化）
 *
 * 注: これらは表示向けの文字列であり、機械処理時は型や意味に応じた分岐が必要です。
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
  dataset: z.record(z.string(), z.array(z.number().nullable())).optional(),
});
export type ResultPayload = z.infer<typeof zResultPayload>;
