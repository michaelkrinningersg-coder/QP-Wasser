import React from 'react';
import { AppTab } from '../types';
import { Upload, FileSpreadsheet, Calculator, FileOutput, CheckSquare, FileBarChart } from 'lucide-react';

interface TabNavigationProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  isDataLoaded: boolean;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange, isDataLoaded }) => {
  
  const getTabClass = (tab: AppTab, disabled: boolean = false) => {
    const base = "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200 whitespace-nowrap";
    if (disabled) return `${base} text-slate-400 border-transparent cursor-not-allowed`;
    if (activeTab === tab) return `${base} border-blue-600 text-blue-600 bg-blue-50/50`;
    return `${base} border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50`;
  };

  return (
    <div className="w-full border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm overflow-x-auto">
      <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex -mb-px">
          <button
            onClick={() => onTabChange(AppTab.IMPORT)}
            className={getTabClass(AppTab.IMPORT)}
          >
            <Upload className="w-4 h-4" />
            Import
          </button>

          <button
            onClick={() => isDataLoaded && onTabChange(AppTab.RAW_DATA)}
            disabled={!isDataLoaded}
            className={getTabClass(AppTab.RAW_DATA, !isDataLoaded)}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Rohdaten
          </button>

          <button
            onClick={() => isDataLoaded && onTabChange(AppTab.ION_BALANCE)}
            disabled={!isDataLoaded}
            className={getTabClass(AppTab.ION_BALANCE, !isDataLoaded)}
          >
            <Calculator className="w-4 h-4" />
            Ionenbilanz
          </button>

          <button
            onClick={() => isDataLoaded && onTabChange(AppTab.SELECTION)}
            disabled={!isDataLoaded}
            className={getTabClass(AppTab.SELECTION, !isDataLoaded)}
          >
            <CheckSquare className="w-4 h-4" />
            Auswahl
          </button>

          <button
            onClick={() => isDataLoaded && onTabChange(AppTab.REPORT)}
            disabled={!isDataLoaded}
            className={getTabClass(AppTab.REPORT, !isDataLoaded)}
          >
            <FileBarChart className="w-4 h-4" />
            Nachmessung
          </button>

          <button
            onClick={() => isDataLoaded && onTabChange(AppTab.EXPORT)}
            disabled={!isDataLoaded}
            className={getTabClass(AppTab.EXPORT, !isDataLoaded)}
          >
            <FileOutput className="w-4 h-4" />
            Export (Sonstiges)
          </button>
        </div>
      </div>
    </div>
  );
};