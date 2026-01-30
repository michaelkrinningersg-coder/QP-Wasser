import React, { useMemo } from 'react';
import { ParsedDataset } from '../types';
import { AlertTriangle, Check, FileCheck } from 'lucide-react';

interface RawDataViewerProps {
  dataset: ParsedDataset;
}

export const RawDataViewer: React.FC<RawDataViewerProps> = ({ dataset }) => {
  
  // Memoize header rendering for performance
  const headers = useMemo(() => dataset.resultHeaders, [dataset]);

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-full">
            <FileCheck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-slate-900">{dataset.fileName}</h3>
            <p className="text-xs text-slate-500">
              Importiert am {dataset.uploadDate.toLocaleString()} • {dataset.data.length} Zeilen
            </p>
          </div>
        </div>
        <div className="text-sm text-slate-500">
          <span className="font-medium">{dataset.resultHeaders.length}</span> Ergebnisse erkannt
        </div>
      </div>

      <div className="flex-grow bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-grow">
          <table className="w-full text-sm text-left text-slate-600 whitespace-nowrap">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th scope="col" className="px-6 py-3 border-b border-slate-200 bg-slate-50 font-bold min-w-[100px]">
                  Serie (Sp1)
                </th>
                <th scope="col" className="px-6 py-3 border-b border-slate-200 bg-slate-50 font-bold min-w-[150px]">
                  Probenkennung (Sp2)
                </th>
                <th scope="col" className="px-6 py-3 border-b border-slate-200 bg-slate-50 font-bold text-center min-w-[80px]">
                  Wdh? (Sp4)
                </th>
                {headers.map((header, idx) => (
                  <th key={idx} scope="col" className="px-6 py-3 border-b border-slate-200 bg-slate-50 min-w-[120px] text-blue-800">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dataset.data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-900">
                    {row.seriesId}
                  </td>
                  <td className="px-6 py-3">
                    {row.sampleId}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {row.isRepeat ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Ja
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  {headers.map((header, idx) => (
                    <td key={idx} className="px-6 py-3">
                      {row.results[header]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          
          {dataset.data.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <p>Keine Datenzeilen gefunden.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
