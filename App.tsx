import React, { useState, useEffect } from 'react';
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

  // NEU: Funktion zum Speichern in die Cloud
  const saveToCloud = async (showSuccessAlert = true) => {
    if (!parsedData) {
      if (showSuccessAlert) alert("Keine Daten zum Speichern vorhanden!");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/saveState', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parsedData,
          comments,
          selection: {
            ...selection,
            // Set in Array umwandeln für JSON
            selectedRowIds: Array.from(selection.selectedRowIds)
          }
        })
      });

      if (response.ok) {
        if (showSuccessAlert) alert('Stand erfolgreich für alle in der Cloud gespeichert!');
      } else {
        if (showSuccessAlert) alert('Fehler beim Speichern.');
      }
    } catch (error) {
      console.error("Cloud Save Error:", error);
      if (showSuccessAlert) alert('Netzwerkfehler beim Speichern.');
    } finally {
      setIsLoading(false);
    }
  };

  // NEU: Funktion zum Laden aus der Cloud
  const loadFromCloud = async (showSuccessAlert = false) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/getState');
      if (!response.ok) {
        if (showSuccessAlert) alert('Kein gespeicherter Stand gefunden oder Fehler beim Laden.');
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      
      setParsedData(data.parsedData);
      setComments(data.comments || {});
      
      // Array zurück in Set umwandeln
      const newSelection = {
        ...data.selection,
        selectedRowIds: new Set(data.selection.selectedRowIds)
      };
      
      // rowParams Sets wiederherstellen
      if (data.selection.rowParams) {
        Object.keys(data.selection.rowParams).forEach(rowId => {
          newSelection.rowParams[rowId] = new Set(data.selection.rowParams[rowId]);
        });
      }
      
      setSelection(newSelection);
      
      if (showSuccessAlert) alert('Stand erfolgreich aus der Cloud geladen!');
      setActiveTab(AppTab.RAW_DATA);
    } catch (error) {
      console.error("Cloud Load Error:", error);
      if (showSuccessAlert) alert('Netzwerkfehler beim Laden.');
    } finally {
      setIsLoading(false);
    }
  };

  // NEU: Automatisches Laden beim Start
  useEffect(() => {
    loadFromCloud(false); // Lade ohne Alert-Popups beim Start
  }, []);

  // NEU: Automatisches Speichern alle 120 Sekunden
  useEffect(() => {
    if (!parsedData) return; // Nur speichern, wenn Daten vorhanden sind

    const intervalId = setInterval(() => {
      saveToCloud(false); // Speichern ohne Alert-Popups
    }, 120000); // 120.000 Millisekunden = 120 Sekunden

    return () => clearInterval(intervalId); // Cleanup beim Unmounten
  }, [parsedData, selection, comments]); // Abhängigkeiten, damit immer der aktuellste State gespeichert wird

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
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">QP-Wasser Version 0.2.4</h1>
          </div>
          
          {/* NEU: Cloud Buttons */}
          <div className="flex gap-2">
            <button 
              onClick={() => loadFromCloud(true)}
              disabled={isLoading}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Aus Cloud laden
            </button>
            <button 
              onClick={saveToCloud}
              disabled={isLoading || !parsedData}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium transition-colors disabled:opacity-50"
            >
              In Cloud speichern
            </button>
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