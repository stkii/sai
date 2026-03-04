export type ParsedTableCell = string | number | boolean | null;

export interface ParsedDataTable {
  headers: string[];
  rows: ParsedTableCell[][];
  note?: string;
  title?: string;
}

export interface ImportDataset {
  path: string;
  sheet?: string;
}
