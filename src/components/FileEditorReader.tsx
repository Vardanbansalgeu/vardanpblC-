import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Trash2,
  Download,
  Plus,
  Eye,
  FileCode,
  Sparkles,
  Archive,
  ArrowRight,
} from 'lucide-react';
import { VirtualFile, formatBytes, getHexDump, downloadVirtualFile } from '../lib/virtualFs';

interface FileEditorReaderProps {
  files: VirtualFile[];
  activeFile: VirtualFile | null;
  onSelectFile: (file: VirtualFile) => void;
  onCreateFile: (name: string, content: string) => void;
  onCopyFile: (source: string, destination: string) => boolean;
  onDeleteFile: (name: string) => void;
  onGoToCompress: (file: VirtualFile) => void;
}

export const FileEditorReader: React.FC<FileEditorReaderProps> = ({
  files,
  activeFile,
  onSelectFile,
  onCreateFile,
  onCopyFile,
  onDeleteFile,
  onGoToCompress,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [viewMode, setViewMode] = useState<'text' | 'hex'>('text');
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyDestName, setCopyDestName] = useState('');
  const [hexLimit, setHexLimit] = useState(512);

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewFileName(`document_${files.length + 1}.txt`);
    setNewFileContent('');
  };

  const handleSaveNewFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    onCreateFile(newFileName.trim(), newFileContent);
    setIsCreating(false);
  };

  const handleApplyPreset = (preset: 'essay' | 'dna' | 'repeated' | 'tiny') => {
    if (preset === 'essay') {
      setNewFileName('algorithms_overview.txt');
      setNewFileContent(
        'Greedy algorithms construct solutions piece by piece, always choosing the next piece that offers the most immediate benefit. Huffman coding uses a greedy algorithm to build an optimal prefix tree for minimum-redundancy data compression.'
      );
    } else if (preset === 'dna') {
      setNewFileName('mitochondria_dna.fasta');
      setNewFileContent(
        '>sample_dna_huffman_test\nATCGATCGATCGATCGAAAAACCCCCGGGGGTTTTTATCGATCGATCG\nATCGATCGATCGATCGAAAAACCCCCGGGGGTTTTTATCGATCGATCG\nATCGATCGATCGATCGAAAAACCCCCGGGGGTTTTTATCGATCGATCG'
      );
    } else if (preset === 'repeated') {
      setNewFileName('heavy_redundancy.txt');
      setNewFileContent('A'.repeat(500) + 'B'.repeat(300) + 'C'.repeat(200) + 'D'.repeat(100));
    } else if (preset === 'tiny') {
      setNewFileName('tiny_demo.txt');
      setNewFileContent('Short text!');
    }
  };

  const handleStartCopy = () => {
    if (!activeFile) return;
    const ext = activeFile.name.includes('.') ? activeFile.name.substring(activeFile.name.lastIndexOf('.')) : '';
    const base = activeFile.name.includes('.')
      ? activeFile.name.substring(0, activeFile.name.lastIndexOf('.'))
      : activeFile.name;
    setCopyDestName(`${base}_copy${ext}`);
    setCopyModalOpen(true);
  };

  const handleConfirmCopy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFile || !copyDestName.trim()) return;
    const success = onCopyFile(activeFile.name, copyDestName.trim());
    if (success) {
      setCopyModalOpen(false);
    }
  };

  const activeTextContent = React.useMemo(() => {
    if (!activeFile) return '';
    try {
      const decoder = new TextDecoder('utf-8', { fatal: false });
      return decoder.decode(activeFile.data);
    } catch {
      return '[Binary data cannot be displayed as UTF-8 text]';
    }
  }, [activeFile]);

  const activeHexDump = React.useMemo(() => {
    if (!activeFile) return { lines: [], totalLength: 0 };
    return getHexDump(activeFile.data, hexLimit);
  }, [activeFile, hexLimit]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: File List */}
      <div className="lg:col-span-4 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Virtual Filesystem
            </h2>
            <p className="text-xs text-slate-400">
              {files.length} active files in memory
            </p>
          </div>
          <button
            onClick={handleStartCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Option 1: Create File</span>
          </button>
        </div>

        <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
          {files.map((file) => {
            const isSelected = activeFile?.name === file.name;
            const isSfl = file.name.endsWith('.sfl1');
            return (
              <div
                key={file.name}
                onClick={() => {
                  onSelectFile(file);
                  setIsCreating(false);
                }}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between group ${
                  isSelected
                    ? 'bg-slate-900 border-indigo-500/50 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                      isSfl
                        ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40'
                        : 'bg-slate-900 text-indigo-400 border border-slate-800'
                    }`}
                  >
                    {isSfl ? <Archive className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate font-mono">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="tabular-nums font-mono">{file.size} bytes</span>
                      <span>·</span>
                      <span>{formatBytes(file.size)}</span>
                      {isSfl && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-400 font-medium">SFL1</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadVirtualFile(file);
                    }}
                    className="p-1 hover:text-white text-slate-400 rounded transition-colors"
                    title="Download file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(file.name);
                    }}
                    className="p-1 hover:text-rose-400 text-slate-400 rounded transition-colors"
                    title="Delete file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Viewer or Creator */}
      <div className="lg:col-span-8">
        {isCreating ? (
          /* Option 1: Create File */
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">
                  Option 1: Create File (C++ createFile)
                </h3>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Presets:
              </span>
              <button
                type="button"
                onClick={() => handleApplyPreset('essay')}
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
              >
                Text Essay
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('dna')}
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
              >
                DNA Fasta
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('repeated')}
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
              >
                Heavy Repetition
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('tiny')}
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
              >
                Tiny Note (RAW mode test)
              </button>
            </div>

            <form onSubmit={handleSaveNewFile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Filename
                </label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g. data.txt"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    File Content
                  </label>
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    {new TextEncoder().encode(newFileContent).length} bytes
                  </span>
                </div>
                <textarea
                  value={newFileContent}
                  onChange={(e) => setNewFileContent(e.target.value)}
                  rows={12}
                  placeholder="Type or paste text content..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed resize-y"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors shadow-sm"
                >
                  Create &amp; Save File
                </button>
              </div>
            </form>
          </div>
        ) : activeFile ? (
          /* Option 2: Read File */
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
            {/* Top Bar for Selected File */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-white font-mono">
                    {activeFile.name}
                  </h3>
                  {activeFile.name.endsWith('.sfl1') && (
                    <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                      SmartFile SFL1 Archive
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span>Size:</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {activeFile.size} bytes
                  </span>
                  <span>({formatBytes(activeFile.size)})</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Text vs Hex tabs */}
                <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                  <button
                    onClick={() => setViewMode('text')}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      viewMode === 'text'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Text View</span>
                  </button>
                  <button
                    onClick={() => setViewMode('hex')}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      viewMode === 'hex'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileCode className="w-3 h-3" />
                    <span>Hex Dump</span>
                  </button>
                </div>

                {/* Option 3: Copy File */}
                <button
                  onClick={handleStartCopy}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors"
                  title="Copy File (C++ copyFile)"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy File</span>
                </button>

                {/* Download */}
                <button
                  onClick={() => downloadVirtualFile(activeFile)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors"
                  title="Download file to computer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                {!activeFile.name.endsWith('.sfl1') && (
                  <button
                    onClick={() => onGoToCompress(activeFile)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Compress (Opt 8)</span>
                    <ArrowRight className="w-3 h-3 ml-0.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Content Display: Text or Hex Dump */}
            {viewMode === 'text' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Option 2: Read File (UTF-8 Output)</span>
                  <span>{activeTextContent.split('\n').length} lines</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 max-h-[460px] overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
                  {activeTextContent}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Hexadecimal Byte Inspector</span>
                  <div className="flex items-center gap-2">
                    <span>Limit:</span>
                    <select
                      value={hexLimit}
                      onChange={(e) => setHexLimit(Number(e.target.value))}
                      className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded px-2 py-0.5"
                    >
                      <option value={256}>256 Bytes</option>
                      <option value={512}>512 Bytes</option>
                      <option value={1024}>1024 Bytes</option>
                      <option value={2048}>2048 Bytes</option>
                      <option value={activeFile.data.length}>Full File</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs overflow-x-auto max-h-[460px]">
                  <table className="w-full tabular-nums">
                    <thead>
                      <tr className="text-slate-600 border-b border-slate-900 text-left">
                        <th className="py-1 px-2 font-semibold">OFFSET</th>
                        <th className="py-1 px-2 font-semibold">00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F</th>
                        <th className="py-1 px-2 font-semibold">DECODED ASCII</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeHexDump.lines.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="py-0.5 px-2 text-indigo-400/80 font-medium">
                            {row.offset}
                          </td>
                          <td className="py-0.5 px-2 text-slate-300 whitespace-nowrap">
                            <span className="space-x-1">
                              {row.hex.slice(0, 8).join(' ')}
                            </span>
                            <span className="mx-2 text-slate-700">|</span>
                            <span className="space-x-1">
                              {row.hex.slice(8, 16).join(' ')}
                            </span>
                          </td>
                          <td className="py-0.5 px-2 text-emerald-400/90 whitespace-pre">
                            {row.ascii}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {activeFile.size > hexLimit && (
                    <p className="text-slate-500 text-center py-2 text-[11px]">
                      Showing first {hexLimit} of {activeFile.size} bytes. Change limit above to inspect more.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-12 text-center">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-200">No File Selected</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Select an existing file from the left panel, or create a new file to explore Huffman compression.
            </p>
            <button
              onClick={handleStartCreate}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors shadow-sm"
            >
              Option 1: Create File
            </button>
          </div>
        )}
      </div>

      {/* Option 3: Copy File Modal */}
      {copyModalOpen && activeFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">
                  Option 3: Copy File (C++ copyFile)
                </h3>
              </div>
              <button
                onClick={() => setCopyModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmCopy} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Source File
                </label>
                <input
                  type="text"
                  value={activeFile.name}
                  disabled
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs font-mono text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Destination Filename
                </label>
                <input
                  type="text"
                  value={copyDestName}
                  onChange={(e) => setCopyDestName(e.target.value)}
                  placeholder="e.g. sample_backup.txt"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCopyModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                >
                  Confirm Copy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
