import { LabDataRow, ParsedDataset } from '../types';

// Declare Papa globally as it is loaded via CDN
declare const Papa: any;

export const parseLabDataCsv = (file: File): Promise<ParsedDataset> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      encoding: 'ISO-8859-1', // Wichtig für Umlaute (ä, ö, ü) in deutschen CSVs
      complete: (results: any) => {
        try {
          const rawRows = results.data as string[][];

          if (!rawRows || rawRows.length < 3) {
            throw new Error("Die Datei scheint leer zu sein oder hat nicht genügend Zeilen (Header + Daten).");
          }

          // Spezifikations-Check:
          // Zeile 2 (Index 1) enthält die Ergebnis-Namen.
          // Ab Spalte 8 (Index 7) beginnen die Ergebnisse.

          const headerRowIndex = 1; // Zeile 2
          const dataStartIndex = 2; // Daten beginnen ab Zeile 3
          const resultStartIndex = 7; // Spalte 8 (Index 7)

          const headerRow = rawRows[headerRowIndex];
          
          if (!headerRow) {
             throw new Error("Konnte die Header-Zeile (Zeile 2) nicht lesen.");
          }

          // 1. Header extrahieren und mappen (Name + Original-Index)
          // Wir erstellen eine Liste von Objekten, um die Zuordnung beim Sortieren nicht zu verlieren
          const headerMapping: { name: string; originalIndex: number }[] = [];

          for (let i = resultStartIndex; i < headerRow.length; i++) {
            const headerName = headerRow[i];
            if (headerName && headerName.trim() !== '') {
              headerMapping.push({
                name: headerName.trim(),
                originalIndex: i
              });
            }
          }

          // 2. Alphabetisch sortieren
          headerMapping.sort((a, b) => a.name.localeCompare(b.name, 'de'));

          // Die sortierten Namen für die Anzeige extrahieren
          const sortedResultHeaders = headerMapping.map(h => h.name);

          const parsedData: LabDataRow[] = [];

          for (let i = dataStartIndex; i < rawRows.length; i++) {
            const row = rawRows[i];
            
            // Überspringe leere Zeilen
            if (!row || row.length < 2 || (row.length === 1 && row[0] === '')) continue;

            const resultValues: Record<string, string> = {};
            
            // 3. Mapping der Ergebnisse basierend auf der sortierten Reihenfolge
            // Wir iterieren durch die sortierte Mapping-Liste und holen den Wert vom originalen Index
            headerMapping.forEach((mapItem) => {
              const val = row[mapItem.originalIndex];
              resultValues[mapItem.name] = val ? val.trim() : '';
            });

            // Spalte 4 (Index 3) ist Wiederholungsprobe
            const repeatVal = row[3] ? row[3].trim() : '';
            
            // Neue Logik: Es ist eine Wiederholung, wenn "2" drin steht. Bei "1" nicht.
            const isRepeat = repeatVal === '2';

            parsedData.push({
              id: `row-${i}`,
              seriesId: row[0] ? row[0].trim() : '',
              sampleId: row[1] ? row[1].trim() : '',
              isRepeat: isRepeat,
              rawRepeatValue: repeatVal,
              results: resultValues
            });
          }

          resolve({
            fileName: file.name,
            uploadDate: new Date(),
            resultHeaders: sortedResultHeaders, // Wir geben die sortierte Liste zurück
            data: parsedData
          });

        } catch (err) {
          reject(err);
        }
      },
      error: (err: any) => {
        reject(err);
      },
      header: false, // Wir parsen manuell
      skipEmptyLines: true
    });
  });
};