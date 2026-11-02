/**
 * In-memory & Persistent Virtual Filesystem for SmartFile Compressor
 */

export interface VirtualFile {
  name: string;
  data: Uint8Array;
  size: number;
  lastModified: number;
  isSfl1?: boolean;
}

const DEFAULT_SAMPLE_TEXT = `Data structures and algorithms form the foundation of computer science.
Huffman coding is an optimal prefix code commonly used for lossless data compression.
The algorithm was developed by David A. Huffman while he was a Sc.D. student at MIT,
and published in the 1952 paper "A Method for the Construction of Minimum-Redundancy Codes".

The output from Huffman's algorithm can be viewed as a variable-length code table for encoding a source symbol.
The algorithm derives this table from the estimated probability or frequency of occurrence for each possible value of the source symbol.
More common symbols are generally represented using fewer bits than less common symbols.

In this SmartFile implementation:
1. Frequency analysis tallies every byte from 0 to 255.
2. A priority queue with deterministic tie-breaking (minSymbol) builds the optimal binary tree.
3. Left branches assign bit '0' and right branches assign bit '1'.
4. If the 2061-byte frequency header plus encoded stream is smaller than the original size, HUFFMAN mode is selected.
5. Otherwise, RAW mode is automatically chosen to prevent file expansion.`;

const DEFAULT_DNA = `>seq1_chr7_homo_sapiens_huffman_benchmark
ATGCGATCGATCGATCGATCGATCGATCGATCGATCGA
GCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC
AAAAAATTTTTTCCCCCCGGGGGGAAAAATTTTCCCCG
ATCGATCGATCGATCGATCGATCGATCGATCGATCGAT
CGATCGATCGATCGATCGATCGATCGATCGATCGATCG
GCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC
AAAAAAAAAAAAAAAAAAAAAAAATTTTTTTTTTTTTT
CCCCCCCCCCCCCCCCCCCCCCCCGGGGGGGGGGGGGG
ATCGATCGATCGATCGATCGATCGATCGATCGATCGAT
GCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC
ATGCGATCGATCGATCGATCGATCGATCGATCGATCGA
GCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC
AAAAAATTTTTTCCCCCCGGGGGGAAAAATTTTCCCCG
ATCGATCGATCGATCGATCGATCGATCGATCGATCGAT
CGATCGATCGATCGATCGATCGATCGATCGATCGATCG
GCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC
AAAAAAAAAAAAAAAAAAAAAAAATTTTTTTTTTTTTT
CCCCCCCCCCCCCCCCCCCCCCCCGGGGGGGGGGGGGG
ATCGATCGATCGATCGATCGATCGATCGATCGATCGAT
GCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC
ATGCGATCGATCGATCGATCGATCGATCGATCGATCGA
GCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC
AAAAAATTTTTTCCCCCCGGGGGGAAAAATTTTCCCCG
ATCGATCGATCGATCGATCGATCGATCGATCGATCGAT
CGATCGATCGATCGATCGATCGATCGATCGATCGATCG
GCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC
AAAAAAAAAAAAAAAAAAAAAAAATTTTTTTTTTTTTT
CCCCCCCCCCCCCCCCCCCCCCCCGGGGGGGGGGGGGG
ATCGATCGATCGATCGATCGATCGATCGATCGATCGAT
GCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC`;

const DEFAULT_TINY = `Hello, SmartFile! Small files trigger RAW mode.`;

export function getInitialFiles(): Map<string, VirtualFile> {
  const map = new Map<string, VirtualFile>();

  const encoder = new TextEncoder();

  const addFile = (name: string, text: string) => {
    const bytes = encoder.encode(text);
    map.set(name, {
      name,
      data: bytes,
      size: bytes.length,
      lastModified: Date.now(),
      isSfl1: name.endsWith('.sfl1'),
    });
  };

  addFile('huffman_essay.txt', DEFAULT_SAMPLE_TEXT);
  addFile('dna_sequence.fasta', DEFAULT_DNA);
  addFile('tiny_note.txt', DEFAULT_TINY);

  return map;
}

export function downloadVirtualFile(file: VirtualFile): void {
  const blob = new Blob([file.data as unknown as BlobPart], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i >= sizes.length) return `${bytes} B`;
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getHexDump(
  data: Uint8Array,
  maxBytes: number = 256
): { lines: { offset: string; hex: string[]; ascii: string }[]; totalLength: number } {
  const lines: { offset: string; hex: string[]; ascii: string }[] = [];
  const limit = Math.min(data.length, maxBytes);

  for (let i = 0; i < limit; i += 16) {
    const chunk = data.subarray(i, Math.min(i + 16, limit));
    const offset = i.toString(16).padStart(6, '0').toUpperCase();
    const hex: string[] = [];
    let ascii = '';

    for (let j = 0; j < 16; j++) {
      if (j < chunk.length) {
        const byte = chunk[j];
        hex.push(byte.toString(16).padStart(2, '0').toUpperCase());
        ascii += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
      } else {
        hex.push('  ');
        ascii += ' ';
      }
    }

    lines.push({ offset, hex, ascii });
  }

  return { lines, totalLength: data.length };
}
