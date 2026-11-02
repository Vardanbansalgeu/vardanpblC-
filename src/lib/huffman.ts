/**
 * SmartFile Huffman Compression & Decompression Engine
 * 100% binary and algorithmic parity with C++ SFL1 format
 */

export class HuffmanNode {
  data: number; // 0..255
  frequency: bigint;
  minSymbol: number;
  left: HuffmanNode | null;
  right: HuffmanNode | null;
  id: string;

  constructor(
    data: number,
    frequency: bigint | number,
    left: HuffmanNode | null = null,
    right: HuffmanNode | null = null
  ) {
    this.data = data;
    this.frequency = typeof frequency === 'bigint' ? frequency : BigInt(frequency);
    this.left = left;
    this.right = right;
    this.id = Math.random().toString(36).substring(2, 9);

    if (left === null && right === null) {
      this.minSymbol = data;
    } else {
      const leftMin = left ? left.minSymbol : 256;
      const rightMin = right ? right.minSymbol : 256;
      this.minSymbol = leftMin < rightMin ? leftMin : rightMin;
    }
  }

  isLeaf(): boolean {
    return this.left === null && this.right === null;
  }
}

/**
 * Compare comparator matching C++:
 * bool operator()(HuffmanNode *a, HuffmanNode *b) {
 *     if (a->frequency != b->frequency) return a->frequency > b->frequency;
 *     return a->minSymbol > b->minSymbol;
 * }
 * In min-priority order: smaller frequency first, then smaller minSymbol.
 */
export function compareNodes(a: HuffmanNode, b: HuffmanNode): number {
  if (a.frequency !== b.frequency) {
    return a.frequency < b.frequency ? -1 : 1;
  }
  return a.minSymbol - b.minSymbol;
}

export class PriorityQueue {
  private items: HuffmanNode[] = [];

  push(node: HuffmanNode): void {
    this.items.push(node);
    this.items.sort((a, b) => compareNodes(a, b));
  }

  pop(): HuffmanNode | undefined {
    return this.items.shift();
  }

  top(): HuffmanNode | undefined {
    return this.items[0];
  }

  get size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

export class BitWriter {
  private buffer: number = 0;
  private bitCount: number = 0;
  private output: number[] = [];

  writeBit(bit: number): void {
    this.buffer = ((this.buffer << 1) | (bit & 1)) & 0xff;
    this.bitCount++;

    if (this.bitCount === 8) {
      this.output.push(this.buffer);
      this.buffer = 0;
      this.bitCount = 0;
    }
  }

  writeCode(code: string): void {
    for (let i = 0; i < code.length; i++) {
      this.writeBit(code.charCodeAt(i) - 48); // '0' -> 0, '1' -> 1
    }
  }

  flush(): void {
    if (this.bitCount > 0) {
      this.buffer = (this.buffer << (8 - this.bitCount)) & 0xff;
      this.output.push(this.buffer);
      this.buffer = 0;
      this.bitCount = 0;
    }
  }

  getBytes(): Uint8Array {
    return new Uint8Array(this.output);
  }

  getCurrentState() {
    return {
      buffer: this.buffer,
      bitCount: this.bitCount,
      outputLength: this.output.length,
    };
  }
}

export class BitReader {
  private data: Uint8Array;
  private offset: number;
  private buffer: number = 0;
  private bitCount: number = 0;

  constructor(data: Uint8Array, startOffset: number = 0) {
    this.data = data;
    this.offset = startOffset;
  }

  readBit(): number {
    if (this.bitCount === 0) {
      if (this.offset >= this.data.length) {
        return -1;
      }
      this.buffer = this.data[this.offset++];
      this.bitCount = 8;
    }

    const bit = (this.buffer >> 7) & 1;
    this.buffer = (this.buffer << 1) & 0xff;
    this.bitCount--;
    return bit;
  }

  get currentOffset(): number {
    return this.offset;
  }
}

export interface CompressionStats {
  originalSize: number;
  estimatedHuffmanSize: number;
  estimatedRawSize: number;
  estimatedSize: number;
  actualSize: number;
  mode: 'HUFFMAN' | 'RAW';
  useHuffman: boolean;
  rawHeaderSize: number;
  huffmanHeaderSize: number;
  encodedSize: number;
  bytesSaved: number;
  spaceSavedPercent: number;
  sizeIncreased: number;
  sizeIncreasePercent: number;
  totalBits: number;
}

export interface CodeInfo {
  byte: number;
  char: string;
  frequency: number;
  code: string;
  length: number;
  totalBits: number;
}

/**
 * Calculates frequency for each byte 0..255
 */
export function calculateFrequency(data: Uint8Array): {
  frequency: bigint[];
  totalSize: number;
  distinctCount: number;
} {
  const frequency = new Array<bigint>(256).fill(0n);
  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    frequency[val] += 1n;
  }

  let distinct = 0;
  for (let i = 0; i < 256; i++) {
    if (frequency[i] > 0n) distinct++;
  }

  return {
    frequency,
    totalSize: data.length,
    distinctCount: distinct,
  };
}

/**
 * Builds Huffman Tree from frequency array matching C++ algorithm
 */
export function buildHuffmanTree(frequency: bigint[] | number[]): HuffmanNode | null {
  const pq = new PriorityQueue();

  for (let i = 0; i < 256; i++) {
    const f = BigInt(frequency[i]);
    if (f > 0n) {
      pq.push(new HuffmanNode(i, f));
    }
  }

  if (pq.isEmpty()) {
    return null;
  }

  while (pq.size > 1) {
    const left = pq.pop()!;
    const right = pq.pop()!;
    pq.push(new HuffmanNode(0, left.frequency + right.frequency, left, right));
  }

  return pq.top() || null;
}

/**
 * Generates Huffman codes for all leaves
 */
export function generateCodes(root: HuffmanNode | null): string[] {
  const codes: string[] = new Array(256).fill('');
  if (!root) return codes;

  function traverse(node: HuffmanNode, code: string) {
    if (node.isLeaf()) {
      codes[node.data] = code === '' ? '0' : code;
      return;
    }
    if (node.left) traverse(node.left, code + '0');
    if (node.right) traverse(node.right, code + '1');
  }

  traverse(root, '');
  return codes;
}

/**
 * Formats tree as indented text identical to C++ displayTree
 */
export function displayTreeIndented(root: HuffmanNode | null, indent: string = ''): string[] {
  if (!root) return [];
  const lines: string[] = [];

  if (root.isLeaf()) {
    lines.push(`${indent}Byte: ${root.data} Frequency: ${root.frequency.toString()}`);
    return lines;
  }

  lines.push(`${indent}Frequency: ${root.frequency.toString()}`);
  if (root.left) {
    lines.push(...displayTreeIndented(root.left, indent + '  '));
  }
  if (root.right) {
    lines.push(...displayTreeIndented(root.right, indent + '  '));
  }
  return lines;
}

/**
 * Compress file bytes using SmartFile SFL1 format
 */
export function compressData(data: Uint8Array): {
  compressedData: Uint8Array;
  stats: CompressionStats;
  codes: string[];
  tree: HuffmanNode | null;
  frequencies: bigint[];
} {
  const { frequency, totalSize } = calculateFrequency(data);
  const root = buildHuffmanTree(frequency);
  const codes = generateCodes(root);

  let totalBits = 0;
  for (let i = 0; i < 256; i++) {
    if (frequency[i] > 0n) {
      totalBits += Number(frequency[i]) * codes[i].length;
    }
  }

  const rawHeaderSize = 4 + 1 + 8; // 13
  const huffmanHeaderSize = 4 + 1 + 8 + 256 * 8; // 2061

  const encodedSize = Math.ceil(totalBits / 8);
  const estimatedHuffmanSize = huffmanHeaderSize + encodedSize;
  const estimatedRawSize = rawHeaderSize + totalSize;

  const useHuffman = estimatedHuffmanSize < estimatedRawSize;
  const estimatedSize = useHuffman ? estimatedHuffmanSize : estimatedRawSize;

  let actualCompressedBytes: Uint8Array;

  if (useHuffman) {
    // SFL1 HUFFMAN MODE
    // 4 bytes: SFL1
    // 1 byte: 1
    // 8 bytes: originalSize
    // 256 * 8 bytes: frequency
    // encoded bitstream
    const bitWriter = new BitWriter();
    for (let i = 0; i < data.length; i++) {
      bitWriter.writeCode(codes[data[i]]);
    }
    bitWriter.flush();
    const encodedPayload = bitWriter.getBytes();

    const totalBufferLength = huffmanHeaderSize + encodedPayload.length;
    actualCompressedBytes = new Uint8Array(totalBufferLength);
    const view = new DataView(actualCompressedBytes.buffer);

    // Magic: "SFL1"
    actualCompressedBytes[0] = 0x53; // 'S'
    actualCompressedBytes[1] = 0x46; // 'F'
    actualCompressedBytes[2] = 0x4c; // 'L'
    actualCompressedBytes[3] = 0x31; // '1'

    // Mode: 1
    actualCompressedBytes[4] = 1;

    // originalSize uint64 LE
    view.setBigUint64(5, BigInt(totalSize), true);

    // frequencies 256 * uint64 LE
    let offset = 13;
    for (let i = 0; i < 256; i++) {
      view.setBigUint64(offset, frequency[i], true);
      offset += 8;
    }

    // copy bitstream
    actualCompressedBytes.set(encodedPayload, offset);
  } else {
    // SFL1 RAW MODE
    // 4 bytes: SFL1
    // 1 byte: 0
    // 8 bytes: originalSize
    // raw data
    const totalBufferLength = rawHeaderSize + totalSize;
    actualCompressedBytes = new Uint8Array(totalBufferLength);
    const view = new DataView(actualCompressedBytes.buffer);

    actualCompressedBytes[0] = 0x53;
    actualCompressedBytes[1] = 0x46;
    actualCompressedBytes[2] = 0x4c;
    actualCompressedBytes[3] = 0x31;

    actualCompressedBytes[4] = 0;
    view.setBigUint64(5, BigInt(totalSize), true);

    actualCompressedBytes.set(data, 13);
  }

  const actualSize = actualCompressedBytes.length;
  let bytesSaved = 0;
  let spaceSavedPercent = 0;
  let sizeIncreased = 0;
  let sizeIncreasePercent = 0;

  if (actualSize <= totalSize) {
    bytesSaved = totalSize - actualSize;
    spaceSavedPercent = totalSize > 0 ? (bytesSaved / totalSize) * 100 : 0;
  } else {
    sizeIncreased = actualSize - totalSize;
    sizeIncreasePercent = totalSize > 0 ? (sizeIncreased / totalSize) * 100 : 0;
  }

  const stats: CompressionStats = {
    originalSize: totalSize,
    estimatedHuffmanSize,
    estimatedRawSize,
    estimatedSize,
    actualSize,
    mode: useHuffman ? 'HUFFMAN' : 'RAW',
    useHuffman,
    rawHeaderSize,
    huffmanHeaderSize,
    encodedSize,
    bytesSaved,
    spaceSavedPercent,
    sizeIncreased,
    sizeIncreasePercent,
    totalBits,
  };

  return {
    compressedData: actualCompressedBytes,
    stats,
    codes,
    tree: root,
    frequencies: frequency,
  };
}

/**
 * Decompress SFL1 binary file matching C++ decompressFile
 */
export function decompressData(sflData: Uint8Array): {
  success: boolean;
  decompressedData?: Uint8Array;
  error?: string;
  originalSize: number;
  mode: 'HUFFMAN' | 'RAW';
  frequencyTotal?: number;
  logs: string[];
} {
  const logs: string[] = [];

  if (sflData.length < 13) {
    return {
      success: false,
      error: 'Invalid SmartFile: File size is smaller than the minimum 13-byte header.',
      originalSize: 0,
      mode: 'RAW',
      logs: ['Error: File is smaller than minimum header size.'],
    };
  }

  // Check Magic "SFL1"
  if (
    sflData[0] !== 0x53 || // S
    sflData[1] !== 0x46 || // F
    sflData[2] !== 0x4c || // L
    sflData[3] !== 0x31 // 1
  ) {
    return {
      success: false,
      error: 'Invalid SmartFile format: Magic signature "SFL1" not found.',
      originalSize: 0,
      mode: 'RAW',
      logs: ['Error: Invalid Magic header signature.'],
    };
  }
  logs.push('SmartFile header signature verified: "SFL1"');

  const mode = sflData[4];
  if (mode !== 0 && mode !== 1) {
    return {
      success: false,
      error: `Unknown compression mode byte: ${mode} (expected 0 for RAW or 1 for HUFFMAN).`,
      originalSize: 0,
      mode: 'RAW',
      logs: [`Error: Unknown compression mode: ${mode}`],
    };
  }

  const view = new DataView(sflData.buffer, sflData.byteOffset, sflData.byteLength);
  const originalSizeBig = view.getBigUint64(5, true);
  const originalSize = Number(originalSizeBig);
  logs.push(`Original file size from header: ${originalSize} bytes`);

  if (mode === 0) {
    logs.push('Compression mode: RAW');
    // Mode 0: RAW mode
    const payload = sflData.subarray(13);
    if (payload.length < originalSize) {
      return {
        success: false,
        error: 'RAW data is incomplete or corrupted.',
        originalSize,
        mode: 'RAW',
        logs,
      };
    }
    const output = new Uint8Array(originalSize);
    output.set(payload.subarray(0, originalSize));
    logs.push(`RAW MODE DECOMPRESSION COMPLETED: Restored ${originalSize} bytes.`);
    return {
      success: true,
      decompressedData: output,
      originalSize,
      mode: 'RAW',
      logs,
    };
  }

  // Mode 1: HUFFMAN mode
  logs.push('Compression mode: HUFFMAN');
  const huffmanHeaderSize = 4 + 1 + 8 + 256 * 8; // 2061
  if (sflData.length < huffmanHeaderSize) {
    return {
      success: false,
      error: 'Compressed file is shorter than its 2061-byte Huffman header.',
      originalSize,
      mode: 'HUFFMAN',
      logs,
    };
  }

  const frequency = new Array<bigint>(256);
  let frequencyTotalBig = 0n;
  let offset = 13;
  for (let i = 0; i < 256; i++) {
    frequency[i] = view.getBigUint64(offset, true);
    frequencyTotalBig += frequency[i];
    offset += 8;
  }

  const frequencyTotal = Number(frequencyTotalBig);
  logs.push(`Frequency table loaded. Sum of frequencies = ${frequencyTotal} bytes.`);

  if (frequencyTotal !== originalSize) {
    return {
      success: false,
      error: `Invalid header: frequency total (${frequencyTotal}) does not match original size (${originalSize}).`,
      originalSize,
      mode: 'HUFFMAN',
      frequencyTotal,
      logs,
    };
  }

  if (originalSize === 0) {
    logs.push('Empty HUFFMAN file decompressed successfully (0 bytes).');
    return {
      success: true,
      decompressedData: new Uint8Array(0),
      originalSize: 0,
      mode: 'HUFFMAN',
      frequencyTotal: 0,
      logs,
    };
  }

  const root = buildHuffmanTree(frequency);
  if (!root) {
    return {
      success: false,
      error: 'Huffman tree could not be rebuilt from frequency table.',
      originalSize,
      mode: 'HUFFMAN',
      logs,
    };
  }
  logs.push('Huffman tree successfully reconstructed with minSymbol priority.');

  const decompressed = new Uint8Array(originalSize);

  if (root.isLeaf()) {
    // Single distinct symbol file
    decompressed.fill(root.data);
    logs.push(`Single symbol file: repeated byte ${root.data} ${originalSize} times.`);
  } else {
    const reader = new BitReader(sflData, huffmanHeaderSize);
    let decoded = 0;
    let current: HuffmanNode = root;

    while (decoded < originalSize) {
      const bit = reader.readBit();
      if (bit === -1) {
        return {
          success: false,
          error: 'Compressed data ended before decoding was complete.',
          originalSize,
          mode: 'HUFFMAN',
          logs,
        };
      }

      current = bit === 0 ? current.left! : current.right!;
      if (!current) {
        return {
          success: false,
          error: 'Invalid Huffman bit sequence encountered during tree traversal.',
          originalSize,
          mode: 'HUFFMAN',
          logs,
        };
      }

      if (current.isLeaf()) {
        decompressed[decoded++] = current.data;
        current = root;
      }
    }
  }

  logs.push(`HUFFMAN MODE DECOMPRESSION COMPLETED: Restored exactly ${originalSize} bytes.`);

  return {
    success: true,
    decompressedData: decompressed,
    originalSize,
    mode: 'HUFFMAN',
    frequencyTotal,
    logs,
  };
}

/**
 * Compare two byte arrays byte-by-byte
 */
export function compareFilesBytes(
  first: Uint8Array,
  second: Uint8Array
): {
  identical: boolean;
  firstSize: number;
  secondSize: number;
  firstDiffOffset?: number;
  firstDiffA?: number;
  firstDiffB?: number;
} {
  const firstSize = first.length;
  const secondSize = second.length;

  if (firstSize !== secondSize) {
    return {
      identical: false,
      firstSize,
      secondSize,
      firstDiffOffset: Math.min(firstSize, secondSize),
    };
  }

  for (let i = 0; i < firstSize; i++) {
    if (first[i] !== second[i]) {
      return {
        identical: false,
        firstSize,
        secondSize,
        firstDiffOffset: i,
        firstDiffA: first[i],
        firstDiffB: second[i],
      };
    }
  }

  return {
    identical: true,
    firstSize,
    secondSize,
  };
}

/**
 * Compute SHA-256 hex string for checksum verification
 */
export async function computeSha256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Helper to display ASCII character nicely
 */
export function formatChar(byte: number): { display: string; name: string } {
  if (byte === 32) return { display: '␣', name: 'Space (0x20)' };
  if (byte === 10) return { display: '\\n', name: 'Newline (0x0A)' };
  if (byte === 13) return { display: '\\r', name: 'Carriage Return (0x0D)' };
  if (byte === 9) return { display: '\\t', name: 'Tab (0x09)' };
  if (byte >= 33 && byte <= 126) {
    const ch = String.fromCharCode(byte);
    return { display: ch, name: `'${ch}'` };
  }
  return { display: '·', name: `0x${byte.toString(16).toUpperCase().padStart(2, '0')}` };
}
