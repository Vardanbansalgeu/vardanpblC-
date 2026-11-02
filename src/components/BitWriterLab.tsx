import React, { useState } from 'react';
import {
  Cpu,
  Play,
  RotateCcw,
  Binary,
  ArrowRight,
  Save,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { BitWriter, BitReader } from '../lib/huffman';
import { VirtualFile } from '../lib/virtualFs';

interface BitWriterLabProps {
  onSaveToFs: (name: string, data: Uint8Array) => void;
}

export const BitWriterLab: React.FC<BitWriterLabProps> = ({ onSaveToFs }) => {
  // Interactive BitWriter state
  const [buffer, setBuffer] = useState<number>(0);
  const [bitCount, setBitCount] = useState<number>(0);
  const [flushedBytes, setFlushedBytes] = useState<number[]>([]);
  const [customBitInput, setCustomBitInput] = useState<string>('10101010');
  const [actionHistory, setActionHistory] = useState<string[]>([]);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // BitReader tester state
  const [readerBytes, setReaderBytes] = useState<number[]>([0xaa, 0xc0]);
  const [readerOffset, setReaderOffset] = useState<number>(0);
  const [readerBuffer, setReaderBuffer] = useState<number>(0);
  const [readerBitCount, setReaderBitCount] = useState<number>(0);
  const [readBitsHistory, setReadBitsHistory] = useState<number[]>([]);

  // Push a single bit (0 or 1) into BitWriter
  const handlePushBit = (bit: number) => {
    const nextBuf = ((buffer << 1) | (bit & 1)) & 0xff;
    const nextCount = bitCount + 1;

    if (nextCount === 8) {
      setFlushedBytes((prev) => [...prev, nextBuf]);
      setBuffer(0);
      setBitCount(0);
      setActionHistory((prev) => [
        `Pushed bit ${bit} -> Buffer full! Flushed byte 0x${nextBuf
          .toString(16)
          .toUpperCase()
          .padStart(2, '0')} (dec: ${nextBuf}, bin: ${nextBuf.toString(2).padStart(8, '0')})`,
        ...prev.slice(0, 15),
      ]);
    } else {
      setBuffer(nextBuf);
      setBitCount(nextCount);
      setActionHistory((prev) => [
        `Pushed bit ${bit} -> Buffer now has ${nextCount} bits: ${(nextBuf << (8 - nextCount))
          .toString(2)
          .padStart(8, '0')
          .slice(0, nextCount)}`,
        ...prev.slice(0, 15),
      ]);
    }
  };

  // Push an entire bit string code
  const handlePushCode = (codeStr: string) => {
    const clean = codeStr.replace(/[^01]/g, '');
    if (!clean) return;

    let curBuf = buffer;
    let curCount = bitCount;
    const newFlushed: number[] = [];

    for (let i = 0; i < clean.length; i++) {
      const bit = clean.charCodeAt(i) - 48;
      curBuf = ((curBuf << 1) | bit) & 0xff;
      curCount++;
      if (curCount === 8) {
        newFlushed.push(curBuf);
        curBuf = 0;
        curCount = 0;
      }
    }

    setBuffer(curBuf);
    setBitCount(curCount);
    if (newFlushed.length > 0) {
      setFlushedBytes((prev) => [...prev, ...newFlushed]);
    }
    setActionHistory((prev) => [
      `Wrote code "${clean}" (${clean.length} bits). Emitted ${newFlushed.length} full byte(s). Buffer has ${curCount} remaining bit(s).`,
      ...prev.slice(0, 15),
    ]);
  };

  // Flush remaining bits (pads buffer with zeros to complete byte)
  const handleFlush = () => {
    if (bitCount > 0) {
      const finalByte = (buffer << (8 - bitCount)) & 0xff;
      setFlushedBytes((prev) => [...prev, finalByte]);
      setActionHistory((prev) => [
        `flush() called! Shifted ${bitCount} bits left by ${8 - bitCount}: emitted byte 0x${finalByte
          .toString(16)
          .toUpperCase()
          .padStart(2, '0')} (${finalByte.toString(2).padStart(8, '0')})`,
        ...prev.slice(0, 15),
      ]);
      setBuffer(0);
      setBitCount(0);
    } else {
      setActionHistory((prev) => ['flush() called with empty buffer (0 bits) -> no byte written.', ...prev.slice(0, 15)]);
    }
  };

  // Replicate exact C++ testBitWriter() function
  const handleRunCppTest = () => {
    const writer = new BitWriter();
    writer.writeCode('10101010');
    writer.writeCode('1100');
    writer.flush();
    const bytes = writer.getBytes();
    const arr = Array.from(bytes);

    setBuffer(0);
    setBitCount(0);
    setFlushedBytes(arr);
    setActionHistory([
      '=== C++ testBitWriter() executed ===',
      '1. writer.writeCode("10101010") -> Emitted Byte 0: 0xAA (170 in decimal)',
      '2. writer.writeCode("1100") -> Buffer holds 4 bits (1100)',
      '3. writer.flush() -> Shifted 4 bits left -> Emitted Byte 1: 0xC0 (192 in decimal)',
      `Completed: [0xAA, 0xC0] (2 bytes total)`,
    ]);

    // Save to virtual filesystem
    onSaveToFs('bitwriter_test.bin', bytes);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleReset = () => {
    setBuffer(0);
    setBitCount(0);
    setFlushedBytes([]);
    setActionHistory(['BitWriter register reset to 0.']);
  };

  // Step BitReader
  const handleStepBitReader = () => {
    let curOff = readerOffset;
    let curBuf = readerBuffer;
    let curCount = readerBitCount;

    if (curCount === 0) {
      if (curOff >= readerBytes.length) {
        alert('End of byte stream reached (BitReader returned -1)!');
        return;
      }
      curBuf = readerBytes[curOff++];
      curCount = 8;
    }

    const bit = (curBuf >> 7) & 1;
    curBuf = (curBuf << 1) & 0xff;
    curCount--;

    setReaderOffset(curOff);
    setReaderBuffer(curBuf);
    setReaderBitCount(curCount);
    setReadBitsHistory((prev) => [...prev, bit]);
  };

  const handleResetBitReader = () => {
    setReaderOffset(0);
    setReaderBuffer(0);
    setReaderBitCount(0);
    setReadBitsHistory([]);
  };

  // Visual representation of the 8 bits in the BitWriter buffer
  // Note: bits fill from left to right as new bits are shifted into LSB
  const bitArray = [];
  for (let i = 0; i < 8; i++) {
    // If bitCount is e.g. 3, the bits currently occupy positions [7, 6, 5] in the left-aligned view
    if (i < bitCount) {
      const bitVal = (buffer >> (bitCount - 1 - i)) & 1;
      bitArray.push({ active: true, val: bitVal });
    } else {
      bitArray.push({ active: false, val: 0 });
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Option 7: Test BitWriter &amp; Bit Packing Lab
            </h2>
            <p className="text-xs text-slate-400">
              Interactive 8-bit shift register simulator matching C++ BitWriter and BitReader
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunCppTest}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run C++ testBitWriter()</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="flex items-center gap-2 p-3 bg-emerald-950/60 border border-emerald-800/50 rounded-lg text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Output saved successfully as <strong className="font-mono">bitwriter_test.bin</strong> in the Virtual Filesystem!
          </span>
        </div>
      )}

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 8-Bit Register Simulation */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Active 8-Bit Internal Accumulator
              </h3>
              <p className="text-xs text-slate-400">
                unsigned char buffer ({bitCount} / 8 bits filled)
              </p>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Visual 8-Bit Register Display */}
          <div className="space-y-2">
            <div className="grid grid-cols-8 gap-2">
              {bitArray.map((cell, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                    cell.active
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-600'
                  }`}
                >
                  <span className="text-lg font-bold font-mono">
                    {cell.active ? cell.val : '-'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono mt-1">
                    Bit {7 - idx}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>MSB (Most Significant Bit)</span>
              <span className="font-mono tabular-nums text-slate-300">
                Buffer dec: {buffer} · hex: 0x{buffer.toString(16).toUpperCase().padStart(2, '0')}
              </span>
              <span>LSB (Least Significant Bit)</span>
            </div>
          </div>

          {/* Interactive Controls */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handlePushBit(0)}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Push Bit '0'</span>
              </button>
              <button
                onClick={() => handlePushBit(1)}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Push Bit '1'</span>
              </button>
              <button
                onClick={handleFlush}
                disabled={bitCount === 0}
                className={`py-2.5 px-4 rounded-lg text-xs font-medium transition-colors ${
                  bitCount > 0
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                }`}
                title="Pads remaining buffer with zeros to form a byte and outputs it"
              >
                flush()
              </button>
            </div>

            {/* Custom Bit String Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Write Code String (C++ writer.writeCode)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customBitInput}
                  onChange={(e) => setCustomBitInput(e.target.value)}
                  placeholder="e.g. 10101010 or 1100"
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handlePushCode(customBitInput)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  Write Code
                </button>
              </div>
            </div>
          </div>

          {/* Action Log History */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-slate-400">Execution Log</span>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-[11px] text-slate-400 space-y-1">
              {actionHistory.length > 0 ? (
                actionHistory.map((line, idx) => (
                  <p key={idx} className={idx === 0 ? 'text-indigo-300 font-semibold' : ''}>
                    {line}
                  </p>
                ))
              ) : (
                <p className="text-slate-600">No actions performed yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Emitted Output Stream & BitReader Simulator */}
        <div className="lg:col-span-5 space-y-6">
          {/* Output Byte Stream */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Emitted Bytes Output Stream
                </h3>
                <p className="text-xs text-slate-400">
                  {flushedBytes.length} byte(s) produced
                </p>
              </div>
              {flushedBytes.length > 0 && (
                <button
                  onClick={() => {
                    const u8 = new Uint8Array(flushedBytes);
                    onSaveToFs(`custom_bitstream_${Date.now()}.bin`, u8);
                    setSavedSuccess(true);
                    setTimeout(() => setSavedSuccess(false), 3000);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 rounded transition-colors"
                >
                  <Save className="w-3 h-3" />
                  <span>Save</span>
                </button>
              )}
            </div>

            {flushedBytes.length > 0 ? (
              <div className="space-y-2">
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-2">
                  {flushedBytes.map((byte, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1 border-b border-slate-900/80 last:border-0"
                    >
                      <span className="text-slate-500">Byte #{idx}:</span>
                      <span className="text-indigo-400 font-bold">
                        0x{byte.toString(16).toUpperCase().padStart(2, '0')}
                      </span>
                      <span className="text-emerald-400">
                        {byte.toString(2).padStart(8, '0')}
                      </span>
                      <span className="text-slate-300 tabular-nums">{byte} dec</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">
                Buffer hasn't emitted full bytes yet. Push bits or flush!
              </div>
            )}
          </div>

          {/* BitReader Interactive Reader */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  BitReader Simulator (C++ readBit)
                </h3>
                <p className="text-xs text-slate-400">
                  Reads bit-by-bit from MSB: (buffer &gt;&gt; 7) &amp; 1
                </p>
              </div>
              <button
                onClick={handleResetBitReader}
                className="text-xs text-slate-400 hover:text-white"
              >
                Reset
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleStepBitReader}
                className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Call readBit()
              </button>
              <button
                onClick={() => {
                  if (flushedBytes.length > 0) {
                    setReaderBytes([...flushedBytes]);
                    handleResetBitReader();
                  }
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
                title="Load emitted BitWriter bytes into BitReader"
              >
                Load From Writer
              </button>
            </div>

            {/* Read Bits stream */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs">
              <span className="text-slate-500 text-[11px] block mb-1">
                Extracted Bit Sequence ({readBitsHistory.length} bits):
              </span>
              <div className="text-emerald-400 tracking-widest break-all select-all font-semibold">
                {readBitsHistory.join('') || <span className="text-slate-600 font-normal">No bits read yet</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
