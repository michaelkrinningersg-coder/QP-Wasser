import React, { useState } from 'react';
import { TabNavigation } from './components/TabNavigation';
import { FileUpload } from './components/FileUpload';
import { RawDataViewer } from './components/RawDataViewer';
import { IonBalanceAnalysis } from './components/IonBalanceAnalysis';
import { DataSelection } from './components/DataSelection';
import { ReportView } from './components/ReportView';
import { AppTab, ParsedDataset, SelectionState } from './types';
import { parseLabDataCsv } from './services/csvService';
import { CheckCircle2 } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.IMPORT);
  const [parsedData, setParsedData] = useState<ParsedDataset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);

  // Selection State
  const [selection, setSelection] = useState<SelectionState>({
    selectedRowIds: new Set(),
    rowParams: {}
  });

  // Comments State (Lifted from IonBalanceAnalysis)
  const [comments, setComments] = useState<Record<string, string>>({});

  // Helper to extract base name (removes numeric suffix like 1.3 or 20.1)
  const getBaseParamName = (header: string) => {
    // Matches suffix like "5.1", "20.1", "1.3" at the end of string
    return header.replace(/\d+\.\d+$/, '');
  };

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setShowSuccessMsg(false);

    try {
      const data = await parseLabDataCsv(file);
      setParsedData(data);
      
      // Initialize Selection: 
      // 1. Rows are DESELECTED by default (Set is empty).
      // 2. Parameters are ALL SELECTED by default for every row (so when a user selects a row, params are ready).
      const initialRowIds = new Set<string>(); // Empty by default per requirement
      const initialRowParams: Record<string, Set<string>> = {};
      
      // Reset comments on new file load
      setComments({});

      data.data.forEach(row => {
        // We do NOT add row.id to initialRowIds
        
        const rowParamSet = new Set<string>();
        data.resultHeaders.forEach(header => {
           const val = row.results[header];
           // Only select if value exists and is not empty
           if (val && val.trim() !== '') {
               const baseName = getBaseParamName(header);
               rowParamSet.add(baseName);
           }
        });
        initialRowParams[row.id] = rowParamSet;
      });

      setSelection({
        selectedRowIds: initialRowIds,
        rowParams: initialRowParams
      });

      setIsLoading(false);
      setShowSuccessMsg(true);
      
      setTimeout(() => {
        setShowSuccessMsg(false);
        setActiveTab(AppTab.RAW_DATA);
      }, 1500);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unbekannter Fehler beim Parsen.");
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case AppTab.IMPORT:
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <FileUpload 
              onFileSelect={handleFileSelect} 
              isLoading={isLoading} 
              error={error} 
            />
            
            {showSuccessMsg && (
               <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full animate-fade-in-up">
                 <CheckCircle2 className="w-5 h-5" />
                 <span className="font-medium">Datei erfolgreich eingelesen! Wechsel zu Rohdaten...</span>
               </div>
            )}
          </div>
        );
      case AppTab.RAW_DATA:
        return parsedData ? <RawDataViewer dataset={parsedData} /> : null;
      case AppTab.ION_BALANCE:
        return parsedData ? (
          <IonBalanceAnalysis 
            dataset={parsedData} 
            comments={comments}
            setComments={setComments}
          />
        ) : null;
      case AppTab.SELECTION:
        return parsedData ? (
          <DataSelection 
            dataset={parsedData} 
            selection={selection} 
            setSelection={setSelection} 
          />
        ) : null;
      case AppTab.REPORT:
        return parsedData ? (
          <ReportView 
            dataset={parsedData} 
            selection={selection} 
            comments={comments}
          />
        ) : null;
      case AppTab.EXPORT:
        return (
          <div className="flex flex-col items-center justify-center h-96 text-slate-400 bg-white rounded-lg border border-slate-200 border-dashed m-4">
             <p className="text-lg font-medium">Sonstiger Export</p>
             <p className="text-sm">Für die spezielle Nachmessungs-Tabelle bitte den Tab "Nachmessung" verwenden.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              L
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">QP-Wasser Version 0.2.2</h1>
          </div>
        </div>
      </header>

      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        isDataLoaded={!!parsedData}
      />

      <main className="flex-grow max-w-[95%] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;