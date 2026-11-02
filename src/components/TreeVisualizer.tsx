import React, { useState, useMemo, useRef } from 'react';
import {
  GitFork,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Check,
  Info,
  Maximize2,
  FileText,
} from 'lucide-react';
import { VirtualFile } from '../lib/virtualFs';
import {
  calculateFrequency,
  buildHuffmanTree,
  HuffmanNode,
  displayTreeIndented,
  formatChar,
} from '../lib/huffman';

interface TreeVisualizerProps {
  files: VirtualFile[];
  activeFile: VirtualFile | null;
  onSelectFile: (file: VirtualFile) => void;
}

interface LayoutNode {
  id: string;
  data: number;
  frequency: bigint;
  minSymbol: number;
  isLeaf: boolean;
  x: number;
  y: number;
  charName: string;
  left?: LayoutNode;
  right?: LayoutNode;
  codePath: string;
}

export const TreeVisualizer: React.FC<TreeVisualizerProps> = ({
  files,
  activeFile,
  onSelectFile,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'indented'>('visual');
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<LayoutNode | null>(null);
  const [copiedAscii, setCopiedAscii] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Build tree from active file
  const treeRoot = useMemo(() => {
    if (!activeFile) return null;
    const { frequency } = calculateFrequency(activeFile.data);
    return buildHuffmanTree(frequency);
  }, [activeFile]);

  // Compute Layout coordinates for SVG rendering
  const { layoutRoot, maxDepth, totalLeaves, bounds } = useMemo(() => {
    if (!treeRoot) {
      return {
        layoutRoot: null,
        maxDepth: 0,
        totalLeaves: 0,
        bounds: { minX: 0, maxX: 800, minY: 0, maxY: 600 },
      };
    }

    let leafCount = 0;
    let deepest = 0;

    // First pass: assign x to leaves based on in-order traversal
    function layout(
      node: HuffmanNode | null,
      depth: number,
      code: string
    ): LayoutNode | null {
      if (!node) return null;
      if (depth > deepest) deepest = depth;

      const isLeaf = node.isLeaf();
      let leftLayout: LayoutNode | undefined;
      let rightLayout: LayoutNode | undefined;

      if (!isLeaf) {
        if (node.left) leftLayout = layout(node.left, depth + 1, code + '0') || undefined;
        if (node.right) rightLayout = layout(node.right, depth + 1, code + '1') || undefined;
      }

      let x = 0;
      if (isLeaf) {
        leafCount++;
        x = leafCount * 90;
      } else if (leftLayout && rightLayout) {
        x = (leftLayout.x + rightLayout.x) / 2;
      } else if (leftLayout) {
        x = leftLayout.x;
      } else if (rightLayout) {
        x = rightLayout.x;
      }

      const y = depth * 110 + 60;
      const charInfo = formatChar(node.data);

      return {
        id: node.id,
        data: node.data,
        frequency: node.frequency,
        minSymbol: node.minSymbol,
        isLeaf,
        x,
        y,
        charName: charInfo.name,
        left: leftLayout,
        right: rightLayout,
        codePath: code,
      };
    }

    const root = layout(treeRoot, 0, '');

    const totalWidth = Math.max((leafCount + 1) * 90, 800);
    const totalHeight = Math.max((deepest + 1) * 110 + 120, 600);

    return {
      layoutRoot: root,
      maxDepth: deepest,
      totalLeaves: leafCount,
      bounds: { minX: 0, maxX: totalWidth, minY: 0, maxY: totalHeight },
    };
  }, [treeRoot]);

  // Generate ASCII lines identical to C++ displayTree
  const asciiTreeLines = useMemo(() => {
    return displayTreeIndented(treeRoot);
  }, [treeRoot]);

  const handleCopyAscii = () => {
    if (asciiTreeLines.length === 0) return;
    navigator.clipboard.writeText(asciiTreeLines.join('\n'));
    setCopiedAscii(true);
    setTimeout(() => setCopiedAscii(false), 2000);
  };

  // Mouse pan handlers for SVG canvas
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  // Render SVG Edges recursively
  const renderEdges = (node: LayoutNode | null | undefined): React.ReactNode => {
    if (!node) return null;
    const elements: React.ReactNode[] = [];

    if (node.left) {
      const midX = (node.x + node.left.x) / 2;
      const midY = (node.y + node.left.y) / 2;
      const isPathActive =
        selectedNode && selectedNode.codePath.startsWith(node.codePath + '0');

      elements.push(
        <g key={`edge-l-${node.id}`}>
          <line
            x1={node.x}
            y1={node.y}
            x2={node.left.x}
            y2={node.left.y}
            stroke={isPathActive ? '#10b981' : '#334155'}
            strokeWidth={isPathActive ? 3 : 1.5}
            strokeDasharray={isPathActive ? undefined : '3,3'}
          />
          {/* Label 0 for Left branch */}
          <rect
            x={midX - 10}
            y={midY - 9}
            width={20}
            height={18}
            rx={4}
            fill="#0f172a"
            stroke={isPathActive ? '#10b981' : '#1e293b'}
          />
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fill={isPathActive ? '#34d399' : '#94a3b8'}
            fontSize={11}
            fontWeight="bold"
            fontFamily="monospace"
          >
            0
          </text>
        </g>
      );
      elements.push(renderEdges(node.left));
    }

    if (node.right) {
      const midX = (node.x + node.right.x) / 2;
      const midY = (node.y + node.right.y) / 2;
      const isPathActive =
        selectedNode && selectedNode.codePath.startsWith(node.codePath + '1');

      elements.push(
        <g key={`edge-r-${node.id}`}>
          <line
            x1={node.x}
            y1={node.y}
            x2={node.right.x}
            y2={node.right.y}
            stroke={isPathActive ? '#10b981' : '#334155'}
            strokeWidth={isPathActive ? 3 : 1.5}
            strokeDasharray={isPathActive ? undefined : '3,3'}
          />
          {/* Label 1 for Right branch */}
          <rect
            x={midX - 10}
            y={midY - 9}
            width={20}
            height={18}
            rx={4}
            fill="#0f172a"
            stroke={isPathActive ? '#10b981' : '#1e293b'}
          />
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fill={isPathActive ? '#34d399' : '#94a3b8'}
            fontSize={11}
            fontWeight="bold"
            fontFamily="monospace"
          >
            1
          </text>
        </g>
      );
      elements.push(renderEdges(node.right));
    }

    return elements;
  };

  // Render SVG Nodes recursively
  const renderNodes = (node: LayoutNode | null | undefined): React.ReactNode => {
    if (!node) return null;
    const elements: React.ReactNode[] = [];
    const isSelected = selectedNode?.id === node.id;
    const isOnPath = selectedNode && selectedNode.codePath.startsWith(node.codePath);

    if (node.isLeaf) {
      elements.push(
        <g
          key={`node-${node.id}`}
          transform={`translate(${node.x}, ${node.y})`}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedNode(node);
          }}
          className="cursor-pointer group"
        >
          <rect
            x={-38}
            y={-28}
            width={76}
            height={56}
            rx={8}
            fill={isSelected ? '#064e3b' : isOnPath ? '#042f2e' : '#0f172a'}
            stroke={isSelected ? '#10b981' : isOnPath ? '#34d399' : '#334155'}
            strokeWidth={isSelected ? 2.5 : 1.5}
            className="transition-colors group-hover:stroke-indigo-400"
          />
          {/* Symbol display */}
          <text
            x={0}
            y={-8}
            textAnchor="middle"
            fill="#f8fafc"
            fontSize={13}
            fontWeight="bold"
            fontFamily="monospace"
          >
            {node.charName.length > 8 ? node.charName.slice(0, 7) + '…' : node.charName}
          </text>
          {/* Frequency & Byte info */}
          <text
            x={0}
            y={8}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={10}
            fontFamily="monospace"
          >
            freq: {node.frequency.toString()}
          </text>
          <text
            x={0}
            y={20}
            textAnchor="middle"
            fill="#64748b"
            fontSize={9}
            fontFamily="monospace"
          >
            dec: {node.data} · min: {node.minSymbol}
          </text>
        </g>
      );
    } else {
      elements.push(
        <g
          key={`node-${node.id}`}
          transform={`translate(${node.x}, ${node.y})`}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedNode(node);
          }}
          className="cursor-pointer group"
        >
          <circle
            r={24}
            fill={isSelected ? '#312e81' : isOnPath ? '#1e1b4b' : '#0f172a'}
            stroke={isSelected ? '#6366f1' : isOnPath ? '#818cf8' : '#334155'}
            strokeWidth={isSelected ? 2.5 : 1.5}
            className="transition-colors group-hover:stroke-indigo-400"
          />
          <text
            x={0}
            y={-3}
            textAnchor="middle"
            fill="#f8fafc"
            fontSize={11}
            fontWeight="bold"
            fontFamily="monospace"
          >
            {node.frequency.toString()}
          </text>
          <text
            x={0}
            y={11}
            textAnchor="middle"
            fill="#64748b"
            fontSize={8}
            fontFamily="monospace"
          >
            min:{node.minSymbol}
          </text>
        </g>
      );
    }

    if (node.left) elements.push(renderNodes(node.left));
    if (node.right) elements.push(renderNodes(node.right));

    return elements;
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Option 5: Display Huffman Tree (C++ showHuffmanTree)
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic priority queue tree built with minSymbol tie-breaking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* File selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">File:</label>
            <select
              value={activeFile?.name || ''}
              onChange={(e) => {
                const f = files.find((item) => item.name === e.target.value);
                if (f) onSelectFile(f);
              }}
              className="bg-slate-950 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {files.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name} ({f.size} B)
                </option>
              ))}
            </select>
          </div>

          {/* Mode Switch: Visual vs Indented C++ text */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('visual')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'visual'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Interactive SVG Graph
            </button>
            <button
              onClick={() => setViewMode('indented')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'indented'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              C++ displayTree Indented
            </button>
          </div>
        </div>
      </div>

      {treeRoot && activeFile ? (
        viewMode === 'visual' ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden relative">
            {/* Canvas Toolbar */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-xs border border-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}
                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetView}
                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Reset View"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Selected Node Inspector Drawer (if node clicked) */}
            {selectedNode && (
              <div className="absolute top-3 left-3 z-10 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-lg p-3 max-w-xs text-xs font-mono shadow-xl space-y-1.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                  <span className="text-white font-semibold">
                    {selectedNode.isLeaf ? 'Leaf Node' : 'Internal Node'}
                  </span>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                {selectedNode.isLeaf && (
                  <div>
                    <span className="text-slate-400">Symbol: </span>
                    <span className="text-emerald-400 font-bold">{selectedNode.charName}</span>
                    <span className="text-slate-500"> (Byte {selectedNode.data})</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400">Frequency: </span>
                  <span className="text-white font-bold">{selectedNode.frequency.toString()}</span>
                </div>
                <div>
                  <span className="text-slate-400">minSymbol: </span>
                  <span className="text-indigo-400">{selectedNode.minSymbol}</span>
                </div>
                <div>
                  <span className="text-slate-400">Code Path: </span>
                  <span className="text-emerald-400 font-bold tracking-wider">
                    {selectedNode.codePath || '(Root)'}
                  </span>
                </div>
              </div>
            )}

            {/* Hint bar */}
            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/70 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-800/80">
              <Info className="w-3 h-3 text-indigo-400" />
              <span>Drag to pan canvas · Click any node to trace code path</span>
            </div>

            {/* SVG Interactive Canvas */}
            <div
              className="w-full h-[620px] overflow-hidden cursor-grab active:cursor-grabbing bg-slate-950/95"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${bounds.maxX} ${bounds.maxY}`}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'top center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                }}
              >
                {/* Render Edges first */}
                {renderEdges(layoutRoot)}
                {/* Render Nodes on top */}
                {renderNodes(layoutRoot)}
              </svg>
            </div>
          </div>
        ) : (
          /* C++ Indented Output Mode */
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-200">
                  C++ displayTree(HuffmanNode *root, string indent = "") Output
                </h3>
                <p className="text-[11px] text-slate-400">
                  Standard recursive print traversal from C++ source
                </p>
              </div>
              <button
                onClick={handleCopyAscii}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
              >
                {copiedAscii ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAscii ? 'Copied' : 'Copy Output'}</span>
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 max-h-[520px] overflow-y-auto whitespace-pre leading-relaxed select-text">
              {asciiTreeLines.join('\n')}
            </div>
          </div>
        )
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
          Select a file to generate and display its Huffman Tree.
        </div>
      )}
    </div>
  );
};
