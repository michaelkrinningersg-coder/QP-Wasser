# QP-Wasser: LabData Manager

Ein React+TypeScript+Vite Tool zur Analyse von Wasserqualitäts-Labordaten aus CSV-Dateien.

## Architektur

**State-Lifting Pattern**: Der globale State wird in [App.tsx](../App.tsx) verwaltet und an Child-Komponenten weitergegeben:
- `parsedData`: Geparste CSV-Daten (via [csvService.ts](../services/csvService.ts))
- `selection`: Welche Zeilen/Parameter ausgewählt sind (`SelectionState` in [types.ts](../types.ts))
- `comments`: Kommentare zur Ionenbilanz (in [IonBalanceAnalysis.tsx](../components/IonBalanceAnalysis.tsx))

**Tab-basierte Navigation**: `AppTab` Enum definiert 6 Tabs (Import → Raw Data → Ion Balance → Selection → Report → Export)

## Datenmodell

### CSV-Parsing ([csvService.ts](../services/csvService.ts))
- **Encoding**: `ISO-8859-1` (deutsche Umlaute: ä, ö, ü)
- **Struktur**: Zeile 2 = Header, Daten ab Zeile 3, Ergebnisse ab Spalte 8
- **Sortierung**: Result-Headers werden alphabetisch sortiert
- **Wiederholungsproben**: Spalte 4 = "2" → `isRepeat: true`

### Base Parameter Names
Pattern: Header-Namen wie `ICCa2.1`, `ICCa8.1` werden zu Basis-Name `ICCa` reduziert via:
```typescript
getBaseName(header) => header.replace(/\d+\.\d+$/, '')
```

## Geräte-Gruppierung

Zentrale Klassifizierung in 5 Geräte-Gruppen (definiert in `getDeviceGroup()`):

```typescript
'pH-LF-TIT': TIT, M1., M3., M8., HH+PHM, LFLFM
'TOC': TOC*
'IC': IC*
'ICP-OES': ICP*
'Sonstige': Rest
```

**Sortierung**: Gruppiert nach `GROUP_ORDER`, dann alphabetisch innerhalb der Gruppe (IC ist nicht mehr nach Anionen/Kationen getrennt, sondern alphabetisch).

## Zahlenformatierung

Deutsche Komma-Notation überall:
- `parseGermanFloat()`: Ersetzt `,` durch `.` vor `parseFloat()`
- `formatGermanFloat()`: Konvertiert Punkt zurück zu Komma für Anzeige

## Farblogik ([ReportView.tsx](../components/ReportView.tsx))

Zeilen werden nach **aktivierten Parametern** eingefärbt (Priorität):

1. **Prioritäts-Parameter** (höchste Priorität):
   - Gelb: Nur `PPO4IC` + `PPgesICP`
   - Orange: Nur `SSO4IC` + `SSgesICP`
   - Pink: Nur `NNgesTOC` + `NNH4/NO2/NO3IC` + `CGES`

2. **Geräte-Gruppen** (sekundär):
   - Lila: Nur pH-LF-TIT
   - Rot: TOC + IC
   - Blau: IC + ICP
   - Grün: TOC + IC + ICP

## Spezifische Patterns

### Selection State Management
```typescript
// Rows: Set<string> (IDs)
// Params: Record<rowId, Set<baseParamName>>
const [selection, setSelection] = useState<SelectionState>({
  selectedRowIds: new Set(),
  rowParams: {}
});
```

### Ionenbilanz-Validierung ([IonBalanceAnalysis.tsx](../components/IonBalanceAnalysis.tsx))
- **IB OK**: `0.9 ≤ roundedQuotientIons ≤ 1.1` (gerundet auf 2 Dezimalen)
- **LF OK**: Vergleicht gemessene Leitfähigkeit mit theoretischer (Toleranz ±10%)
- **Auto-Kommentare**: z.B. "Corg>20", "LTF<50", "Probe leer"

### Excel Export ([ReportView.tsx](../components/ReportView.tsx))
Verwendet `xlsx-js-style` (via CDN in [index.html](../index.html)) für:
- Farbige Zellen-Hintergründe (hex-Werte wie `FFFFCC`)
- Mehrere Tabs: "Ausgabe" (gefilterte Daten) + "IB Tabelle" (Ionenbilanz)
- Bedingte Formatierung: Zellen mit `x` (inaktive Parameter) bekommen grauen Hintergrund

## Development Workflow

### Lokale Entwicklung
```bash
npm install
npm run dev  # Startet Vite auf Port 3000 (0.0.0.0)
```

### Externe Dependencies (CDN)
- **TailwindCSS**: `cdn.tailwindcss.com`
- **PapaParse**: CSV-Parsing (v5.4.1)
- **xlsx-js-style**: Excel-Export mit Styling (v1.2.0)
- **React 19**: Via ESM import map

### Build
```bash
npm run build  # Output: dist/
npm run preview  # Preview production build
```

## Wichtige Konventionen

1. **Keine Sub-Shells**: Verwende `@/` Alias für Imports (konfiguriert in [vite.config.ts](../vite.config.ts))
2. **TypeScript Strict Mode**: `noEmit: true` (Type-Checking ohne JS-Output)
3. **Komponentenstruktur**: Alle Komponenten in `components/`, Services in `services/`
4. **Legacy HTML**: [LaborTool.html](../LaborTool.html) ist alte Vanilla-JS-Version (nicht mehr aktiv)

## Typische Aufgaben

### Neues Geräte-Gruppen-Muster hinzufügen
Suche nach `getDeviceGroup()` (mehrfach dupliziert in Komponenten) und erweitere Pattern.

### Neue Validierungsregel für Ionenbilanz
Bearbeite [IonBalanceAnalysis.tsx](../components/IonBalanceAnalysis.tsx) → `processedData` useMemo.

### Excel-Export-Spalte hinzufügen
Siehe [ReportView.tsx](../components/ReportView.tsx) → `buildExcelData()` Funktion.
