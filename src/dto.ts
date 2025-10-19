/**
 * Data Transfer Object shared with the Rust side.
 */

export type ParsedTable = {
  headers: string[];
  rows: CellValue[][];
};

type CellValue = string | number | boolean | null | undefined;
