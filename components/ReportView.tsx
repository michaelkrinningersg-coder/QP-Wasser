import React, { useMemo } from 'react';
import { ParsedDataset, SelectionState } from '../types';
import { Download } from 'lucide-react';

declare const XLSX: any; // xlsx-js-style

interface ReportViewProps {
  dataset: ParsedDataset;
  selection: SelectionState;
  comments: Record<string, string>;
}

// Group definitions
type DeviceGroup = 'pH-LF-TIT' | 'TOC' | 'IC' | 'ICP-OES' | 'Sonstige';

const getDeviceGroup = (header: string): DeviceGroup => {
  const h = header.toUpperCase();
  // Matching Logic
  if (h.includes('TIT') || h.includes('M1.') || h.includes('M3.') || h.includes('M8.') || h.includes('HH+PHM') || h.includes('LFLFM')) return 'pH-LF-TIT';
  if (h.includes('TOC')) return 'TOC';
  if (h.includes('ICP')) return 'ICP-OES'; 
  if (h.includes('IC')) return 'IC';
  return 'Sonstige';
};

const getBaseName = (header: string) => header.replace(/\d+\.\d+$/, '');

const GROUP_ORDER: DeviceGroup[] = ['pH-LF-TIT', 'TOC', 'IC', 'ICP-OES', 'Sonstige'];

// Calculation Helpers
const parseGermanFloat = (val: string): number => {
    if (!val) return NaN;
    const cleanVal = val.replace(',', '.').trim();
    return parseFloat(cleanVal);
};
const formatGermanFloat = (val: number): string => {
    if (isNaN(val)) return "";
    return val.toFixed(2).replace('.', ',');
};

export const ReportView: React.FC<ReportViewProps> = ({ dataset, selection, comments }) => {

  // Prepare Data Structure
  const reportData = useMemo(() => {
    // 1. Identify all headers to display (Global List)
    // Extended pattern to catch HH+PHM and LFLFM
    const pattern = /(ICP|IC|TOC|TIT|M\d+\.|HH\+PHM|LFLFM)/;
    const allRelevantHeaders = dataset.resultHeaders.filter(h => pattern.test(h.toUpperCase()));

    // 2. Group Headers
    const groupedHeaders: Record<DeviceGroup, string[]> = {
      'pH-LF-TIT': [], 'TOC': [], 'IC': [], 'ICP-OES': [], 'Sonstige': []
    };

    allRelevantHeaders.forEach(h => {
      groupedHeaders[getDeviceGroup(h)].push(h);
    });

    // Sort within groups
    Object.keys(groupedHeaders).forEach(k => {
      const groupKey = k as DeviceGroup;
      // All groups including IC are sorted alphabetically now
      groupedHeaders[groupKey].sort((a, b) => a.localeCompare(b, 'de'));
    });

    // Flatten headers
    const orderedHeaders: { name: string, group: DeviceGroup, baseName: string }[] = [];
    GROUP_ORDER.forEach(group => {
      groupedHeaders[group].forEach(h => {
        orderedHeaders.push({ name: h, group, baseName: getBaseName(h) });
      });
    });

    // 3. Filter Rows
    const selectedRows = dataset.data.filter(r => selection.selectedRowIds.has(r.id));
    
    // Sort rows
    const sortedRows = selectedRows.sort((a, b) => {
        const seriesComp = a.seriesId.localeCompare(b.seriesId, undefined, { numeric: true });
        if (seriesComp !== 0) return seriesComp;
        const idComp = a.sampleId.localeCompare(b.sampleId, undefined, { numeric: true });
        if (idComp !== 0) return idComp;
        return (Number(a.isRepeat) - Number(b.isRepeat));
    });

    return {
      headers: orderedHeaders,
      rows: sortedRows
    };
  }, [dataset, selection.selectedRowIds]);

  // --- Color Logic (Per Row) ---
  const getRowColorClass = (rowId: string): { className: string, hexColor: string } => {
    // Get active base params for this row
    const activeParams = selection.rowParams[rowId] || new Set<string>();
    const s = Array.from(activeParams);
    
    if (s.length === 0) return { className: 'bg-white', hexColor: 'FFFFFF' };

    const has = (partial: string) => s.some((c: string) => c.toUpperCase().includes(partial.toUpperCase()));
    
    // Determine strict groups present in selection
    const hasTOC = has('TOC');
    const hasIC = has('IC');
    const hasICP = has('ICP');
    const hasPH = has('TIT') || has('M1.') || has('M3.') || has('M8.') || has('HH+PHM') || has('LFLFM');

    // -- Priority Colors First (P, S, N) --

    // Yellow: Only PPO4IC and PPgesICP (Prioritized)
    const isYellow = s.length > 0 && s.every((c: string) => {
        const u = c.toUpperCase();
        return u.includes('PPO4IC') || u.includes('PPGESICP');
    });
    if (isYellow) return { className: 'bg-yellow-100 border-l-4 border-l-yellow-500', hexColor: 'FFFFCC' };

    // Orange: Only SSO4IC and SSgesICP (Prioritized)
    const isOrange = s.length > 0 && s.every((c: string) => {
        const u = c.toUpperCase();
        return u.includes('SSO4IC') || u.includes('SSGESICP');
    });
    if (isOrange) return { className: 'bg-orange-100 border-l-4 border-l-orange-500', hexColor: 'FFDDBB' };

    // Pink: Only NNgesTOC and N-ICs (Prioritized)
    const isPink = s.length > 0 && s.every((c: string) => {
        const u = c.toUpperCase();
        return u.includes('NNGESTOC') || u.includes('NNH4IC') || u.includes('NNO2IC') || u.includes('NNO3IC') || u.includes('CGES');
    });
    if (isPink) return { className: 'bg-pink-100 border-l-4 border-l-pink-500', hexColor: 'FFCCFF' };

    // -- Device Group Colors (Secondary) --

    // Purple: Exclusively pH-LF-TIT group
    if (hasPH && !hasTOC && !hasIC && !hasICP) {
        return { className: 'bg-purple-100 border-l-4 border-l-purple-500', hexColor: 'E6CCFF' };
    }

    if (hasTOC && hasIC && !hasICP && !hasPH) return { className: 'bg-red-100 border-l-4 border-l-red-500', hexColor: 'FFCCCC' };
    if (hasIC && hasICP && !hasTOC && !hasPH) return { className: 'bg-blue-100 border-l-4 border-l-blue-500', hexColor: 'CCE5FF' };
    if (hasTOC && hasIC && hasICP) return { className: 'bg-green-100 border-l-4 border-l-green-500', hexColor: 'CCFFCC' };

    return { className: 'bg-white', hexColor: 'FFFFFF' };
  };

  // --- Logic to determine if a specific cell is active (input) or 'x' ---
  const isCellActive = (row: any, headerBaseName: string, headerFullName: string) => {
      // 1. Is the base parameter selected for this row?
      const isSelected = selection.rowParams[row.id]?.has(headerBaseName);
      if (!isSelected) return false;

      // 2. Does this specific column have a value?
      const val = row.results[headerFullName];
      return (val && val.trim() !== '');
  };

  // --- Excel Export ---
  const handleExcelExport = () => {
    const wb = XLSX.utils.book_new();
    
    // --- Sheet 1: Nachmessung ---
    const headerRow = ["Serie", "Probe", "Wdh.", ...reportData.headers.map(h => h.name)];
    const dataRows: any[] = [];
    
    // Styles - Set Font to Arial
    const styleHeader = { font: { name: "Arial", bold: true }, fill: { fgColor: { rgb: "EEEEEE" } }, border: { bottom: { style: "thin" } } };
    const styleDefault = { font: { name: "Arial" }, fill: { fgColor: { rgb: "FFFFFF" } } };
    const styleX = { font: { name: "Arial", color: { rgb: "FF0000" } }, alignment: { horizontal: "center" } };

    // Initialize with Header
    dataRows.push(headerRow.map(h => ({ v: h, s: styleHeader })));

    let currentRowIndex = 1;

    reportData.rows.forEach(row => {
        const colorStyle = getRowColorClass(row.id);
        const styleRowColor = { font: { name: "Arial" }, fill: { fgColor: { rgb: colorStyle.hexColor } } };

        const isRepeatStr = row.isRepeat ? "2" : "1";
        
        // Row 1: Original Data
        const row1: any[] = [
            { v: row.seriesId, s: styleRowColor },
            { v: row.sampleId, s: styleRowColor },
            { v: isRepeatStr, s: styleRowColor }
        ];
        
        reportData.headers.forEach(h => {
            const val = row.results[h.name];
            const numVal = parseFloat(val.replace(',', '.'));
            row1.push({ 
                v: isNaN(numVal) ? val : numVal, 
                t: isNaN(numVal) ? 's' : 'n',
                s: styleRowColor 
            });
        });
        dataRows.push(row1);

        // Row 2: Input (New)
        const row2: any[] = [
            { v: "", s: styleDefault }, { v: "Neu:", s: { font: { name: "Arial", italic: true } } }, { v: "", s: styleDefault }
        ];
        
        reportData.headers.forEach(h => {
            const active = isCellActive(row, h.baseName, h.name);
            if (!active) {
                row2.push({ v: "x", s: { ...styleX, border: { bottom: { style: "thin" } } } });
            } else {
                row2.push({ v: "", s: { font: { name: "Arial" }, border: { bottom: { style: "thin" } } } });
            }
        });
        dataRows.push(row2);

        // Row 3: Formula
        const row3: any[] = [
            { v: "", s: styleDefault }, { v: "Abw. %:", s: { font: { name: "Arial", italic: true } } }, { v: "", s: styleDefault }
        ];
        
        reportData.headers.forEach((_, colIdx) => {
            const excelCol = XLSX.utils.encode_col(colIdx + 3);
            const oldCellRef = `${excelCol}${currentRowIndex + 1}`;
            const newCellRef = `${excelCol}${currentRowIndex + 2}`;
            const formula = `IF(ISBLANK(${newCellRef}),"",(${newCellRef}-${oldCellRef})/${oldCellRef})`;
            
            row3.push({
                t: 'n',
                f: formula,
                z: '0.00%',
                s: { font: { name: "Arial", color: { rgb: "666666" } } }
            });
        });
        dataRows.push(row3);

        // Row 4: Spacer
        dataRows.push([]); 
        
        currentRowIndex += 4;
    });

    // --- Footer Section: Legend + Work Table side-by-side ---
    
    // Define Legend Items (Col 0)
    const legendItems = [
        { v: "Legende Farbmarkierung:", s: { font: { name: "Arial", bold: true } } },
        { v: "Nur P (PO4+Pges)", s: { font: { name: "Arial" }, fill: { fgColor: { rgb: "FFFFCC" } } } },
        { v: "Nur S (SO4+Sges)", s: { font: { name: "Arial" }, fill: { fgColor: { rgb: "FFDDBB" } } } },
        { v: "N+TC (TOC+IC)", s: { font: { name: "Arial" }, fill: { fgColor: { rgb: "FFCCFF" } } } },
        { v: "TOC + IC", s: { font: { name: "Arial" }, fill: { fgColor: { rgb: "FFCCCC" } } } },
        { v: "IC + ICP", s: { font: { name: "Arial" }, fill: { fgColor: { rgb: "CCE5FF" } } } },
        { v: "Alle Gruppen", s: { font: { name: "Arial" }, fill: { fgColor: { rgb: "CCFFCC" } } } },
        { v: "Nur pH-LF-TIT", s: { font: { name: "Arial" }, fill: { fgColor: { rgb: "E6CCFF" } } } }
    ];

    // Define Table Items (Cols 3, 4, 5 corresponding to D, E, F)
    const tableHeader = [
        { v: "Gerätegruppe", s: styleHeader }, 
        { v: "Erledigt von", s: styleHeader }, 
        { v: "Datum", s: styleHeader }
    ];
    
    const tableRows: any[][] = [];
    GROUP_ORDER.forEach(g => {
        if (g !== 'Sonstige') {
            tableRows.push([
                { v: g, s: { font: { name: "Arial" }, border: { right: { style: "thin" } } } }, 
                { v: "", s: { font: { name: "Arial" }, border: { bottom: { style: "thin" } } } }, 
                { v: "", s: { font: { name: "Arial" }, border: { bottom: { style: "thin" } } } }
            ]);
        }
    });

    dataRows.push([]); // Spacer row before footer

    const maxFooterRows = Math.max(legendItems.length, tableRows.length + 1);

    for (let i = 0; i < maxFooterRows; i++) {
        const row: any[] = [];
        
        // Col 0: Legend
        if (i < legendItems.length) {
            row[0] = legendItems[i];
        } else {
            row[0] = { v: "" };
        }

        // Col 1-2: Spacer
        row[1] = { v: "" };
        row[2] = { v: "" };

        // Col 3-5: Table (Excel Columns D, E, F)
        if (i === 0) {
            // Table Header
            row[3] = tableHeader[0];
            row[4] = tableHeader[1];
            row[5] = tableHeader[2];
        } else if (i <= tableRows.length) {
            // Table Body
            const tRow = tableRows[i-1];
            row[3] = tRow[0];
            row[4] = tRow[1];
            row[5] = tRow[2];
        }

        dataRows.push(row);
    }

    dataRows.push([]);
    dataRows.push([{ v: "Nach Eintragen der letzten noch ausstehenden Messergebnisse bitte in den Ordner \"Nachmessungen fertig\" auf G schieben! … und Theo bitte Bescheid geben, dass die Nachmessungen abgeschlossen sind.", s: { font: { name: "Arial", bold: true, color: { rgb: "FF0000" } }, fill: { fgColor: { rgb: "FFFF00" } } } }]);

    const ws = XLSX.utils.aoa_to_sheet(dataRows);
    const wscols = [{ wch: 10 }, { wch: 15 }, { wch: 5 }];
    reportData.headers.forEach(() => wscols.push({ wch: 12 }));
    ws['!cols'] = wscols;
    XLSX.utils.book_append_sheet(wb, ws, "Nachmessung");

    // --- Sheet 2: Ionenbilanz (Calculated) ---
    const ibHeaders = [
      "Probenkennung", "WDH", "Alkalinität", "Corg berechnet", "Leitfähigkeit",
      "Quotient ELF_eu_korr", "Quotient Kationen Anionen NFV", "Theo elekt Leit (EU) korr",
      "Q. LF/Theo (ber.)", "Bemerkung", "Kommentar"
    ];
    
    const h = dataset.resultHeaders;
    const colAlk = h.find(x => x.toLowerCase().startsWith('alkalinität-gran')) || '';
    const colCorg = h.find(x => x === 'Corg berechnet') || '';
    const colCond31 = h.find(x => x === 'LFLFLFM3.1') || '';
    const colCond13 = h.find(x => x === 'LFLFLFM1.3') || '';
    const colQElf = h.find(x => x === 'Quotient ELF_eu_korr') || '';
    const colQIon = h.find(x => x === 'Quotient Kationen Anionen NFV') || '';
    const colTheo = h.find(x => x === 'Theo elekt Leit (EU) korr') || '';

    const ibSorted = [...dataset.data].sort((a, b) => {
        const idComp = a.sampleId.localeCompare(b.sampleId, undefined, { numeric: true, sensitivity: 'base' });
        if (idComp !== 0) return idComp;
        return (Number(a.isRepeat) - Number(b.isRepeat));
    });

    const ibRows: any[] = [ibHeaders.map(val => ({ v: val, s: styleHeader }))];

    ibSorted.forEach(row => {
        const valAlk = colAlk ? row.results[colAlk] : '';
        const valC = colCorg ? row.results[colCorg] : '';
        const numCorg = parseGermanFloat(valC); // Fixed: Defined numCorg
        
        let valCond = '';
        let isFallback = false;
        const v31 = colCond31 ? row.results[colCond31] : '';
        const v13 = colCond13 ? row.results[colCond13] : '';
        if (v31 && v31.trim() !== '') { valCond = v31; }
        else if (v13 && v13.trim() !== '') { valCond = v13; isFallback = true; }

        const valQE = colQElf ? row.results[colQElf] : '';
        const valQI = colQIon ? row.results[colQIon] : '';
        const valT = colTheo ? row.results[colTheo] : '';

        const nQI = parseGermanFloat(valQI);
        // Rounding Logic
        const rQI = !isNaN(nQI) ? parseFloat(nQI.toFixed(2)) : NaN;
        const isIbOk = !isNaN(rQI) && rQI >= 0.9 && rQI <= 1.1;

        const nCond = parseGermanFloat(valCond);
        const nTheo = parseGermanFloat(valT);
        const nQElf = parseGermanFloat(valQE);

        let isLfOk = false;
        let cQ = NaN;

        if (!isNaN(nCond) && !isNaN(nTheo) && nTheo !== 0) {
            cQ = nCond / nTheo;
            if (nCond > 20) isLfOk = cQ >= 0.9 && cQ <= 1.1;
            else if (nCond >= 10) isLfOk = cQ >= 0.8 && cQ <= 1.2;
            else isLfOk = cQ >= 0.7 && cQ <= 1.3;
        }

        let bem = "";
        // Logic from IonBalanceAnalysis: No remark if repeat
        if (!row.isRepeat) {
            if (!isNaN(rQI) && !isNaN(cQ)) {
                if (isIbOk && isLfOk) bem = "ok";
                else if (isIbOk && !isLfOk) bem = "IB ok, LF nicht";
                else if (!isIbOk && isLfOk) bem = "IB nicht ok ; LF ok";
                else bem = "IB nicht ok + LF nicht ok";
            } else if (!isNaN(rQI)) {
                bem = isIbOk ? "IB ok" : "IB nicht ok";
            }
        }

        // --- Auto Comment Logic ---
        let autoComment = "";
        if (!row.isRepeat) {
            const isDeviation = !isIbOk || !isLfOk;

            // Prio 1: Corg > 20
            if (isDeviation && !isNaN(numCorg) && numCorg > 20) {
                autoComment = "Corg>20";
            }
            // Prio 2: Spezifischer Corg/LF Fall
            // Entfernt: && !isIbOk
            else if (isDeviation && !isNaN(numCorg) && numCorg > 10 && !isNaN(nCond) && nCond < 50) {
                autoComment = "Corg>10 LTF<50";
            }
            // Prio 3: Hohe Leitfähigkeit Warnung
            else if (!isNaN(nCond) && nCond > 300 && !isLfOk) {
                autoComment = "gilt nur für Ideal verdünnte Lösungen";
            }
            // Prio 4: Niedrige Leitfähigkeit
            else if (isDeviation && !isNaN(nCond) && nCond < 30) {
                autoComment = "Leitfähigkeit < 30";
            }
        }

        const condStyle = isFallback ? { font: { name: "Arial", color: { rgb: "FF0000" } } } : { font: { name: "Arial" } };
        const bemStyle = bem === 'ok' ? { font: { name: "Arial" }, fill: { fgColor: { rgb: "CCFFCC" } } } : (bem ? { font: { name: "Arial" }, fill: { fgColor: { rgb: "FFCCCC" } } } : { font: { name: "Arial" } });
        const defaultStyle = { font: { name: "Arial" } };

        // Add Comment Column
        // Use manually set comment if available, otherwise use autoComment
        const comment = comments[row.id] || autoComment;

        ibRows.push([
            { v: row.sampleId, s: defaultStyle },
            { v: row.isRepeat ? "ja" : "nein", s: defaultStyle },
            { v: valAlk, s: defaultStyle },
            { v: valC, s: defaultStyle },
            { v: valCond, s: condStyle },
            { v: formatGermanFloat(nQElf), s: defaultStyle },
            { v: formatGermanFloat(rQI), s: defaultStyle },
            { v: isNaN(nTheo) ? "" : nTheo.toFixed(1).replace('.', ','), s: defaultStyle },
            { v: formatGermanFloat(cQ), s: defaultStyle },
            { v: bem, s: bemStyle },
            { v: comment, s: defaultStyle } // New Column
        ]);
    });

    const wsIB = XLSX.utils.aoa_to_sheet(ibRows);
    XLSX.utils.book_append_sheet(wb, wsIB, "Ionenbilanz");

    XLSX.writeFile(wb, `Nachmessung_${dataset.fileName.replace('.csv', '')}.xlsx`);
  };

  if (reportData.rows.length === 0 || reportData.headers.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-lg border border-slate-200 m-4">
              <p>Bitte wählen Sie im Tab "Auswahl" Proben aus.</p>
          </div>
      );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="font-medium text-slate-900">Nachmessung Export Vorschau</h3>
          <p className="text-xs text-slate-500">
             Farbcode basierend auf individueller Auswahl. 'x' markiert nicht ausgewählte oder leere Parameter.
          </p>
        </div>
        <button 
          onClick={handleExcelExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Als XLSX exportieren
        </button>
      </div>

      <div className="flex-grow bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-grow p-4">
            
            {/* Legend visual in UI */}
            <div className="flex flex-wrap gap-4 mb-4 text-xs">
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-100 border border-yellow-500"></div> P (PO4+Pges)</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-100 border border-orange-500"></div> S (SO4+Sges)</div>
                {/* Changed Label Here */}
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-pink-100 border border-pink-500"></div> N+TC (TOC+IC)</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-100 border border-red-500"></div> TOC+IC</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-100 border border-blue-500"></div> IC+ICP</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-100 border border-green-500"></div> Alle</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-purple-100 border border-purple-500"></div> pH-LF-TIT</div>
            </div>

            <table className="w-full text-sm text-left whitespace-nowrap border-collapse">
                <thead>
                    <tr>
                        <th className="border p-2 bg-slate-100 font-bold min-w-[80px]">Serie</th>
                        <th className="border p-2 bg-slate-100 font-bold min-w-[100px]">Probe</th>
                        <th className="border p-2 bg-slate-100 font-bold w-12 text-center">Wdh</th>
                        {reportData.headers.map(h => (
                            <th key={h.name} className="border p-2 bg-slate-100 text-blue-800 font-medium min-w-[100px]">
                                <div className="text-[10px] text-slate-500">{h.group}</div>
                                {h.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {reportData.rows.map(row => {
                        const colorStyle = getRowColorClass(row.id);
                        return (
                            <React.Fragment key={row.id}>
                                {/* Row 1: Values */}
                                <tr className={`${colorStyle.className}`}>
                                    <td className="border p-2 font-medium">{row.seriesId}</td>
                                    <td className="border p-2">{row.sampleId}</td>
                                    <td className="border p-2 text-center">{row.isRepeat ? '2' : '1'}</td>
                                    {reportData.headers.map(h => (
                                        <td key={h.name} className="border p-2 text-right">
                                            {row.results[h.name]}
                                        </td>
                                    ))}
                                </tr>
                                
                                {/* Row 2: Input Placeholder with 'x' logic */}
                                <tr className="bg-slate-50/50">
                                    <td colSpan={3} className="border p-2 text-right text-xs italic text-slate-500">Neuer Wert:</td>
                                    {reportData.headers.map(h => {
                                        const active = isCellActive(row, h.baseName, h.name);
                                        return (
                                            <td key={h.name} className="border p-2 bg-white text-center text-red-500 font-bold">
                                                {active ? (
                                                    <div className="h-4 border-b border-slate-300"></div>
                                                ) : (
                                                    "x"
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>

                                {/* Row 3: Deviation Placeholder */}
                                <tr className="bg-slate-50/50">
                                    <td colSpan={3} className="border p-2 text-right text-xs italic text-slate-500">Abweichung %:</td>
                                    {reportData.headers.map(h => (
                                        <td key={h.name} className="border p-2 text-right text-xs text-slate-400">
                                            (Formel)
                                        </td>
                                    ))}
                                </tr>

                                {/* Spacer */}
                                <tr><td colSpan={3 + reportData.headers.length} className="h-4 bg-slate-100"></td></tr>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
            
            <div className="mt-8 max-w-2xl">
                 <div className="p-4 bg-yellow-200 text-red-600 font-bold border border-yellow-300">
                    Nach Eintragen der letzten noch ausstehenden Messergebnisse bitte in den Ordner "Nachmessungen fertig" auf G schieben! … und Theo bitte Bescheid geben, dass die Nachmessungen abgeschlossen sind.
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};