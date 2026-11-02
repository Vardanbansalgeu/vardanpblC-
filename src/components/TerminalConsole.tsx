import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, RotateCcw, Copy, Check, Play } from 'lucide-react';
import { VirtualFile } from '../lib/virtualFs';
import {
  calculateFrequency,
  buildHuffmanTree,
  generateCodes,
  displayTreeIndented,
  BitWriter,
  compressData,
  decompressData,
  compareFilesBytes,
} from '../lib/huffman';

interface TerminalConsoleProps {
  files: VirtualFile[];
  onUpdateFiles: (updated: VirtualFile[]) => void;
}

const WELCOME_BANNER = `====================================
       SMARTFILE COMPRESSOR
  HUFFMAN CODING + OOP + DSA
====================================
1. Create File
2. Read File
3. Copy File
4. Calculate Frequency
5. Display Huffman Tree
6. Generate Huffman Codes
7. Test BitWriter
8. Compress File
9. Decompress File
10. Verify Original and Decompressed Files
11. Exit
`;

type PromptState =
  | 'idle'
  | 'create_filename'
  | 'create_content'
  | 'read_filename'
  | 'copy_source'
  | 'copy_dest'
  | 'freq_filename'
  | 'tree_filename'
  | 'codes_filename'
  | 'compress_input'
  | 'compress_output'
  | 'decompress_input'
  | 'decompress_output'
  | 'verify_orig'
  | 'verify_decomp';

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({
  files,
  onUpdateFiles,
}) => {
  const [outputLines, setOutputLines] = useState<string[]>([
    WELCOME_BANNER,
    'Enter your choice: ',
  ]);
  const [inputVal, setInputVal] = useState('');
  const [promptState, setPromptState] = useState<PromptState>('idle');
  const [tempState, setTempState] = useState<{ [key: string]: string }>({});
  const [copied, setCopied] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [outputLines]);

  const print = (text: string) => {
    setOutputLines((prev) => [...prev, text]);
  };

  const handleResetTerminal = () => {
    setOutputLines([WELCOME_BANNER, 'Enter your choice: ']);
    setPromptState('idle');
    setTempState({});
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(outputLines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputVal;
    setInputVal('');

    // Echo input
    print(`> ${val}`);

    if (promptState === 'idle') {
      const choice = parseInt(val.trim(), 10);
      if (isNaN(choice)) {
        print('Invalid input. Please enter a number.\n');
        print('Enter your choice: ');
        return;
      }

      switch (choice) {
        case 1:
          print('Enter filename: ');
          setPromptState('create_filename');
          break;
        case 2:
          print('Enter filename: ');
          setPromptState('read_filename');
          break;
        case 3:
          print('Enter source filename: ');
          setPromptState('copy_source');
          break;
        case 4:
          print('Enter filename: ');
          setPromptState('freq_filename');
          break;
        case 5:
          print('Enter filename: ');
          setPromptState('tree_filename');
          break;
        case 6:
          print('Enter filename: ');
          setPromptState('codes_filename');
          break;
        case 7: {
          // testBitWriter()
          const writer = new BitWriter();
          writer.writeCode('10101010');
          writer.writeCode('1100');
          writer.flush();
          const bytes = writer.getBytes();

          const existingIndex = files.findIndex((f) => f.name === 'bitwriter_test.bin');
          const newF: VirtualFile = {
            name: 'bitwriter_test.bin',
            data: bytes,
            size: bytes.length,
            lastModified: Date.now(),
          };
          const nextFiles = [...files];
          if (existingIndex >= 0) nextFiles[existingIndex] = newF;
          else nextFiles.push(newF);
          onUpdateFiles(nextFiles);

          print('BitWriter test completed.');
          print('Output saved in bitwriter_test.bin\n');
          print('Enter your choice: ');
          break;
        }
        case 8:
          print('Enter input filename: ');
          setPromptState('compress_input');
          break;
        case 9:
          print('Enter SmartFile filename: ');
          setPromptState('decompress_input');
          break;
        case 10:
          print('Enter original filename: ');
          setPromptState('verify_orig');
          break;
        case 11:
          print('\nProgram terminated.\n');
          break;
        default:
          print('Invalid choice. Select 1 to 11.\n');
          print('Enter your choice: ');
          break;
      }
      return;
    }

    // Sub-prompts
    if (promptState === 'create_filename') {
      setTempState({ filename: val.trim() });
      print('Enter file content: ');
      setPromptState('create_content');
      return;
    }

    if (promptState === 'create_content') {
      const name = tempState.filename || 'file.txt';
      const bytes = new TextEncoder().encode(val);
      const newFile: VirtualFile = {
        name,
        data: bytes,
        size: bytes.length,
        lastModified: Date.now(),
        isSfl1: name.endsWith('.sfl1'),
      };
      const idx = files.findIndex((f) => f.name === name);
      const next = [...files];
      if (idx >= 0) next[idx] = newFile;
      else next.push(newFile);
      onUpdateFiles(next);

      print('File created successfully.\n');
      print('Enter your choice: ');
      setPromptState('idle');
      return;
    }

    if (promptState === 'read_filename') {
      const f = files.find((item) => item.name === val.trim());
      if (!f) {
        print('File not found.\n');
      } else {
        print('\nFile Content:');
        try {
          const text = new TextDecoder('utf-8').decode(f.data);
          print(text);
        } catch {
          print('[Binary data]');
        }
      }
      print('\nEnter your choice: ');
      setPromptState('idle');
      return;
    }

    if (promptState === 'copy_source') {
      setTempState({ source: val.trim() });
      print('Enter destination filename: ');
      setPromptState('copy_dest');
      return;
    }

    if (promptState === 'copy_dest') {
      const source = tempState.source;
      const dest = val.trim();
      if (source === dest) {
        print('Use different filenames.\n');
      } else {
        const srcFile = files.find((f) => f.name === source);
        if (!srcFile) {
          print('File copying failed. Check the filenames.\n');
        } else {
          const cloned: VirtualFile = {
            name: dest,
            data: new Uint8Array(srcFile.data),
            size: srcFile.size,
            lastModified: Date.now(),
            isSfl1: dest.endsWith('.sfl1'),
          };
          onUpdateFiles([...files, cloned]);
          print('File copied successfully.\n');
        }
      }
      print('Enter your choice: ');
      setPromptState('idle');
      return;
    }

    if (promptState === 'freq_filename') {
      const f = files.find((item) => item.name === val.trim());
      if (!f) {
        print('File not found.\n');
      } else {
        const { frequency, totalSize } = calculateFrequency(f.data);
        print('\nByte Frequencies:');
        for (let i = 0; i < 256; i++) {
          if (frequency[i] > 0n) {
            print(`Byte ${i} : ${frequency[i].toString()}`);
          }
        }
        print(`\nTotal File Size: ${totalSize} bytes\n`);
      }
      print('Enter your choice: ');
      setPromptState('idle');
      return;
    }

    if (promptState === 'tree_filename') {
      const f = files.find((item) => item.name === val.trim());
      if (!f) {
        print('File not found.\n');
      } else {
        const { frequency } = calculateFrequency(f.data);
        const root = buildHuffmanTree(frequency);
        if (!root) {
          print('Empty file. Tree cannot be created.\n');
        } else {
          print('\nHuffman Tree:');
          const lines = displayTreeIndented(root);
          lines.forEach((l) => print(l));
        }
      }
      print('\nEnter your choice: ');
      setPromptState('idle');
      return;
    }

    if (promptState === 'codes_filename') {
      const f = files.find((item) => item.name === val.trim());
      if (!f) {
        print('File not found.\n');
      } else {
        const { frequency } = calculateFrequency(f.data);
        const root = buildHuffmanTree(frequency);
        if (!root) {
          print('Empty file. Codes cannot be generated.\n');
        } else {
          const codes = generateCodes(root);
          print('\nHuffman Codes:');
          for (let i = 0; i < 256; i++) {
            if (frequency[i] > 0n) {
              print(`Byte ${i} : ${codes[i]}`);
            }
          }
        }
      }
      print('\nEnter your choice: ');
      setPromptState('idle');
      return;
    }

    if (promptState === 'compress_input') {
      setTempState({ input: val.trim() });
      print('Enter output SmartFile name: ');
      setPromptState('compress_output');
      return;
    }

    if (promptState === 'compress_output') {
      const inputName = tempState.input;
      const outputName = val.trim();
      const inputFile = files.find((f) => f.name === inputName);

      if (!inputFile) {
        print('\nInput file does not exist.\n');
      } else if (inputName === outputName) {
        print('\nInput and output filenames must be different.\n');
      } else {
        const { compressedData, stats } = compressData(inputFile.data);
        const newFile: VirtualFile = {
          name: outputName,
          data: compressedData,
          size: compressedData.length,
          lastModified: Date.now(),
          isSfl1: true,
        };
        onUpdateFiles([...files, newFile]);

        if (stats.mode === 'HUFFMAN') {
          print('\nHUFFMAN COMPRESSION APPLIED');
          print(`Huffman Header Size: ${stats.huffmanHeaderSize} bytes`);
          print(`Encoded Data Size : ${stats.encodedSize} bytes`);
        } else {
          print('\nRAW MODE APPLIED');
          print('Huffman compression would not reduce the total file size.');
          print('Original data stored directly after the RAW header.');
        }

        print('\n========== COMPRESSION STATISTICS ==========');
        print(`Original File Size       : ${stats.originalSize} bytes`);
        print(`Estimated Compressed Size: ${stats.estimatedSize} bytes`);
        print(`Actual Compressed Size   : ${stats.actualSize} bytes`);
        print(`Compression Mode         : ${stats.mode}`);
        if (stats.actualSize <= stats.originalSize) {
          print(`Bytes Saved              : ${stats.bytesSaved} bytes`);
          print(`Space Saved              : ${stats.spaceSavedPercent.toFixed(2)}%`);
        } else {
          print(`Bytes Saved              : 0 bytes`);
          print(`Size Increased           : ${stats.sizeIncreased} bytes`);
          print(`Size Increase            : ${stats.sizeIncreasePercent.toFixed(2)}%`);
        }
        print('============================================\n');
      }

      print('Enter your choice: ');
      setPromptState('idle');
      return;
    }

    if (promptState === 'decompress_input') {
      setTempState({ input: val.trim() });
      print('Enter output filename: ');
      setPromptState('decompress_output');
      return;
    }

    if (promptState === 'decompress_output') {
      const inputName = tempState.input;
      const outputName = val.trim();
      const inputFile = files.find((f) => f.name === inputName);

      if (!inputFile) {
        print('\nSmartFile does not exist.\n');
      } else if (inputName === outputName) {
        print('\nInput and output filenames must be different.\n');
      } else {
        const result = decompressData(inputFile.data);
        if (result.success && result.decompressedData) {
          const newFile: VirtualFile = {
            name: outputName,
            data: result.decompressedData,
            size: result.decompressedData.length,
            lastModified: Date.now(),
          };
          onUpdateFiles([...files, newFile]);

          if (result.mode === 'RAW') {
            print('\nRAW MODE DECOMPRESSION COMPLETED');
            print(`Decompressed Size: ${newFile.size} bytes\n`);
          } else {
            print('\nHUFFMAN MODE DECOMPRESSION COMPLETED');
            print(`Original Size: ${result.originalSize} bytes`);
            print(`Decompressed Size: ${newFile.size} bytes\n`);
          }
        } else {
          print(`\nDecompression failed: ${result.error}\n`);
        }
      }

      print('Enter your choice: ');
      setPromptState('idle');
      return;
    }

    if (promptState === 'verify_orig') {
      setTempState({ orig: val.trim() });
      print('Enter decompressed filename: ');
      setPromptState('verify_decomp');
      return;
    }

    if (promptState === 'verify_decomp') {
      const origName = tempState.orig;
      const decompName = val.trim();

      const fA = files.find((f) => f.name === origName);
      const fB = files.find((f) => f.name === decompName);

      if (!fA || !fB) {
        print('One or both files do not exist.\n');
      } else {
        print(`\nOriginal File Size     : ${fA.size} bytes`);
        print(`Decompressed File Size : ${fB.size} bytes\n`);

        const cmp = compareFilesBytes(fA.data, fB.data);
        if (cmp.identical) {
          print('VERIFICATION PASSED');
          print('Both files are exactly identical.\n');
        } else {
          print('VERIFICATION FAILED');
          print('The files are not identical.\n');
        }
      }

      print('Enter your choice: ');
      setPromptState('idle');
      return;
    }
  };

  return (
    <div className="space-y-4">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Interactive C++ Terminal Emulator (stdin / stdout)
            </h2>
            <p className="text-xs text-slate-400">
              Directly execute choices 1 through 11 matching the C++ console application
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Logs'}</span>
          </button>
          <button
            onClick={handleResetTerminal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart Console</span>
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Terminal Window Header */}
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <span className="text-xs font-mono text-slate-400 ml-2">
              smartfile_compressor.out
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            g++ -O3 -std=c++17
          </span>
        </div>

        {/* Scrollable Output Stream */}
        <div className="p-4 font-mono text-xs text-slate-200 h-[480px] overflow-y-auto space-y-1 select-text">
          {outputLines.map((line, idx) => (
            <div
              key={idx}
              className={`whitespace-pre-wrap leading-relaxed ${
                line.startsWith('>')
                  ? 'text-indigo-400 font-bold'
                  : line.includes('VERIFICATION PASSED') || line.includes('HUFFMAN COMPRESSION APPLIED')
                  ? 'text-emerald-400 font-bold'
                  : line.includes('VERIFICATION FAILED') || line.includes('Invalid')
                  ? 'text-rose-400 font-bold'
                  : 'text-slate-300'
              }`}
            >
              {line}
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>

        {/* Interactive stdin input form */}
        <form
          onSubmit={handleFormSubmit}
          className="bg-slate-900/90 border-t border-slate-800 p-3 flex items-center gap-2"
        >
          <span className="text-xs font-mono text-emerald-400 font-bold shrink-0">
            stdin &gt;
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Type choice (1-11) or answer and hit Enter..."
            className="flex-1 bg-transparent border-0 text-xs font-mono text-white placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-mono transition-colors shrink-0 flex items-center gap-1"
          >
            <span>Send</span>
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>
    </div>
  );
};
