import React, { useState, useMemo } from 'react';
import {
  Binary,
  Search,
  ArrowUpDown,
  Copy,
  Check,
  Code2,
  Cpu,
  BarChart3,
} from 'lucide-react';
import { VirtualFile } from '../lib/virtualFs';
import {
  calculateFrequency,
  buildHuffmanTree,
  generateCodes,
  formatChar,
  CodeInfo,
} from '../lib/huffman';

interface FrequencyCodesPanelProps {
  files: VirtualFile[];
  activeFile: VirtualFile | null;
  onSelectFile: (file: VirtualFile) => void;
  onViewTree: () => void;
}

export const FrequencyCodesPanel: React.FC<FrequencyCodesPanelProps> = ({
  files,
  activeFile,
  onSelectFile,
  onViewTree,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'frequency-desc' | 'byte-asc' | 'code-asc'>(
    'frequency-desc'
  );
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'codes' | 'cpp_view'>('codes');

  // Compute frequencies and codes for active file
  const analysis = useMemo(() => {
    if (!activeFile) return null;

    const { frequency, totalSize, distinctCount } = calculateFrequency(activeFile.data);
    const root = buildHuffmanTree(frequency);
    const codes = generateCodes(root);

    const items: CodeInfo[] = [];
    let totalEncodedBits = 0;

    for (let i = 0; i < 256; i++) {
      const f = Number(frequency[i]);
      if (f > 0) {
        const code = codes[i];
        const len = code.length;
        const bits = f * len;
        totalEncodedBits += bits;

        items.push({
          byte: i,
          char: formatChar(i).name,
          frequency: f,
          code,
          length: len,
          totalBits: bits,
        });
      }
    }

    // Shannon Entropy: H = - sum(p_i * log2(p_i))
    let entropy = 0;
    if (totalSize > 0) {
      for (const item of items) {
        const p = item.frequency / totalSize;
        if (p > 0) {
          entropy -= p * Math.log2(p);
        }
      }
    }

    const theoreticalMinimumBytes = totalSize > 0 ? (entropy * totalSize) / 8 : 0;
    const avgCodeLength = totalSize > 0 ? totalEncodedBits / totalSize : 0;
    const rawBits = totalSize * 8;
    const bitsSaved = rawBits - totalEncodedBits;

    return {
      frequency,
      totalSize,
      distinctCount,
      items,
      codes,
      totalEncodedBits,
      entropy,
      theoreticalMinimumBytes,
      avgCodeLength,
      rawBits,
      bitsSaved,
    };
  }, [activeFile]);

  // Filter and sort items
  const displayItems = useMemo(() => {
    if (!analysis) return [];
    let list = [...analysis.items];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) => {
        const dec = item.byte.toString();
        const hex = item.byte.toString(16).toLowerCase();
        const ch = item.char.toLowerCase();
        const code = item.code;
        return (
          dec.includes(q) ||
          hex.includes(q) ||
          ch.includes(q) ||
          code.includes(q)
        );
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'frequency-desc') return b.frequency - a.frequency;
      if (sortBy === 'byte-asc') return a.byte - b.byte;
      if (sortBy === 'code-asc') return a.length - b.length || a.code.localeCompare(b.code);
      return 0;
    });

    return list;
  }, [analysis, searchQuery, sortBy]);

  // Formatted C++ output matching `showCodes(codes, frequency)`
  const cppFormattedCodes = useMemo(() => {
    if (!analysis) return '';
    let out = 'Huffman Codes:\n';
    for (let i = 0; i < 256; i++) {
      if (analysis.frequency[i] > 0n) {
        out += `Byte ${i.toString().padStart(3, ' ')} : ${analysis.codes[i]}\n`;
      }
    }
    return out;
  }, [analysis]);

  const handleCopyCodes = () => {
    if (!cppFormattedCodes) return;
    navigator.clipboard.writeText(cppFormattedCodes);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* File Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Binary className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Options 4 &amp; 6: Frequency Analysis &amp; Huffman Codes
            </h2>
            <p className="text-xs text-slate-400">
              Byte distribution, entropy calculation, and optimal prefix codes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 shrink-0">Analyze File:</label>
          <select
            value={activeFile?.name || ''}
            onChange={(e) => {
              const f = files.find((item) => item.name === e.target.value);
              if (f) onSelectFile(f);
            }}
            className="bg-slate-950 border border-slate-700 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
          >
            {files.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name} ({f.size} B)
              </option>
            ))}
          </select>
        </div>
      </div>

      {analysis && activeFile ? (
        <>
          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Total File Size</span>
              <span className="text-lg font-bold text-white font-mono tabular-nums">
                {analysis.totalSize} <span className="text-xs font-normal text-slate-400">bytes</span>
              </span>
              <span className="block text-[11px] text-slate-500 mt-1 font-mono">
                {analysis.rawBits} raw bits (8 b/symbol)
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Distinct Symbols</span>
              <span className="text-lg font-bold text-indigo-400 font-mono tabular-nums">
                {analysis.distinctCount} <span className="text-xs font-normal text-slate-400">/ 256</span>
              </span>
              <span className="block text-[11px] text-slate-500 mt-1">
                {( (analysis.distinctCount / 256) * 100 ).toFixed(1)}% alphabet coverage
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Shannon Entropy</span>
              <span className="text-lg font-bold text-amber-400 font-mono tabular-nums">
                {analysis.entropy.toFixed(3)}{' '}
                <span className="text-xs font-normal text-slate-400">bits/symbol</span>
              </span>
              <span className="block text-[11px] text-slate-500 mt-1">
                Theoretical limit: {Math.round(analysis.theoreticalMinimumBytes)} bytes
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Avg Huffman Code</span>
              <span className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
                {analysis.avgCodeLength.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-400">bits/symbol</span>
              </span>
              <span className="block text-[11px] text-slate-500 mt-1 font-mono">
                {analysis.totalEncodedBits} encoded bits
              </span>
            </div>
          </div>

          {/* Top Frequencies Visual Bar Strip */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-semibold text-slate-200">
                  Top Frequent Symbols (Visual Weight)
                </h3>
              </div>
              <button
                onClick={onViewTree}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                <span>View Generated Tree (Option 5)</span>
                <span>→</span>
              </button>
            </div>

            <div className="space-y-2">
              {analysis.items
                .slice()
                .sort((a, b) => b.frequency - a.frequency)
                .slice(0, 6)
                .map((item) => {
                  const pct = analysis.totalSize > 0 ? (item.frequency / analysis.totalSize) * 100 : 0;
                  return (
                    <div key={item.byte} className="flex items-center gap-3 text-xs">
                      <span className="font-mono text-slate-300 w-24 truncate shrink-0">
                        {item.char} ({item.byte})
                      </span>
                      <div className="flex-1 bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <span className="font-mono text-slate-400 w-24 text-right tabular-nums shrink-0">
                        {item.frequency} ({pct.toFixed(1)}%)
                      </span>
                      <span className="font-mono text-emerald-400 w-20 text-right shrink-0">
                        {item.code}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Controls: Search, Sort, Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter byte, char, code..."
                  className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-56"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setSortBy('frequency-desc')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    sortBy === 'frequency-desc'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Sort by frequency descending"
                >
                  Freq ↓
                </button>
                <button
                  onClick={() => setSortBy('byte-asc')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    sortBy === 'byte-asc'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Sort by byte number ascending"
                >
                  Byte ↑
                </button>
                <button
                  onClick={() => setSortBy('code-asc')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    sortBy === 'code-asc'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Sort by code length"
                >
                  Bits ↑
                </button>
              </div>
            </div>

            {/* Sub-tabs: Table vs C++ showCodes text */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setActiveSubTab('codes')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeSubTab === 'codes'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Codebook Table
                </button>
                <button
                  onClick={() => setActiveSubTab('cpp_view')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeSubTab === 'cpp_view'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  C++ showCodes Output
                </button>
              </div>

              {activeSubTab === 'cpp_view' && (
                <button
                  onClick={handleCopyCodes}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
                >
                  {copiedCodes ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCodes ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Table View */}
          {activeSubTab === 'codes' ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-xs text-left font-mono tabular-nums">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[11px] sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Byte</th>
                      <th className="py-2.5 px-3">Hex</th>
                      <th className="py-2.5 px-3">Char / Symbol</th>
                      <th className="py-2.5 px-3 text-right">Frequency</th>
                      <th className="py-2.5 px-3 text-right">% of Total</th>
                      <th className="py-2.5 px-3">Huffman Code</th>
                      <th className="py-2.5 px-3 text-right">Code Bits</th>
                      <th className="py-2.5 px-3 text-right">Total Bits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {displayItems.length > 0 ? (
                      displayItems.map((item) => {
                        const pct =
                          analysis.totalSize > 0
                            ? (item.frequency / analysis.totalSize) * 100
                            : 0;
                        return (
                          <tr key={item.byte} className="hover:bg-slate-800/40">
                            <td className="py-2 px-3 text-indigo-400 font-semibold">
                              {item.byte}
                            </td>
                            <td className="py-2 px-3 text-slate-400">
                              0x{item.byte.toString(16).toUpperCase().padStart(2, '0')}
                            </td>
                            <td className="py-2 px-3 text-white font-medium">
                              {item.char}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-200">
                              {item.frequency}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-400">
                              {pct.toFixed(2)}%
                            </td>
                            <td className="py-2 px-3 text-emerald-400 font-semibold tracking-wider">
                              {item.code}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-300">
                              {item.length}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-400">
                              {item.totalBits}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          No matching symbols found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Option 6 C++ Console Format Preview */
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 max-h-[500px] overflow-y-auto whitespace-pre leading-relaxed select-text">
              {cppFormattedCodes}
            </div>
          )}
        </>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
          Select a file to inspect frequency and generate Huffman codes.
        </div>
      )}
    </div>
  );
};
