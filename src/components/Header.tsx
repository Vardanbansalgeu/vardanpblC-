import React from 'react';
import {
  FileCode2,
  Binary,
  GitFork,
  Cpu,
  FileArchive,
  CheckCircle2,
  Terminal,
  FilePlus,
  Upload,
} from 'lucide-react';

export type ActiveTab =
  | 'files'
  | 'frequency'
  | 'tree'
  | 'bitwriter'
  | 'compress'
  | 'decompress'
  | 'verify'
  | 'terminal';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onNewFile: () => void;
  onUploadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onNewFile,
  onUploadFile,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'files', label: 'File Manager', icon: <FileCode2 className="w-4 h-4" /> },
    { id: 'frequency', label: 'Frequency & Codes', icon: <Binary className="w-4 h-4" /> },
    { id: 'tree', label: 'Huffman Tree', icon: <GitFork className="w-4 h-4" /> },
    { id: 'bitwriter', label: 'BitWriter Lab', icon: <Cpu className="w-4 h-4" /> },
    { id: 'compress', label: 'Compress (SFL1)', icon: <FileArchive className="w-4 h-4" /> },
    { id: 'decompress', label: 'Decompress', icon: <FileArchive className="w-4 h-4" /> },
    { id: 'verify', label: 'Verify Files', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'terminal', label: 'C++ Terminal', icon: <Terminal className="w-4 h-4" /> },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/95 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-6">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Binary className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight whitespace-nowrap">
                SmartFile Compressor
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-mono text-slate-500">
                SFL1 · Huffman DSA
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action Button */}
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={onUploadFile}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap shrink-0"
              title="Upload file from your computer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>
            <button
              onClick={onNewFile}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors shadow-sm whitespace-nowrap shrink-0"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>New File</span>
            </button>
          </div>
        </div>

        {/* Mobile Nav Bar */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto pb-2.5 pt-1 border-t border-slate-900 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
