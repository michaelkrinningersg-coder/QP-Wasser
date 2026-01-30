import React, { useMemo, useEffect } from 'react';
import { ParsedDataset } from '../types';
import { Download } from 'lucide-react';

interface IonBalanceAnalysisProps {
  dataset: ParsedDataset;
  comments: Record<string, string>;
  setComments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

// Helper to parse German numbers (comma to dot)
const parseGermanFloat = (val: string): number => {
  if (!val) return NaN;
  const cleanVal = val.replace(',', '.').trim();
  return parseFloat(cleanVal);
};

// Helper to format numbers back to German with variable decimals
const formatGermanFloat = (val: number, decimals: number = 2): string => {
  if (isNaN(val)) return "";
  return val.toFixed(decimals).replace('.', ',');
};

// Comment Options
const COMMENT_OPTIONS = [
  "",
  "Corg>20",
  "NM",
  "Abweichung im Rahmen der NWG",
  "Corg>10 LTF<50",
  "durch Nachmessung bestätigt",
  "Grenzfall",
  "Probe leer",
  "keine Alkalinität bestimmt bei pH > 6",
  "Leitfähigkeit < 30",
  "gilt nur für Ideal verdünnte Lösungen",
  "anderer Grund"
];

export const IonBalanceAnalysis: React.FC<IonBalanceAnalysisProps> = ({ dataset, comments, setComments }) => {
  
  // Process data logic including auto-comments
  const processedData = useMemo(() => {
    // 1. Sort: Probenkennung (SampleId) -> WDH (isRepeat)
    const sorted = [...dataset.data].sort((a, b) => {
      const idComparison = a.sampleId.localeCompare(b.sampleId, undefined, { numeric: true, sensitivity: 'base' });
      if (idComparison !== 0) return idComparison;
      return (Number(a.isRepeat) - Number(b.isRepeat));
    });

    const headers = dataset.resultHeaders;
    const colAlkalinity = headers.find(h => h.toLowerCase().startsWith('alkalinität-gran')) || '';
    const colCorg = headers.find(h => h === 'Corg berechnet') || '';
    
    const colCond31 = headers.find(h => h === 'LFLFLFM3.1') || '';
    const colCond13 = headers.find(h => h === 'LFLFLFM1.3') || '';
    
    const colQuotientElf = headers.find(h => h === 'Quotient ELF_eu_korr') || '';
    const colQuotientIons = headers.find(h => h === 'Quotient Kationen Anionen NFV') || '';
    const colTheoCond = headers.find(h => h === 'Theo elekt Leit (EU) korr') || '';

    return sorted.map(row => {
      const valAlkalinity = colAlkalinity ? row.results[colAlkalinity] : '';
      const valCorg = colCorg ? row.results[colCorg] : '';
      const numCorg = parseGermanFloat(valCorg);

      let valCond = '';
      let isCondFallback = false;
      const val31 = colCond31 ? row.results[colCond31] : '';
      const val13 = colCond13 ? row.results[colCond13] : '';

      if (val31 && val31.trim() !== '') {
        valCond = val31;
      } else if (val13 && val13.trim() !== '') {
        valCond = val13;
        isCondFallback = true;
      }

      const valQuotientElf = colQuotientElf ? row.results[colQuotientElf] : '';
      const valQuotientIons = colQuotientIons ? row.results[colQuotientIons] : '';
      const valTheoCond = colTheoCond ? row.results[colTheoCond] : '';

      // --- Calculation & Rounding ---
      
      const numQuotientElf = parseGermanFloat(valQuotientElf);
      const numQuotientIons = parseGermanFloat(valQuotientIons);
      const numTheoCond = parseGermanFloat(valTheoCond);

      // Round Quotient Ions to 2 decimals for validation logic
      // Note: Number(val.toFixed(2)) handles rounding like 1.056 -> 1.06
      const roundedQuotientIons = !isNaN(numQuotientIons) 
        ? parseFloat(numQuotientIons.toFixed(2)) 
        : NaN;

      // Validate against the rounded value
      const isIbOk = !isNaN(roundedQuotientIons) && roundedQuotientIons >= 0.9 && roundedQuotientIons <= 1.1;

      const numCond = parseGermanFloat(valCond);
      
      let isLfOk = false;
      let calculatedCondQuotient = NaN;

      if (!isNaN(numCond) && !isNaN(numTheoCond) && numTheoCond !== 0) {
        calculatedCondQuotient = numCond / numTheoCond;
        if (numCond > 20) isLfOk = calculatedCondQuotient >= 0.9 && calculatedCondQuotient <= 1.1;
        else if (numCond >= 10) isLfOk = calculatedCondQuotient >= 0.8 && calculatedCondQuotient <= 1.2;
        else isLfOk = calculatedCondQuotient >= 0.7 && calculatedCondQuotient <= 1.3;
      }

      let bem = "";
      // Bei Wiederholungsproben keine Bemerkung einfügen
      if (!row.isRepeat) {
          const hasIbData = !isNaN(roundedQuotientIons);
          const hasLfData = !isNaN(calculatedCondQuotient);

          if (hasIbData && hasLfData) {
              if (isIbOk && isLfOk) bem = "ok";
              else if (isIbOk && !isLfOk) bem = "IB ok, LF nicht";
              else if (!isIbOk && isLfOk) bem = "IB nicht ok ; LF ok";
              else bem = "IB nicht ok + LF nicht ok";
          } else if (hasIbData && !hasLfData) {
              bem = isIbOk ? "IB ok" : "IB nicht ok";
          }
      }

      // --- Auto Comment Logic ---
      let autoComment = "";
      
      // Keine automatischen Kommentare bei Wiederholungsproben
      if (!row.isRepeat) {
          const isDeviation = !isIbOk || !isLfOk;

          // Prio 1: Corg > 20 (Unabhängig von Leitfähigkeit)
          if (isDeviation && !isNaN(numCorg) && numCorg > 20) {
              autoComment = "Corg>20";
          }
          // Prio 2: Spezifischer Corg/LF Fall
          // Entfernt: && !isIbOk -> Soll immer gelten, wenn eine Abweichung existiert
          else if (isDeviation && !isNaN(numCorg) && numCorg > 10 && !isNaN(numCond) && numCond < 50) {
              autoComment = "Corg>10 LTF<50";
          }
          // Prio 3: Hohe Leitfähigkeit Warnung
          else if (!isNaN(numCond) && numCond > 300 && !isLfOk) {
              autoComment = "gilt nur für Ideal verdünnte Lösungen";
          }
          // Prio 4: Niedrige Leitfähigkeit
          else if (isDeviation && !isNaN(numCond) && numCond < 30) {
              autoComment = "Leitfähigkeit < 30";
          }
      }

      return {
        ...row,
        display: {
          alkalinity: valAlkalinity,
          corg: valCorg,
          cond: valCond,
          isCondFallback,
          // Formatting specific: ELF (2 dec), Ions (2 dec), Theo (1 dec)
          quotientElf: formatGermanFloat(numQuotientElf, 2),
          quotientIons: formatGermanFloat(numQuotientIons, 2),
          theoCond: formatGermanFloat(numTheoCond, 1),
          calcCondQuotient: formatGermanFloat(calculatedCondQuotient, 2),
          bemerkung: bem,
          autoComment
        }
      };
    });
  }, [dataset]);

  // Effect to populate initial comments only if empty (on first load or recalc)
  useEffect(() => {
    setComments(prev => {
        const next = { ...prev };
        let changed = false;
        processedData.forEach(row => {
            if (row.display.autoComment && !next[row.id]) {
                next[row.id] = row.display.autoComment;
                changed = true;
            }
        });
        return changed ? next : prev;
    });
  }, [processedData, setComments]);

  const handleCommentChange = (rowId: string, value: string) => {
    setComments(prev => ({ ...prev, [rowId]: value }));
  };

  const handleExport = () => {
    const header = [
      "Probenkennung",
      "WDH",
      "Alkalinität",
      "Corg berechnet",
      "Leitfähigkeit",
      "Quotient ELF_eu_korr",
      "Quotient Kationen Anionen NFV",
      "Theo elekt Leit (EU) korr",
      "Q. LF/Theo (ber.)",
      "Bemerkung",
      "Kommentar"
    ];

    const csvRows = processedData.map(row => {
      const comment = comments[row.id] || "";
      const escape = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;

      return [
        escape(row.sampleId),
        row.isRepeat ? "ja" : "nein",
        escape(row.display.alkalinity),
        escape(row.display.corg),
        escape(row.display.cond),
        escape(row.display.quotientElf),
        escape(row.display.quotientIons),
        escape(row.display.theoCond),
        escape(row.display.calcCondQuotient),
        escape(row.display.bemerkung),
        escape(comment)
      ].join(';');
    });

    const csvContent = "\uFEFF" + [header.join(';'), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `Ionenbilanz_${dataset.fileName.replace('.csv', '')}_export.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="font-medium text-slate-900">Ionenbilanz Auswertung</h3>
          <p className="text-xs text-slate-500">
            Automatischer Kommentarvorschlag bei Auffälligkeiten (z.B. Corg &gt; 20).
          </p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Exportieren
        </button>
      </div>

      <div className="flex-grow bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-grow">
          <table className="w-full text-sm text-left text-slate-600 whitespace-nowrap border-separate border-spacing-0">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 z-10 shadow-sm">
              <tr>
                <th className="sticky top-0 bg-slate-50 px-4 py-3 border-b border-slate-200 min-w-[120px] shadow-[0_1px_0_0_rgba(226,232,240,1)]">Probenkennung</th>
                <th className="sticky top-0 bg-slate-50 px-4 py-3 border-b border-slate-200 w-16 text-center shadow-[0_1px_0_0_rgba(226,232,240,1)]">WDH</th>
                <th className="sticky top-0 bg-slate-50 px-4 py-3 border-b border-slate-200 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Alkalinität</th>
                <th className="sticky top-0 bg-slate-50 px-4 py-3 border-b border-slate-200 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Corg ber.</th>
                <th className="sticky top-0 bg-slate-50 px-4 py-3 border-b border-slate-200 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Leitfähigkeit</th>
                <th className="sticky top-0 bg-slate-50 px-4 py-3 border-b border-slate-200 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Q. ELF_eu_korr</th>
                <th className="sticky top-0 bg-slate-50 px-4 py-3 border-b border-slate-200 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Q. Kat/An NFV</th>
                <th className="sticky top-0 bg-slate-50 px-4 py-3 border-b border-slate-200 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Theo LF (EU)</th>
                <th className="sticky top-0 bg-slate-50 px-4 py-3 border-b border-slate-200 text-blue-700 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Q. LF/Theo (ber.)</th>
                <th className="sticky top-0 bg-slate-50 px-4 py-3 border-b border-slate-200 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Bemerkung</th>
                <th className="sticky top-0 bg-slate-50 px-4 py-3 border-b border-slate-200 min-w-[200px] shadow-[0_1px_0_0_rgba(226,232,240,1)]">Kommentar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2 font-medium text-slate-900">{row.sampleId}</td>
                  <td className="px-4 py-2 text-center">
                    {row.isRepeat ? <span className="text-amber-600 font-bold">Ja</span> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-4 py-2">{row.display.alkalinity}</td>
                  <td className="px-4 py-2">{row.display.corg}</td>
                  <td className={`px-4 py-2 font-mono ${row.display.isCondFallback ? 'text-red-600 font-bold' : ''}`}>
                    {row.display.cond}
                    {row.display.isCondFallback && <span className="ml-1 text-[10px] align-top text-red-400">*</span>}
                  </td>
                  <td className="px-4 py-2">{row.display.quotientElf}</td>
                  <td className="px-4 py-2">{row.display.quotientIons}</td>
                  <td className="px-4 py-2">{row.display.theoCond}</td>
                  <td className="px-4 py-2 font-mono text-blue-700">{row.display.calcCondQuotient}</td>
                  <td className="px-4 py-2">
                    {row.display.bemerkung === 'ok' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">ok</span>
                    ) : row.display.bemerkung ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-800">
                        {row.display.bemerkung}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={comments[row.id] || ""}
                      onChange={(e) => handleCommentChange(row.id, e.target.value)}
                      className="block w-full rounded-md border-slate-300 py-1.5 text-xs focus:border-blue-500 focus:ring-blue-500 bg-white border shadow-sm"
                    >
                      {COMMENT_OPTIONS.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {processedData.length === 0 && (
             <div className="p-8 text-center text-slate-400">Keine Daten verfügbar</div>
          )}
        </div>
      </div>
    </div>
  );
};