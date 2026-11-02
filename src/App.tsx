import React, { useState, useEffect } from 'react';
import {
  FileCode2,
  Binary,
  GitFork,
  Cpu,
  FileArchive,
  CheckCircle2,
  Terminal,
  FolderOpen,
  ArrowRight,
  Info,
  Layers,
} from 'lucide-react';
import { Header, ActiveTab } from './components/Header';
import { FileEditorReader } from './components/FileEditorReader';
import { FrequencyCodesPanel } from './components/FrequencyCodesPanel';
import { TreeVisualizer } from './components/TreeVisualizer';
import { BitWriterLab } from './components/BitWriterLab';
import { CompressionPanel } from './components/CompressionPanel';
import { DecompressionPanel } from './components/DecompressionPanel';
import { VerificationPanel } from './components/VerificationPanel';
import { TerminalConsole } from './components/TerminalConsole';
import { VirtualFile, getInitialFiles } from './lib/virtualFs';

export default function App() {
  const [files, setFiles] = useState<VirtualFile[]>(() => {
    const initial = getInitialFiles();
    return Array.from(initial.values());
  });

  const [activeFileName, setActiveFileName] = useState<string>('huffman_essay.txt');
  const [activeTab, setActiveTab] = useState<ActiveTab>('files');
  const [verifyPair, setVerifyPair] = useState<{ orig?: string; decomp?: string }>({});

  const activeFile = files.find((f) => f.name === activeFileName) || files[0] || null;

  // Option 1: Create File
  const handleCreateFile = (name: string, content: string) => {
    const bytes = new TextEncoder().encode(content);
    const newFile: VirtualFile = {
      name,
      data: bytes,
      size: bytes.length,
      lastModified: Date.now(),
      isSfl1: name.endsWith('.sfl1'),
    };

    setFiles((prev) => {
      const existing = prev.findIndex((f) => f.name === name);
      if (existing >= 0) {
        const copy = [...prev];
        copy[existing] = newFile;
        return copy;
      }
      return [...prev, newFile];
    });
    setActiveFileName(name);
  };

  // Option 3: Copy File
  const handleCopyFile = (sourceName: string, destName: string): boolean => {
    const source = files.find((f) => f.name === sourceName);
    if (!source) return false;
    if (sourceName === destName) {
      alert('Source and destination filenames must be different.');
      return false;
    }

    const cloned: VirtualFile = {
      name: destName,
      data: new Uint8Array(source.data),
      size: source.size,
      lastModified: Date.now(),
      isSfl1: destName.endsWith('.sfl1'),
    };

    setFiles((prev) => [...prev, cloned]);
    setActiveFileName(destName);
    return true;
  };

  // Delete file
  const handleDeleteFile = (name: string) => {
    if (files.length <= 1) {
      alert('Cannot delete the last remaining file in the virtual filesystem.');
      return;
    }
    setFiles((prev) => prev.filter((f) => f.name !== name));
    if (activeFileName === name) {
      const remaining = files.filter((f) => f.name !== name);
      setActiveFileName(remaining[0]?.name || '');
    }
  };

  // Upload file from computer
  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (!buffer) return;

      const bytes = new Uint8Array(buffer);
      const newFile: VirtualFile = {
        name: file.name,
        data: bytes,
        size: bytes.length,
        lastModified: Date.now(),
        isSfl1: file.name.endsWith('.sfl1'),
      };

      setFiles((prev) => {
        const existing = prev.findIndex((f) => f.name === file.name);
        if (existing >= 0) {
          const copy = [...prev];
          copy[existing] = newFile;
          return copy;
        }
        return [...prev, newFile];
      });

      setActiveFileName(file.name);
      if (file.name.endsWith('.sfl1')) {
        setActiveTab('decompress');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Save raw data from BitWriter Lab
  const handleSaveToFs = (name: string, data: Uint8Array) => {
    const newFile: VirtualFile = {
      name,
      data,
      size: data.length,
      lastModified: Date.now(),
      isSfl1: name.endsWith('.sfl1'),
    };
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.name === name);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newFile;
        return copy;
      }
      return [...prev, newFile];
    });
    setActiveFileName(name);
  };

  // Add newly compressed .sfl1 file
  const handleAddCompressedFile = (file: VirtualFile) => {
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.name === file.name);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = file;
        return copy;
      }
      return [...prev, file];
    });
    setActiveFileName(file.name);
  };

  // Add restored file
  const handleAddDecompressedFile = (file: VirtualFile) => {
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.name === file.name);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = file;
        return copy;
      }
      return [...prev, file];
    });
    setActiveFileName(file.name);
  };

  // Navigation shortcuts
  const handleGoToCompress = (file: VirtualFile) => {
    setActiveFileName(file.name);
    setActiveTab('compress');
  };

  const handleGoToDecompress = (file: VirtualFile) => {
    setActiveFileName(file.name);
    setActiveTab('decompress');
  };

  const handleGoToVerify = (origName: string, decompName: string) => {
    setVerifyPair({ orig: origName, decomp: decompName });
    setActiveTab('verify');
  };

  // 11 C++ Menu Options Matrix for quick navigation and clarity
  const cppOptions: {
    num: number;
    title: string;
    tab: ActiveTab;
    desc: string;
  }[] = [
    { num: 1, title: 'Create File', tab: 'files', desc: 'Create new virtual file' },
    { num: 2, title: 'Read File', tab: 'files', desc: 'Inspect content & Hex Dump' },
    { num: 3, title: 'Copy File', tab: 'files', desc: 'Clone file data' },
    { num: 4, title: 'Calculate Frequency', tab: 'frequency', desc: '256-byte frequency & entropy' },
    { num: 5, title: 'Display Huffman Tree', tab: 'tree', desc: 'Interactive graph & C++ indented' },
    { num: 6, title: 'Generate Huffman Codes', tab: 'frequency', desc: 'Prefix codes & bit lengths' },
    { num: 7, title: 'Test BitWriter', tab: 'bitwriter', desc: '8-bit shift register simulator' },
    { num: 8, title: 'Compress File', tab: 'compress', desc: 'Encode to SmartFile SFL1' },
    { num: 9, title: 'Decompress File', tab: 'decompress', desc: 'Unpack SFL1 & recover original' },
    { num: 10, title: 'Verify Files', tab: 'verify', desc: 'Byte comparison & SHA-256' },
    { num: 11, title: 'Exit / Console', tab: 'terminal', desc: 'Interactive C++ CLI mode' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Universal Top Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewFile={() => {
          setActiveTab('files');
        }}
        onUploadFile={handleUploadFile}
      />

      {/* Quick Menu Options Strip (Option 1 to 11 selector) */}
      <section className="border-b border-slate-900 bg-slate-950/70 py-2.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-400 font-medium">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">C++ Switch Choices:</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {cppOptions.map((opt) => {
              const isSelected = activeTab === opt.tab;
              return (
                <button
                  key={opt.num}
                  onClick={() => setActiveTab(opt.tab)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800'
                  }`}
                  title={opt.desc}
                >
                  <span className="text-slate-500 font-bold">{opt.num}.</span>
                  <span>{opt.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'files' && (
          <FileEditorReader
            files={files}
            activeFile={activeFile}
            onSelectFile={(f) => setActiveFileName(f.name)}
            onCreateFile={handleCreateFile}
            onCopyFile={handleCopyFile}
            onDeleteFile={handleDeleteFile}
            onGoToCompress={handleGoToCompress}
          />
        )}

        {activeTab === 'frequency' && (
          <FrequencyCodesPanel
            files={files}
            activeFile={activeFile}
            onSelectFile={(f) => setActiveFileName(f.name)}
            onViewTree={() => setActiveTab('tree')}
          />
        )}

        {activeTab === 'tree' && (
          <TreeVisualizer
            files={files}
            activeFile={activeFile}
            onSelectFile={(f) => setActiveFileName(f.name)}
          />
        )}

        {activeTab === 'bitwriter' && (
          <BitWriterLab onSaveToFs={handleSaveToFs} />
        )}

        {activeTab === 'compress' && (
          <CompressionPanel
            files={files}
            activeFile={activeFile}
            onSelectFile={(f) => setActiveFileName(f.name)}
            onAddCompressedFile={handleAddCompressedFile}
            onGoToDecompress={handleGoToDecompress}
          />
        )}

        {activeTab === 'decompress' && (
          <DecompressionPanel
            files={files}
            activeFile={activeFile}
            onSelectFile={(f) => setActiveFileName(f.name)}
            onAddDecompressedFile={handleAddDecompressedFile}
            onGoToVerify={handleGoToVerify}
          />
        )}

        {activeTab === 'verify' && (
          <VerificationPanel
            files={files}
            initialOriginalName={verifyPair.orig}
            initialDecompressedName={verifyPair.decomp}
          />
        )}

        {activeTab === 'terminal' && (
          <TerminalConsole
            files={files}
            onUpdateFiles={(updated) => setFiles(updated)}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>SmartFile Compressor</span>
            <span>·</span>
            <span>SFL1 Binary Specification</span>
            <span>·</span>
            <span>OOP + DSA Priority Queue</span>
          </div>
          <div>
            <span>Full C++ Compatibility (Header: 13B RAW / 2061B Huffman)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
