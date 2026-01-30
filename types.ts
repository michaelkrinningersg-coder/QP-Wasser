// Definition der Datenstruktur basierend auf der CSV
export interface LabDataRow {
  id: string; // Eindeutige ID für React keys
  seriesId: string; // Spalte 1 (Index 0)
  sampleId: string; // Spalte 2 (Index 1)
  isRepeat: boolean; // Spalte 4 (Index 3) - Indikator
  rawRepeatValue: string; // Der originale Wert aus Spalte 4
  results: Record<string, string>; // Dynamische Ergebnisse ab Spalte 8
}

export interface ParsedDataset {
  fileName: string;
  uploadDate: Date;
  resultHeaders: string[]; // Die Namen der Ergebnisse aus Zeile 2
  data: LabDataRow[];
}

export enum AppTab {
  IMPORT = 'import',
  RAW_DATA = 'raw_data',
  ION_BALANCE = 'ion_balance',
  SELECTION = 'selection',
  REPORT = 'report',
  EXPORT = 'export'
}

export interface SelectionState {
  // Welche Zeilen sollen generell betrachtet werden?
  selectedRowIds: Set<string>;
  
  // Pro Zeile (RowID): Welche "Basis-Parameter" sind ausgewählt?
  // Key: RowID, Value: Set of BaseParameterNames (z.B. "LFLFLFM")
  rowParams: Record<string, Set<string>>;
}
