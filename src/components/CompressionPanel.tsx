import React, { useState } from 'react';
import {
  FileArchive,
  ArrowRight,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { VirtualFile, formatBytes, downloadVirtualFile } from '../lib/virtualFs';
import { compressData, CompressionStats } from '../lib/huffman';

interface CompressionPanelProps {
  files: VirtualFile[];
  activeFile: VirtualFile | null;
  onSelectFile: (file: VirtualFile) => void;
  onAddCompressedFile: (file: VirtualFile) => void;
  onGoToDecompress: (file: VirtualFile) => void;
}

export const CompressionPanel: React.FC<CompressionPanelProps> = ({
  files,
  activeFile,
  onSelectFile,
  onAddCompressedFile,
  onGoToDecompress,
}) => {
  const [outputFileName, setOutputFileName] = useState<string>(
    activeFile ? `${activeFile.name.replace(/\.[^/.]+$/, '')}.sfl1` : 'output.sfl1'
  );
  const [latestStats, setLatestStats] = useState<CompressionStats | null>(null);
  const [generatedFile, setGeneratedFile] = useState<VirtualFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Update output filename default when active file changes
  React.useEffect(() => {
    if (activeFile) {
      setOutputFileName(`${activeFile.name.replace(/\.[^/.]+$/, '')}.sfl1`);
    }
  }, [activeFile]);

  const handleRunCompress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFile) return;

    if (activeFile.name === outputFileName.trim()) {
      alert('Input and output filenames must be different!');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      try {
        const { compressedData, stats } = compressData(activeFile.data);
        const newVirtualFile: VirtualFile = {
          name: outputFileName.trim(),
          data: compressedData,
          size: compressedData.length,
          lastModified: Date.now(),
          isSfl1: true,
        };

        setLatestStats(stats);
        setGeneratedFile(newVirtualFile);
        onAddCompressedFile(newVirtualFile);
      } catch (err: any) {
        alert(`Compression error: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    }, 150);
  };

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
              Option 8: Compress File (C++ compressFile)
            </h2>
            <p className="text-xs text-slate-400">
              Binary compression to SmartFile SFL1 format with automatic RAW/HUFFMAN mode selection
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Mode Selection */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-5">
          <form onSubmit={handleRunCompress} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Select Input File
              </label>
              <select
                value={activeFile?.name || ''}
                onChange={(e) => {
                  const f = files.find((item) => item.name === e.target.value);
                  if (f) onSelectFile(f);
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                required
              >
                {files
                  .filter((f) => !f.name.endsWith('.sfl1'))
                  .map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name} ({f.size} bytes)
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Output SmartFile (.sfl1) Name
              </label>
              <input
                type="text"
                value={outputFileName}
                onChange={(e) => setOutputFileName(e.target.value)}
                placeholder="e.g. archive.sfl1"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            {/* SmartFile SFL1 Format Details */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 text-xs space-y-2">
              <span className="font-semibold text-slate-300 block flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                SFL1 Header Architecture:
              </span>
              <ul className="text-[11px] text-slate-400 space-y-1 font-mono list-disc list-inside">
                <li>Magic Header: <span className="text-white">"SFL1"</span> (4 bytes)</li>
                <li>Mode: <span className="text-emerald-400">0x01</span> (HUFFMAN) or <span className="text-amber-400">0x00</span> (RAW) (1 byte)</li>
                <li>Original Size: <span className="text-white">uint64 little-endian</span> (8 bytes)</li>
                <li>Frequencies: <span className="text-white">256 * 8 = 2048 bytes</span> (HUFFMAN only)</li>
                <li>Threshold Rule: HUFFMAN chosen if <span className="text-indigo-400">Est. Huffman &lt; Est. Raw</span></li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isProcessing || !activeFile}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>{isProcessing ? 'Compressing...' : 'Execute compressFile()'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Statistics Output Box */}
        <div className="lg:col-span-7 space-y-5">
          {latestStats ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Compression Completed Successfully
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {generatedFile && (
                    <button
                      onClick={() => downloadVirtualFile(generatedFile)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .sfl1</span>
                    </button>
                  )}
                  {generatedFile && (
                    <button
                      onClick={() => onGoToDecompress(generatedFile)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
                    >
                      <span>Decompress File (Opt 9)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Exact C++ Output Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-200 select-text leading-relaxed">
                <p className="text-indigo-400 font-bold">========== COMPRESSION STATISTICS ==========</p>
                <div className="grid grid-cols-2 gap-y-1 py-2">
                  <span className="text-slate-400">Original File Size</span>
                  <span className="text-right font-bold text-white tabular-nums">
                    : {latestStats.originalSize} bytes
                  </span>

                  <span className="text-slate-400">Estimated Compressed Size</span>
                  <span className="text-right font-bold text-slate-300 tabular-nums">
                    : {latestStats.estimatedSize} bytes
                  </span>

                  <span className="text-slate-400">Actual Compressed Size</span>
                  <span className="text-right font-bold text-indigo-400 tabular-nums">
                    : {latestStats.actualSize} bytes
                  </span>

                  <span className="text-slate-400">Compression Mode</span>
                  <span
                    className={`text-right font-bold ${
                      latestStats.mode === 'HUFFMAN' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    : {latestStats.mode}
                  </span>

                  {latestStats.actualSize <= latestStats.originalSize ? (
                    <>
                      <span className="text-slate-400">Bytes Saved</span>
                      <span className="text-right font-bold text-emerald-400 tabular-nums">
                        : {latestStats.bytesSaved} bytes
                      </span>
                      <span className="text-slate-400">Space Saved</span>
                      <span className="text-right font-bold text-emerald-400 tabular-nums">
                        : {latestStats.spaceSavedPercent.toFixed(2)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-400">Bytes Saved</span>
                      <span className="text-right font-bold text-slate-400 tabular-nums">: 0 bytes</span>
                      <span className="text-slate-400">Size Increased</span>
                      <span className="text-right font-bold text-amber-400 tabular-nums">
                        : {latestStats.sizeIncreased} bytes
                      </span>
                      <span className="text-slate-400">Size Increase</span>
                      <span className="text-right font-bold text-amber-400 tabular-nums">
                        : {latestStats.sizeIncreasePercent.toFixed(2)}%
                      </span>
                    </>
                  )}
                </div>
                <p className="text-indigo-400 font-bold">============================================</p>
              </div>

              {/* Technical Reason Note */}
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs space-y-1 text-slate-400">
                <span className="font-semibold text-slate-300">
                  {latestStats.mode === 'HUFFMAN'
                    ? '✓ HUFFMAN Mode Selected by Algorithm:'
                    : 'ℹ RAW Mode Selected by Algorithm:'}
                </span>
                <p className="text-[11px] leading-relaxed">
                  {latestStats.mode === 'HUFFMAN'
                    ? `The compressed bitstream (${latestStats.encodedSize} bytes) plus the 2061-byte frequency header yielded ${latestStats.actualSize} bytes, which is smaller than storing the raw data (${latestStats.estimatedRawSize} bytes).`
                    : `Storing Huffman tree frequency tables (2061 bytes) would make the output larger than the raw file. The program automatically selected RAW mode (13-byte header) to protect against file bloat!`}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
              <FileArchive className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-200">Ready to Compress</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Select an input file and run the SmartFile compressor to produce a binary-compatible .sfl1 file.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
