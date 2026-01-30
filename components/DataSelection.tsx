import React, { useMemo } from 'react';
import { ParsedDataset, SelectionState } from '../types';
import { CheckSquare, Square, Check, X } from 'lucide-react';

interface DataSelectionProps {
  dataset: ParsedDataset;
  selection: SelectionState;
  setSelection: React.Dispatch<React.SetStateAction<SelectionState>>;
}

// Reuse Device Group Logic locally to avoid circular deps or complex refactoring
type DeviceGroup = 'pH-LF-TIT' | 'TOC' | 'IC' | 'ICP-OES' | 'Sonstige';
const GROUP_ORDER: DeviceGroup[] = ['pH-LF-TIT', 'TOC', 'IC', 'ICP-OES', 'Sonstige'];

const getDeviceGroup = (headerBase: string): DeviceGroup => {
  const h = headerBase.toUpperCase();
  if (h.includes('TIT') || h.includes('M1.') || h.includes('M3.') || h.includes('M8.') || h.includes('HH+PHM') || h.includes('LFLFM')) return 'pH-LF-TIT';
  if (h.includes('TOC')) return 'TOC';
  if (h.includes('ICP')) return 'ICP-OES'; 
  if (h.includes('IC')) return 'IC';
  return 'Sonstige';
};

export const DataSelection: React.FC<DataSelectionProps> = ({ dataset, selection, setSelection }) => {
  
  // 1. Identify relevant headers
  const relevantHeaders = useMemo(() => {
    // Extended pattern to catch HH+PHM and LFLFM if they don't match standard prefixes
    const pattern = /(ICP|IC|TOC|TIT|M\d+\.|HH\+PHM|LFLFM)/;
    return dataset.resultHeaders.filter(h => pattern.test(h.toUpperCase()));
  }, [dataset]);

  // 2. Base Name Helper
  const getBaseName = (header: string) => header.replace(/\d+\.\d+$/, '');

  // 3. Helper: Clean Param Name (Remove Prefixes)
  const formatParamName = (baseName: string) => {
    return baseName.replace(/^(TIT|ICP|IC|TOC)/i, '');
  };

  // 4. Helper: Get Color Style based on Group
  const getParamColor = (baseName: string) => {
    const group = getDeviceGroup(baseName);
    switch (group) {
        case 'ICP-OES': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'IC': return 'bg-red-100 text-red-800 border-red-200';
        case 'TOC': return 'bg-green-100 text-green-800 border-green-200';
        case 'pH-LF-TIT': return 'bg-purple-100 text-purple-800 border-purple-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // 5. Map Rows to Available Base Params AND Sort them
  const rowAvailableParams = useMemo(() => {
    const map: Record<string, string[]> = {};
    dataset.data.forEach(row => {
        const available = new Set<string>();
        relevantHeaders.forEach(h => {
            const val = row.results[h];
            if (val && val.trim() !== '') {
                available.add(getBaseName(h));
            }
        });
        
        // Custom Sorting: Group Order -> Alpha (IC no longer separated)
        const sorted = Array.from(available).sort((a, b) => {
            const gA = getDeviceGroup(a);
            const gB = getDeviceGroup(b);
            
            // 1. Group Order
            const idxA = GROUP_ORDER.indexOf(gA);
            const idxB = GROUP_ORDER.indexOf(gB);
            if (idxA !== idxB) return idxA - idxB;

            // 2. Alphabetical (Standard for all groups including IC)
            return a.localeCompare(b);
        });

        map[row.id] = sorted;
    });
    return map;
  }, [dataset, relevantHeaders]);

  // --- Actions ---

  const toggleRow = (id: string) => {
    setSelection(prev => {
      const newSet = new Set(prev.selectedRowIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return { ...prev, selectedRowIds: newSet };
    });
  };

  const toggleAllRows = () => {
    if (selection.selectedRowIds.size === dataset.data.length) {
      setSelection(prev => ({ ...prev, selectedRowIds: new Set<string>() }));
    } else {
      setSelection(prev => ({ ...prev, selectedRowIds: new Set(dataset.data.map(r => r.id)) }));
    }
  };

  const toggleRowParam = (rowId: string, baseParam: string) => {
    setSelection(prev => {
        const currentParams = prev.rowParams[rowId] ? new Set(prev.rowParams[rowId]) : new Set<string>();
        if (currentParams.has(baseParam)) {
            currentParams.delete(baseParam);
        } else {
            currentParams.add(baseParam);
        }
        return {
            ...prev,
            rowParams: {
                ...prev.rowParams,
                [rowId]: currentParams
            }
        };
    });
  };

  const toggleAllParamsForRow = (rowId: string, availableParams: string[]) => {
      setSelection(prev => {
        const currentParams = prev.rowParams[rowId] || new Set<string>();
        const allSelected = availableParams.every(p => currentParams.has(p));
        
        const newParams = new Set(currentParams);
        if (allSelected) {
            availableParams.forEach(p => newParams.delete(p));
        } else {
            availableParams.forEach(p => newParams.add(p));
        }

        return {
            ...prev,
            rowParams: {
                ...prev.rowParams,
                [rowId]: newParams
            }
        };
      });
  };

  // Toggle specific group for a row (e.g., select all IC)
  const toggleGroupForRow = (rowId: string, group: DeviceGroup, rowParams: string[]) => {
      const paramsInGroup = rowParams.filter(p => getDeviceGroup(p) === group);
      if (paramsInGroup.length === 0) return;

      setSelection(prev => {
          const currentParams = prev.rowParams[rowId] || new Set<string>();
          const allInGroupSelected = paramsInGroup.every(p => currentParams.has(p));
          
          const newParams = new Set(currentParams);
          if (allInGroupSelected) {
              paramsInGroup.forEach(p => newParams.delete(p));
          } else {
              paramsInGroup.forEach(p => newParams.add(p));
          }

          return {
              ...prev,
              rowParams: {
                  ...prev.rowParams,
                  [rowId]: newParams
              }
          };
      });
  };

  // Toggle specific chemical sets (P, S, N)
  const toggleChemSet = (rowId: string, type: 'P' | 'S' | 'N', rowParams: string[]) => {
      let targetParams: string[] = [];
      if (type === 'P') {
          targetParams = rowParams.filter(p => {
              const u = p.toUpperCase();
              return u.includes('PPO4IC') || u.includes('PPGESICP');
          });
      } else if (type === 'S') {
          targetParams = rowParams.filter(p => {
              const u = p.toUpperCase();
              return u.includes('SSO4IC') || u.includes('SSGESICP');
          });
      } else if (type === 'N') {
          targetParams = rowParams.filter(p => {
              const u = p.toUpperCase();
              return u.includes('NNGESTOC') || u.includes('NNH4IC') || u.includes('NNO2IC') || u.includes('NNO3IC') || u.includes('CGES');
          });
      }

      if (targetParams.length === 0) return;

      setSelection(prev => {
          // Logic: Select specifically THESE and nothing else? Or toggle them?
          // Prompt says: "bei P ausschließlich ... auswählen"
          // This implies DESELECT everything else and SELECT these.

          const newParams = new Set<string>();
          
          targetParams.forEach(p => newParams.add(p));

          return {
              ...prev,
              rowParams: {
                  ...prev.rowParams,
                  [rowId]: newParams
              }
          };
      });
  };

  // Helper to get short label for buttons
  const getGroupLabel = (g: DeviceGroup) => {
      if (g === 'ICP-OES') return 'ICP';
      if (g === 'pH-LF-TIT') return 'TIT';
      return g;
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-12rem)]">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="font-semibold text-slate-800">Proben & Parameter Auswahl</h3>
            <p className="text-xs text-slate-500 mt-1">
                Proben aktivieren, um Parameter zu sehen. Parameter sind standardmäßig alle aktiv.
            </p>
          </div>
          <button 
             onClick={toggleAllRows}
             className="text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1 border border-blue-200 rounded bg-blue-50"
          >
            {selection.selectedRowIds.size === dataset.data.length ? 'Alle Proben abwählen' : 'Alle Proben auswählen'}
          </button>
        </div>

        <div className="p-0 overflow-y-auto flex-grow bg-white">
            <div className="divide-y divide-slate-100">
            {dataset.data.map((row) => {
                const isRowSelected = selection.selectedRowIds.has(row.id);
                const availableParams = rowAvailableParams[row.id] || [];
                const selectedParams = selection.rowParams[row.id] || new Set();
                const selectedCount = availableParams.filter(p => selectedParams.has(p)).length;

                // Identify which groups are present in this row to show buttons
                const groupsInRow = (Array.from(new Set(availableParams.map(p => getDeviceGroup(p)))) as DeviceGroup[])
                    .sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));

                return (
                    <div key={row.id} className={`flex flex-col border-b border-slate-100 last:border-0 ${isRowSelected ? 'bg-blue-50/10' : 'opacity-60 bg-slate-50'}`}>
                        {/* Row Layout */}
                        <div className="flex items-center px-4 py-3 gap-4">
                            {/* Checkbox & ID Area */}
                            <div 
                                onClick={() => toggleRow(row.id)}
                                className="cursor-pointer flex items-center gap-2 flex-shrink-0 w-48"
                            >
                                <div className={`${isRowSelected ? 'text-blue-600' : 'text-slate-300'}`}>
                                    {isRowSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-sm font-bold ${isRowSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                                        {row.sampleId}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        {row.isRepeat ? 'Wiederholung' : ''}
                                    </span>
                                </div>
                            </div>

                            {/* Group Toggles + P/S/N */}
                            {isRowSelected && (
                                <div className="flex flex-col gap-1 mr-2 border-r border-slate-100 pr-2">
                                    <div className="flex gap-1">
                                        {groupsInRow.map(g => {
                                            const paramsInGroup = availableParams.filter(p => getDeviceGroup(p) === g);
                                            const allInGroupSelected = paramsInGroup.every(p => selectedParams.has(p));
                                            return (
                                                <button
                                                    key={g}
                                                    onClick={(e) => { e.stopPropagation(); toggleGroupForRow(row.id, g, availableParams); }}
                                                    className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider transition-colors w-10 text-center
                                                        ${allInGroupSelected 
                                                            ? 'bg-slate-700 text-white border-slate-700 hover:bg-slate-600' 
                                                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400 hover:text-slate-600'}
                                                    `}
                                                    title={`Gruppe ${g} umschalten`}
                                                >
                                                    {getGroupLabel(g)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex gap-1 mt-0.5">
                                        {['P', 'S', 'N'].map(t => (
                                            <button
                                                key={t}
                                                onClick={(e) => { e.stopPropagation(); toggleChemSet(row.id, t as 'P'|'S'|'N', availableParams); }}
                                                className="text-[9px] px-1.5 py-0.5 rounded border border-orange-200 bg-orange-50 text-orange-800 font-bold hover:bg-orange-100 w-6 text-center"
                                                title={`Nur ${t}-Parameter auswählen`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Parameter Tags Area */}
                            {isRowSelected && (
                                <div className="flex-grow flex items-center gap-2">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); toggleAllParamsForRow(row.id, availableParams); }}
                                        className="text-[10px] font-bold text-slate-400 hover:text-blue-600 mr-2 uppercase tracking-wider flex-shrink-0"
                                        title={selectedCount === availableParams.length ? 'Alle abwählen' : 'Alle auswählen'}
                                    >
                                        {selectedCount === availableParams.length ? <X className="w-3 h-3"/> : <Check className="w-3 h-3"/>}
                                    </button>

                                    <div className="flex flex-wrap gap-1.5">
                                        {availableParams.length > 0 ? availableParams.map(param => {
                                            const isParamSelected = selectedParams.has(param);
                                            const displayName = formatParamName(param);
                                            const colorClass = getParamColor(param);
                                            
                                            return (
                                                <button
                                                    key={param}
                                                    onClick={(e) => { e.stopPropagation(); toggleRowParam(row.id, param); }}
                                                    className={`
                                                        px-2 py-0.5 text-[10px] font-medium rounded border transition-all
                                                        ${isParamSelected 
                                                            ? `${colorClass} shadow-sm` 
                                                            : 'bg-white text-slate-300 border-slate-100 hover:bg-slate-50 line-through decoration-slate-300'}
                                                    `}
                                                    title={param}
                                                >
                                                    {displayName}
                                                </button>
                                            );
                                        }) : (
                                            <span className="text-xs text-slate-300 italic">Keine Parameter</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
            </div>
        </div>
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 text-center">
            {selection.selectedRowIds.size} Proben ausgewählt
        </div>
    </div>
  );
};