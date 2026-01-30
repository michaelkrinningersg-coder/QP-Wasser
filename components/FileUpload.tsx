import React, { useCallback, useState } from 'react';
import { UploadCloud, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading, error }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndPassFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndPassFile(e.target.files[0]);
    }
  };

  const validateAndPassFile = (file: File) => {
    if (file.name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel') {
      onFileSelect(file);
    } else {
      alert("Bitte laden Sie eine .csv Datei hoch.");
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-semibold text-slate-800 mb-2">Datei Import</h2>
      <p className="text-sm text-slate-500 mb-6">
        Laden Sie hier die CSV-Datei hoch. Das System erwartet die Probenkennungen in Spalte 2, 
        Ergebnisse ab Spalte 8 und die Ergebnisnamen in Zeile 2.
      </p>

      <div 
        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          id="dropzone-file" 
          type="file" 
          className="hidden" 
          accept=".csv"
          onChange={handleChange}
        />
        
        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-full">
          {isLoading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
              <p className="text-sm text-slate-500">Datei wird verarbeitet...</p>
            </div>
          ) : (
            <>
              <UploadCloud className={`w-12 h-12 mb-3 ${dragActive ? 'text-blue-500' : 'text-slate-400'}`} />
              <p className="mb-2 text-sm text-slate-600">
                <span className="font-semibold">Klicken zum Auswählen</span> oder Datei hierher ziehen
              </p>
              <p className="text-xs text-slate-500">CSV Dateien</p>
            </>
          )}
        </label>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Fehler beim Einlesen:</p>
            <p>{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
