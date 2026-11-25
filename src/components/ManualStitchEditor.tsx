import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  X,
  Undo2,
  Redo2,
  Paintbrush,
  PaintBucket,
  Pipette,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  Search,
  Plus,
  Eraser,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  Move,
  Save,
  RotateCcw,
  Route,
  Eye,
  EyeOff,
  Trash2,
  SlidersHorizontal,
  CheckCircle2,
  PenTool,
} from 'lucide-react';
import {
  PatternData,
  StitchGridCell,
  DMCColor,
  BackstitchSegment,
  SuggestedBackstitchPath,
} from '../types';
import { DMC_PALETTE } from '../data/dmcPalette';
import { recalculatePattern } from '../utils/patternEditor';
import {
  detectSuggestedBackstitchPaths,
  convertPathToBackstitchSegments,
  calculateBackstitchStats,
} from '../utils/outlineDetector';

interface ManualStitchEditorProps {
  isOpen: boolean;
  onClose: () => void;
  pattern: PatternData;
  onSave: (updatedPattern: PatternData) => void;
  language: 'en' | 'fil';
}

type EditorTool = 'pencil' | 'bucket' | 'replace' | 'eyedropper' | 'eraser' | 'pan' | 'backstitch';
type ViewMode = 'blocks' | 'stitches' | 'symbols';

interface EditAction {
  description: string;
  changes: { x: number; y: number; prevCode: string; newCode: string }[];
  backstitchChange?: {
    prevBackstitches: BackstitchSegment[];
    newBackstitches: BackstitchSegment[];
  };
}

export const ManualStitchEditor: React.FC<ManualStitchEditorProps> = ({
  isOpen,
  onClose,
  pattern,
  onSave,
  language,
}) => {
  // Working copy of grid
  const [grid, setGrid] = useState<StitchGridCell[][]>(() =>
    pattern.grid.map((row) => row.map((cell) => ({ ...cell })))
  );

  // Available palette in editor (starts with pattern palette, can add more from DMC_PALETTE)
  const [palette, setPalette] = useState<DMCColor[]>(() => [...pattern.palette]);
  const [activeColor, setActiveColor] = useState<DMCColor>(() => pattern.palette[0] || DMC_PALETTE[0]);

  // Selected tool & settings
  const [activeTool, setActiveTool] = useState<EditorTool>('pencil');
  const [brushSize, setBrushSize] = useState<1 | 2 | 3>(1);
  const [viewMode, setViewMode] = useState<ViewMode>('blocks');

  // Zoom & Pan
  const [zoom, setZoom] = useState<number>(1.2);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [startPanPos, setStartPanPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Canvas interaction
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStrokeChanges, setCurrentStrokeChanges] = useState<
    Map<string, { x: number; y: number; prevCode: string; newCode: string }>
  >(new Map());

  // Cursor tracking
  const [hoveredCell, setHoveredCell] = useState<{
    x: number;
    y: number;
    color: DMCColor;
  } | null>(null);

  // Undo / Redo history
  const [undoStack, setUndoStack] = useState<EditAction[]>([]);
  const [redoStack, setRedoStack] = useState<EditAction[]>([]);

  // Palette & Tools drawer tabs
  const [activeTab, setActiveTab] = useState<'palette' | 'backstitch' | 'dmcLibrary'>('palette');
  const [dmcSearchQuery, setDmcSearchQuery] = useState('');

  // Backstitch & Outline Assistant State
  const [backstitches, setBackstitches] = useState<BackstitchSegment[]>(() =>
    pattern.backstitches ? [...pattern.backstitches] : []
  );
  const [showBackstitches, setShowBackstitches] = useState<boolean>(true);
  const [suggestedPaths, setSuggestedPaths] = useState<SuggestedBackstitchPath[]>([]);
  const [hoveredPathId, setHoveredPathId] = useState<string | null>(null);
  const [showSuggestedGuides, setShowSuggestedGuides] = useState<boolean>(true);
  const [contrastThreshold, setContrastThreshold] = useState<number>(26);
  const [minPathLength, setMinPathLength] = useState<number>(3);
  const [backstitchColor, setBackstitchColor] = useState<string>('#1A1615');
  const [backstitchDmc, setBackstitchDmc] = useState<string>('310');
  const [backstitchStrands, setBackstitchStrands] = useState<1 | 2>(1);
  const [backstitchStart, setBackstitchStart] = useState<{ x: number; y: number } | null>(null);
  const [hoveredVertex, setHoveredVertex] = useState<{ x: number; y: number } | null>(null);
  const [pathCategoryFilter, setPathCategoryFilter] = useState<
    'all' | 'silhouette' | 'contrast-edge' | 'detail' | 'monogram'
  >('all');

  // Global Replace Modal
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceSourceColor, setReplaceSourceColor] = useState<DMCColor>(() => pattern.palette[0] || DMC_PALETTE[0]);
  const [replaceTargetColor, setReplaceTargetColor] = useState<DMCColor>(() => pattern.palette[1] || DMC_PALETTE[1]);

  // Unsaved changes confirmation modal
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Success toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset when pattern or modal opened
  useEffect(() => {
    if (isOpen) {
      setGrid(pattern.grid.map((row) => row.map((cell) => ({ ...cell }))));
      setPalette([...pattern.palette]);
      setActiveColor(pattern.palette[0] || DMC_PALETTE[0]);
      setBackstitches(pattern.backstitches ? [...pattern.backstitches] : []);
      setBackstitchStart(null);
      setHoveredVertex(null);
      setUndoStack([]);
      setRedoStack([]);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, pattern]);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Has unsaved changes?
  const hasUnsavedChanges = undoStack.length > 0;

  // Realtime color tally of current grid
  const colorTally = useMemo(() => {
    const tally = new Map<string, number>();
    for (let y = 0; y < pattern.height; y++) {
      for (let x = 0; x < pattern.width; x++) {
        const code = grid[y]?.[x]?.dmcCode;
        if (code) {
          tally.set(code, (tally.get(code) || 0) + 1);
        }
      }
    }
    return tally;
  }, [grid, pattern.width, pattern.height]);

  // Color dictionary lookup for rendering
  const colorMap = useMemo(() => {
    const map = new Map<string, DMCColor>();
    DMC_PALETTE.forEach((c) => map.set(c.code, c));
    palette.forEach((c) => map.set(c.code, c));
    return map;
  }, [palette]);

  // Backstitch metrics and thread requirements
  const backstitchStats = useMemo(() => {
    return calculateBackstitchStats(backstitches, 14);
  }, [backstitches]);

  // Base cell size (pixels per stitch at zoom 1.0)
  const baseCellSize = 14;
  const cellSize = baseCellSize * zoom;
  const totalCanvasWidth = pattern.width * cellSize;
  const totalCanvasHeight = pattern.height * cellSize;

  // Fit canvas to screen on initial open
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const availableW = rect.width - 48;
      const availableH = rect.height - 48;
      const fitZoom = Math.min(2.0, Math.max(0.4, Math.min(availableW / (pattern.width * baseCellSize), availableH / (pattern.height * baseCellSize))));
      setZoom(Number(fitZoom.toFixed(2)));
    }
  }, [isOpen, pattern.width, pattern.height]);

  // Run Outline detection whenever grid, palette, threshold, or minPathLength changes
  useEffect(() => {
    if (!isOpen) return;
    const paths = detectSuggestedBackstitchPaths(grid, palette, pattern.width, pattern.height, {
      contrastThreshold,
      minPathLength,
      suggestedDmc: backstitchDmc,
      suggestedHex: backstitchColor,
    });
    setSuggestedPaths(paths);
  }, [
    isOpen,
    grid,
    palette,
    pattern.width,
    pattern.height,
    contrastThreshold,
    minPathLength,
    backstitchDmc,
    backstitchColor,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in search input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        setIsSpaceDown(true);
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key.toLowerCase() === 'b') {
        setActiveTool('pencil');
      } else if (e.key.toLowerCase() === 'g') {
        setActiveTool('bucket');
      } else if (e.key.toLowerCase() === 'i') {
        setActiveTool('eyedropper');
      } else if (e.key.toLowerCase() === 'e') {
        setActiveTool('eraser');
      } else if (e.key.toLowerCase() === 'h') {
        setActiveTool('pan');
      } else if (e.key.toLowerCase() === 's') {
        setActiveTool('backstitch');
        setActiveTab('backstitch');
      } else if (e.key.toLowerCase() === 'r') {
        setShowReplaceModal(true);
      } else if (e.key === 'Escape') {
        if (backstitchStart) {
          setBackstitchStart(null);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceDown(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, undoStack, redoStack, backstitchStart]);

  // Render Pattern onto Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = totalCanvasWidth;
    canvas.height = totalCanvasHeight;

    // Background Aida cloth texture
    ctx.fillStyle = '#FAF7F2';
    ctx.fillRect(0, 0, totalCanvasWidth, totalCanvasHeight);

    // Draw grid cells
    for (let y = 0; y < pattern.height; y++) {
      for (let x = 0; x < pattern.width; x++) {
        const cell = grid[y]?.[x];
        if (!cell) continue;

        const color = colorMap.get(cell.dmcCode) || palette[0] || DMC_PALETTE[0];
        const px = x * cellSize;
        const py = y * cellSize;

        if (viewMode === 'blocks') {
          ctx.fillStyle = color.hex;
          ctx.fillRect(px, py, cellSize, cellSize);
        } else if (viewMode === 'stitches') {
          // Fabric square base
          ctx.fillStyle = '#F5EFE6';
          ctx.fillRect(px, py, cellSize, cellSize);

          // Diagonal 1 (\)
          ctx.strokeStyle = color.hex;
          ctx.lineWidth = Math.max(1.5, cellSize * 0.18);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(px + cellSize * 0.15, py + cellSize * 0.15);
          ctx.lineTo(px + cellSize * 0.85, py + cellSize * 0.85);
          ctx.stroke();

          // Diagonal 2 (/)
          ctx.beginPath();
          ctx.moveTo(px + cellSize * 0.85, py + cellSize * 0.15);
          ctx.lineTo(px + cellSize * 0.15, py + cellSize * 0.85);
          ctx.stroke();
        } else if (viewMode === 'symbols') {
          // White square with black/dark text
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(px, py, cellSize, cellSize);

          if (cellSize >= 10) {
            ctx.fillStyle = '#111111';
            ctx.font = `bold ${Math.max(8, Math.floor(cellSize * 0.65))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(color.symbol || '●', px + cellSize / 2, py + cellSize / 2);
          }
        }
      }
    }

    // Grid lines
    if (cellSize >= 5) {
      // 1-stitch fine gridlines
      ctx.strokeStyle = viewMode === 'symbols' ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 0.5;

      for (let x = 0; x <= pattern.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, totalCanvasHeight);
        ctx.stroke();
      }

      for (let y = 0; y <= pattern.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellSize);
        ctx.lineTo(totalCanvasWidth, y * cellSize);
        ctx.stroke();
      }

      // 10-stitch major gridlines (standard cross-stitch requirement)
      ctx.strokeStyle = 'rgba(184, 142, 60, 0.6)'; // Heirloom gold line
      ctx.lineWidth = 1.5;

      for (let x = 0; x <= pattern.width; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, totalCanvasHeight);
        ctx.stroke();
      }

      for (let y = 0; y <= pattern.height; y += 10) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellSize);
        ctx.lineTo(totalCanvasWidth, y * cellSize);
        ctx.stroke();
      }

      // Center crosshair markers
      const centerX = Math.floor(pattern.width / 2) * cellSize;
      const centerY = Math.floor(pattern.height / 2) * cellSize;

      ctx.strokeStyle = 'rgba(230, 0, 35, 0.7)'; // Red center marker
      ctx.lineWidth = 2;

      // Top center arrow
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, Math.min(20, totalCanvasHeight));
      ctx.stroke();

      // Left center arrow
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(Math.min(20, totalCanvasWidth), centerY);
      ctx.stroke();
    }

    // Draw suggested outline guides
    if (showSuggestedGuides && suggestedPaths.length > 0) {
      suggestedPaths.forEach((path) => {
        const isHovered = path.id === hoveredPathId;
        const isFiltered = pathCategoryFilter === 'all' || path.category === pathCategoryFilter;
        if (!isHovered && !isFiltered) return;

        ctx.save();
        if (isHovered) {
          ctx.strokeStyle = '#06B6D4'; // Vibrant glowing cyan
          ctx.lineWidth = Math.max(2.5, cellSize * 0.22);
          ctx.setLineDash([4, 2]);
          ctx.shadowColor = 'rgba(6, 182, 212, 0.7)';
          ctx.shadowBlur = 6;
        } else {
          ctx.strokeStyle = 'rgba(217, 119, 6, 0.7)'; // Amber guide
          ctx.lineWidth = Math.max(1.5, cellSize * 0.12);
          ctx.setLineDash([3, 3]);
        }

        ctx.beginPath();
        for (const seg of path.segments) {
          ctx.moveTo(seg.x1 * cellSize, seg.y1 * cellSize);
          ctx.lineTo(seg.x2 * cellSize, seg.y2 * cellSize);
        }
        ctx.stroke();
        ctx.restore();
      });
    }

    // Draw committed backstitches
    if (showBackstitches && backstitches.length > 0) {
      for (const bs of backstitches) {
        const x1 = bs.x1 * cellSize;
        const y1 = bs.y1 * cellSize;
        const x2 = bs.x2 * cellSize;
        const y2 = bs.y2 * cellSize;

        // Line
        ctx.strokeStyle = bs.color || '#1A1615';
        ctx.lineWidth = Math.max(2, cellSize * ((bs.strands ?? 1) === 2 ? 0.22 : 0.15));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Needle puncture dots at vertices
        ctx.fillStyle = bs.color || '#1A1615';
        const punctureR = Math.max(1.5, cellSize * 0.08);
        ctx.beginPath();
        ctx.arc(x1, y1, punctureR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x2, y2, punctureR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Backstitch active rubber-band line
    if (activeTool === 'backstitch' && backstitchStart && hoveredVertex) {
      const sx = backstitchStart.x * cellSize;
      const sy = backstitchStart.y * cellSize;
      const ex = hoveredVertex.x * cellSize;
      const ey = hoveredVertex.y * cellSize;

      ctx.save();
      ctx.strokeStyle = '#B88E3C';
      ctx.lineWidth = Math.max(2, cellSize * 0.18);
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.restore();

      // Start vertex anchor
      ctx.fillStyle = '#E6C687';
      ctx.strokeStyle = '#2C2523';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(3, cellSize * 0.15), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Backstitch hovered vertex snap indicator
    if (activeTool === 'backstitch' && hoveredVertex) {
      const vx = hoveredVertex.x * cellSize;
      const vy = hoveredVertex.y * cellSize;
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(vx, vy, Math.max(4, cellSize * 0.2), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Hover highlight
    if (hoveredCell && activeTool !== 'pan' && activeTool !== 'backstitch') {
      const hx = hoveredCell.x * cellSize;
      const hy = hoveredCell.y * cellSize;

      // Outer gold box
      ctx.strokeStyle = '#B88E3C';
      ctx.lineWidth = 2;
      ctx.strokeRect(hx - 1, hy - 1, cellSize * brushSize + 2, cellSize * brushSize + 2);

      // Active paint preview overlay
      if (activeTool === 'pencil' || activeTool === 'bucket' || activeTool === 'eraser') {
        const previewColor = activeTool === 'eraser' ? '#FFFFFF' : activeColor.hex;
        ctx.fillStyle = previewColor;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(hx, hy, cellSize * brushSize, cellSize * brushSize);
        ctx.globalAlpha = 1.0;
      }
    }
  }, [
    grid,
    palette,
    colorMap,
    viewMode,
    cellSize,
    totalCanvasWidth,
    totalCanvasHeight,
    pattern.width,
    pattern.height,
    hoveredCell,
    activeTool,
    brushSize,
    activeColor,
    backstitches,
    showBackstitches,
    suggestedPaths,
    hoveredPathId,
    showSuggestedGuides,
    pathCategoryFilter,
    backstitchStart,
    hoveredVertex,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Convert mouse event coordinates to grid (x, y)
  const getGridCoordsFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const gridX = Math.floor(mouseX / cellSize);
    const gridY = Math.floor(mouseY / cellSize);

    if (gridX >= 0 && gridX < pattern.width && gridY >= 0 && gridY < pattern.height) {
      return { x: gridX, y: gridY };
    }
    return null;
  };

  // Convert mouse event to nearest grid vertex (0..width, 0..height)
  const getVertexCoordsFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const vx = Math.round(mouseX / cellSize);
    const vy = Math.round(mouseY / cellSize);

    if (vx >= 0 && vx <= pattern.width && vy >= 0 && vy <= pattern.height) {
      return { x: vx, y: vy };
    }
    return null;
  };

  // Apply a suggested outline path into committed backstitches
  const handleApplySuggestedPath = (path: SuggestedBackstitchPath) => {
    const newSegs = convertPathToBackstitchSegments(path, backstitchColor, backstitchDmc, backstitchStrands);
    const existing = new Set(
      backstitches.map(
        (s) => `${Math.min(s.x1, s.x2)},${Math.min(s.y1, s.y2)}-${Math.max(s.x1, s.x2)},${Math.max(s.y1, s.y2)}`
      )
    );

    const nonDupes = newSegs.filter((s) => {
      const key = `${Math.min(s.x1, s.x2)},${Math.min(s.y1, s.y2)}-${Math.max(s.x1, s.x2)},${Math.max(s.y1, s.y2)}`;
      return !existing.has(key);
    });

    if (nonDupes.length === 0) {
      setToastMessage(language === 'fil' ? 'Nai-apply na ang linyang ito' : 'Outline path already added');
      return;
    }

    const updated = [...backstitches, ...nonDupes];
    setBackstitches(updated);
    setUndoStack((prev) => [
      ...prev,
      {
        description: `Added outline: ${path.title} (${nonDupes.length} segs)`,
        changes: [],
        backstitchChange: {
          prevBackstitches: [...backstitches],
          newBackstitches: updated,
        },
      },
    ]);
    setRedoStack([]);
    setToastMessage(
      language === 'fil'
        ? `Idinagdag ang ${nonDupes.length} linya ng backstitch`
        : `Added ${nonDupes.length} backstitch segments`
    );
  };

  // Apply all suggestions in active category
  const handleApplyAllSuggestedPaths = () => {
    const filtered = pathCategoryFilter === 'all'
      ? suggestedPaths
      : suggestedPaths.filter((p) => p.category === pathCategoryFilter);

    if (filtered.length === 0) {
      setToastMessage(language === 'fil' ? 'Walang nahanap na mungkahi' : 'No suggested outlines to apply');
      return;
    }

    const existing = new Set(
      backstitches.map(
        (s) => `${Math.min(s.x1, s.x2)},${Math.min(s.y1, s.y2)}-${Math.max(s.x1, s.x2)},${Math.max(s.y1, s.y2)}`
      )
    );

    const allNew: BackstitchSegment[] = [];
    filtered.forEach((path) => {
      const segs = convertPathToBackstitchSegments(path, backstitchColor, backstitchDmc, backstitchStrands);
      segs.forEach((seg) => {
        const key = `${Math.min(seg.x1, seg.x2)},${Math.min(seg.y1, seg.y2)}-${Math.max(seg.x1, seg.x2)},${Math.max(seg.y1, seg.y2)}`;
        if (!existing.has(key)) {
          existing.add(key);
          allNew.push(seg);
        }
      });
    });

    if (allNew.length === 0) {
      setToastMessage(language === 'fil' ? 'Lahat ng mungkahi ay nai-apply na' : 'All suggested paths already added');
      return;
    }

    const updated = [...backstitches, ...allNew];
    setBackstitches(updated);
    setUndoStack((prev) => [
      ...prev,
      {
        description: `Applied ${allNew.length} suggested backstitch outlines`,
        changes: [],
        backstitchChange: {
          prevBackstitches: [...backstitches],
          newBackstitches: updated,
        },
      },
    ]);
    setRedoStack([]);
    setToastMessage(
      language === 'fil'
        ? `Nai-apply ang ${allNew.length} linya mula sa ${filtered.length} mungkahi`
        : `Applied ${allNew.length} backstitch lines from ${filtered.length} outlines`
    );
  };

  // Delete backstitch segment
  const handleDeleteBackstitch = (id: string) => {
    const updated = backstitches.filter((b) => b.id !== id);
    setBackstitches(updated);
    setUndoStack((prev) => [
      ...prev,
      {
        description: 'Deleted backstitch segment',
        changes: [],
        backstitchChange: {
          prevBackstitches: [...backstitches],
          newBackstitches: updated,
        },
      },
    ]);
    setRedoStack([]);
  };

  // Clear all backstitches
  const handleClearAllBackstitches = () => {
    if (backstitches.length === 0) return;
    if (
      window.confirm(
        language === 'fil'
          ? 'Alisin ang lahat ng linya ng backstitch?'
          : 'Clear all backstitch outline lines?'
      )
    ) {
      const prev = [...backstitches];
      setBackstitches([]);
      setBackstitchStart(null);
      setUndoStack((p) => [
        ...p,
        {
          description: 'Cleared all backstitches',
          changes: [],
          backstitchChange: {
            prevBackstitches: prev,
            newBackstitches: [],
          },
        },
      ]);
      setRedoStack([]);
      setToastMessage(language === 'fil' ? 'Na-clear ang lahat ng backstitch' : 'Cleared all backstitches');
    }
  };

  // Paint a single or multi-cell stamp
  const applyPaintAt = (
    startX: number,
    startY: number,
    colorToApply: DMCColor,
    currentGrid: StitchGridCell[][],
    strokeMap: Map<string, { x: number; y: number; prevCode: string; newCode: string }>
  ) => {
    const nextGrid = currentGrid.map((r) => [...r]);

    for (let dy = 0; dy < brushSize; dy++) {
      for (let dx = 0; dx < brushSize; dx++) {
        const nx = startX + dx;
        const ny = startY + dy;

        if (nx >= 0 && nx < pattern.width && ny >= 0 && ny < pattern.height) {
          const prevCell = nextGrid[ny][nx];
          if (prevCell.dmcCode !== colorToApply.code) {
            const key = `${nx},${ny}`;
            if (!strokeMap.has(key)) {
              strokeMap.set(key, {
                x: nx,
                y: ny,
                prevCode: prevCell.dmcCode,
                newCode: colorToApply.code,
              });
            }
            nextGrid[ny][nx] = {
              ...prevCell,
              dmcCode: colorToApply.code,
            };
          }
        }
      }
    }

    return nextGrid;
  };

  // Flood fill algorithm
  const applyFloodFill = (startX: number, startY: number, targetDmcColor: DMCColor) => {
    const originCell = grid[startY]?.[startX];
    if (!originCell) return;
    const sourceCode = originCell.dmcCode;
    if (sourceCode === targetDmcColor.code) return;

    const nextGrid = grid.map((r) => [...r]);
    const changes: { x: number; y: number; prevCode: string; newCode: string }[] = [];
    const queue: [number, number][] = [[startX, startY]];
    const visited = new Uint8Array(pattern.width * pattern.height);

    const getIdx = (x: number, y: number) => y * pattern.width + x;

    visited[getIdx(startX, startY)] = 1;

    while (queue.length > 0) {
      const [cx, cy] = queue.pop()!;
      const curCell = nextGrid[cy][cx];

      if (curCell.dmcCode === sourceCode) {
        changes.push({
          x: cx,
          y: cy,
          prevCode: sourceCode,
          newCode: targetDmcColor.code,
        });

        nextGrid[cy][cx] = {
          ...curCell,
          dmcCode: targetDmcColor.code,
        };

        const neighbors: [number, number][] = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < pattern.width && ny >= 0 && ny < pattern.height) {
            const idx = getIdx(nx, ny);
            if (!visited[idx] && nextGrid[ny][nx].dmcCode === sourceCode) {
              visited[idx] = 1;
              queue.push([nx, ny]);
            }
          }
        }
      }
    }

    if (changes.length > 0) {
      setGrid(nextGrid);
      setUndoStack((prev) => [
        ...prev,
        {
          description: `Flood Fill ${changes.length} stitches`,
          changes,
        },
      ]);
      setRedoStack([]);
      setToastMessage(
        language === 'fil'
          ? `Napalitan ang ${changes.length} tahi gamit ang Flood Fill`
          : `Filled ${changes.length} stitches with ${targetDmcColor.code}`
      );
    }
  };

  // Global Color Replacer (Replace ALL stitches of Color A with Color B)
  const applyGlobalReplace = (sourceColor: DMCColor, destColor: DMCColor) => {
    if (sourceColor.code === destColor.code) return;

    const nextGrid = grid.map((r) => [...r]);
    const changes: { x: number; y: number; prevCode: string; newCode: string }[] = [];

    for (let y = 0; y < pattern.height; y++) {
      for (let x = 0; x < pattern.width; x++) {
        if (nextGrid[y][x].dmcCode === sourceColor.code) {
          changes.push({
            x,
            y,
            prevCode: sourceColor.code,
            newCode: destColor.code,
          });
          nextGrid[y][x] = {
            ...nextGrid[y][x],
            dmcCode: destColor.code,
          };
        }
      }
    }

    if (changes.length > 0) {
      setGrid(nextGrid);
      setUndoStack((prev) => [
        ...prev,
        {
          description: `Replaced ${sourceColor.code} with ${destColor.code} (${changes.length} stitches)`,
          changes,
        },
      ]);
      setRedoStack([]);
      setShowReplaceModal(false);
      setToastMessage(
        language === 'fil'
          ? `Lahat ng ${changes.length} tahi ng ${sourceColor.code} ay pinalitan ng ${destColor.code}`
          : `Replaced all ${changes.length} stitches of ${sourceColor.code} with ${destColor.code}`
      );
    } else {
      setToastMessage(
        language === 'fil'
          ? `Walang nahanap na tahi ng ${sourceColor.code}`
          : `No stitches found with color ${sourceColor.code}`
      );
    }
  };

  // Undo Handler
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    if (lastAction.changes && lastAction.changes.length > 0) {
      const nextGrid = grid.map((r) => [...r]);
      for (const ch of lastAction.changes) {
        nextGrid[ch.y][ch.x] = {
          ...nextGrid[ch.y][ch.x],
          dmcCode: ch.prevCode,
        };
      }
      setGrid(nextGrid);
    }

    if (lastAction.backstitchChange) {
      setBackstitches(lastAction.backstitchChange.prevBackstitches);
    }

    setUndoStack(newUndoStack);
    setRedoStack((prev) => [...prev, lastAction]);
    setToastMessage(language === 'fil' ? 'Nai-undo ang huling edit' : 'Undone: ' + lastAction.description);
  };

  // Redo Handler
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const actionToRedo = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    if (actionToRedo.changes && actionToRedo.changes.length > 0) {
      const nextGrid = grid.map((r) => [...r]);
      for (const ch of actionToRedo.changes) {
        nextGrid[ch.y][ch.x] = {
          ...nextGrid[ch.y][ch.x],
          dmcCode: ch.newCode,
        };
      }
      setGrid(nextGrid);
    }

    if (actionToRedo.backstitchChange) {
      setBackstitches(actionToRedo.backstitchChange.newBackstitches);
    }

    setRedoStack(newRedoStack);
    setUndoStack((prev) => [...prev, actionToRedo]);
    setToastMessage(language === 'fil' ? 'Nai-redo ang edit' : 'Redone: ' + actionToRedo.description);
  };

  // Reset to original
  const handleResetToOriginal = () => {
    if (
      window.confirm(
        language === 'fil'
          ? 'Nais mo bang ibalik ang orihinal na pattern? Mawawala ang lahat ng iyong manu-manong pagbabago.'
          : 'Reset all stitches back to original generated pattern? All manual edits will be lost.'
      )
    ) {
      setGrid(pattern.grid.map((r) => r.map((c) => ({ ...c }))));
      setBackstitches(pattern.backstitches ? [...pattern.backstitches] : []);
      setBackstitchStart(null);
      setUndoStack([]);
      setRedoStack([]);
      setToastMessage(language === 'fil' ? 'Naibalik sa orihinal' : 'Reset to original pattern');
    }
  };

  // Commit & Save back to App
  const handleCommitSave = () => {
    const updated = recalculatePattern(pattern, grid, palette, backstitches);
    onSave(updated);
    setUndoStack([]);
    setRedoStack([]);
    setToastMessage(language === 'fil' ? '✅ Na-save ang mga pagbabago!' : '✅ Pattern successfully saved!');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  // Mouse Handlers on Canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'pan' || e.button === 1 || isSpaceDown) {
      setIsPanning(true);
      setStartPanPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (activeTool === 'backstitch') {
      const v = getVertexCoordsFromEvent(e);
      if (!v) return;

      if (!backstitchStart) {
        setBackstitchStart(v);
        setToastMessage(
          language === 'fil'
            ? `Nagsimula sa (${v.x}, ${v.y}). I-click ang susunod na tuldok.`
            : `Anchor set at (${v.x}, ${v.y}). Click next vertex to stitch line.`
        );
      } else {
        if (backstitchStart.x === v.x && backstitchStart.y === v.y) {
          setBackstitchStart(null);
          return;
        }

        const newSeg: BackstitchSegment = {
          id: `bs_man_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          x1: backstitchStart.x,
          y1: backstitchStart.y,
          x2: v.x,
          y2: v.y,
          color: backstitchColor,
          dmcCode: backstitchDmc,
          strands: backstitchStrands,
        };

        const updated = [...backstitches, newSeg];
        setBackstitches(updated);
        setUndoStack((prev) => [
          ...prev,
          {
            description: `Drawn backstitch (${backstitchStart.x},${backstitchStart.y}) to (${v.x},${v.y})`,
            changes: [],
            backstitchChange: {
              prevBackstitches: [...backstitches],
              newBackstitches: updated,
            },
          },
        ]);
        setRedoStack([]);
        setBackstitchStart(v);
      }
      return;
    }

    const coords = getGridCoordsFromEvent(e);
    if (!coords) return;

    if (activeTool === 'eyedropper' || e.altKey) {
      const cell = grid[coords.y]?.[coords.x];
      if (cell) {
        const picked = colorMap.get(cell.dmcCode) || DMC_PALETTE[0];
        setActiveColor(picked);
        // If not in active palette, add it
        if (!palette.some((c) => c.code === picked.code)) {
          setPalette((prev) => [picked, ...prev]);
        }
        setToastMessage(
          language === 'fil'
            ? `Pinili ang kulay: DMC ${picked.code} (${picked.name})`
            : `Sampled DMC ${picked.code} - ${picked.name}`
        );
        if (!e.altKey) setActiveTool('pencil');
      }
      return;
    }

    if (activeTool === 'bucket') {
      applyFloodFill(coords.x, coords.y, activeColor);
      return;
    }

    if (activeTool === 'replace') {
      const cell = grid[coords.y]?.[coords.x];
      if (cell) {
        const clickedColor = colorMap.get(cell.dmcCode) || DMC_PALETTE[0];
        setReplaceSourceColor(clickedColor);
        setReplaceTargetColor(activeColor);
        setShowReplaceModal(true);
      }
      return;
    }

    if (activeTool === 'pencil' || activeTool === 'eraser') {
      setIsDrawing(true);
      const strokeMap = new Map<string, { x: number; y: number; prevCode: string; newCode: string }>();
      const colorToPaint = activeTool === 'eraser' ? (colorMap.get('Blanc') || DMC_PALETTE[1]) : activeColor;
      const updatedGrid = applyPaintAt(coords.x, coords.y, colorToPaint, grid, strokeMap);
      setGrid(updatedGrid);
      setCurrentStrokeChanges(strokeMap);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPanPos.x,
        y: e.clientY - startPanPos.y,
      });
      return;
    }

    if (activeTool === 'backstitch') {
      const v = getVertexCoordsFromEvent(e);
      setHoveredVertex(v);
    } else if (hoveredVertex) {
      setHoveredVertex(null);
    }

    const coords = getGridCoordsFromEvent(e);
    if (coords) {
      const cell = grid[coords.y]?.[coords.x];
      const color = cell ? colorMap.get(cell.dmcCode) || DMC_PALETTE[0] : DMC_PALETTE[0];
      setHoveredCell({
        x: coords.x,
        y: coords.y,
        color,
      });

      if (isDrawing && (activeTool === 'pencil' || activeTool === 'eraser')) {
        const colorToPaint = activeTool === 'eraser' ? (colorMap.get('Blanc') || DMC_PALETTE[1]) : activeColor;
        const updatedGrid = applyPaintAt(coords.x, coords.y, colorToPaint, grid, currentStrokeChanges);
        setGrid(updatedGrid);
      }
    } else {
      setHoveredCell(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (backstitchStart) {
      setBackstitchStart(null);
      setToastMessage(language === 'fil' ? 'Nai-cancel ang linyang backstitch' : 'Cancelled active backstitch line');
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (isDrawing) {
      setIsDrawing(false);
      if (currentStrokeChanges.size > 0) {
        const changesArray = Array.from(currentStrokeChanges.values());
        setUndoStack((prev) => [
          ...prev,
          {
            description: `Painted ${changesArray.length} stitches with ${activeColor.code}`,
            changes: changesArray,
          },
        ]);
        setRedoStack([]);
        setCurrentStrokeChanges(new Map());
      }
    }
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
    if (isDrawing) {
      handleMouseUp();
    }
  };

  // Add DMC color from complete library into active palette
  const handleAddDmcToPalette = (dmcColor: DMCColor) => {
    if (!palette.some((c) => c.code === dmcColor.code)) {
      setPalette((prev) => [dmcColor, ...prev]);
    }
    setActiveColor(dmcColor);
    setActiveTab('palette');
    setToastMessage(
      language === 'fil'
        ? `Idinagdag sa Palette: DMC ${dmcColor.code} (${dmcColor.name})`
        : `Added DMC ${dmcColor.code} (${dmcColor.name}) to palette`
    );
  };

  // Filtered DMC colors for search
  const filteredDmcLibrary = useMemo(() => {
    const query = dmcSearchQuery.trim().toLowerCase();
    if (!query) return DMC_PALETTE;
    return DMC_PALETTE.filter(
      (c) => c.code.toLowerCase().includes(query) || c.name.toLowerCase().includes(query)
    );
  }, [dmcSearchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-hidden animate-fade-in">
      <div className="bg-[#FAF7F2] w-full h-full max-w-[1400px] max-h-[96vh] rounded-2xl border border-[#D7CBB9] shadow-2xl flex flex-col overflow-hidden">
        {/* ================= TOP HEADER BAR ================= */}
        <div className="bg-[#2C2523] text-white px-4 sm:px-6 py-3 flex items-center justify-between border-b border-[#433936] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#3D3330] border border-[#B88E3C] flex items-center justify-center text-[#E6C687]">
              <Paintbrush className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-bold text-base sm:text-lg text-[#F7F3E9]">
                  {language === 'fil' ? 'Manu-manong Editor ng Tahi' : 'Manual Stitch Grid Editor'}
                </h1>
                {hasUnsavedChanges ? (
                  <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    {language === 'fil' ? 'May mga pagbabago' : `${undoStack.length} unsaved edits`}
                  </span>
                ) : (
                  <span className="text-[10px] text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
                    {language === 'fil' ? 'Nai-sync' : 'Synced'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#D8CCA7] hidden sm:block">
                {pattern.width} × {pattern.height} stitches · {palette.length} DMC Colors · {pattern.fabricCount}ct Aida
              </p>
            </div>
          </div>

          {/* Center Action Toolbar: Undo, Redo, Zoom, View Mode */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Undo / Redo */}
            <div className="flex items-center bg-[#1F1918] rounded-lg p-0.5 border border-white/10">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                title={language === 'fil' ? 'I-undo (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                title={language === 'fil' ? 'I-redo (Ctrl+Y)' : 'Redo (Ctrl+Y)'}
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="hidden md:flex items-center bg-[#1F1918] rounded-lg p-0.5 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('blocks')}
                className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-all ${
                  viewMode === 'blocks' ? 'bg-[#B88E3C] text-white font-bold' : 'text-white/70 hover:text-white'
                }`}
              >
                {language === 'fil' ? 'Blocks' : 'Blocks'}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('stitches')}
                className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-all ${
                  viewMode === 'stitches' ? 'bg-[#B88E3C] text-white font-bold' : 'text-white/70 hover:text-white'
                }`}
              >
                {language === 'fil' ? 'Stitches (X)' : 'Stitches (X)'}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('symbols')}
                className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-all ${
                  viewMode === 'symbols' ? 'bg-[#B88E3C] text-white font-bold' : 'text-white/70 hover:text-white'
                }`}
              >
                {language === 'fil' ? 'Simbolo' : 'Symbols'}
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center bg-[#1F1918] rounded-lg p-0.5 border border-white/10">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(1))))}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded cursor-pointer"
                title={language === 'fil' ? 'Paliitin' : 'Zoom Out'}
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono px-1.5 text-white/80 min-w-[42px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.2).toFixed(1))))}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded cursor-pointer"
                title={language === 'fil' ? 'Palakihin' : 'Zoom In'}
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setPan({ x: 0, y: 0 });
                  setZoom(1.0);
                }}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded cursor-pointer"
                title={language === 'fil' ? 'I-reset ang view' : 'Reset View'}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Save & Close Actions */}
            <button
              type="button"
              onClick={handleCommitSave}
              className="py-1.5 px-3.5 rounded-lg text-xs font-bold text-[#2C2523] bg-[#E6C687] hover:bg-[#F2D79E] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{language === 'fil' ? 'I-apply ang Edits' : 'Save & Apply'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (hasUnsavedChanges) {
                  setShowDiscardConfirm(true);
                } else {
                  onClose();
                }
              }}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
              title={language === 'fil' ? 'Isara' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= MAIN WORKSPACE BODY ================= */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* ================= LEFT TOOLBAR ================= */}
          <div className="w-full md:w-16 bg-[#EDE5D8] border-b md:border-b-0 md:border-r border-[#D7CBB9] p-2 flex md:flex-col items-center justify-between md:justify-start gap-2 shrink-0">
            {/* Primary Editing Tools */}
            <div className="flex md:flex-col items-center gap-1.5 w-full">
              {/* Pencil Tool */}
              <button
                type="button"
                onClick={() => setActiveTool('pencil')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-0.5 relative ${
                  activeTool === 'pencil'
                    ? 'bg-[#2C2523] text-[#E6C687] shadow-sm'
                    : 'text-[#5F554F] hover:bg-[#E2D8C7] hover:text-[#2C2523]'
                }`}
                title={language === 'fil' ? 'Pencil: Manu-manong pagguhit ng tahi (B)' : 'Pencil: Single/drag stitch paint (B)'}
              >
                <Paintbrush className="w-4 h-4" />
                <span className="text-[9px] font-semibold">{language === 'fil' ? 'Pencil' : 'Brush'}</span>
              </button>

              {/* Bucket Fill */}
              <button
                type="button"
                onClick={() => setActiveTool('bucket')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  activeTool === 'bucket'
                    ? 'bg-[#2C2523] text-[#E6C687] shadow-sm'
                    : 'text-[#5F554F] hover:bg-[#E2D8C7] hover:text-[#2C2523]'
                }`}
                title={language === 'fil' ? 'Bucket: Punuan ang magkakadugtong na parehong kulay (G)' : 'Flood Fill: Contiguous color fill (G)'}
              >
                <PaintBucket className="w-4 h-4" />
                <span className="text-[9px] font-semibold">{language === 'fil' ? 'Fill' : 'Fill'}</span>
              </button>

              {/* Global Color Replacer */}
              <button
                type="button"
                onClick={() => {
                  setReplaceSourceColor(activeColor);
                  setShowReplaceModal(true);
                }}
                className={`p-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  activeTool === 'replace'
                    ? 'bg-[#2C2523] text-[#E6C687] shadow-sm'
                    : 'text-[#5F554F] hover:bg-[#E2D8C7] hover:text-[#2C2523]'
                }`}
                title={language === 'fil' ? 'Replace All: Palitan ang lahat ng tahi ng kulay na ito (R)' : 'Global Replace: Swap all stitches of a color pattern-wide (R)'}
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-[9px] font-semibold">{language === 'fil' ? 'Swap' : 'Swap'}</span>
              </button>

              {/* Eyedropper Tool */}
              <button
                type="button"
                onClick={() => setActiveTool('eyedropper')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  activeTool === 'eyedropper'
                    ? 'bg-[#2C2523] text-[#E6C687] shadow-sm'
                    : 'text-[#5F554F] hover:bg-[#E2D8C7] hover:text-[#2C2523]'
                }`}
                title={language === 'fil' ? 'Eyedropper: Kumuha ng kulay mula sa grid (I / Alt)' : 'Eyedropper: Pick color from grid (I / Alt)'}
              >
                <Pipette className="w-4 h-4" />
                <span className="text-[9px] font-semibold">{language === 'fil' ? 'Picker' : 'Pick'}</span>
              </button>

              {/* Eraser / White Tool */}
              <button
                type="button"
                onClick={() => setActiveTool('eraser')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  activeTool === 'eraser'
                    ? 'bg-[#2C2523] text-[#E6C687] shadow-sm'
                    : 'text-[#5F554F] hover:bg-[#E2D8C7] hover:text-[#2C2523]'
                }`}
                title={language === 'fil' ? 'Eraser: I-clear ang tahi pabalik sa puti (E)' : 'Eraser: Clear stitch to white cloth (E)'}
              >
                <Eraser className="w-4 h-4" />
                <span className="text-[9px] font-semibold">{language === 'fil' ? 'Bura' : 'Erase'}</span>
              </button>

              {/* Pan / Hand Tool */}
              <button
                type="button"
                onClick={() => setActiveTool('pan')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  activeTool === 'pan'
                    ? 'bg-[#2C2523] text-[#E6C687] shadow-sm'
                    : 'text-[#5F554F] hover:bg-[#E2D8C7] hover:text-[#2C2523]'
                }`}
                title={language === 'fil' ? 'Pan: I-drag ang view (Space / H)' : 'Pan: Drag canvas view (Space / H)'}
              >
                <Move className="w-4 h-4" />
                <span className="text-[9px] font-semibold">{language === 'fil' ? 'Pan' : 'Pan'}</span>
              </button>

              {/* Backstitch Tool */}
              <button
                type="button"
                onClick={() => {
                  setActiveTool('backstitch');
                  setActiveTab('backstitch');
                }}
                className={`p-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  activeTool === 'backstitch'
                    ? 'bg-[#2C2523] text-[#E6C687] shadow-sm ring-1 ring-[#B88E3C]'
                    : 'text-[#5F554F] hover:bg-[#E2D8C7] hover:text-[#2C2523]'
                }`}
                title={language === 'fil' ? 'Backstitch: Pagguhit ng outline sa mga vertex ng grid (S)' : 'Backstitch: Draw outlines along grid vertices (S)'}
              >
                <Route className="w-4 h-4" />
                <span className="text-[9px] font-semibold">{language === 'fil' ? 'Outline' : 'Outline'}</span>
              </button>
            </div>

            {/* Brush Size Selector */}
            <div className="hidden md:flex flex-col items-center gap-1 pt-2 border-t border-[#D7CBB9] w-full">
              <span className="text-[9px] font-bold text-[#7A6E65] uppercase">Size</span>
              {([1, 2, 3] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setBrushSize(sz)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    brushSize === sz
                      ? 'bg-[#B88E3C] text-white'
                      : 'text-[#5F554F] hover:bg-[#E2D8C7]'
                  }`}
                  title={`${sz}x${sz} stitches stamp`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* ================= CANVAS VIEWPORT ================= */}
          <div
            ref={containerRef}
            className={`flex-1 relative overflow-auto bg-[#EAE2D5] flex items-center justify-center select-none ${
              activeTool === 'pan' || isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
            }`}
            style={{ minHeight: '360px' }}
          >
            {/* Scrollable / pannable canvas container */}
            <div
              className="relative p-8 transition-transform duration-75"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px)`,
              }}
            >
              <div className="bg-white p-2 rounded-lg shadow-lg border border-[#D7CBB9] inline-block">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  onContextMenu={handleContextMenu}
                  className="block shadow-inner"
                  style={{
                    imageRendering: 'pixelated',
                  }}
                />
              </div>
            </div>

            {/* Floating Quick Info Pill at Canvas Bottom */}
            <div className="absolute bottom-3 left-4 right-4 sm:right-auto bg-[#2C2523]/90 text-white backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 shadow-lg flex items-center gap-4 text-xs z-10 pointer-events-none">
              {hoveredCell ? (
                <>
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-[#E6C687] font-bold">X:</span>
                    <span>{hoveredCell.x}</span>
                    <span className="text-[#E6C687] font-bold ml-1">Y:</span>
                    <span>{hoveredCell.y}</span>
                  </div>
                  <div className="h-3 w-px bg-white/20" />
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0"
                      style={{ backgroundColor: hoveredCell.color.hex }}
                    />
                    <span className="font-semibold text-white/90">
                      DMC {hoveredCell.color.code}
                    </span>
                    <span className="text-[11px] text-white/70 hidden sm:inline">
                      {hoveredCell.color.name}
                    </span>
                    <span className="font-mono text-[#E6C687] font-bold">
                      [{hoveredCell.color.symbol}]
                    </span>
                    <span className="text-[10px] text-white/50">
                      ({colorTally.get(hoveredCell.color.code) || 0} stitches)
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-white/70 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-[#E6C687]" />
                  <span>
                    {language === 'fil'
                      ? 'I-click o i-drag sa grid upang magpinta. Hold Space para mag-pan.'
                      : 'Click or drag on grid to paint stitches. Hold Space to pan.'}
                  </span>
                </div>
              )}
            </div>

            {/* Floating Toast Notification */}
            {toastMessage && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#2C2523] text-[#E6C687] px-4 py-2 rounded-xl border border-[#B88E3C] shadow-xl text-xs font-semibold flex items-center gap-2 z-20 animate-fade-in">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{toastMessage}</span>
              </div>
            )}
          </div>

          {/* ================= RIGHT PALETTE & COLOR PICKER PANEL ================= */}
          <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-[#D7CBB9] flex flex-col shrink-0 overflow-hidden">
            {/* Active Color Preview Card */}
            <div className="p-3 bg-[#FAF7F2] border-b border-[#E8E1D5]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A6E65] block mb-1.5">
                {language === 'fil' ? 'Kasalukuyang Sinulid' : 'Active Thread Floss'}
              </span>
              <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-[#D7CBB9] shadow-2xs">
                <div
                  className="w-10 h-10 rounded-lg border-2 border-[#B88E3C] shadow-xs flex items-center justify-center text-lg font-bold shrink-0"
                  style={{
                    backgroundColor: activeColor.hex,
                    color: activeColor.symbolDark ? '#111111' : '#FFFFFF',
                  }}
                >
                  {activeColor.symbol}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-[#2C2523]">
                      DMC {activeColor.code}
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#FAF7F2] border border-[#E8E1D5] text-[#7A6E65]">
                      {colorTally.get(activeColor.code) || 0} stitches
                    </span>
                  </div>
                  <p className="text-xs text-[#7A6E65] truncate">{activeColor.name}</p>
                </div>
              </div>
            </div>

            {/* Tabs: Active Palette vs Backstitch Outlines vs Complete DMC Floss Library */}
            <div className="flex border-b border-[#E8E1D5] bg-[#FAF7F2] text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('palette')}
                className={`flex-1 py-2.5 font-semibold text-center cursor-pointer transition-all border-b-2 ${
                  activeTab === 'palette'
                    ? 'border-[#B88E3C] text-[#2C2523] bg-white'
                    : 'border-transparent text-[#7A6E65] hover:text-[#2C2523]'
                }`}
              >
                {language === 'fil' ? `Palette (${palette.length})` : `Palette (${palette.length})`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('backstitch');
                  if (activeTool !== 'backstitch') setActiveTool('backstitch');
                }}
                className={`flex-1 py-2.5 font-semibold text-center cursor-pointer transition-all border-b-2 flex items-center justify-center gap-1 ${
                  activeTab === 'backstitch'
                    ? 'border-[#B88E3C] text-[#2C2523] bg-white'
                    : 'border-transparent text-[#7A6E65] hover:text-[#2C2523]'
                }`}
              >
                <Route className="w-3.5 h-3.5" />
                <span>{language === 'fil' ? `Outline (${backstitches.length})` : `Outline (${backstitches.length})`}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dmcLibrary')}
                className={`flex-1 py-2.5 font-semibold text-center cursor-pointer transition-all border-b-2 flex items-center justify-center gap-1 ${
                  activeTab === 'dmcLibrary'
                    ? 'border-[#B88E3C] text-[#2C2523] bg-white'
                    : 'border-transparent text-[#7A6E65] hover:text-[#2C2523]'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'fil' ? 'Lahat' : 'All DMC'}</span>
              </button>
            </div>

            {/* Tab 1: Current Palette Swatches */}
            {activeTab === 'palette' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                <div className="grid grid-cols-1 gap-1.5">
                  {palette.map((color) => {
                    const count = colorTally.get(color.code) || 0;
                    const isSelected = activeColor.code === color.code;

                    return (
                      <button
                        key={color.code}
                        type="button"
                        onClick={() => setActiveColor(color)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#FAF7F2] border-[#B88E3C] ring-2 ring-[#B88E3C]/30 shadow-xs'
                            : 'bg-white border-[#E8E1D5] hover:border-[#D7CBB9] hover:bg-[#FCFAF7]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-6 h-6 rounded-md border border-black/10 shrink-0 flex items-center justify-center text-xs font-bold"
                            style={{
                              backgroundColor: color.hex,
                              color: color.symbolDark ? '#111111' : '#FFFFFF',
                            }}
                          >
                            {color.symbol}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#2C2523]">DMC {color.code}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#B88E3C]" />}
                            </div>
                            <span className="text-[11px] text-[#7A6E65] truncate block">
                              {color.name}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-semibold text-[#2C2523]">
                            {count}
                          </span>
                          <span className="text-[10px] text-[#8C8077] block">
                            {count > 0 ? `${Math.max(1, Math.ceil(count / 1800))} sk` : '0 sk'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Backstitch Outlines & AI Assistant */}
            {activeTab === 'backstitch' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
                {/* Backstitch Tool Status Card */}
                <div
                  className={`p-3 rounded-xl border transition-all ${
                    activeTool === 'backstitch'
                      ? 'bg-[#FAF7F2] border-[#B88E3C] shadow-xs'
                      : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-[#2C2523]">
                      <Route className="w-4 h-4 text-[#B88E3C]" />
                      <span>{language === 'fil' ? 'Pagguhit ng Backstitch' : 'Manual Backstitch Tool'}</span>
                    </div>
                    {activeTool === 'backstitch' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#B88E3C] text-white">
                        {language === 'fil' ? 'Aktibo' : 'Active'}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTool('backstitch')}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#2C2523] text-[#E6C687] hover:bg-black cursor-pointer"
                      >
                        {language === 'fil' ? 'I-activate' : 'Activate'}
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-[#7A6E65] leading-relaxed">
                    {backstitchStart
                      ? (language === 'fil'
                          ? `Nagsimula sa (${backstitchStart.x}, ${backstitchStart.y}). I-click ang susunod na intersection o Esc para i-cancel.`
                          : `Anchor at (${backstitchStart.x}, ${backstitchStart.y}). Click target vertex to complete segment. Esc / Right-click to cancel.`)
                      : (language === 'fil'
                          ? 'I-click ang anumang intersection sa grid upang simulan ang linyang backstitch. Pwede ring gumamit ng mga AI mungkahi sa ibaba.'
                          : 'Click any grid intersection to anchor a stitch. Snaps automatically to vertices for precise needle lines.')}
                  </p>
                </div>

                {/* Thread & Strands Config */}
                <div className="space-y-2 bg-[#FAF7F2] p-3 rounded-xl border border-[#E8E1D5]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A6E65] block">
                    {language === 'fil' ? 'Sinulid at Kapal ng Tahi' : 'Thread & Strand Thickness'}
                  </span>

                  {/* Strands selection */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBackstitchStrands(1)}
                      className={`py-1.5 px-2 rounded-lg font-semibold text-center border cursor-pointer transition-all ${
                        backstitchStrands === 1
                          ? 'bg-[#2C2523] text-[#E6C687] border-[#2C2523]'
                          : 'bg-white text-[#5F554F] border-[#D7CBB9] hover:bg-[#F2ECE1]'
                      }`}
                    >
                      <div className="text-xs font-bold">1 Strand</div>
                      <div className="text-[10px] opacity-80">{language === 'fil' ? 'Pinong Detalye' : 'Fine Outline'}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackstitchStrands(2)}
                      className={`py-1.5 px-2 rounded-lg font-semibold text-center border cursor-pointer transition-all ${
                        backstitchStrands === 2
                          ? 'bg-[#2C2523] text-[#E6C687] border-[#2C2523]'
                          : 'bg-white text-[#5F554F] border-[#D7CBB9] hover:bg-[#F2ECE1]'
                      }`}
                    >
                      <div className="text-xs font-bold">2 Strands</div>
                      <div className="text-[10px] opacity-80">{language === 'fil' ? 'Makapal / Contour' : 'Bold Contour'}</div>
                    </button>
                  </div>

                  {/* Floss Color Quick Selector */}
                  <div className="pt-2 border-t border-[#E8E1D5] space-y-1.5">
                    <span className="text-[10px] font-bold text-[#7A6E65] block">
                      {language === 'fil' ? 'Pumili ng Kulay ng Outline:' : 'Outline Floss Color:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { code: '310', hex: '#1A1615', name: 'Black' },
                        { code: '823', hex: '#1B2740', name: 'Navy' },
                        { code: '898', hex: '#493025', name: 'Coffee' },
                        { code: '3852', hex: '#C69214', name: 'Gold' },
                        { code: 'Blanc', hex: '#F8F8F8', name: 'White' },
                      ].map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setBackstitchDmc(c.code);
                            setBackstitchColor(c.hex);
                          }}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-medium cursor-pointer transition-all ${
                            backstitchDmc === c.code
                              ? 'bg-[#2C2523] text-white border-[#2C2523]'
                              : 'bg-white text-[#2C2523] border-[#D7CBB9] hover:bg-neutral-100'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-black/20"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span>{c.code}</span>
                        </button>
                      ))}
                    </div>

                    {/* From active pattern palette */}
                    <div className="flex items-center gap-1 pt-1 overflow-x-auto">
                      <span className="text-[10px] text-[#7A6E65] shrink-0">Palette:</span>
                      {palette.slice(0, 8).map((col) => (
                        <button
                          key={col.code}
                          type="button"
                          onClick={() => {
                            setBackstitchDmc(col.code);
                            setBackstitchColor(col.hex);
                          }}
                          className={`w-5 h-5 rounded-md border shrink-0 cursor-pointer transition-all ${
                            backstitchDmc === col.code ? 'ring-2 ring-[#B88E3C] scale-110' : 'border-black/20'
                          }`}
                          style={{ backgroundColor: col.hex }}
                          title={`DMC ${col.code} - ${col.name}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Overlays Visibility Toggles */}
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-[#D7CBB9]">
                  <span className="font-semibold text-[#2C2523]">
                    {language === 'fil' ? 'Ipakita ang Outlines' : 'Backstitches Overlay'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBackstitches(!showBackstitches)}
                      className={`p-1.5 rounded-lg border cursor-pointer transition-all ${
                        showBackstitches
                          ? 'bg-[#2C2523] text-[#E6C687] border-[#2C2523]'
                          : 'bg-neutral-100 text-neutral-400 border-neutral-200'
                      }`}
                      title={showBackstitches ? 'Hide backstitch lines' : 'Show backstitch lines'}
                    >
                      {showBackstitches ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSuggestedGuides(!showSuggestedGuides)}
                      className={`p-1.5 rounded-lg border cursor-pointer transition-all ${
                        showSuggestedGuides
                          ? 'bg-[#B88E3C] text-white border-[#B88E3C]'
                          : 'bg-neutral-100 text-neutral-400 border-neutral-200'
                      }`}
                      title={showSuggestedGuides ? 'Hide AI suggested guides' : 'Show AI suggested guides'}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* AI Outline Suggestions */}
                <div className="space-y-2.5 bg-[#FAF7F2] p-3 rounded-xl border border-[#E8E1D5]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-[#2C2523]">
                      <Sparkles className="w-3.5 h-3.5 text-[#B88E3C]" />
                      <span>{language === 'fil' ? 'AI Mungkahi ng Outline' : 'AI Suggested Outlines'}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#7A6E65]">
                      {suggestedPaths.length} {language === 'fil' ? 'nahanap' : 'found'}
                    </span>
                  </div>

                  {/* Category filters */}
                  <div className="flex flex-wrap gap-1">
                    {(['all', 'silhouette', 'contrast-edge', 'detail', 'monogram'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setPathCategoryFilter(cat)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer transition-all capitalize ${
                          pathCategoryFilter === cat
                            ? 'bg-[#2C2523] text-[#E6C687]'
                            : 'bg-white text-[#7A6E65] border border-[#D7CBB9] hover:bg-[#F2ECE1]'
                        }`}
                      >
                        {cat === 'contrast-edge' ? 'Contrast' : cat}
                      </button>
                    ))}
                  </div>

                  {/* Sliders */}
                  <div className="space-y-2 pt-1 border-t border-[#E8E1D5] text-[11px]">
                    <div>
                      <div className="flex justify-between text-[#7A6E65] mb-1">
                        <span>{language === 'fil' ? 'Contrast Sensitivity' : 'Contrast Sensitivity'}</span>
                        <span className="font-mono font-bold text-[#2C2523]">{contrastThreshold}</span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="50"
                        value={contrastThreshold}
                        onChange={(e) => setContrastThreshold(Number(e.target.value))}
                        className="w-full accent-[#B88E3C] cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[#7A6E65] mb-1">
                        <span>{language === 'fil' ? 'Minimum Haba ng Tahi' : 'Min Path Length'}</span>
                        <span className="font-mono font-bold text-[#2C2523]">{minPathLength} sts</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="8"
                        value={minPathLength}
                        onChange={(e) => setMinPathLength(Number(e.target.value))}
                        className="w-full accent-[#B88E3C] cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Apply All Visible Suggestions */}
                  <button
                    type="button"
                    onClick={handleApplyAllSuggestedPaths}
                    className="w-full py-2 px-3 rounded-lg text-xs font-bold text-[#2C2523] bg-[#E6C687] hover:bg-[#F2D79E] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {language === 'fil'
                        ? 'I-apply Lahat ng Mungkahi'
                        : `Apply All Visible (${
                            pathCategoryFilter === 'all'
                              ? suggestedPaths.length
                              : suggestedPaths.filter((p) => p.category === pathCategoryFilter).length
                          })`}
                    </span>
                  </button>

                  {/* Suggested Paths List */}
                  <div className="max-h-48 overflow-y-auto space-y-1 pt-1">
                    {suggestedPaths
                      .filter((p) => pathCategoryFilter === 'all' || p.category === pathCategoryFilter)
                      .slice(0, 15)
                      .map((path) => (
                        <div
                          key={path.id}
                          onMouseEnter={() => setHoveredPathId(path.id)}
                          onMouseLeave={() => setHoveredPathId(null)}
                          className={`p-2 rounded-lg border transition-all flex items-center justify-between ${
                            hoveredPathId === path.id
                              ? 'bg-amber-50 border-[#B88E3C]'
                              : 'bg-white border-[#E8E1D5] hover:border-[#D7CBB9]'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-[#2C2523] truncate block text-[11px]">
                                {path.title}
                              </span>
                              <span className="text-[9px] uppercase px-1 rounded bg-[#EAE2D5] text-[#5F554F] shrink-0">
                                {path.category}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#7A6E65] block">
                              {path.segments.length} {language === 'fil' ? 'tahi' : 'stitches'} • DMC {backstitchDmc}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleApplySuggestedPath(path)}
                            className="py-1 px-2 rounded-md text-[11px] font-bold text-[#2C2523] bg-[#FAF7F2] hover:bg-[#EAE2D5] border border-[#D7CBB9] transition-all cursor-pointer shrink-0"
                          >
                            {language === 'fil' ? 'Idagdag' : 'Add'}
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Active Outlines Management */}
                <div className="space-y-2 bg-white p-3 rounded-xl border border-[#D7CBB9]">
                  <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-2">
                    <div>
                      <span className="font-bold text-[#2C2523] block text-xs">
                        {language === 'fil' ? 'Mga Aktibong Backstitch' : 'Active Pattern Outlines'}
                      </span>
                      <span className="text-[10px] text-[#7A6E65]">
                        {backstitchStats.totalSegments} {language === 'fil' ? 'mga linya' : 'segments'} • {backstitchStats.lengthCm} cm ({backstitchStats.lengthInches} in)
                      </span>
                    </div>

                    {backstitches.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllBackstitches}
                        className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title={language === 'fil' ? 'I-clear ang lahat ng outline' : 'Clear all outlines'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Thread Floss breakdown */}
                  {backstitchStats.flossBreakdown.length > 0 ? (
                    <div className="space-y-1 py-1">
                      {backstitchStats.flossBreakdown.map((fb) => (
                        <div
                          key={`${fb.dmcCode}_${fb.strands}`}
                          className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-[#FAF7F2] border border-[#E8E1D5]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-3 h-3 rounded-full border border-black/20"
                              style={{ backgroundColor: fb.colorHex }}
                            />
                            <span className="font-bold text-[#2C2523]">DMC {fb.dmcCode}</span>
                            <span className="text-[10px] text-[#7A6E65]">({fb.strands} stnd)</span>
                          </div>
                          <span className="font-mono text-[#5F554F]">
                            {fb.segmentCount} sts • {fb.skeinsEstimated} sk
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#7A6E65] italic py-2 text-center">
                      {language === 'fil' ? 'Walang backstitch lines sa pattern' : 'No backstitches added yet'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Full DMC Floss Library Search & Add */}
            {activeTab === 'dmcLibrary' && (
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#7A6E65] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={dmcSearchQuery}
                    onChange={(e) => setDmcSearchQuery(e.target.value)}
                    placeholder={
                      language === 'fil'
                        ? 'Maghanap ng DMC code o kulay...'
                        : 'Search DMC code or name...'
                    }
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-[#D7CBB9] bg-white focus:outline-none focus:border-[#B88E3C] focus:ring-1 focus:ring-[#B88E3C]"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1">
                  {filteredDmcLibrary.map((dmcColor) => {
                    const alreadyInPalette = palette.some((c) => c.code === dmcColor.code);

                    return (
                      <div
                        key={dmcColor.code}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E8E1D5] hover:border-[#D7CBB9] transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-6 h-6 rounded-md border border-black/10 shrink-0 flex items-center justify-center text-xs font-bold"
                            style={{
                              backgroundColor: dmcColor.hex,
                              color: dmcColor.symbolDark ? '#111111' : '#FFFFFF',
                            }}
                          >
                            {dmcColor.symbol}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#2C2523] block">
                              DMC {dmcColor.code}
                            </span>
                            <span className="text-[11px] text-[#7A6E65] truncate block">
                              {dmcColor.name}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddDmcToPalette(dmcColor)}
                          className="py-1 px-2 rounded-lg text-xs font-semibold text-[#2C2523] bg-[#FAF7F2] hover:bg-[#EAE2D5] border border-[#D7CBB9] transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3 text-[#B88E3C]" />
                          <span>{alreadyInPalette ? 'Select' : 'Add'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer Quick Action: Global Color Swap / Reset */}
            <div className="p-3 bg-[#FAF7F2] border-t border-[#E8E1D5] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setReplaceSourceColor(activeColor);
                  setShowReplaceModal(true);
                }}
                className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-[#2C2523] bg-white hover:bg-[#F2ECE1] border border-[#D7CBB9] transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#B88E3C]" />
                <span>{language === 'fil' ? 'Palitan ang Kulay' : 'Replace Color'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetToOriginal}
                className="py-1.5 px-2.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
                title={language === 'fil' ? 'Ibalik sa orihinal' : 'Reset to original'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'fil' ? 'I-reset' : 'Reset'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= GLOBAL COLOR REPLACE MODAL ================= */}
      {showReplaceModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl border border-[#D7CBB9] shadow-2xl p-6 max-w-md w-full space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#B88E3C]" />
                <h3 className="font-serif font-bold text-lg text-[#2C2523]">
                  {language === 'fil' ? 'Palitan ang Lahat ng Tahi' : 'Global Color Replacer'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReplaceModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#7A6E65]">
              {language === 'fil'
                ? 'Palitan ang lahat ng tahi ng piniling kulay sa buong pattern. Tamang-tama para tanggalin ang magugulong confetti o baguhin ang background.'
                : 'Replace every occurrence of a specific DMC color throughout the entire chart with a new color. Perfect for smoothing confetti shading or altering background hues.'}
            </p>

            {/* Source & Destination Color Pickers */}
            <div className="grid grid-cols-2 gap-4 items-center bg-[#FAF7F2] p-4 rounded-xl border border-[#E8E1D5]">
              {/* Source Color */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#7A6E65] uppercase">
                  {language === 'fil' ? 'Mula sa (Palitan)' : 'Replace From'}
                </label>
                <select
                  value={replaceSourceColor.code}
                  onChange={(e) => {
                    const found = palette.find((c) => c.code === e.target.value);
                    if (found) setReplaceSourceColor(found);
                  }}
                  className="w-full text-xs font-semibold p-2 rounded-lg border border-[#D7CBB9] bg-white cursor-pointer"
                >
                  {palette.map((c) => (
                    <option key={c.code} value={c.code}>
                      DMC {c.code} ({colorTally.get(c.code) || 0} stitches)
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="w-4 h-4 rounded-full border border-black/20"
                    style={{ backgroundColor: replaceSourceColor.hex }}
                  />
                  <span className="text-[11px] text-[#2C2523] truncate font-medium">
                    {replaceSourceColor.name}
                  </span>
                </div>
              </div>

              {/* Destination Color */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#7A6E65] uppercase">
                  {language === 'fil' ? 'Patungo sa (Bago)' : 'Replace With'}
                </label>
                <select
                  value={replaceTargetColor.code}
                  onChange={(e) => {
                    const found = palette.find((c) => c.code === e.target.value) || DMC_PALETTE.find((c) => c.code === e.target.value);
                    if (found) setReplaceTargetColor(found);
                  }}
                  className="w-full text-xs font-semibold p-2 rounded-lg border border-[#D7CBB9] bg-white cursor-pointer"
                >
                  {palette.map((c) => (
                    <option key={c.code} value={c.code}>
                      DMC {c.code} - {c.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="w-4 h-4 rounded-full border border-black/20"
                    style={{ backgroundColor: replaceTargetColor.hex }}
                  />
                  <span className="text-[11px] text-[#2C2523] truncate font-medium">
                    {replaceTargetColor.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Impact details */}
            <div className="text-xs bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900">
              <span className="font-bold">
                {colorTally.get(replaceSourceColor.code) || 0} {language === 'fil' ? 'tahi ang mapapalitan' : 'stitches will be updated'}
              </span>
              {' '}
              {language === 'fil'
                ? `mula sa DMC ${replaceSourceColor.code} patungong DMC ${replaceTargetColor.code}. Maaari itong i-undo anumang oras.`
                : `from DMC ${replaceSourceColor.code} to DMC ${replaceTargetColor.code}. You can undo this action at any time.`}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReplaceModal(false)}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-[#7A6E65] hover:bg-[#FAF7F2] border border-[#D7CBB9] cursor-pointer"
              >
                {language === 'fil' ? 'Kanselahin' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => applyGlobalReplace(replaceSourceColor, replaceTargetColor)}
                className="py-2 px-5 rounded-xl font-serif text-xs font-bold text-white bg-[#2C2523] hover:bg-[#433936] cursor-pointer shadow-sm"
              >
                {language === 'fil' ? 'Kumpirmahin ang Pagpalit' : 'Confirm Replace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DISCARD UNSAVED CONFIRM MODAL ================= */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl border border-[#D7CBB9] shadow-2xl p-6 max-w-sm w-full space-y-4 animate-scale-in">
            <h3 className="font-serif font-bold text-lg text-[#2C2523]">
              {language === 'fil' ? 'I-discard ang mga Pagbabago?' : 'Discard Unsaved Edits?'}
            </h3>
            <p className="text-xs text-[#7A6E65]">
              {language === 'fil'
                ? `Mayroon kang ${undoStack.length} hindi pa nai-save na pagbabago sa grid. Nais mo ba itong i-discard bago lumabas?`
                : `You have ${undoStack.length} unsaved stitch edits. Do you want to discard them or save before leaving?`}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="py-2 px-3 rounded-xl text-xs font-semibold text-[#7A6E65] hover:bg-[#FAF7F2] border border-[#D7CBB9] cursor-pointer"
              >
                {language === 'fil' ? 'Bumalik' : 'Stay Here'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onClose();
                }}
                className="py-2 px-3.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer"
              >
                {language === 'fil' ? 'I-discard' : 'Discard'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  handleCommitSave();
                }}
                className="py-2 px-4 rounded-xl font-serif text-xs font-bold text-white bg-[#2C2523] hover:bg-[#433936] cursor-pointer shadow-sm"
              >
                {language === 'fil' ? 'I-save at Isara' : 'Save & Exit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
