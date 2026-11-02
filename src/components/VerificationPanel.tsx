import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Hash,
  Scale,
  FileCheck2,
  ArrowRight,
} from 'lucide-react';
import { VirtualFile, formatBytes } from '../lib/virtualFs';
import { compareFilesBytes, computeSha256 } from '../lib/huffman';

interface VerificationPanelProps {
  files: VirtualFile[];
  initialOriginalName?: string;
  initialDecompressedName?: string;
}

export const VerificationPanel: React.FC<VerificationPanelProps> = ({
  files,
  initialOriginalName,
  initialDecompressedName,
}) => {
  const [origName, setOrigName] = useState<string>(
    initialOriginalName || files[0]?.name || ''
  );
  const [decompName, setDecompName] = useState<string>(
    initialDecompressedName ||
      files.find((f) => f.name.includes('restored') || f.name.includes('copy'))?.name ||
      files[1]?.name ||
      ''
  );

  const [verificationResult, setVerificationResult] = useState<{
    tested: boolean;
    identical: boolean;
    origSize: number;
    decompSize: number;
    origHash?: string;
    decompHash?: string;
    firstDiffOffset?: number;
    firstDiffA?: number;
    firstDiffB?: number;
  }>({
    tested: false,
    identical: false,
    origSize: 0,
    decompSize: 0,
  });

  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (initialOriginalName) setOrigName(initialOriginalName);
    if (initialDecompressedName) setDecompName(initialDecompressedName);
  }, [initialOriginalName, initialDecompressedName]);

  const handleRunVerify = async () => {
    const fileA = files.find((f) => f.name === origName);
    const fileB = files.find((f) => f.name === decompName);

    if (!fileA || !fileB) {
      alert('One or both selected files do not exist.');
      return;
    }

    setIsVerifying(true);

    try {
      const cmp = compareFilesBytes(fileA.data, fileB.data);
      const hashA = await computeSha256(fileA.data);
      const hashB = await computeSha256(fileB.data);

      setVerificationResult({
        tested: true,
        identical: cmp.identical,
        origSize: fileA.size,
        decompSize: fileB.size,
        origHash: hashA,
        decompHash: hashB,
        firstDiffOffset: cmp.firstDiffOffset,
        firstDiffA: cmp.firstDiffA,
        firstDiffB: cmp.firstDiffB,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Option 10: Verify Original and Decompressed Files
            </h2>
            <p className="text-xs text-slate-400">
              Byte-by-byte integrity comparator and SHA-256 cryptographic check matching C++ verifyFiles()
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Selector Form */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Original File (firstFile)
            </label>
            <select
              value={origName}
              onChange={(e) => setOrigName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            >
              {files.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name} ({f.size} B)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Decompressed File (secondFile)
            </label>
            <select
              value={decompName}
              onChange={(e) => setDecompName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            >
              {files.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name} ({f.size} B)
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-400 space-y-1">
            <span className="font-semibold text-slate-300">C++ verifyFiles Specification:</span>
            <p className="text-[11px] leading-relaxed">
              Compares every individual byte of the stream. For verification to pass, the sizes must match exactly (<code className="text-slate-200">originalSize == decompressedSize</code>) and every byte must be equal (<code className="text-slate-200">a == b</code>).
            </p>
          </div>

          <button
            onClick={handleRunVerify}
            disabled={isVerifying || !origName || !decompName}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>{isVerifying ? 'Comparing Bytes...' : 'Execute verifyFiles()'}</span>
          </button>
        </div>

        {/* Right Column: Output Result Box */}
        <div className="lg:col-span-7 space-y-4">
          {verificationResult.tested ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
              {/* Header Status */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  {verificationResult.identical ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                  <h3 className="text-sm font-semibold text-white">
                    {verificationResult.identical ? 'Verification Succeeded' : 'Verification Failed'}
                  </h3>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                    verificationResult.identical
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                  }`}
                >
                  {verificationResult.identical ? '100% BIT-FOR-BIT MATCH' : 'MISMATCH DETECTED'}
                </span>
              </div>

              {/* Exact C++ Console Output */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-200 select-text leading-relaxed">
                <p>Original File Size     : {verificationResult.origSize} bytes</p>
                <p>Decompressed File Size : {verificationResult.decompSize} bytes</p>
                <br />
                {verificationResult.identical ? (
                  <div className="text-emerald-400 font-bold space-y-0.5">
                    <p>VERIFICATION PASSED</p>
                    <p>Both files are exactly identical.</p>
                  </div>
                ) : (
                  <div className="text-rose-400 font-bold space-y-0.5">
                    <p>VERIFICATION FAILED</p>
                    <p>The files are not identical.</p>
                  </div>
                )}
              </div>

              {/* Hash Verification Badges */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-indigo-400" /> Cryptographic SHA-256 Checksums:
                </span>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-2">
                  <div>
                    <span className="text-slate-500 block text-[11px] truncate">
                      {origName}:
                    </span>
                    <span className="text-slate-300 break-all">{verificationResult.origHash}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] truncate">
                      {decompName}:
                    </span>
                    <span
                      className={`break-all ${
                        verificationResult.identical ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {verificationResult.decompHash}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mismatch Details (if not identical) */}
              {!verificationResult.identical && verificationResult.firstDiffOffset !== undefined && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-lg text-xs space-y-1 text-rose-300">
                  <span className="font-semibold block">First Divergence:</span>
                  <p className="font-mono text-[11px]">
                    Offset: Byte {verificationResult.firstDiffOffset} (0x
                    {verificationResult.firstDiffOffset.toString(16).toUpperCase()})
                  </p>
                  {verificationResult.firstDiffA !== undefined && verificationResult.firstDiffB !== undefined && (
                    <p className="font-mono text-[11px]">
                      Expected 0x{verificationResult.firstDiffA.toString(16).toUpperCase().padStart(2, '0')}{' '}
                      ({verificationResult.firstDiffA}) vs Found 0x
                      {verificationResult.firstDiffB.toString(16).toUpperCase().padStart(2, '0')}{' '}
                      ({verificationResult.firstDiffB})
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
              <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-200">Awaiting Verification</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Select an original file and its decompressed counterpart to run byte-by-byte comparison and cryptographic verification.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
