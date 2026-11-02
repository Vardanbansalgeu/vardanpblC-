import React, { useState } from 'react';
import {
  FileArchive,
  ArrowRight,
  Download,
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileCheck,
  RotateCcw,
} from 'lucide-react';
import { VirtualFile, formatBytes, downloadVirtualFile } from '../lib/virtualFs';
import { decompressData } from '../lib/huffman';

interface DecompressionPanelProps {
  files: VirtualFile[];
  activeFile: VirtualFile | null;
  onSelectFile: (file: VirtualFile) => void;
  onAddDecompressedFile: (file: VirtualFile) => void;
  onGoToVerify: (originalName: string, decompressedName: string) => void;
}

export const DecompressionPanel: React.FC<DecompressionPanelProps> = ({
  files,
  activeFile,
  onSelectFile,
  onAddDecompressedFile,
  onGoToVerify,
}) => {
  const sflFiles = files.filter((f) => f.name.endsWith('.sfl1'));

  const [selectedSflName, setSelectedSflName] = useState<string>(
    activeFile?.name.endsWith('.sfl1') ? activeFile.name : sflFiles[0]?.name || ''
  );

  const [destFileName, setDestFileName] = useState<string>('restored_output.txt');
  const [decompResult, setDecompResult] = useState<{
    success: boolean;
    error?: string;
    originalSize: number;
    mode: 'HUFFMAN' | 'RAW';
    logs: string[];
    file?: VirtualFile;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync selected file if activeFile changes
  React.useEffect(() => {
    if (activeFile && activeFile.name.endsWith('.sfl1')) {
      setSelectedSflName(activeFile.name);
      const base = activeFile.name.replace('.sfl1', '');
      setDestFileName(`restored_${base}.txt`);
    } else if (sflFiles.length > 0 && !selectedSflName) {
      setSelectedSflName(sflFiles[0].name);
      const base = sflFiles[0].name.replace('.sfl1', '');
      setDestFileName(`restored_${base}.txt`);
    }
  }, [activeFile, sflFiles.length]);

  const handleRunDecompress = (e: React.FormEvent) => {
    e.preventDefault();
    const targetFile = files.find((f) => f.name === selectedSflName);
    if (!targetFile) {
      alert('Selected SmartFile not found.');
      return;
    }

    if (targetFile.name === destFileName.trim()) {
      alert('SmartFile and output destination filenames must be different!');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      try {
        const result = decompressData(targetFile.data);

        if (result.success && result.decompressedData) {
          const restoredFile: VirtualFile = {
            name: destFileName.trim(),
            data: result.decompressedData,
            size: result.decompressedData.length,
            lastModified: Date.now(),
          };

          setDecompResult({
            success: true,
            originalSize: result.originalSize,
            mode: result.mode,
            logs: result.logs,
            file: restoredFile,
          });

          onAddDecompressedFile(restoredFile);
        } else {
          setDecompResult({
            success: false,
            error: result.error || 'Decompression failed.',
            originalSize: result.originalSize,
            mode: result.mode,
            logs: result.logs,
          });
        }
      } catch (err: any) {
        setDecompResult({
          success: false,
          error: err.message,
          originalSize: 0,
          mode: 'RAW',
          logs: [`Runtime exception: ${err.message}`],
        });
      } finally {
        setIsProcessing(false);
      }
    }, 150);
  };

  const correspondingOriginalName = React.useMemo(() => {
    if (!selectedSflName) return '';
    const base = selectedSflName.replace('.sfl1', '');
    const found = files.find(
      (f) =>
        f.name === `${base}.txt` ||
        f.name === `${base}.fasta` ||
        f.name === `${base}.bin` ||
        f.name === base
    );
    return found ? found.name : '';
  }, [selectedSflName, files]);

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
            <FileArchive className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Option 9: Decompress File (C++ decompressFile)
            </h2>
            <p className="text-xs text-slate-400">
              Parses SFL1 headers, reconstructs Huffman tree or extracts RAW data, and validates sizes
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-5">
          {sflFiles.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <p>No .sfl1 files found in virtual storage.</p>
              <p className="text-[11px] text-slate-500">
                Compress a file first (Option 8) or import an .sfl1 file from your computer using the Import button.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRunDecompress} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Select SmartFile (.sfl1)
                </label>
                <select
                  value={selectedSflName}
                  onChange={(e) => {
                    setSelectedSflName(e.target.value);
                    const base = e.target.value.replace('.sfl1', '');
                    setDestFileName(`restored_${base}.txt`);
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  {sflFiles.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name} ({f.size} bytes)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Output Decompressed Filename
                </label>
                <input
                  type="text"
                  value={destFileName}
                  onChange={(e) => setDestFileName(e.target.value)}
                  placeholder="e.g. restored.txt"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs space-y-1.5 text-slate-400">
                <span className="font-semibold text-slate-300 block">
                  Decompression Protocol:
                </span>
                <p className="text-[11px] leading-relaxed">
                  1. Reads "SFL1" magic bytes and compression mode (0 or 1).<br />
                  2. Reads 64-bit original size.<br />
                  3. If Mode 1: loads 256 frequency entries, ensures sum equals original size, rebuilds tree, and parses bitstream with BitReader.<br />
                  4. If Mode 0: copies raw data payload directly.
                </p>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                <span>{isProcessing ? 'Decompressing...' : 'Execute decompressFile()'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Decompression Output & Verification Link */}
        <div className="lg:col-span-7 space-y-5">
          {decompResult ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  {decompResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  )}
                  <h3 className="text-sm font-semibold text-white">
                    {decompResult.success
                      ? 'Decompression Completed Successfully'
                      : 'Decompression Failed'}
                  </h3>
                </div>

                {decompResult.success && decompResult.file && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadVirtualFile(decompResult.file!)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Restored</span>
                    </button>
                    {correspondingOriginalName && (
                      <button
                        onClick={() =>
                          onGoToVerify(correspondingOriginalName, decompResult.file!.name)
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
                      >
                        <span>Verify Match (Opt 10)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Console log outputs matching C++ */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs select-text space-y-1.5">
                <p className="text-indigo-400 font-bold">
                  {decompResult.mode === 'HUFFMAN'
                    ? '=== HUFFMAN MODE DECOMPRESSION ==='
                    : '=== RAW MODE DECOMPRESSION ==='}
                </p>
                {decompResult.logs.map((log, idx) => (
                  <p key={idx} className="text-slate-300">
                    &gt; {log}
                  </p>
                ))}

                {decompResult.success ? (
                  <div className="pt-2 text-emerald-400 font-bold border-t border-slate-800 mt-2">
                    <p>
                      {decompResult.mode === 'HUFFMAN'
                        ? 'HUFFMAN MODE DECOMPRESSION COMPLETED'
                        : 'RAW MODE DECOMPRESSION COMPLETED'}
                    </p>
                    <p className="text-white">
                      Original Size: {decompResult.originalSize} bytes
                    </p>
                    <p className="text-emerald-400">
                      Decompressed Size: {decompResult.file?.size} bytes
                    </p>
                  </div>
                ) : (
                  <p className="text-rose-400 pt-2 font-bold">
                    Error: {decompResult.error}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
              <FileArchive className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-200">Ready to Decompress</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Select an .sfl1 file to unpack the Huffman encoded bitstream and restore the exact original bytes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
