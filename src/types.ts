export interface Dataset {
  path: string;
  sheet?: string;
}

export interface ParsedDataTable {
  headers: string[];
  rows: ParsedCell[][];
  note?: string;
  title?: string;
}

export type ParsedCell = string | number | boolean | null;
