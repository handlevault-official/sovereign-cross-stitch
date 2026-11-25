import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  EyeOff,
  CheckCircle2,
  Crosshair,
  Sparkles,
  Paintbrush,
  Pin,
  Flag,
  FileText,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Contrast,
  Camera,
  Download,
  Trash2,
  Calendar,
  Image as ImageIcon,
  Edit2,
  Check,
  X,
  Film,
  Route,
  Keyboard,
  Database,
  Flame,
  StickyNote,
  Undo2,
  Redo2,
  Upload,
  PenTool,
  Disc,
  RotateCw,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Ghost,
  Ruler,
} from 'lucide-react';
import {
  PatternData,
  DMCColor,
  ProjectMilestone,
  ProjectAnnotation,
  ProjectSnapshot,
  StitchHistoryDelta,
  StitchTimerData,
} from '../types';
import { StitchSessionTimer } from './StitchSessionTimer';
import { PomodoroTimerWidget } from './PomodoroTimerWidget';
import { AnnotationModal } from './AnnotationModal';
import { AnnotationManagerDrawer } from './AnnotationManagerDrawer';
import { loadAnnotations, saveAnnotations } from '../utils/annotationStorage';
import { SnapshotExportModal } from './SnapshotExportModal';
import { ProgressBackupModal } from './ProgressBackupModal';
import { PatternImageExportModal } from './PatternImageExportModal';

interface StitchViewerProps {
  pattern: PatternData;
  activeColorFilter: string | null;
  onSelectColor: (code: string | null) => void;
  language: 'en' | 'fil';
  stitchedCells: Set<string>;
  onToggleStitch: (cellKey: string) => void;
  onMarkStitch?: (cellKey: string, mark: boolean, skipHistory?: boolean) => void;
  markMode: boolean;
  setMarkMode: (mode: boolean) => void;
  onOpenManualEditor?: () => void;
  onOpenBackstitchDrawer?: () => void;
  sessionStitches?: number;
  onResetSessionStitches?: () => void;
  highlightedMilestone?: ProjectMilestone | null;
  onLogPomodoroSession?: (stitchesCount: number, minutesSpent: number) => void;
  onImportStitchedCells?: (cells: Set<string>, mode: 'replace' | 'merge') => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onCommitHistory?: (delta: StitchHistoryDelta) => void;
  externalTimerData?: StitchTimerData;
  externalSessionSeconds?: number;
  externalIsRunning?: boolean;
  onExternalToggleTimer?: () => void;
}

export type ViewMode = 'stitches' | 'symbols' | 'blocks' | 'heatmap' | 'snapshots';

// 5-stop perceptual thermal ramp helper for Stitch Density Heatmap
const THERMAL_STOPS: [number, number, number][] = [
  [30, 58, 138],   // 0.00 - Deep Royal Blue (solid single-color blocks)
  [13, 148, 136],  // 0.25 - Cool Teal (gentle shading)
  [245, 158, 11],  // 0.50 - Warm Amber (moderate color shifts)
  [234, 88, 12],   // 0.75 - Vibrant Orange (dense detail)
  [220, 38, 38],   // 1.00 - Crimson Hotspot (heavy confetti / complex area)
];

function getThermalRgb(score: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, score));
  const scaled = clamped * (THERMAL_STOPS.length - 1);
  const idx = Math.min(THERMAL_STOPS.length - 2, Math.floor(scaled));
  const t = scaled - idx;
  const c0 = THERMAL_STOPS[idx];
  const c1 = THERMAL_STOPS[idx + 1];
  return [
    Math.round(c0[0] + (c1[0] - c0[0]) * t),
    Math.round(c0[1] + (c1[1] - c0[1]) * t),
    Math.round(c0[2] + (c1[2] - c0[2]) * t),
  ];
}

export const StitchViewer: React.FC<StitchViewerProps> = ({
  pattern,
  activeColorFilter,
  onSelectColor,
  language,
  stitchedCells,
  onToggleStitch,
  onMarkStitch,
  markMode,
  setMarkMode,
  onOpenManualEditor,
  onOpenBackstitchDrawer,
  sessionStitches = 0,
  onResetSessionStitches = () => {},
  highlightedMilestone = null,
  onLogPomodoroSession,
  onImportStitchedCells,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onCommitHistory,
  externalTimerData,
  externalSessionSeconds,
  externalIsRunning,
  onExternalToggleTimer,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('stitches');
  const [heatmapStyle, setHeatmapStyle] = useState<'thermal' | 'blended'>('thermal');
  const [heatmapHotspotsOnly, setHeatmapHotspotsOnly] = useState<boolean>(false);
  const [heatmapOverlayEnabled, setHeatmapOverlayEnabled] = useState<boolean>(false);
  const [heatmapOverlayOpacity, setHeatmapOverlayOpacity] = useState<number>(58);
  const [heatmapFocusTier, setHeatmapFocusTier] = useState<'all' | 'dense' | 'sparse'>('all');

  // Original Photo Overlay Validation State
  const overlayFileInputRef = useRef<HTMLInputElement>(null);
  const overlayUrlRef = useRef<string | null>(null);
  const [photoOverlayEnabled, setPhotoOverlayEnabled] = useState<boolean>(false);
  const [overlayPhotoName, setOverlayPhotoName] = useState<string>('');
  const [overlayImageObj, setOverlayImageObj] = useState<HTMLImageElement | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(50);

  // Preview Mode: High-Contrast Sketch-Style Background Filter for clear grid visibility on complex photos
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [sketchContrast, setSketchContrast] = useState<number>(75);
  const [previewShowSymbols, setPreviewShowSymbols] = useState<boolean>(false);

  // Embroidery Hoop Simulator State
  const [hoopEnabled, setHoopEnabled] = useState<boolean>(false);
  const [hoopShape, setHoopShape] = useState<'circle' | 'oval'>('circle');
  const [hoopSizeInches, setHoopSizeInches] = useState<number>(8);
  const [hoopOvalSize, setHoopOvalSize] = useState<'4x6' | '5x7' | '6x9' | '8x10'>('5x7');
  const [hoopPosition, setHoopPosition] = useState<{ x: number; y: number }>(() => ({
    x: pattern.width / 2,
    y: pattern.height / 2,
  }));
  const [hoopRotation, setHoopRotation] = useState<number>(0);
  const [hoopFinish, setHoopFinish] = useState<'bamboo' | 'walnut' | 'ebony'>('bamboo');
  const [hoopMaskOutside, setHoopMaskOutside] = useState<boolean>(true);
  const [hoopMoveMode, setHoopMoveMode] = useState<boolean>(false);
  const [isDraggingHoop, setIsDraggingHoop] = useState<boolean>(false);
  const hoopDragStartRef = useRef<{ mouseX: number; mouseY: number; hoopX: number; hoopY: number }>({
    mouseX: 0,
    mouseY: 0,
    hoopX: 0,
    hoopY: 0,
  });

  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showCenterMarks, setShowCenterMarks] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<{
    x: number;
    y: number;
    code: string;
    name: string;
    symbol: string;
    hex: string;
  } | null>(null);
  const [isDraggingToMark, setIsDraggingToMark] = useState(false);
  const [dragAction, setDragAction] = useState<'add' | 'remove'>('add');
  const dragHistoryRef = useRef<{ added: Set<string>; removed: Set<string> }>({
    added: new Set(),
    removed: new Set(),
  });

  // Annotation Layer State
  const [annotations, setAnnotations] = useState<ProjectAnnotation[]>(() =>
    loadAnnotations(pattern.id)
  );
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [annotateMode, setAnnotateMode] = useState<boolean>(false);
  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState<boolean>(false);
  const [isAnnotationDrawerOpen, setIsAnnotationDrawerOpen] = useState<boolean>(false);
  const [activeModalCoord, setActiveModalCoord] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [editingAnnotation, setEditingAnnotation] = useState<ProjectAnnotation | null>(null);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<ProjectAnnotation | null>(null);
  const [jumpHighlight, setJumpHighlight] = useState<{ x: number; y: number } | null>(null);
  const [mouseDownPoint, setMouseDownPoint] = useState<{ x: number; y: number; cellX: number; cellY: number } | null>(null);

  // Keyboard Navigation Cursor & Power-User Shortcuts State
  const [keyboardCursor, setKeyboardCursor] = useState<{ x: number; y: number } | null>(null);
  const [showKeyboardHelpModal, setShowKeyboardHelpModal] = useState<boolean>(false);

  // Stitch Progress Export & Import Backup Modal State
  const [showBackupModal, setShowBackupModal] = useState<boolean>(false);

  // High-Resolution Pattern Grid Image Export Modal (PNG / JPG)
  const [showPatternImageExportModal, setShowPatternImageExportModal] = useState<boolean>(false);

  // Integrated Pomodoro Toggle State
  const [showPomodoro, setShowPomodoro] = useState<boolean>(false);

  // Smart Highlight Mode (dims non-selected threads when a color is selected)
  const [smartHighlight, setSmartHighlight] = useState<boolean>(true);

  // Contrast Toggle: High-Contrast (B&W) Mode for Low-Light Stitching Sessions
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sovereign_stitchviewer_high_contrast') === 'true';
    } catch {
      return false;
    }
  });

  const toggleHighContrast = () => {
    setHighContrast((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sovereign_stitchviewer_high_contrast', String(next));
      } catch {}
      return next;
    });
  };

  // Ghost Mode: Dims completed stitches to 20% opacity instead of hiding them so completed context remains visible
  const [ghostMode, setGhostMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sovereign_stitchviewer_ghost_mode') === 'true';
    } catch {
      return false;
    }
  });

  const toggleGhostMode = useCallback(() => {
    setGhostMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sovereign_stitchviewer_ghost_mode', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Grid Snap Alignment Guide & Dynamic Aida Rulers State
  const [gridSnapEnabled, setGridSnapEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sovereign_stitchviewer_grid_snap') === 'true';
    } catch {
      return false;
    }
  });
  const [gridSnapOrigin, setGridSnapOrigin] = useState<'corner' | 'center'>('corner');
  const [gridSnapUnit, setGridSnapUnit] = useState<'in' | 'cm'>('in');
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: 520,
  });

  const toggleGridSnap = useCallback(() => {
    setGridSnapEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sovereign_stitchviewer_grid_snap', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Track viewport size for crisp dynamic perimeter rulers
  useEffect(() => {
    const el = containerRef.current;
    if (!el || viewMode === 'snapshots') return;

    const updateSize = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        setViewportSize({ width: el.clientWidth, height: el.clientHeight });
      }
    };
    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateSize);
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [viewMode]);

  // Original Photo Overlay Handlers
  useEffect(() => {
    return () => {
      if (overlayUrlRef.current) {
        URL.revokeObjectURL(overlayUrlRef.current);
        overlayUrlRef.current = null;
      }
    };
  }, []);

  const handleOverlayFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (overlayUrlRef.current) {
        URL.revokeObjectURL(overlayUrlRef.current);
      }
      overlayUrlRef.current = objectUrl;
      setOverlayImageObj(img);
      setOverlayPhotoName(file.name);
      setPhotoOverlayEnabled(true);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
    e.target.value = '';
  }, []);

  const handleClearOverlayPhoto = useCallback(() => {
    if (overlayUrlRef.current) {
      URL.revokeObjectURL(overlayUrlRef.current);
      overlayUrlRef.current = null;
    }
    setOverlayImageObj(null);
    setOverlayPhotoName('');
    setPhotoOverlayEnabled(false);
  }, []);

  const handleTogglePhotoOverlay = useCallback(() => {
    setPhotoOverlayEnabled((prev) => {
      const next = !prev;
      if (next && !overlayImageObj) {
        setTimeout(() => {
          overlayFileInputRef.current?.click();
        }, 0);
      }
      return next;
    });
  }, [overlayImageObj]);

  const togglePreviewMode = useCallback(() => {
    setPreviewMode((prev) => !prev);
  }, []);

  const toggleHoopSimulator = useCallback(() => {
    setHoopEnabled((prev) => {
      const next = !prev;
      if (next) {
        if (!markMode && !annotateMode) {
          setHoopMoveMode(true);
        }
      } else {
        setHoopMoveMode(false);
        setIsDraggingHoop(false);
      }
      return next;
    });
  }, [markMode, annotateMode]);

  const handleCenterHoop = useCallback(() => {
    setHoopPosition({ x: pattern.width / 2, y: pattern.height / 2 });
  }, [pattern.width, pattern.height]);

  const handleNudgeHoop = useCallback(
    (dx: number, dy: number) => {
      setHoopPosition((prev) => ({
        x: Math.max(0, Math.min(pattern.width, prev.x + dx)),
        y: Math.max(0, Math.min(pattern.height, prev.y + dy)),
      }));
    },
    [pattern.width, pattern.height]
  );

  // Backstitch Outlines Visibility
  const [showBackstitches, setShowBackstitches] = useState<boolean>(true);

  // Stitch Simulation: Overlays ultra-realistic 3D 2-ply twisted thread texture and Aida fabric weave
  const [stitchSimulation, setStitchSimulation] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('sovereign_stitch_simulation');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  // Simulation Sheen: 'mercerized' (glossy cotton luster) or 'natural' (matte natural fiber)
  const [simulationSheen, setSimulationSheen] = useState<'mercerized' | 'natural'>(() => {
    try {
      return (localStorage.getItem('sovereign_stitch_simulation_sheen') as 'mercerized' | 'natural') || 'mercerized';
    } catch {
      return 'mercerized';
    }
  });

  const toggleStitchSimulation = () => {
    setStitchSimulation((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sovereign_stitch_simulation', String(next));
      } catch {}
      if (next && viewMode === 'symbols') {
        setViewMode('stitches');
      }
      return next;
    });
  };

  const toggleSimulationSheen = () => {
    setSimulationSheen((prev) => {
      const next = prev === 'mercerized' ? 'natural' : 'mercerized';
      try {
        localStorage.setItem('sovereign_stitch_simulation_sheen', next);
      } catch {}
      return next;
    });
  };

  // Reveal Mode (Scratch-Off Experience): Gradually uncovers the pattern as stitches are marked
  const [revealMode, setRevealMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sovereign_stitchviewer_reveal_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Reveal Mode Scratch-off Cover Style: 'foil' (shimmering metallic scratch card) or 'linen' (raw unworked aida cloth)
  const [revealCoverStyle, setRevealCoverStyle] = useState<'foil' | 'linen'>(() => {
    try {
      return (localStorage.getItem('sovereign_stitchviewer_reveal_style') as 'foil' | 'linen') || 'foil';
    } catch {
      return 'foil';
    }
  });

  // Reveal Mode Ghost Guide: Faint watermark DMC symbol guide underneath the scratch cover
  const [revealGhostGuide, setRevealGhostGuide] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sovereign_stitchviewer_reveal_ghost');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleRevealMode = () => {
    setRevealMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sovereign_stitchviewer_reveal_mode', String(next));
      } catch {}
      if (next && !markMode) {
        setMarkMode(true);
      }
      return next;
    });
  };

  const toggleRevealCoverStyle = () => {
    setRevealCoverStyle((prev) => {
      const next = prev === 'foil' ? 'linen' : 'foil';
      try {
        localStorage.setItem('sovereign_stitchviewer_reveal_style', next);
      } catch {}
      return next;
    });
  };

  const toggleRevealGhostGuide = () => {
    setRevealGhostGuide((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sovereign_stitchviewer_reveal_ghost', String(next));
      } catch {}
      return next;
    });
  };

  // Project Snapshots Gallery State
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>(() => {
    try {
      const raw = localStorage.getItem(`sovereign_snapshots_${pattern.id}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);
  const [activeLightboxSnapshot, setActiveLightboxSnapshot] = useState<ProjectSnapshot | null>(null);
  const [editingSnapshotNoteId, setEditingSnapshotNoteId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState<string>('');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`sovereign_snapshots_${pattern.id}`);
      setSnapshots(raw ? JSON.parse(raw) : []);
    } catch {
      setSnapshots([]);
    }
  }, [pattern.id]);

  // Mobile Touch Gesture State (Pinch-to-zoom & Drag-to-pan)
  const [isGestureActive, setIsGestureActive] = useState<boolean>(false);
  const [activePinchZoom, setActivePinchZoom] = useState<number | null>(null);

  const touchStateRef = useRef<{
    isPinching: boolean;
    isPanning: boolean;
    isMarking: boolean;
    initialDist: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
    initialMidpoint: { x: number; y: number };
    startTouch: { x: number; y: number };
    lastTapTime: number;
    hasMoved: boolean;
  }>({
    isPinching: false,
    isPanning: false,
    isMarking: false,
    initialDist: 0,
    initialZoom: 1,
    initialPan: { x: 0, y: 0 },
    initialMidpoint: { x: 0, y: 0 },
    startTouch: { x: 0, y: 0 },
    lastTapTime: 0,
    hasMoved: false,
  });

  // Precompute 5x5 local stitch complexity / density scores for Heatmap Visualization Mode
  const densityAnalysis = useMemo(() => {
    const w = pattern.width;
    const h = pattern.height;
    const total = w * h;
    const scores = new Float32Array(total);
    const uniqueCounts = new Uint8Array(total);
    const paletteSize = Math.max(1, pattern.palette.length + 16);
    const seenStamp = new Int32Array(paletteSize);
    let stamp = 0;

    let highCount = 0;
    let moderateCount = 0;
    let lowCount = 0;
    let maxScore = 0;
    let peakDenseCoord = { x: Math.floor(w / 2), y: Math.floor(h / 2) };
    let minScore = 2;
    let peakSparseCoord = { x: 0, y: 0 };

    const radius = 2; // 5x5 local stitch window
    for (let y = 0; y < h; y++) {
      const minY = Math.max(0, y - radius);
      const maxY = Math.min(h - 1, y + radius);

      for (let x = 0; x < w; x++) {
        const minX = Math.max(0, x - radius);
        const maxX = Math.min(w - 1, x + radius);

        stamp++;
        let unique = 0;
        let transitions = 0;
        let adjPairs = 0;

        for (let wy = minY; wy <= maxY; wy++) {
          const row = pattern.grid[wy];
          for (let wx = minX; wx <= maxX; wx++) {
            const cIdx = row[wx].colorIndex;
            if (cIdx >= 0 && cIdx < seenStamp.length) {
              if (seenStamp[cIdx] !== stamp) {
                seenStamp[cIdx] = stamp;
                unique++;
              }
            }
            if (wx < maxX) {
              adjPairs++;
              if (cIdx !== row[wx + 1].colorIndex) transitions++;
            }
            if (wy < maxY) {
              adjPairs++;
              if (cIdx !== pattern.grid[wy + 1][wx].colorIndex) transitions++;
            }
          }
        }

        const transitionRatio = adjPairs > 0 ? transitions / adjPairs : 0;
        const varietyRatio = Math.min(1, Math.max(0, unique - 1) / 6);
        const score = Math.min(1, 0.65 * transitionRatio + 0.35 * varietyRatio);

        const idx = y * w + x;
        scores[idx] = score;
        uniqueCounts[idx] = Math.min(255, unique);

        if (score > maxScore) {
          maxScore = score;
          peakDenseCoord = { x, y };
        }
        if (score < minScore) {
          minScore = score;
          peakSparseCoord = { x, y };
        }
        if (score >= 0.6) highCount++;
        else if (score >= 0.28) moderateCount++;
        else lowCount++;
      }
    }

    return {
      scores,
      uniqueCounts,
      highCount,
      moderateCount,
      lowCount,
      highPct: total > 0 ? Math.round((highCount / total) * 100) : 0,
      moderatePct: total > 0 ? Math.round((moderateCount / total) * 100) : 0,
      lowPct: total > 0 ? Math.round((lowCount / total) * 100) : 0,
      maxScore,
      peakDenseCoord,
      peakSparseCoord,
    };
  }, [pattern]);

  // High-Contrast Sketch-Style Offscreen Background Canvas for Preview Mode
  const sketchBackgroundCanvas = useMemo<HTMLCanvasElement | null>(() => {
    if (!previewMode || typeof document === 'undefined') return null;

    const aspect = pattern.height / Math.max(1, pattern.width);
    const workW = overlayImageObj
      ? Math.min(720, Math.max(pattern.width * 3, 360, overlayImageObj.naturalWidth || 480))
      : Math.min(720, Math.max(1, pattern.width * 3));
    const workH = Math.max(1, Math.round(workW * aspect));

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = workW;
    srcCanvas.height = workH;
    const sCtx = srcCanvas.getContext('2d');
    if (!sCtx) return null;

    if (overlayImageObj) {
      sCtx.imageSmoothingEnabled = true;
      sCtx.drawImage(overlayImageObj, 0, 0, workW, workH);
    } else {
      const paletteMap = new Map<string, DMCColor>();
      pattern.palette.forEach((c) => paletteMap.set(c.code, c));
      const cellW = workW / Math.max(1, pattern.width);
      const cellH = workH / Math.max(1, pattern.height);
      for (let y = 0; y < pattern.height; y++) {
        for (let x = 0; x < pattern.width; x++) {
          const cell = pattern.grid[y][x];
          const color = paletteMap.get(cell.dmcCode) || pattern.palette[0];
          sCtx.fillStyle = color.hex;
          sCtx.fillRect(
            Math.floor(x * cellW),
            Math.floor(y * cellH),
            Math.ceil(cellW),
            Math.ceil(cellH)
          );
        }
      }
    }

    const imgData = sCtx.getImageData(0, 0, workW, workH);
    const data = imgData.data;
    const totalPx = workW * workH;
    const gray = new Float32Array(totalPx);
    const inv = new Float32Array(totalPx);

    for (let i = 0; i < totalPx; i++) {
      const p = i * 4;
      const lum = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
      gray[i] = lum;
      inv[i] = 255 - lum;
    }

    // Separable 5x5 box blur (radius = 2) on inverted grayscale for Color Dodge pencil sketch
    const radius = 2;
    const tmpBlur = new Float32Array(totalPx);
    const invBlur = new Float32Array(totalPx);

    for (let y = 0; y < workH; y++) {
      const rowOffset = y * workW;
      for (let x = 0; x < workW; x++) {
        let sum = 0;
        let count = 0;
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = Math.min(workW - 1, Math.max(0, x + dx));
          sum += inv[rowOffset + sx];
          count++;
        }
        tmpBlur[rowOffset + x] = sum / count;
      }
    }

    for (let x = 0; x < workW; x++) {
      for (let y = 0; y < workH; y++) {
        let sum = 0;
        let count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          const sy = Math.min(workH - 1, Math.max(0, y + dy));
          sum += tmpBlur[sy * workW + x];
          count++;
        }
        invBlur[y * workW + x] = sum / count;
      }
    }

    // Combine Color Dodge sketch + Sobel contour edges onto crisp bright paper (#FDFCF9)
    const strength = 0.45 + (sketchContrast / 100) * 1.45;
    for (let y = 0; y < workH; y++) {
      const yPrev = Math.max(0, y - 1) * workW;
      const yCurr = y * workW;
      const yNext = Math.min(workH - 1, y + 1) * workW;

      for (let x = 0; x < workW; x++) {
        const idx = yCurr + x;
        const xPrev = Math.max(0, x - 1);
        const xNext = Math.min(workW - 1, x + 1);

        const gVal = gray[idx];
        const denom = Math.max(1, 255 - invBlur[idx]);
        const dodge = gVal >= 254 ? 255 : Math.min(255, (gVal * 255) / denom);
        const dodgeInk = 255 - dodge;

        // 3x3 Sobel gradient magnitude for crisp delicate contours (e.g. lace, veil, eyes)
        const tl = gray[yPrev + xPrev];
        const tc = gray[yPrev + x];
        const tr = gray[yPrev + xNext];
        const ml = gray[yCurr + xPrev];
        const mr = gray[yCurr + xNext];
        const bl = gray[yNext + xPrev];
        const bc = gray[yNext + x];
        const br = gray[yNext + xNext];

        const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
        const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
        const sobelMag = Math.min(255, (Math.abs(gx) + Math.abs(gy)) * 0.42);

        const rawInk = (dodgeInk * 1.15 + sobelMag * 0.52) * strength;
        const t = rawInk <= 16 ? 0 : Math.min(1, (rawInk - 16) / 140);

        const p = idx * 4;
        data[p] = Math.round(253 - t * (253 - 20));
        data[p + 1] = Math.round(252 - t * (252 - 20));
        data[p + 2] = Math.round(249 - t * (249 - 24));
        data[p + 3] = 255;
      }
    }

    sCtx.putImageData(imgData, 0, 0);
    return srcCanvas;
  }, [previewMode, pattern, overlayImageObj, sketchContrast]);

  // Base cell size on canvas
  const baseCellSize = 10;
  const canvasWidth = pattern.width * baseCellSize;
  const canvasHeight = pattern.height * baseCellSize;

  // Responsive Fit to container calculation
  const handleFitToContainer = useCallback(() => {
    if (containerRef.current) {
      const containerW = containerRef.current.clientWidth - 32;
      const containerH = containerRef.current.clientHeight - 32;
      const fitZoomW = containerW / canvasWidth;
      const fitZoomH = containerH / canvasHeight;
      const fitZoom = Math.min(1.2, Math.max(0.05, Math.min(fitZoomW, fitZoomH)));
      setZoom(fitZoom);
      setPan({
        x: Math.max(0, (containerW + 32 - canvasWidth * fitZoom) / 2),
        y: Math.max(0, (containerH + 32 - canvasHeight * fitZoom) / 2),
      });
    }
  }, [canvasWidth, canvasHeight]);

  // Center-anchored Zoom In/Out functions for toolbar and keyboard shortcuts
  const handleZoomCenter = useCallback((factor: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    setZoom((prevZoom) => {
      const nextZoom = Math.min(8.0, Math.max(0.05, prevZoom * factor));
      setPan((prevPan) => {
        const nextPanX = centerX - (centerX - prevPan.x) * (nextZoom / prevZoom);
        const nextPanY = centerY - (centerY - prevPan.y) * (nextZoom / prevZoom);
        return { x: nextPanX, y: nextPanY };
      });
      return nextZoom;
    });
  }, []);

  const handleZoomIn = useCallback(() => handleZoomCenter(1.25), [handleZoomCenter]);
  const handleZoomOut = useCallback(() => handleZoomCenter(1 / 1.25), [handleZoomCenter]);

  const handleSetExactZoom = useCallback((targetZoom: number) => {
    const container = containerRef.current;
    if (!container) {
      setZoom(targetZoom);
      return;
    }
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    setZoom((prevZoom) => {
      const clamped = Math.min(8.0, Math.max(0.05, targetZoom));
      setPan((prevPan) => {
        const nextPanX = centerX - (centerX - prevPan.x) * (clamped / prevZoom);
        const nextPanY = centerY - (centerY - prevPan.y) * (clamped / prevZoom);
        return { x: nextPanX, y: nextPanY };
      });
      return clamped;
    });
  }, []);

  // Floating zoom indicator state for mouse-wheel feedback
  const [wheelZoomIndicator, setWheelZoomIndicator] = useState<number | null>(null);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fit to container on first load or when pattern changes
  useEffect(() => {
    handleFitToContainer();
    // Reload pattern annotations
    setAnnotations(loadAnnotations(pattern.id));
    setEditingAnnotation(null);
    setHoveredAnnotation(null);
    setJumpHighlight(null);
    // Reset embroidery hoop position & auto-fit default diameter to new pattern
    setHoopPosition({ x: pattern.width / 2, y: pattern.height / 2 });
    setHoopRotation(0);
    const fabricCt = pattern.fabricCount || 14;
    const targetInches = Math.min(pattern.width, pattern.height) / fabricCt;
    const circleOptions = [4, 5, 6, 7, 8, 10, 12];
    const bestCircle = circleOptions.reduce((best, curr) =>
      Math.abs(curr - targetInches) < Math.abs(best - targetInches) ? curr : best
    , 8);
    setHoopSizeInches(bestCircle);
  }, [pattern.id, pattern.width, pattern.height, pattern.fabricCount, handleFitToContainer]);

  // Non-passive wheel / trackpad zoom with center anchored under cursor
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let zoomFactor: number;
      if (e.ctrlKey) {
        // Trackpad pinch-to-zoom gesture provides fine delta
        zoomFactor = Math.exp(-e.deltaY * 0.015);
      } else {
        // Standard mouse wheel notch (scroll up: zoom in, scroll down: zoom out)
        zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      }

      setZoom((prevZoom) => {
        const nextZoom = Math.min(8.0, Math.max(0.05, prevZoom * zoomFactor));
        setPan((prevPan) => {
          const nextPanX = mouseX - (mouseX - prevPan.x) * (nextZoom / prevZoom);
          const nextPanY = mouseY - (mouseY - prevPan.y) * (nextZoom / prevZoom);
          return { x: nextPanX, y: nextPanY };
        });

        // Trigger brief visual HUD zoom level badge
        setWheelZoomIndicator(Math.round(nextZoom * 100));
        if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
        wheelTimeoutRef.current = setTimeout(() => {
          setWheelZoomIndicator(null);
        }, 1200);

        return nextZoom;
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    };
  }, [viewMode]);

  // Helper to ensure keyboard cursor cell is visible inside container viewport
  const ensureCellInView = useCallback(
    (cellX: number, cellY: number) => {
      const container = containerRef.current;
      if (!container) return;

      const margin = 45;
      const cellScreenX = pan.x + (cellX + 0.5) * baseCellSize * zoom;
      const cellScreenY = pan.y + (cellY + 0.5) * baseCellSize * zoom;
      const containerW = container.clientWidth;
      const containerH = container.clientHeight;

      let nextPanX = pan.x;
      let nextPanY = pan.y;

      if (cellScreenX < margin) {
        nextPanX += margin - cellScreenX;
      } else if (cellScreenX > containerW - margin) {
        nextPanX -= cellScreenX - (containerW - margin);
      }

      if (cellScreenY < margin) {
        nextPanY += margin - cellScreenY;
      } else if (cellScreenY > containerH - margin) {
        nextPanY -= cellScreenY - (containerH - margin);
      }

      if (nextPanX !== pan.x || nextPanY !== pan.y) {
        setPan({ x: nextPanX, y: nextPanY });
      }
    },
    [pan, zoom, baseCellSize]
  );

  // Power-User Keyboard Engine: Arrow keys navigation, Spacebar toggle, Enter for notes, etc.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in input, textarea, or if modals are active
      const activeEl = document.activeElement;
      const tag = activeEl?.tagName?.toLowerCase();
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        activeEl?.getAttribute('contenteditable') === 'true' ||
        isAnnotationModalOpen ||
        isExportModalOpen ||
        activeLightboxSnapshot !== null
      ) {
        return;
      }

      // 1. Grid Navigation via Arrow Keys (with Shift+Arrow for 10-stitch jumps)
      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        e.preventDefault();

        const step = e.shiftKey ? 10 : 1;
        const currentX =
          keyboardCursor !== null
            ? keyboardCursor.x
            : hoveredCell !== null
            ? hoveredCell.x - 1
            : Math.floor(pattern.width / 2);

        const currentY =
          keyboardCursor !== null
            ? keyboardCursor.y
            : hoveredCell !== null
            ? hoveredCell.y - 1
            : Math.floor(pattern.height / 2);

        let nextX = currentX;
        let nextY = currentY;

        if (e.key === 'ArrowUp') nextY = Math.max(0, currentY - step);
        if (e.key === 'ArrowDown') nextY = Math.min(pattern.height - 1, currentY + step);
        if (e.key === 'ArrowLeft') nextX = Math.max(0, currentX - step);
        if (e.key === 'ArrowRight') nextX = Math.min(pattern.width - 1, currentX + step);

        setKeyboardCursor({ x: nextX, y: nextY });

        // Update live hovered stitch info so power users see real-time DMC stats
        if (pattern.grid[nextY] && pattern.grid[nextY][nextX]) {
          const cell = pattern.grid[nextY][nextX];
          const color = pattern.palette[cell.colorIndex] || pattern.palette[0];
          setHoveredCell({
            x: nextX + 1,
            y: nextY + 1,
            code: color.code,
            name: color.name,
            symbol: color.symbol,
            hex: color.hex,
          });

          if (showAnnotations) {
            const ann = annotations.find((a) => a.x === nextX && a.y === nextY);
            setHoveredAnnotation(ann || null);
          }
        }

        ensureCellInView(nextX, nextY);
        return;
      }

      // 2. Toggle Stitch Mark via Spacebar
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();

        const targetX =
          keyboardCursor !== null
            ? keyboardCursor.x
            : hoveredCell !== null
            ? hoveredCell.x - 1
            : Math.floor(pattern.width / 2);

        const targetY =
          keyboardCursor !== null
            ? keyboardCursor.y
            : hoveredCell !== null
            ? hoveredCell.y - 1
            : Math.floor(pattern.height / 2);

        if (targetX >= 0 && targetX < pattern.width && targetY >= 0 && targetY < pattern.height) {
          const key = `${targetX},${targetY}`;
          const isCurrentlyStitched = stitchedCells.has(key);
          const willBeStitched = !isCurrentlyStitched;

          if (onMarkStitch) {
            onMarkStitch(key, willBeStitched);
          } else {
            onToggleStitch(key);
          }

          if (!markMode) {
            setMarkMode(true);
          }

          setKeyboardCursor({ x: targetX, y: targetY });
          ensureCellInView(targetX, targetY);
        }
        return;
      }

      // 3. Open Stitch Note / Annotation Modal via Enter
      if (e.key === 'Enter') {
        e.preventDefault();
        const targetX =
          keyboardCursor !== null
            ? keyboardCursor.x
            : hoveredCell !== null
            ? hoveredCell.x - 1
            : Math.floor(pattern.width / 2);

        const targetY =
          keyboardCursor !== null
            ? keyboardCursor.y
            : hoveredCell !== null
            ? hoveredCell.y - 1
            : Math.floor(pattern.height / 2);

        if (targetX >= 0 && targetX < pattern.width && targetY >= 0 && targetY < pattern.height) {
          const existing = annotations.find((a) => a.x === targetX && a.y === targetY);
          setActiveModalCoord({ x: targetX, y: targetY });
          setEditingAnnotation(existing || null);
          setIsAnnotationModalOpen(true);
        }
        return;
      }

      // 4. Toggle 3D Stitch Simulation via 'S' / 's'
      if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleStitchSimulation();
        return;
      }

      // 5. Toggle Mark Mode Tracker via 'M' / 'm'
      if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setMarkMode(!markMode);
        return;
      }

      // 6. Toggle High Contrast B&W via 'C' / 'c'
      if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleHighContrast();
        return;
      }

      // 7. Toggle Center Crosshair via 'G' / 'g' (Grid center)
      if ((e.key === 'g' || e.key === 'G') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowCenterMarks((prev) => !prev);
        return;
      }

      // 8. Zoom In via '+' or '='
      if ((e.key === '+' || e.key === '=') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleZoomIn();
        return;
      }

      // 9. Zoom Out via '-' or '_'
      if ((e.key === '-' || e.key === '_') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleZoomOut();
        return;
      }

      // 10. Fit to Screen via '0'
      if (e.key === '0' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleFitToContainer();
        return;
      }

      // 11. 100% Actual Scale via '1'
      if (e.key === '1' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleSetExactZoom(1.0);
        return;
      }

      // 11b. Toggle Interactive Heatmap Overlay via 'H' / 'h'
      if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (viewMode === 'heatmap') {
          setViewMode('stitches');
        } else {
          setHeatmapOverlayEnabled((prev) => !prev);
        }
        return;
      }

      // 11b-2. Toggle Original Photo Overlay via 'O' / 'o'
      if ((e.key === 'o' || e.key === 'O') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleTogglePhotoOverlay();
        return;
      }

      // 11b-3. Toggle Sketch Preview Mode via 'P' / 'p'
      if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        togglePreviewMode();
        return;
      }

      // 11b-4. Toggle Embroidery Hoop Simulator via 'E' / 'e'
      if ((e.key === 'e' || e.key === 'E') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleHoopSimulator();
        return;
      }

      // 11b-5. Toggle Ghost Mode (dim completed stitches to 20% opacity) via 'D' / 'd'
      if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleGhostMode();
        return;
      }

      // 11b-6. Toggle Grid Snap Alignment Guide & Dynamic Rulers via 'R' / 'r'
      if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleGridSnap();
        return;
      }

      // 11c. Undo / Redo stitch marking via Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const lowerKey = e.key.toLowerCase();
        if (lowerKey === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            if (onRedo && canRedo) onRedo();
          } else {
            if (onUndo && canUndo) onUndo();
          }
          return;
        }
        if (lowerKey === 'y') {
          e.preventDefault();
          if (onRedo && canRedo) onRedo();
          return;
        }
      }

      // 12. Open Keyboard Help Cheat Sheet via '?'
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowKeyboardHelpModal((prev) => !prev);
        return;
      }

      // 13. Dismiss active keyboard reticle via Escape
      if (e.key === 'Escape') {
        setKeyboardCursor(null);
        setShowKeyboardHelpModal(false);
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    pattern,
    keyboardCursor,
    hoveredCell,
    stitchedCells,
    markMode,
    setMarkMode,
    onToggleStitch,
    onMarkStitch,
    ensureCellInView,
    annotations,
    showAnnotations,
    isAnnotationModalOpen,
    isExportModalOpen,
    activeLightboxSnapshot,
    toggleStitchSimulation,
    toggleHighContrast,
    handleZoomIn,
    handleZoomOut,
    handleFitToContainer,
    handleSetExactZoom,
    handleTogglePhotoOverlay,
    togglePreviewMode,
    toggleHoopSimulator,
    toggleGhostMode,
    toggleGridSnap,
    viewMode,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
  ]);

  // Annotation Management Handlers
  const handleSaveAnnotation = (
    data: Omit<ProjectAnnotation, 'id' | 'createdAt'> & { id?: string }
  ) => {
    let next: ProjectAnnotation[];
    if (data.id) {
      next = annotations.map((a) =>
        a.id === data.id
          ? {
              ...a,
              type: data.type,
              color: data.color,
              text: data.text,
              resolved: data.resolved,
            }
          : a
      );
    } else {
      const newAnn: ProjectAnnotation = {
        id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        patternId: pattern.id,
        x: data.x,
        y: data.y,
        type: data.type,
        color: data.color,
        text: data.text,
        createdAt: Date.now(),
        resolved: false,
      };
      next = [newAnn, ...annotations];
    }
    setAnnotations(next);
    saveAnnotations(pattern.id, next);
  };

  const handleDeleteAnnotation = (id: string) => {
    const next = annotations.filter((a) => a.id !== id);
    setAnnotations(next);
    saveAnnotations(pattern.id, next);
  };

  const handleToggleResolved = (id: string) => {
    const next = annotations.map((a) =>
      a.id === id ? { ...a, resolved: !a.resolved } : a
    );
    setAnnotations(next);
    saveAnnotations(pattern.id, next);
  };

  const handleClearAllAnnotations = () => {
    const confirmClear = window.confirm(
      language === 'fil'
        ? 'Sigurado ka bang nais mong burahin ang lahat ng mga tala at marker para sa disenyong ito?'
        : 'Are you sure you want to remove all annotations and notes for this design?'
    );
    if (!confirmClear) return;
    setAnnotations([]);
    saveAnnotations(pattern.id, []);
  };

  const handleJumpToCoordinate = (targetX: number, targetY: number) => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;

    const targetZoom = Math.max(1.8, zoom);
    setZoom(targetZoom);

    // Center target coordinate
    const cellCenterX = (targetX + 0.5) * baseCellSize * targetZoom;
    const cellCenterY = (targetY + 0.5) * baseCellSize * targetZoom;

    const newPanX = containerW / 2 - cellCenterX;
    const newPanY = containerH / 2 - cellCenterY;

    setPan({ x: newPanX, y: newPanY });

    setJumpHighlight({ x: targetX, y: targetY });
    setTimeout(() => {
      setJumpHighlight(null);
    }, 3500);
  };

  // Draw pattern onto canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = previewMode ? '#FDFCF9' : highContrast ? '#FFFFFF' : '#FAF7F2';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (previewMode && sketchBackgroundCanvas) {
      // High-Contrast Sketch-Style Background Image for clear grid visibility
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(sketchBackgroundCanvas, 0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    } else {
      // Draw fabric weave texture background
      ctx.strokeStyle = highContrast ? 'rgba(0, 0, 0, 0.06)' : 'rgba(215, 203, 185, 0.4)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= canvasWidth; x += baseCellSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= canvasHeight; y += baseCellSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
      }
    }

    // Palette lookup map
    const paletteMap = new Map<string, DMCColor>();
    pattern.palette.forEach((c) => paletteMap.set(c.code, c));

    // Render each cell
    for (let y = 0; y < pattern.height; y++) {
      for (let x = 0; x < pattern.width; x++) {
        const cell = pattern.grid[y][x];
        const color = paletteMap.get(cell.dmcCode) || pattern.palette[0];
        const px = x * baseCellSize;
        const py = y * baseCellSize;

        const isFiltered = activeColorFilter && activeColorFilter !== color.code;
        const isSmartHighlighted = smartHighlight && activeColorFilter && activeColorFilter === color.code;
        const isSmartDimmed = smartHighlight && activeColorFilter && activeColorFilter !== color.code;
        const isStitched = stitchedCells.has(`${x},${y}`);

        // PREVIEW MODE: Keep the high-contrast sketch-style background unobstructed beneath crisp grid lines
        if (previewMode) {
          if (isSmartHighlighted) {
            ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
            ctx.fillRect(px, py, baseCellSize, baseCellSize);
            ctx.strokeStyle = '#D97706';
            ctx.lineWidth = 1.3;
            ctx.strokeRect(px + 0.5, py + 0.5, baseCellSize - 1, baseCellSize - 1);
          }
          if (previewShowSymbols && !isSmartDimmed && !isFiltered) {
            ctx.save();
            if (ghostMode && isStitched) {
              ctx.globalAlpha = 0.2;
            }
            ctx.fillStyle = isSmartHighlighted ? '#78350F' : 'rgba(15, 23, 42, 0.72)';
            ctx.font = 'bold 6.5px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(color.symbol, px + baseCellSize / 2, py + baseCellSize / 2);
            ctx.restore();
          }
          if (isStitched && !ghostMode) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.32)';
            ctx.fillRect(px, py, baseCellSize, baseCellSize);
            ctx.strokeStyle = '#059669';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 0.5, py + 0.5, baseCellSize - 1, baseCellSize - 1);
          }
          continue;
        }

        // REVEAL MODE (SCRATCH-OFF EXPERIENCE): Unstitched cells are concealed under textured scratch foil or linen
        if (revealMode && !isStitched) {
          if (revealCoverStyle === 'foil') {
            // Shimmering metallic scratch-off foil texture
            if (highContrast) {
              ctx.fillStyle = (x + y) % 2 === 0 ? '#38383F' : '#2F2F36';
            } else {
              ctx.fillStyle = (x + y) % 2 === 0 ? '#CFC7B9' : '#C5BDAD';
            }
            ctx.fillRect(px, py, baseCellSize, baseCellSize);

            // Embossed 3D scratch card edge bevel
            ctx.fillStyle = highContrast ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.45)';
            ctx.fillRect(px, py, baseCellSize, 1);
            ctx.fillRect(px, py, 1, baseCellSize);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
            ctx.fillRect(px, py + baseCellSize - 1, baseCellSize, 1);
            ctx.fillRect(px + baseCellSize - 1, py, 1, baseCellSize);

            // Shimmering diagonal micro-scratch stroke
            ctx.strokeStyle = highContrast ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(px + 1.5, py + baseCellSize - 1.5);
            ctx.lineTo(px + baseCellSize - 1.5, py + 1.5);
            ctx.stroke();

            // Corner needle guide holes
            ctx.fillStyle = highContrast ? 'rgba(0, 0, 0, 0.5)' : 'rgba(90, 80, 70, 0.25)';
            ctx.fillRect(px, py, 1, 1);
            ctx.fillRect(px + baseCellSize - 1, py, 1, 1);
            ctx.fillRect(px, py + baseCellSize - 1, 1, 1);
            ctx.fillRect(px + baseCellSize - 1, py + baseCellSize - 1, 1, 1);

            // Faint DMC symbol ghost watermark or scratch sparkle
            if (revealGhostGuide) {
              ctx.fillStyle = highContrast ? 'rgba(255, 255, 255, 0.25)' : 'rgba(75, 65, 55, 0.28)';
              ctx.font = 'bold 6.5px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(color.symbol, px + baseCellSize / 2, py + baseCellSize / 2);
            } else {
              ctx.fillStyle = highContrast ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.45)';
              ctx.fillRect(px + baseCellSize / 2 - 0.5, py + baseCellSize / 2 - 0.5, 1.5, 1.5);
            }
          } else {
            // RAW UNWORKED LINEN / AIDA WEAVE COVER
            if (highContrast) {
              ctx.fillStyle = (x + y) % 2 === 0 ? '#27272A' : '#222225';
            } else {
              ctx.fillStyle = (x + y) % 2 === 0 ? '#EAE3D5' : '#E2DBCB';
            }
            ctx.fillRect(px, py, baseCellSize, baseCellSize);

            // Aida cloth warp & weft fibers
            ctx.strokeStyle = highContrast ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(px, py + baseCellSize / 2);
            ctx.lineTo(px + baseCellSize, py + baseCellSize / 2);
            ctx.moveTo(px + baseCellSize / 2, py);
            ctx.lineTo(px + baseCellSize / 2, py + baseCellSize);
            ctx.stroke();

            // Puncture holes at cell corners
            ctx.fillStyle = highContrast ? 'rgba(0, 0, 0, 0.6)' : 'rgba(120, 105, 90, 0.35)';
            ctx.beginPath();
            ctx.arc(px + 1, py + 1, 0.8, 0, Math.PI * 2);
            ctx.arc(px + baseCellSize - 1, py + 1, 0.8, 0, Math.PI * 2);
            ctx.arc(px + 1, py + baseCellSize - 1, 0.8, 0, Math.PI * 2);
            ctx.arc(px + baseCellSize - 1, py + baseCellSize - 1, 0.8, 0, Math.PI * 2);
            ctx.fill();

            // Faint DMC symbol ghost watermark
            if (revealGhostGuide) {
              ctx.fillStyle = highContrast ? 'rgba(255, 255, 255, 0.2)' : 'rgba(110, 95, 80, 0.3)';
              ctx.font = 'bold 6.5px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(color.symbol, px + baseCellSize / 2, py + baseCellSize / 2);
            }
          }
          // Cell is covered by scratch-off layer - proceed to next cell
          continue;
        }

        const isGhostDimmed = ghostMode && isStitched;
        if (isGhostDimmed) {
          ctx.save();
          ctx.globalAlpha = 0.2;
        }

        if (viewMode === 'heatmap') {
          const cellIdx = y * pattern.width + x;
          const densityScore = densityAnalysis.scores[cellIdx] || 0;
          const isHotspot = densityScore >= 0.6;
          const isSparse = densityScore <= 0.28;
          const effectiveFocus =
            heatmapFocusTier !== 'all'
              ? heatmapFocusTier
              : heatmapHotspotsOnly
              ? 'dense'
              : 'all';

          if (isSmartDimmed || isFiltered) {
            ctx.fillStyle = highContrast ? 'rgba(240, 240, 240, 0.35)' : 'rgba(225, 220, 212, 0.28)';
            ctx.fillRect(px, py, baseCellSize, baseCellSize);
          } else if (
            (effectiveFocus === 'dense' && !isHotspot) ||
            (effectiveFocus === 'sparse' && !isSparse)
          ) {
            // Focus Filter: Dim non-matching cells so dense confetti or sparse background zones jump out
            ctx.fillStyle = highContrast ? 'rgba(235, 235, 238, 0.7)' : 'rgba(232, 227, 219, 0.55)';
            ctx.fillRect(px, py, baseCellSize, baseCellSize);
          } else {
            const [tr, tg, tb] = getThermalRgb(densityScore);

            if (heatmapStyle === 'blended') {
              // Blend thermal tint (65%) over the underlying thread color (35%)
              const br = Math.round(color.r * 0.35 + tr * 0.65);
              const bg = Math.round(color.g * 0.35 + tg * 0.65);
              const bb = Math.round(color.b * 0.35 + tb * 0.65);
              ctx.fillStyle = `rgb(${br}, ${bg}, ${bb})`;
            } else {
              ctx.fillStyle = `rgb(${tr}, ${tg}, ${tb})`;
            }
            ctx.fillRect(px, py, baseCellSize, baseCellSize);

            // Subtle crisp highlight border for peak complexity hotspots (>= 75%)
            if (densityScore >= 0.75) {
              ctx.strokeStyle = highContrast ? '#FFFFFF' : 'rgba(255, 243, 196, 0.65)';
              ctx.lineWidth = 0.7;
              ctx.strokeRect(px + 0.5, py + 0.5, baseCellSize - 1, baseCellSize - 1);
            }

            if (isSmartHighlighted) {
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 1.4;
              ctx.strokeRect(px + 0.5, py + 0.5, baseCellSize - 1, baseCellSize - 1);
            }
          }
        } else if (viewMode === 'blocks') {
          // Flat color block or Textured Embroidery Block
          if (isSmartDimmed) {
            ctx.fillStyle = highContrast ? 'rgba(240, 240, 240, 0.4)' : 'rgba(235, 230, 222, 0.25)';
            ctx.fillRect(px, py, baseCellSize, baseCellSize);
          } else if (isFiltered) {
            ctx.fillStyle = highContrast ? 'rgba(220, 220, 220, 0.3)' : 'rgba(200, 200, 200, 0.15)';
            ctx.fillRect(px, py, baseCellSize, baseCellSize);
          } else {
            if (highContrast) {
              const lum = Math.round(0.299 * color.r + 0.587 * color.g + 0.114 * color.b);
              const contrastLum = lum > 130 ? Math.min(255, lum + 25) : Math.max(0, lum - 25);
              ctx.fillStyle = `rgb(${contrastLum}, ${contrastLum}, ${contrastLum})`;
            } else {
              ctx.fillStyle = color.hex;
            }
            ctx.fillRect(px, py, baseCellSize, baseCellSize);

            // Stitch Simulation: Overlay realistic woven embroidery floss texture onto the blocks
            if (stitchSimulation) {
              // 3D Block Edge Bevel
              ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
              ctx.fillRect(px, py, baseCellSize, 1);
              ctx.fillRect(px, py, 1, baseCellSize);
              ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
              ctx.fillRect(px, py + baseCellSize - 1, baseCellSize, 1);
              ctx.fillRect(px + baseCellSize - 1, py, 1, baseCellSize);

              // Thread weave ridges
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(px, py + baseCellSize * 0.35);
              ctx.lineTo(px + baseCellSize, py + baseCellSize * 0.35);
              ctx.moveTo(px, py + baseCellSize * 0.7);
              ctx.lineTo(px + baseCellSize, py + baseCellSize * 0.7);
              ctx.stroke();

              // Diagonal cotton sheen
              ctx.strokeStyle = simulationSheen === 'mercerized' ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 0.14)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(px + 1, py + baseCellSize - 1);
              ctx.lineTo(px + baseCellSize - 1, py + 1);
              ctx.stroke();
            }

            // Glowing amber outline if smart highlighted or high-contrast cell boundary
            if (isSmartHighlighted) {
              ctx.strokeStyle = '#D97706';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(px + 0.5, py + 0.5, baseCellSize - 1, baseCellSize - 1);
            } else if (highContrast) {
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
              ctx.lineWidth = 0.5;
              ctx.strokeRect(px + 0.5, py + 0.5, baseCellSize - 1, baseCellSize - 1);
            }
          }
        } else if (viewMode === 'symbols') {
          // Symbol chart
          if (isSmartDimmed) {
            ctx.fillStyle = highContrast ? 'rgba(255, 255, 255, 0.95)' : 'rgba(245, 242, 236, 0.35)';
            ctx.fillRect(px, py, baseCellSize, baseCellSize);
            ctx.fillStyle = highContrast ? 'rgba(0, 0, 0, 0.12)' : 'rgba(180, 170, 160, 0.15)';
            ctx.font = '5px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(color.symbol, px + baseCellSize / 2, py + baseCellSize / 2);
          } else if (isSmartHighlighted) {
            ctx.fillStyle = highContrast ? '#000000' : '#FFFFFF';
            ctx.fillRect(px, py, baseCellSize, baseCellSize);
            ctx.fillStyle = highContrast ? '#FFFFFF' : '#000000';
            ctx.font = 'bold 8.5px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(color.symbol, px + baseCellSize / 2, py + baseCellSize / 2);

            ctx.strokeStyle = '#D97706';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px + 0.5, py + 0.5, baseCellSize - 1, baseCellSize - 1);
          } else {
            if (highContrast) {
              // High-Contrast B&W Symbol Chart: Crisp pitch-black symbols on clean white/soft-gray cells
              const lum = Math.round(0.299 * color.r + 0.587 * color.g + 0.114 * color.b);
              ctx.fillStyle = lum < 70 ? '#E2E8F0' : '#FFFFFF';
              ctx.fillRect(px, py, baseCellSize, baseCellSize);

              ctx.fillStyle = isFiltered ? 'rgba(0, 0, 0, 0.15)' : '#000000';
              ctx.font = 'bold 8px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(color.symbol, px + baseCellSize / 2, py + baseCellSize / 2);

              ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
              ctx.lineWidth = 0.5;
              ctx.strokeRect(px + 0.5, py + 0.5, baseCellSize - 1, baseCellSize - 1);
            } else {
              ctx.fillStyle = isFiltered
                ? 'rgba(240, 240, 240, 0.6)'
                : `rgb(${Math.floor(255 - (255 - color.r) * 0.2)}, ${Math.floor(
                    255 - (255 - color.g) * 0.2
                  )}, ${Math.floor(255 - (255 - color.b) * 0.2)})`;
              ctx.fillRect(px, py, baseCellSize, baseCellSize);

              // Symbol
              ctx.fillStyle = isFiltered ? '#CCCCCC' : '#1A1A1A';
              ctx.font = 'bold 7px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(color.symbol, px + baseCellSize / 2, py + baseCellSize / 2);
            }
          }
        } else {
          // Simulated Realistic Cross Stitch 'X'
          if (isSmartDimmed) {
            ctx.fillStyle = highContrast ? 'rgba(255, 255, 255, 0.8)' : 'rgba(235, 230, 222, 0.25)';
            ctx.fillRect(px, py, baseCellSize, baseCellSize);
            ctx.strokeStyle = highContrast ? 'rgba(0, 0, 0, 0.12)' : 'rgba(200, 190, 180, 0.25)';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(px + 2, py + 2);
            ctx.lineTo(px + baseCellSize - 2, py + baseCellSize - 2);
            ctx.stroke();
          } else if (isFiltered) {
            ctx.fillStyle = highContrast ? 'rgba(240, 240, 240, 0.5)' : 'rgba(230, 225, 218, 0.4)';
            ctx.fillRect(px, py, baseCellSize, baseCellSize);
          } else {
            // Thread Color in High Contrast B&W vs Full Color
            let threadStrokeColor = color.hex;
            let threadSheenColor = simulationSheen === 'mercerized' ? 'rgba(255, 255, 255, 0.42)' : 'rgba(255, 255, 255, 0.24)';
            if (highContrast) {
              const lum = Math.round(0.299 * color.r + 0.587 * color.g + 0.114 * color.b);
              const contrastLum = lum > 125 ? Math.min(245, lum + 20) : Math.max(15, lum - 20);
              threadStrokeColor = `rgb(${contrastLum}, ${contrastLum}, ${contrastLum})`;
              threadSheenColor = lum > 125 ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.4)';
            }

            // Background glow for active smart highlighted stitches
            if (isSmartHighlighted) {
              ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
              ctx.fillRect(px, py, baseCellSize, baseCellSize);
            }

            if (stitchSimulation) {
              // ==========================================
              // ULTRA-REALISTIC EMBROIDERY THREAD SIMULATION
              // ==========================================
              // 1. Four Aida Needle Puncture Eyelets at the 4 cell corners
              const holeShadow = highContrast ? 'rgba(0,0,0,0.5)' : 'rgba(38, 30, 22, 0.4)';
              const holeRim = highContrast ? 'rgba(0,0,0,0.18)' : 'rgba(110, 95, 80, 0.22)';
              
              const holes = [
                { hx: px + 1.2, hy: py + 1.2 },
                { hx: px + baseCellSize - 1.2, hy: py + 1.2 },
                { hx: px + 1.2, hy: py + baseCellSize - 1.2 },
                { hx: px + baseCellSize - 1.2, hy: py + baseCellSize - 1.2 },
              ];
              holes.forEach(({ hx, hy }) => {
                ctx.fillStyle = holeRim;
                ctx.beginPath();
                ctx.arc(hx, hy, 1.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = holeShadow;
                ctx.beginPath();
                ctx.arc(hx, hy, 0.8, 0, Math.PI * 2);
                ctx.fill();
              });

              // 2. Under-Stitch Leg (Diagonal 1: Top-Left to Bottom-Right '\')
              // 2a. Fabric Contact Drop Shadow
              ctx.strokeStyle = highContrast ? 'rgba(0, 0, 0, 0.26)' : 'rgba(25, 18, 12, 0.2)';
              ctx.lineWidth = isSmartHighlighted ? 3.4 : 3.0;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(px + 1.8, py + 2.3);
              ctx.lineTo(px + baseCellSize - 1.8, py + baseCellSize - 1.3);
              ctx.stroke();

              // 2b. Strand 2-Ply Core
              ctx.strokeStyle = threadStrokeColor;
              ctx.lineWidth = isSmartHighlighted ? 2.8 : 2.5;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(px + 1.5, py + 1.5);
              ctx.lineTo(px + baseCellSize - 1.5, py + baseCellSize - 1.5);
              ctx.stroke();

              // 2c. Dual-Ply Twisted Center Groove (inter-ply shadow)
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.26)';
              ctx.lineWidth = 0.55;
              ctx.beginPath();
              ctx.moveTo(px + 2.0, py + 2.0);
              ctx.lineTo(px + baseCellSize - 2.0, py + baseCellSize - 2.0);
              ctx.stroke();

              // 2d. Mercerized Cotton Specular Sheen Highlight
              ctx.strokeStyle = threadSheenColor;
              ctx.lineWidth = isSmartHighlighted ? 0.9 : 0.7;
              ctx.beginPath();
              ctx.moveTo(px + 2.2, py + 1.6);
              ctx.lineTo(px + baseCellSize - 2.6, py + baseCellSize - 3.2);
              ctx.stroke();

              // 3. Over-Stitch Leg (Diagonal 2: Bottom-Left to Top-Right '/')
              // 3a. Crossing Shadow cast on under-stitch leg
              ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
              ctx.beginPath();
              ctx.arc(px + baseCellSize / 2, py + baseCellSize / 2, 1.4, 0, Math.PI * 2);
              ctx.fill();

              // 3b. Over-Stitch Soft Drop Shadow
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
              ctx.lineWidth = isSmartHighlighted ? 3.4 : 2.9;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(px + 1.8, py + baseCellSize - 1.3);
              ctx.lineTo(px + baseCellSize - 1.8, py + 2.3);
              ctx.stroke();

              // 3c. Over-Stitch 2-Ply Body
              ctx.strokeStyle = threadStrokeColor;
              ctx.lineWidth = isSmartHighlighted ? 2.9 : 2.6;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(px + 1.5, py + baseCellSize - 1.5);
              ctx.lineTo(px + baseCellSize - 1.5, py + 1.5);
              ctx.stroke();

              // 3d. Dual-Ply Twisted Center Groove
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
              ctx.lineWidth = 0.55;
              ctx.beginPath();
              ctx.moveTo(px + 2.0, py + baseCellSize - 2.0);
              ctx.lineTo(px + baseCellSize - 2.0, py + 2.0);
              ctx.stroke();

              // 3e. Specular Highlight along crest of Top Crossing Strand
              ctx.strokeStyle = threadSheenColor;
              ctx.lineWidth = isSmartHighlighted ? 1.0 : 0.85;
              ctx.beginPath();
              ctx.moveTo(px + 2.6, py + baseCellSize - 2.2);
              ctx.lineTo(px + baseCellSize - 2.2, py + 2.6);
              ctx.stroke();

              // 3f. Micro-twist fiber grain marks (tactile twisted ply relief)
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
              ctx.lineWidth = 0.5;
              const midX = px + baseCellSize / 2;
              const midY = py + baseCellSize / 2;
              ctx.beginPath();
              ctx.moveTo(midX - 2.2, midY + 1.4);
              ctx.lineTo(midX - 1.5, midY + 2.2);
              ctx.moveTo(midX + 1.5, midY - 2.2);
              ctx.lineTo(midX + 2.2, midY - 1.4);
              ctx.stroke();
            } else {
              // Standard Simplified Stitch 'X'
              ctx.fillStyle = highContrast ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)';
              ctx.beginPath();
              ctx.arc(px + 1.5, py + 1.5, 1, 0, Math.PI * 2);
              ctx.arc(px + baseCellSize - 1.5, py + 1.5, 1, 0, Math.PI * 2);
              ctx.arc(px + 1.5, py + baseCellSize - 1.5, 1, 0, Math.PI * 2);
              ctx.arc(px + baseCellSize - 1.5, py + baseCellSize - 1.5, 1, 0, Math.PI * 2);
              ctx.fill();

              // Diagonal stitch 1 (\)
              ctx.strokeStyle = threadStrokeColor;
              ctx.lineWidth = isSmartHighlighted ? 2.5 : highContrast ? 2.3 : 2.2;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(px + 2, py + 2);
              ctx.lineTo(px + baseCellSize - 2, py + baseCellSize - 2);
              ctx.stroke();

              // Diagonal stitch 2 (/) with slight highlight
              ctx.beginPath();
              ctx.moveTo(px + baseCellSize - 2, py + 2);
              ctx.lineTo(px + 2, py + baseCellSize - 2);
              ctx.stroke();

              // Thread sheen/highlight
              ctx.strokeStyle = isSmartHighlighted ? 'rgba(255, 255, 255, 0.5)' : threadSheenColor;
              ctx.lineWidth = isSmartHighlighted ? 1 : 0.8;
              ctx.beginPath();
              ctx.moveTo(px + baseCellSize - 2.5, py + 2.5);
              ctx.lineTo(px + 2.5, py + baseCellSize - 2.5);
              ctx.stroke();
            }

            // In High Contrast mode, render the DMC symbol in the center of the stitch for maximum clarity in low-light stitching!
            if (highContrast && !isSmartDimmed && !isFiltered) {
              const lum = Math.round(0.299 * color.r + 0.587 * color.g + 0.114 * color.b);
              ctx.fillStyle = lum > 135 ? '#000000' : '#FFFFFF';
              ctx.font = 'bold 6.5px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(color.symbol, px + baseCellSize / 2, py + baseCellSize / 2);
            }

            // Amber contrast halo for active highlighted color
            if (isSmartHighlighted) {
              ctx.strokeStyle = '#D97706';
              ctx.lineWidth = 1.2;
              ctx.strokeRect(px + 0.5, py + 0.5, baseCellSize - 1, baseCellSize - 1);
            }
          }
        }

        if (isGhostDimmed) {
          ctx.restore();
        }

        // Overlay if marked as stitched (in Ghost Mode, completed stitches remain ghosted at 20% opacity without emerald box)
        if (isStitched && !ghostMode) {
          if (revealMode) {
            // In Reveal Mode, the completed stitch is triumphantly uncovered!
            // Give it a subtle celebratory golden sheen border
            ctx.strokeStyle = highContrast ? '#10B981' : 'rgba(217, 119, 6, 0.65)';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(px + 0.5, py + 0.5, baseCellSize - 1, baseCellSize - 1);
          } else if (highContrast) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.42)';
            ctx.fillRect(px, py, baseCellSize, baseCellSize);
            ctx.strokeStyle = '#047857';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(px + 0.5, py + 0.5, baseCellSize - 1, baseCellSize - 1);
            ctx.strokeStyle = '#065F46';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(px + 2, py + baseCellSize / 2);
            ctx.lineTo(px + baseCellSize / 2 - 1, py + baseCellSize - 2.5);
            ctx.lineTo(px + baseCellSize - 2, py + 2.5);
            ctx.stroke();
          } else {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
            ctx.fillRect(px, py, baseCellSize, baseCellSize);
            ctx.strokeStyle = '#059669';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 0.5, py + 0.5, baseCellSize - 1, baseCellSize - 1);
          }
        }
      }
    }

    // Interactive Heatmap Intensity Overlay Layer: superimposes thermal density colors over active Stitch/Symbol/Block grid
    if (heatmapOverlayEnabled && viewMode !== 'heatmap') {
      const alpha = Math.max(0.15, Math.min(0.92, heatmapOverlayOpacity / 100));
      const effectiveFocus =
        heatmapFocusTier !== 'all'
          ? heatmapFocusTier
          : heatmapHotspotsOnly
          ? 'dense'
          : 'all';

      ctx.save();
      for (let y = 0; y < pattern.height; y++) {
        const py = y * baseCellSize;
        for (let x = 0; x < pattern.width; x++) {
          const px = x * baseCellSize;
          const idx = y * pattern.width + x;
          const score = densityAnalysis.scores[idx] || 0;
          const isDense = score >= 0.6;
          const isSparse = score <= 0.28;

          if (
            (effectiveFocus === 'dense' && !isDense) ||
            (effectiveFocus === 'sparse' && !isSparse)
          ) {
            ctx.fillStyle = 'rgba(24, 21, 19, 0.36)';
            ctx.fillRect(px, py, baseCellSize, baseCellSize);
          } else {
            const [tr, tg, tb] = getThermalRgb(score);
            ctx.fillStyle = `rgba(${tr}, ${tg}, ${tb}, ${alpha.toFixed(2)})`;
            ctx.fillRect(px, py, baseCellSize, baseCellSize);
          }
        }
      }
      ctx.restore();
    }

    // Original Photo Overlay Layer: drawn over stitch cells and under grid lines/notes for clean validation
    if (!previewMode && photoOverlayEnabled && overlayImageObj && overlayOpacity > 0) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, overlayOpacity / 100));
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(overlayImageObj, 0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    }

    // Grid lines: Thin for 1x1 (boosted clarity in Preview Mode & High Contrast)
    ctx.strokeStyle = previewMode
      ? 'rgba(15, 23, 42, 0.42)'
      : highContrast
      ? 'rgba(0, 0, 0, 0.35)'
      : 'rgba(180, 170, 160, 0.35)';
    ctx.lineWidth = previewMode || highContrast ? 0.7 : 0.5;
    for (let x = 0; x <= canvasWidth; x += baseCellSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= canvasHeight; y += baseCellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }

    // Bold 10x10 Grid Lines
    ctx.strokeStyle = previewMode ? '#0F172A' : highContrast ? '#000000' : 'rgba(60, 50, 45, 0.7)';
    ctx.lineWidth = previewMode || highContrast ? 1.65 : 1.2;
    for (let x = 0; x <= canvasWidth; x += baseCellSize * 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= canvasHeight; y += baseCellSize * 10) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }

    // Center Crosshairs
    if (showCenterMarks) {
      const midX = Math.floor(pattern.width / 2) * baseCellSize;
      const midY = Math.floor(pattern.height / 2) * baseCellSize;

      if (highContrast) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(midX, 0);
        ctx.lineTo(midX, canvasHeight);
        ctx.moveTo(0, midY);
        ctx.lineTo(canvasWidth, midY);
        ctx.stroke();
      }

      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 1.5;

      // Center vertical mark
      ctx.beginPath();
      ctx.moveTo(midX, 0);
      ctx.lineTo(midX, canvasHeight);
      ctx.stroke();

      // Center horizontal mark
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(canvasWidth, midY);
      ctx.stroke();

      // Red arrows at boundaries
      ctx.fillStyle = '#DC2626';
      // Top arrow
      ctx.beginPath();
      ctx.moveTo(midX - 4, 0);
      ctx.lineTo(midX + 4, 0);
      ctx.lineTo(midX, 6);
      ctx.fill();
      // Left arrow
      ctx.beginPath();
      ctx.moveTo(0, midY - 4);
      ctx.lineTo(0, midY + 4);
      ctx.lineTo(6, midY);
      ctx.fill();
    }

    // Highlighted Project Milestone Boundary & Coordinate Overlay
    if (highlightedMilestone) {
      const minX = Math.max(0, Math.min(pattern.width - 1, highlightedMilestone.minX));
      const maxX = Math.max(minX, Math.min(pattern.width - 1, highlightedMilestone.maxX));
      const minY = Math.max(0, Math.min(pattern.height - 1, highlightedMilestone.minY));
      const maxY = Math.max(minY, Math.min(pattern.height - 1, highlightedMilestone.maxY));

      const bx = minX * baseCellSize;
      const by = minY * baseCellSize;
      const bw = (maxX - minX + 1) * baseCellSize;
      const bh = (maxY - minY + 1) * baseCellSize;

      // Tinted region
      ctx.fillStyle = 'rgba(184, 142, 60, 0.18)';
      ctx.fillRect(bx, by, bw, bh);

      // Distinct animated-style dashed border
      ctx.save();
      ctx.strokeStyle = '#B88E3C';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(bx, by, bw, bh);

      // Badge label
      ctx.fillStyle = '#2C2523';
      ctx.font = 'bold 11px sans-serif';
      const label = `🚩 ${highlightedMilestone.title} (X:${minX}–${maxX}, Y:${minY}–${maxY})`;
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(bx, Math.max(0, by - 20), textWidth + 12, 20);
      ctx.fillStyle = '#FAF7F2';
      ctx.fillText(label, bx + 6, Math.max(14, by - 6));
      ctx.restore();
    }

    // Draw Annotation Layer (Sticky Notes, Flags, Pins)
    if (showAnnotations && annotations.length > 0) {
      annotations.forEach((ann) => {
        if (ann.x < 0 || ann.x >= pattern.width || ann.y < 0 || ann.y >= pattern.height) return;

        const ax = ann.x * baseCellSize;
        const ay = ann.y * baseCellSize;

        ctx.save();

        if (ann.resolved) {
          ctx.globalAlpha = 0.55;
        }

        // Jump pulse highlight ring
        if (jumpHighlight && jumpHighlight.x === ann.x && jumpHighlight.y === ann.y) {
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(ax + baseCellSize / 2, ay + baseCellSize / 2, baseCellSize * 1.5, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
          ctx.fill();
        }

        if (ann.type === 'label') {
          // Prominent Grid Text Label / Annotation
          ctx.strokeStyle = ann.color;
          ctx.lineWidth = 2.2;
          ctx.strokeRect(ax, ay, baseCellSize, baseCellSize);

          // Small tag dot at cell center
          ctx.fillStyle = ann.color;
          ctx.beginPath();
          ctx.arc(ax + baseCellSize / 2, ay + baseCellSize / 2, Math.max(2.5, baseCellSize * 0.2), 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(ax + baseCellSize / 2, ay + baseCellSize / 2, Math.max(1, baseCellSize * 0.08), 0, Math.PI * 2);
          ctx.fill();

          // Render text label pill / ribbon above or beside the cell
          const displayText = ann.text.length > 26 ? ann.text.slice(0, 24) + '…' : ann.text;
          ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
          const textMetrics = ctx.measureText(displayText);
          const badgeW = textMetrics.width + 24;
          const badgeH = 18;

          // Position badge above cell with a pointer down to the coordinate, clamped if near top
          let badgeX = ax + baseCellSize / 2 - 8;
          let badgeY = ay - badgeH - 5;
          if (badgeY < 2) {
            badgeY = ay + baseCellSize + 6;
          }

          // Small drop shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(badgeX + 1.5, badgeY + 1.5, badgeW, badgeH, 4);
            ctx.fill();

            // Badge background
            ctx.fillStyle = '#2C2523';
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
            ctx.fill();

            // Left color bar
            ctx.fillStyle = ann.color;
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, 3.5, badgeH, [4, 0, 0, 4]);
            ctx.fill();
          } else {
            ctx.fillRect(badgeX + 1.5, badgeY + 1.5, badgeW, badgeH);
            ctx.fillStyle = '#2C2523';
            ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
            ctx.fillStyle = ann.color;
            ctx.fillRect(badgeX, badgeY, 3.5, badgeH);
          }

          // Tag icon / prefix
          ctx.fillStyle = '#E6C687';
          ctx.font = '10px sans-serif';
          ctx.fillText('🏷️', badgeX + 5, badgeY + 13);

          // Text content
          ctx.fillStyle = '#FAF7F2';
          ctx.font = 'bold 9.5px system-ui, -apple-system, sans-serif';
          ctx.fillText(displayText, badgeX + 20, badgeY + 12.5);

          // Pointer tick to stitch cell
          ctx.strokeStyle = ann.color;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          if (badgeY < ay) {
            ctx.moveTo(badgeX + 8, badgeY + badgeH);
            ctx.lineTo(ax + baseCellSize / 2, ay);
          } else {
            ctx.moveTo(badgeX + 8, badgeY);
            ctx.lineTo(ax + baseCellSize / 2, ay + baseCellSize);
          }
          ctx.stroke();
        } else if (ann.type === 'flag') {
          // Flagpole
          ctx.strokeStyle = '#2C2523';
          ctx.lineWidth = 1.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ax + 2, ay + baseCellSize);
          ctx.lineTo(ax + 2, ay - 3);
          ctx.stroke();

          // Flag Pennant Triangle
          ctx.fillStyle = ann.color;
          ctx.beginPath();
          ctx.moveTo(ax + 2, ay - 3);
          ctx.lineTo(ax + baseCellSize + 4, ay + 1);
          ctx.lineTo(ax + 2, ay + 6);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else if (ann.type === 'note') {
          const lText = ann.text.toLowerCase();
          const isFK = lText.includes('knot') || lText.includes('french');
          const isHalf = lText.includes('half') || lText.includes('½');

          if (isFK) {
            // French Knot raised bead & swirl indicator on grid stitch
            ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
            ctx.beginPath();
            ctx.arc(ax + baseCellSize / 2 + 0.8, ay + baseCellSize / 2 + 0.8, 3.8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = ann.color || '#D97706';
            ctx.beginPath();
            ctx.arc(ax + baseCellSize / 2, ay + baseCellSize / 2, 3.8, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Inner knot spiral dot
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(ax + baseCellSize / 2 - 0.7, ay + baseCellSize / 2 - 0.7, 1.2, 0, Math.PI * 2);
            ctx.fill();

            // Top-Right corner micro badge 'FK'
            ctx.fillStyle = '#2C2523';
            ctx.fillRect(ax + baseCellSize - 5, ay - 3, 7, 5);
            ctx.fillStyle = '#FAF7F2';
            ctx.font = 'bold 4px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('FK', ax + baseCellSize - 1.5, ay - 0.5);
          } else if (isHalf) {
            // Half-Stitch single diagonal line & '½' badge on grid stitch
            ctx.strokeStyle = ann.color || '#B88E3C';
            ctx.lineWidth = 2.4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(ax + 1.5, ay + baseCellSize - 1.5);
            ctx.lineTo(ax + baseCellSize - 1.5, ay + 1.5);
            ctx.stroke();

            // White center core line for visibility
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(ax + 2.5, ay + baseCellSize - 2.5);
            ctx.lineTo(ax + baseCellSize - 2.5, ay + 2.5);
            ctx.stroke();

            // Top-Right corner micro badge '½'
            ctx.fillStyle = ann.color || '#B88E3C';
            ctx.fillRect(ax + baseCellSize - 5, ay - 3, 7, 5);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 4.5px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('½', ax + baseCellSize - 1.5, ay - 0.5);
          } else {
            // Crisp Sticky Note Grid Icon with outer halo & folded dog-ear corner
            const nx = ax - 1;
            const ny = ay - 1;
            const nw = baseCellSize + 2;
            const nh = baseCellSize + 2;
            const fold = 3.2;

            // Soft drop shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
            ctx.beginPath();
            ctx.moveTo(nx + 1.5, ny + 1.5);
            ctx.lineTo(nx + nw - fold + 1.5, ny + 1.5);
            ctx.lineTo(nx + nw + 1.5, ny + fold + 1.5);
            ctx.lineTo(nx + nw + 1.5, ny + nh + 1.5);
            ctx.lineTo(nx + 1.5, ny + nh + 1.5);
            ctx.closePath();
            ctx.fill();

            // Sticky note body with dog-ear corner
            ctx.fillStyle = ann.color || '#F59E0B';
            ctx.beginPath();
            ctx.moveTo(nx, ny);
            ctx.lineTo(nx + nw - fold, ny);
            ctx.lineTo(nx + nw, ny + fold);
            ctx.lineTo(nx + nw, ny + nh);
            ctx.lineTo(nx, ny + nh);
            ctx.closePath();
            ctx.fill();

            // High-contrast crisp border so sticky note stands out over any stitch color
            ctx.strokeStyle = '#2C2523';
            ctx.lineWidth = 0.9;
            ctx.stroke();

            // Folded corner flap
            ctx.fillStyle = '#FFFBEB';
            ctx.beginPath();
            ctx.moveTo(nx + nw - fold, ny);
            ctx.lineTo(nx + nw - fold, ny + fold);
            ctx.lineTo(nx + nw, ny + fold);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(44, 37, 35, 0.45)';
            ctx.lineWidth = 0.6;
            ctx.stroke();

            // Mini ruled text lines inside sticky note
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 0.95;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(nx + 2.2, ny + 4.4);
            ctx.lineTo(nx + nw - 3.6, ny + 4.4);
            ctx.moveTo(nx + 2.2, ny + 7.0);
            ctx.lineTo(nx + nw - 2.6, ny + 7.0);
            ctx.moveTo(nx + 2.2, ny + 9.5);
            ctx.lineTo(nx + nw - 4.4, ny + 9.5);
            ctx.stroke();
          }
        } else {
          // Circular Pin Marker
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.beginPath();
          ctx.arc(ax + baseCellSize / 2 + 1, ay + baseCellSize / 2 + 1, 4.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = ann.color;
          ctx.beginPath();
          ctx.arc(ax + baseCellSize / 2, ay + baseCellSize / 2, 4.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Center white pin core
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(ax + baseCellSize / 2, ay + baseCellSize / 2, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }

        // Small green checkmark circle if resolved
        if (ann.resolved) {
          ctx.fillStyle = '#10B981';
          ctx.beginPath();
          ctx.arc(ax + baseCellSize - 0.5, ay + 0.5, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }

        ctx.restore();
      });
    }

    // Render Decorative Backstitch Outlines Layer
    if (showBackstitches && pattern.backstitches && pattern.backstitches.length > 0) {
      pattern.backstitches.forEach((bs) => {
        const x1 = bs.x1 * baseCellSize;
        const y1 = bs.y1 * baseCellSize;
        const x2 = bs.x2 * baseCellSize;
        const y2 = bs.y2 * baseCellSize;

        ctx.strokeStyle = bs.color || '#1A1615';
        ctx.lineWidth = Math.max(2, baseCellSize * ((bs.strands ?? 1) === 2 ? 0.22 : 0.15));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Needle puncture dots at endpoints
        ctx.fillStyle = bs.color || '#1A1615';
        const punctureR = Math.max(1.5, baseCellSize * 0.08);
        ctx.beginPath();
        ctx.arc(x1, y1, punctureR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x2, y2, punctureR, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Render Active Keyboard Navigation Cursor Reticle
    if (keyboardCursor) {
      const { x: kx, y: ky } = keyboardCursor;
      if (kx >= 0 && kx < pattern.width && ky >= 0 && ky < pattern.height) {
        const kpx = kx * baseCellSize;
        const kpy = ky * baseCellSize;

        ctx.save();
        // Drop shadow for reticle
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.lineWidth = 2.4;
        ctx.strokeRect(kpx - 0.5, kpy - 0.5, baseCellSize + 1, baseCellSize + 1);

        // Vibrant high-visibility gold/amber reticle frame
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(kpx - 0.5, kpy - 0.5, baseCellSize + 1, baseCellSize + 1);

        // Inner white contrast highlight ring
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(kpx + 0.5, kpy + 0.5, baseCellSize - 1, baseCellSize - 1);

        // Corner tick brackets for precision power-user targeting
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 2.2;
        const arm = Math.max(2, baseCellSize * 0.3);
        // Top-Left corner
        ctx.beginPath();
        ctx.moveTo(kpx - 2, kpy + arm);
        ctx.lineTo(kpx - 2, kpy - 2);
        ctx.lineTo(kpx + arm, kpy - 2);
        // Top-Right corner
        ctx.moveTo(kpx + baseCellSize + 2 - arm, kpy - 2);
        ctx.lineTo(kpx + baseCellSize + 2, kpy - 2);
        ctx.lineTo(kpx + baseCellSize + 2, kpy + arm);
        // Bottom-Left corner
        ctx.moveTo(kpx - 2, kpy + baseCellSize + 2 - arm);
        ctx.lineTo(kpx - 2, kpy + baseCellSize + 2);
        ctx.lineTo(kpx + arm, kpy + baseCellSize + 2);
        // Bottom-Right corner
        ctx.moveTo(kpx + baseCellSize + 2 - arm, kpy + baseCellSize + 2);
        ctx.lineTo(kpx + baseCellSize + 2, kpy + baseCellSize + 2);
        ctx.lineTo(kpx + baseCellSize + 2, kpy + baseCellSize + 2 - arm);
        ctx.stroke();

        ctx.restore();
      }
    }

    // Draw Embroidery Hoop Simulator Overlay (circular or oval wooden tension hoop + brass screw hardware)
    if (hoopEnabled) {
      const ovalDimensions: Record<'4x6' | '5x7' | '6x9' | '8x10', [number, number]> = {
        '4x6': [4, 6],
        '5x7': [5, 7],
        '6x9': [6, 9],
        '8x10': [8, 10],
      };
      const [widthIn, heightIn] =
        hoopShape === 'circle' ? [hoopSizeInches, hoopSizeInches] : ovalDimensions[hoopOvalSize];
      const fabricCt = pattern.fabricCount || 14;
      const rx = Math.max(24, (widthIn * fabricCt * baseCellSize) / 2);
      const ry = Math.max(24, (heightIn * fabricCt * baseCellSize) / 2);
      const cx = hoopPosition.x * baseCellSize;
      const cy = hoopPosition.y * baseCellSize;
      const rad = (hoopRotation * Math.PI) / 180;

      ctx.save();

      // 1. Optional dark matte crop mask outside the inner hoop opening
      if (hoopMaskOutside) {
        ctx.fillStyle = 'rgba(22, 18, 15, 0.72)';
        ctx.beginPath();
        ctx.rect(0, 0, canvasWidth, canvasHeight);
        ctx.ellipse(cx, cy, rx, ry, rad, 0, Math.PI * 2);
        ctx.fill('evenodd');
      }

      // 2. Transform into rotated hoop coordinate space
      ctx.translate(cx, cy);
      ctx.rotate(rad);

      const ringThickness = Math.max(12, Math.min(26, Math.min(rx, ry) * 0.085));
      const woodThemes = {
        bamboo: {
          outer: '#B98E56',
          mid: '#DFBA83',
          inner: '#9E733D',
          grain: 'rgba(110, 74, 30, 0.25)',
          highlight: 'rgba(255, 240, 212, 0.55)',
          border: '#7C5629',
        },
        walnut: {
          outer: '#563723',
          mid: '#7B4F32',
          inner: '#3E2516',
          grain: 'rgba(28, 14, 7, 0.35)',
          highlight: 'rgba(218, 165, 128, 0.35)',
          border: '#2E1A0F',
        },
        ebony: {
          outer: '#262322',
          mid: '#3D3735',
          inner: '#161413',
          grain: 'rgba(0, 0, 0, 0.4)',
          highlight: 'rgba(180, 172, 166, 0.28)',
          border: '#0B0A0A',
        },
      };
      const wood = woodThemes[hoopFinish];

      // Inner recessed fabric lip shadow
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.34)';
      ctx.lineWidth = Math.max(4, ringThickness * 0.28);
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(4, rx - 1), Math.max(4, ry - 1), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Inner tension ring (wooden bevel inside outer hoop)
      ctx.save();
      ctx.strokeStyle = wood.inner;
      ctx.lineWidth = ringThickness * 0.38;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx + ringThickness * 0.19, ry + ringThickness * 0.19, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Fine seam line separating inner & outer wooden hoop rings
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx + ringThickness * 0.38, ry + ringThickness * 0.38, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Outer tension ring with drop shadow & wood finish bevel
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.48)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      ctx.strokeStyle = wood.outer;
      ctx.lineWidth = ringThickness * 0.68;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx + ringThickness * 0.72, ry + ringThickness * 0.72, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Mid-tone beveled ridge & wood-grain streaks on outer ring
      ctx.strokeStyle = wood.mid;
      ctx.lineWidth = ringThickness * 0.44;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx + ringThickness * 0.72, ry + ringThickness * 0.72, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = wood.grain;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([18, 8, 9, 12]);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx + ringThickness * 0.65, ry + ringThickness * 0.65, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Specular rim highlight on outer bezel
      ctx.strokeStyle = wood.highlight;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx + ringThickness * 0.56, ry + ringThickness * 0.56, 0, -Math.PI * 0.85, -Math.PI * 0.15);
      ctx.stroke();

      // Outer hoop rim edge
      ctx.strokeStyle = wood.border;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx + ringThickness * 1.06, ry + ringThickness * 1.06, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner hoop crisp rim edge
      ctx.strokeStyle = wood.border;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Top-mounted brushed-brass clasp & tension screw hardware
      const topY = -(ry + ringThickness * 0.78);
      const bracketW = Math.max(10, ringThickness * 0.56);
      const bracketH = Math.max(18, ringThickness * 1.05);
      const gapHalf = Math.max(3, ringThickness * 0.22);

      // Dark split gap at top of outer ring
      ctx.fillStyle = '#1C1917';
      ctx.fillRect(-gapHalf, -(ry + ringThickness * 1.12), gapHalf * 2, ringThickness * 0.85);

      const brassGrad = ctx.createLinearGradient(-bracketW * 1.8, topY - bracketH / 2, bracketW * 1.8, topY + bracketH / 2);
      brassGrad.addColorStop(0, '#8A6B29');
      brassGrad.addColorStop(0.35, '#F5DF96');
      brassGrad.addColorStop(0.6, '#C89E44');
      brassGrad.addColorStop(1, '#785A1F');

      // Left & right brass clasp blocks
      ctx.fillStyle = brassGrad;
      ctx.strokeStyle = '#5C4415';
      ctx.lineWidth = 1;
      ctx.fillRect(-gapHalf - bracketW, topY - bracketH * 0.55, bracketW, bracketH);
      ctx.strokeRect(-gapHalf - bracketW, topY - bracketH * 0.55, bracketW, bracketH);
      ctx.fillRect(gapHalf, topY - bracketH * 0.55, bracketW, bracketH);
      ctx.strokeRect(gapHalf, topY - bracketH * 0.55, bracketW, bracketH);

      // Threaded horizontal brass bolt shaft
      const boltHalfLen = gapHalf + bracketW + Math.max(14, ringThickness * 0.8);
      const shaftH = Math.max(5, ringThickness * 0.28);
      ctx.fillStyle = '#B89038';
      ctx.fillRect(-boltHalfLen, topY - shaftH / 2, boltHalfLen * 2, shaftH);
      ctx.strokeRect(-boltHalfLen, topY - shaftH / 2, boltHalfLen * 2, shaftH);

      // Screw threads
      ctx.strokeStyle = 'rgba(72, 50, 12, 0.55)';
      ctx.lineWidth = 1;
      for (let tx = -boltHalfLen + 4; tx < boltHalfLen - 3; tx += 3.5) {
        ctx.beginPath();
        ctx.moveTo(tx, topY - shaftH / 2);
        ctx.lineTo(tx + 1.5, topY + shaftH / 2);
        ctx.stroke();
      }

      // Knurled brass tension thumbnut (right) & bolt head (left)
      const knobW = Math.max(8, ringThickness * 0.42);
      const knobH = Math.max(14, ringThickness * 0.86);
      ctx.fillStyle = brassGrad;
      ctx.strokeStyle = '#5C4415';
      ctx.fillRect(boltHalfLen - knobW * 0.35, topY - knobH / 2, knobW, knobH);
      ctx.strokeRect(boltHalfLen - knobW * 0.35, topY - knobH / 2, knobW, knobH);
      ctx.fillRect(-boltHalfLen - knobW * 0.5, topY - shaftH * 0.85, knobW * 0.65, shaftH * 1.7);
      ctx.strokeRect(-boltHalfLen - knobW * 0.5, topY - shaftH * 0.85, knobW * 0.65, shaftH * 1.7);

      // Center alignment reticle while positioning hoop
      if (hoopMoveMode) {
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(12, 0);
        ctx.moveTo(0, -12);
        ctx.lineTo(0, 12);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }, [
    pattern,
    viewMode,
    canvasWidth,
    canvasHeight,
    activeColorFilter,
    stitchedCells,
    showCenterMarks,
    highlightedMilestone,
    showAnnotations,
    annotations,
    jumpHighlight,
    smartHighlight,
    highContrast,
    revealMode,
    revealCoverStyle,
    revealGhostGuide,
    showBackstitches,
    stitchSimulation,
    simulationSheen,
    keyboardCursor,
    densityAnalysis,
    heatmapStyle,
    heatmapHotspotsOnly,
    heatmapOverlayEnabled,
    heatmapOverlayOpacity,
    heatmapFocusTier,
    photoOverlayEnabled,
    overlayImageObj,
    overlayOpacity,
    previewMode,
    sketchBackgroundCanvas,
    previewShowSymbols,
    hoopEnabled,
    hoopShape,
    hoopSizeInches,
    hoopOvalSize,
    hoopPosition,
    hoopRotation,
    hoopFinish,
    hoopMaskOutside,
    hoopMoveMode,
    ghostMode,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Project Snapshot Handlers
  const handleTakeSnapshot = (customNote?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Render fresh state onto canvas
    renderCanvas();

    try {
      const previewUrl = canvas.toDataURL('image/png');
      const now = new Date();
      const dateFormatted = now.toLocaleDateString(language === 'fil' ? 'fil-PH' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const currentPercentage =
        pattern.totalStitches > 0
          ? Number(((stitchedCells.size / pattern.totalStitches) * 100).toFixed(1))
          : 0;

      const newSnapshot: ProjectSnapshot = {
        id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        patternId: pattern.id,
        timestamp: Date.now(),
        dateFormatted,
        previewUrl,
        stitchedCount: stitchedCells.size,
        totalStitches: pattern.totalStitches,
        percentage: currentPercentage,
        viewMode: viewMode === 'snapshots' ? 'stitches' : viewMode,
        highContrast,
        stitchSimulation,
        note:
          customNote ||
          (language === 'fil'
            ? `${stitchedCells.size.toLocaleString()} tahi natapos (${currentPercentage}%)`
            : `${stitchedCells.size.toLocaleString()} stitches complete (${currentPercentage}%)`),
      };

      const nextList = [newSnapshot, ...snapshots];
      setSnapshots(nextList);
      try {
        localStorage.setItem(`sovereign_snapshots_${pattern.id}`, JSON.stringify(nextList));
      } catch (err) {
        console.error('Snapshot storage error', err);
      }

      setSnapshotToast(
        language === 'fil'
          ? `📸 Na-save ang milestone snapshot! (${currentPercentage}%)`
          : `📸 Milestone snapshot captured! (${currentPercentage}%)`
      );
      setTimeout(() => setSnapshotToast(null), 3500);
    } catch (err) {
      console.error('Failed to capture snapshot', err);
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    const nextList = snapshots.filter((s) => s.id !== id);
    setSnapshots(nextList);
    try {
      localStorage.setItem(`sovereign_snapshots_${pattern.id}`, JSON.stringify(nextList));
    } catch {}
    if (activeLightboxSnapshot?.id === id) {
      setActiveLightboxSnapshot(null);
    }
  };

  const handleSaveSnapshotNote = (id: string, noteText: string) => {
    const nextList = snapshots.map((s) => (s.id === id ? { ...s, note: noteText } : s));
    setSnapshots(nextList);
    try {
      localStorage.setItem(`sovereign_snapshots_${pattern.id}`, JSON.stringify(nextList));
    } catch {}
    setEditingSnapshotNoteId(null);
  };

  const handleDownloadSnapshot = (snap: ProjectSnapshot) => {
    const safeTitle = (pattern.title || 'wedding_pattern').replace(/[^a-zA-Z0-9-_]/g, '_');
    const link = document.createElement('a');
    link.download = `${safeTitle}_milestone_${snap.percentage.toFixed(0)}pct_${snap.timestamp}.png`;
    link.href = snap.previewUrl;
    link.click();
  };

  const flushDragHistory = useCallback(() => {
    const { added, removed } = dragHistoryRef.current;
    if ((added.size > 0 || removed.size > 0) && onCommitHistory) {
      onCommitHistory({
        added: Array.from(added),
        removed: Array.from(removed),
      });
    }
    dragHistoryRef.current.added.clear();
    dragHistoryRef.current.removed.clear();
  }, [onCommitHistory]);

  // Mouse interaction handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;

    const cellX = Math.floor(mouseX / baseCellSize);
    const cellY = Math.floor(mouseY / baseCellSize);

    // Sync active keyboard cursor with mouse click
    if (cellX >= 0 && cellX < pattern.width && cellY >= 0 && cellY < pattern.height) {
      setKeyboardCursor({ x: cellX, y: cellY });
    }

    // Drag Embroidery Hoop Simulator on canvas when Hoop Move Mode is active
    if (hoopEnabled && hoopMoveMode) {
      hoopDragStartRef.current = {
        mouseX,
        mouseY,
        hoopX: hoopPosition.x,
        hoopY: hoopPosition.y,
      };
      setIsDraggingHoop(true);
      return;
    }

    // Annotate / Sticky Note mode click
    if (annotateMode) {
      if (cellX >= 0 && cellX < pattern.width && cellY >= 0 && cellY < pattern.height) {
        const existing = annotations.find((a) => a.x === cellX && a.y === cellY);
        setActiveModalCoord({ x: cellX, y: cellY });
        setEditingAnnotation(existing || null);
        setIsAnnotationModalOpen(true);
      }
      return;
    }

    // Direct click on an annotation marker when not in mark mode
    if (!markMode && showAnnotations) {
      const existing = annotations.find((a) => a.x === cellX && a.y === cellY);
      if (existing) {
        setActiveModalCoord({ x: cellX, y: cellY });
        setEditingAnnotation(existing);
        setIsAnnotationModalOpen(true);
        return;
      }
    }

    // Stitch Marking Mode
    if (markMode) {
      if (cellX >= 0 && cellX < pattern.width && cellY >= 0 && cellY < pattern.height) {
        const key = `${cellX},${cellY}`;
        const willMark = !stitchedCells.has(key);
        setDragAction(willMark ? 'add' : 'remove');
        setIsDraggingToMark(true);
        dragHistoryRef.current.added.clear();
        dragHistoryRef.current.removed.clear();
        if (onMarkStitch) {
          if (willMark) dragHistoryRef.current.added.add(key);
          else dragHistoryRef.current.removed.add(key);
          onMarkStitch(key, willMark, true);
        } else {
          onToggleStitch(key);
        }
      }
      return;
    }

    // Standard Panning & Click Registration
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setMouseDownPoint({ x: e.clientX, y: e.clientY, cellX, cellY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;

    if (isDraggingHoop) {
      const dxCells = (mouseX - hoopDragStartRef.current.mouseX) / baseCellSize;
      const dyCells = (mouseY - hoopDragStartRef.current.mouseY) / baseCellSize;
      setHoopPosition({
        x: Math.max(0, Math.min(pattern.width, hoopDragStartRef.current.hoopX + dxCells)),
        y: Math.max(0, Math.min(pattern.height, hoopDragStartRef.current.hoopY + dyCells)),
      });
      return;
    }

    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
      return;
    }

    const cellX = Math.floor(mouseX / baseCellSize);
    const cellY = Math.floor(mouseY / baseCellSize);

    // Continuous paint when dragging in markMode
    if (markMode && isDraggingToMark) {
      if (cellX >= 0 && cellX < pattern.width && cellY >= 0 && cellY < pattern.height) {
        const key = `${cellX},${cellY}`;
        const alreadyStitched = stitchedCells.has(key);
        if (onMarkStitch) {
          if (dragAction === 'add' && !alreadyStitched) {
            dragHistoryRef.current.added.add(key);
            dragHistoryRef.current.removed.delete(key);
            onMarkStitch(key, true, true);
          } else if (dragAction === 'remove' && alreadyStitched) {
            dragHistoryRef.current.removed.add(key);
            dragHistoryRef.current.added.delete(key);
            onMarkStitch(key, false, true);
          }
        } else {
          if (dragAction === 'add' && !alreadyStitched) {
            onToggleStitch(key);
          } else if (dragAction === 'remove' && alreadyStitched) {
            onToggleStitch(key);
          }
        }
      }
    }

    // Inspect hovered stitch and annotation
    if (cellX >= 0 && cellX < pattern.width && cellY >= 0 && cellY < pattern.height) {
      const cell = pattern.grid[cellY][cellX];
      const color = pattern.palette[cell.colorIndex] || pattern.palette[0];
      setHoveredCell({
        x: cellX + 1,
        y: cellY + 1,
        code: color.code,
        name: color.name,
        symbol: color.symbol,
        hex: color.hex,
      });

      if (showAnnotations) {
        const ann = annotations.find((a) => a.x === cellX && a.y === cellY);
        setHoveredAnnotation(ann || null);
      } else {
        setHoveredAnnotation(null);
      }
    } else {
      setHoveredCell(null);
      setHoveredAnnotation(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingHoop) {
      setIsDraggingHoop(false);
    }
    setIsPanning(false);
    if (isDraggingToMark) {
      setIsDraggingToMark(false);
      flushDragHistory();
    }

    // If mouse released with minimal travel (< 6px) and not in markMode or hoopMoveMode, open sticky note / annotation modal
    if (mouseDownPoint && !markMode && !(hoopEnabled && hoopMoveMode)) {
      const dist = Math.hypot(e.clientX - mouseDownPoint.x, e.clientY - mouseDownPoint.y);
      if (dist < 6) {
        const { cellX, cellY } = mouseDownPoint;
        if (cellX >= 0 && cellX < pattern.width && cellY >= 0 && cellY < pattern.height) {
          const existing = annotations.find((a) => a.x === cellX && a.y === cellY);
          setActiveModalCoord({ x: cellX, y: cellY });
          setEditingAnnotation(existing || null);
          setIsAnnotationModalOpen(true);
        }
      }
    }
    setMouseDownPoint(null);
  };

  // Mobile Touch Gesture Engine: Pinch-to-zoom & Drag-to-pan
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    if (e.touches.length === 2) {
      // 2-Finger Touch: Always Pinch-to-zoom & Drag-to-pan (even when in markMode)
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      touchStateRef.current.isPinching = true;
      touchStateRef.current.isPanning = false;
      touchStateRef.current.isMarking = false;
      touchStateRef.current.initialDist = dist;
      touchStateRef.current.initialZoom = zoom;
      touchStateRef.current.initialPan = { ...pan };
      touchStateRef.current.initialMidpoint = { x: midX, y: midY };
      touchStateRef.current.hasMoved = true;

      setIsGestureActive(true);
      setActivePinchZoom(zoom);
      return;
    }

    if (e.touches.length === 1) {
      const t = e.touches[0];
      const now = Date.now();
      const lastTap = touchStateRef.current.lastTapTime;
      const containerRect = container.getBoundingClientRect();

      // Double-Tap Gesture: Quick zoom in to 2x or reset to fit
      if (now - lastTap < 320) {
        touchStateRef.current.lastTapTime = 0;
        const tapX = t.clientX - containerRect.left;
        const tapY = t.clientY - containerRect.top;

        if (zoom < 1.4) {
          const targetZoom = 2.0;
          const newPanX = tapX - (tapX - pan.x) * (targetZoom / zoom);
          const newPanY = tapY - (tapY - pan.y) * (targetZoom / zoom);
          setZoom(targetZoom);
          setPan({ x: newPanX, y: newPanY });
        } else {
          handleFitToContainer();
        }
        return;
      }
      touchStateRef.current.lastTapTime = now;

      touchStateRef.current.startTouch = { x: t.clientX, y: t.clientY };
      touchStateRef.current.initialPan = { ...pan };
      touchStateRef.current.hasMoved = false;

      const rect = canvas.getBoundingClientRect();
      const touchCanvasX = (t.clientX - rect.left) / zoom;
      const touchCanvasY = (t.clientY - rect.top) / zoom;
      const cellX = Math.floor(touchCanvasX / baseCellSize);
      const cellY = Math.floor(touchCanvasY / baseCellSize);

      if (markMode) {
        // Mark Mode: 1-finger paints stitches
        touchStateRef.current.isMarking = true;
        touchStateRef.current.isPanning = false;
        if (cellX >= 0 && cellX < pattern.width && cellY >= 0 && cellY < pattern.height) {
          const key = `${cellX},${cellY}`;
          const willMark = !stitchedCells.has(key);
          setDragAction(willMark ? 'add' : 'remove');
          setIsDraggingToMark(true);
          dragHistoryRef.current.added.clear();
          dragHistoryRef.current.removed.clear();
          if (onMarkStitch) {
            if (willMark) dragHistoryRef.current.added.add(key);
            else dragHistoryRef.current.removed.add(key);
            onMarkStitch(key, willMark, true);
          } else {
            onToggleStitch(key);
          }
        }
      } else {
        // Normal Mode: 1-finger drags to pan
        touchStateRef.current.isPanning = true;
        touchStateRef.current.isMarking = false;
        setIsPanning(true);
      }

      setIsGestureActive(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    if (e.touches.length === 2 && touchStateRef.current.isPinching) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      const scale = dist / (touchStateRef.current.initialDist || 1);
      const newZoom = Math.min(4.0, Math.max(0.1, touchStateRef.current.initialZoom * scale));

      const containerRect = container.getBoundingClientRect();
      const originX = touchStateRef.current.initialMidpoint.x - containerRect.left;
      const originY = touchStateRef.current.initialMidpoint.y - containerRect.top;

      const newPanX =
        originX -
        (originX - touchStateRef.current.initialPan.x) * (newZoom / touchStateRef.current.initialZoom) +
        (midX - touchStateRef.current.initialMidpoint.x);
      const newPanY =
        originY -
        (originY - touchStateRef.current.initialPan.y) * (newZoom / touchStateRef.current.initialZoom) +
        (midY - touchStateRef.current.initialMidpoint.y);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
      setActivePinchZoom(newZoom);
      return;
    }

    if (e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - touchStateRef.current.startTouch.x;
      const dy = t.clientY - touchStateRef.current.startTouch.y;

      if (Math.hypot(dx, dy) > 5) {
        touchStateRef.current.hasMoved = true;
      }

      if (touchStateRef.current.isPanning) {
        // Drag-to-pan in all directions
        setPan({
          x: touchStateRef.current.initialPan.x + dx,
          y: touchStateRef.current.initialPan.y + dy,
        });
      } else if (touchStateRef.current.isMarking && isDraggingToMark) {
        // Continuous marking when swiping in markMode
        const rect = canvas.getBoundingClientRect();
        const touchCanvasX = (t.clientX - rect.left) / zoom;
        const touchCanvasY = (t.clientY - rect.top) / zoom;
        const cellX = Math.floor(touchCanvasX / baseCellSize);
        const cellY = Math.floor(touchCanvasY / baseCellSize);

        if (cellX >= 0 && cellX < pattern.width && cellY >= 0 && cellY < pattern.height) {
          const key = `${cellX},${cellY}`;
          const alreadyStitched = stitchedCells.has(key);
          if (onMarkStitch) {
            if (dragAction === 'add' && !alreadyStitched) {
              dragHistoryRef.current.added.add(key);
              dragHistoryRef.current.removed.delete(key);
              onMarkStitch(key, true, true);
            } else if (dragAction === 'remove' && alreadyStitched) {
              dragHistoryRef.current.removed.add(key);
              dragHistoryRef.current.added.delete(key);
              onMarkStitch(key, false, true);
            }
          } else {
            if (dragAction === 'add' && !alreadyStitched) {
              onToggleStitch(key);
            } else if (dragAction === 'remove' && alreadyStitched) {
              onToggleStitch(key);
            }
          }
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) {
      const hadMoved = touchStateRef.current.hasMoved;
      const wasMarking = touchStateRef.current.isMarking;

      touchStateRef.current.isPinching = false;
      touchStateRef.current.isPanning = false;
      touchStateRef.current.isMarking = false;
      setIsPanning(false);
      if (isDraggingToMark || wasMarking) {
        setIsDraggingToMark(false);
        flushDragHistory();
      }
      setIsGestureActive(false);
      setActivePinchZoom(null);

      // If user tapped without dragging
      if (!hadMoved && !wasMarking) {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const t = touchStateRef.current.startTouch;
          const touchCanvasX = (t.x - rect.left) / zoom;
          const touchCanvasY = (t.y - rect.top) / zoom;
          const cellX = Math.floor(touchCanvasX / baseCellSize);
          const cellY = Math.floor(touchCanvasY / baseCellSize);

          if (cellX >= 0 && cellX < pattern.width && cellY >= 0 && cellY < pattern.height) {
            // Annotate Mode click
            if (annotateMode) {
              const existing = annotations.find((a) => a.x === cellX && a.y === cellY);
              setActiveModalCoord({ x: cellX, y: cellY });
              setEditingAnnotation(existing || null);
              setIsAnnotationModalOpen(true);
              return;
            }

            // Direct tap on existing annotation marker
            if (showAnnotations) {
              const existing = annotations.find((a) => a.x === cellX && a.y === cellY);
              if (existing) {
                setActiveModalCoord({ x: cellX, y: cellY });
                setEditingAnnotation(existing);
                setIsAnnotationModalOpen(true);
                return;
              }
            }

            // Inspect tapped stitch on mobile
            const cell = pattern.grid[cellY][cellX];
            const color = pattern.palette[cell.colorIndex] || pattern.palette[0];
            setHoveredCell({
              x: cellX + 1,
              y: cellY + 1,
              code: color.code,
              name: color.name,
              symbol: color.symbol,
              hex: color.hex,
            });
          }
        }
      }
    } else if (e.touches.length === 1) {
      // Transition from 2 fingers down to 1 finger
      const t = e.touches[0];
      touchStateRef.current.isPinching = false;
      touchStateRef.current.isPanning = !markMode && !annotateMode;
      touchStateRef.current.startTouch = { x: t.clientX, y: t.clientY };
      touchStateRef.current.initialPan = { ...pan };
      setActivePinchZoom(null);
    }
  };

  const completedPercentage = ((stitchedCells.size / pattern.totalStitches) * 100).toFixed(1);

  return (
    <div className="bg-white rounded-xl border border-[#E8E1D5] shadow-xs overflow-hidden flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-[#FAF7F2] border-b border-[#E8E1D5] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 p-1 bg-white rounded-lg border border-[#E8E1D5]">
          <button
            type="button"
            onClick={() => setViewMode('stitches')}
            className={`px-3 py-1 text-xs font-medium rounded transition-all whitespace-nowrap shrink-0 ${
              viewMode === 'stitches'
                ? 'bg-[#2C2523] text-white shadow-xs'
                : 'text-[#5F554F] hover:text-[#2C2523]'
            }`}
          >
            {language === 'fil' ? '🧵 Realistiko (Stitches)' : '🧵 Real Stitch View'}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('symbols')}
            className={`px-3 py-1 text-xs font-medium rounded transition-all whitespace-nowrap shrink-0 ${
              viewMode === 'symbols'
                ? 'bg-[#2C2523] text-white shadow-xs'
                : 'text-[#5F554F] hover:text-[#2C2523]'
            }`}
          >
            {language === 'fil' ? '🔣 Symbol Chart' : '🔣 Symbol Chart'}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('blocks')}
            className={`px-3 py-1 text-xs font-medium rounded transition-all whitespace-nowrap shrink-0 ${
              viewMode === 'blocks'
                ? 'bg-[#2C2523] text-white shadow-xs'
                : 'text-[#5F554F] hover:text-[#2C2523]'
            }`}
          >
            {language === 'fil' ? '🎨 Color Blocks' : '🎨 Color Blocks'}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('heatmap')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'heatmap'
                ? 'bg-gradient-to-r from-[#7C2D12] to-[#B45309] text-white shadow-xs font-semibold'
                : 'text-[#5F554F] hover:text-[#2C2523] hover:bg-orange-50/70'
            }`}
            title={
              language === 'fil'
                ? 'Density Heatmap: Makita ang mga bahaging may siksik at kumplikadong detalye bago magsimula [H]'
                : 'Density Heatmap: Highlight complex confetti sections with high stitch density [H]'
            }
          >
            <Flame className={`w-3.5 h-3.5 ${viewMode === 'heatmap' ? 'text-amber-300' : 'text-orange-600'}`} />
            <span>{language === 'fil' ? '🔥 Density Heatmap' : '🔥 Density Heatmap'}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('snapshots')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'snapshots'
                ? 'bg-[#2C2523] text-white shadow-xs font-semibold'
                : 'text-[#5F554F] hover:text-[#2C2523] hover:bg-[#FAF7F2]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{language === 'fil' ? '📸 Mga Snapshot' : '📸 Snapshots'}</span>
            <span
              className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                viewMode === 'snapshots'
                  ? 'bg-amber-400 text-black'
                  : 'bg-[#EAE2D5] text-[#2C2523]'
              }`}
            >
              {snapshots.length}
            </span>
          </button>
        </div>

        {/* Center marks, Stitch Tracker, Undo/Redo, Sticky Notes, Snapshot, & Pomodoro Bar Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* SNAPSHOT QUICK CAPTURE BUTTON */}
          <button
            type="button"
            onClick={() => handleTakeSnapshot()}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-amber-600/40 bg-amber-50 hover:bg-amber-100 text-amber-950 transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
            title={
              language === 'fil'
                ? 'Kumuha ng snapshot ng kasalukuyang grid at i-save sa gallery'
                : 'Capture the current visible grid state as a PNG and add it to Project Snapshots'
            }
          >
            <Camera className="w-3.5 h-3.5 text-amber-700" />
            <span>{language === 'fil' ? 'Snapshot' : 'Snapshot'}</span>
          </button>

          {/* Center Crosshairs */}
          <button
            type="button"
            onClick={() => setShowCenterMarks(!showCenterMarks)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
              showCenterMarks
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-white text-[#5F554F] border-[#E8E1D5]'
            }`}
            title="Toggle Center Crosshairs"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {language === 'fil' ? 'Gitna (Center)' : 'Center Marks'}
            </span>
          </button>

          {/* Stitch Tracker & Undo/Redo Group */}
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-md border border-[#E8E1D5]">
            <button
              type="button"
              onClick={() => {
                setMarkMode(!markMode);
                if (!markMode) setAnnotateMode(false);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                markMode
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold'
                  : 'text-[#5F554F] hover:text-[#2C2523] hover:bg-[#FAF7F2]'
              }`}
              title="Interactive Progress Marker [M]"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {language === 'fil' ? 'Tracker' : 'Stitch Tracker'} ({completedPercentage}%)
              </span>
            </button>

            <div className="w-[1px] h-4 bg-[#E8E1D5]" />

            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                canUndo
                  ? 'text-[#2C2523] hover:bg-[#FAF7F2] cursor-pointer'
                  : 'text-[#C4B9AC] cursor-not-allowed'
              }`}
              title={
                language === 'fil'
                  ? 'I-undo ang huling pagmarka ng tahi (Ctrl+Z)'
                  : 'Undo last stitch mark (Ctrl+Z)'
              }
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{language === 'fil' ? 'Undo' : 'Undo'}</span>
            </button>

            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                canRedo
                  ? 'text-[#2C2523] hover:bg-[#FAF7F2] cursor-pointer'
                  : 'text-[#C4B9AC] cursor-not-allowed'
              }`}
              title={
                language === 'fil'
                  ? 'I-redo ang na-undo na tahi (Ctrl+Shift+Z / Ctrl+Y)'
                  : 'Redo stitch mark (Ctrl+Shift+Z / Ctrl+Y)'
              }
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{language === 'fil' ? 'Redo' : 'Redo'}</span>
            </button>
          </div>

          {/* STICKY NOTE & ANNOTATION LAYER TOOLS */}
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-md border border-[#E8E1D5]">
            {/* Click-to-Add Sticky Note Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !annotateMode;
                setAnnotateMode(next);
                if (next) setMarkMode(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all cursor-pointer ${
                annotateMode
                  ? 'bg-amber-600 text-white font-bold shadow-2xs'
                  : 'text-[#5F554F] hover:text-[#2C2523] hover:bg-[#FAF7F2]'
              }`}
              title={
                language === 'fil'
                  ? 'Sticky Note: I-click ang anumang coordinate sa grid upang maglagay ng paalala, tip, o technique note'
                  : 'Sticky Note: Click any grid coordinate to attach a text annotation, stitching tip, or marker icon'
              }
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>
                {annotateMode
                  ? language === 'fil'
                    ? 'Sticky Note: ON'
                    : 'Sticky Note: ON'
                  : language === 'fil'
                  ? '📝 Sticky Note'
                  : '📝 Sticky Note'}
              </span>
            </button>

            {/* Open Sticky Notes & Annotations Manager Drawer */}
            <button
              type="button"
              onClick={() => setIsAnnotationDrawerOpen(true)}
              className="px-2 py-1 text-xs text-[#5F554F] hover:text-[#2C2523] hover:bg-[#FAF7F2] rounded flex items-center gap-1 font-medium transition-colors"
              title="Open Sticky Notes & Coordinate Annotations Manager"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-mono text-[11px] font-bold bg-[#FAF7F2] px-1 rounded border border-[#E8E1D5]">
                {annotations.length}
              </span>
            </button>

            {/* Quick Toggle Visibility */}
            <button
              type="button"
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={`p-1 text-xs rounded transition-colors ${
                showAnnotations
                  ? 'text-amber-800 hover:bg-amber-50'
                  : 'text-gray-400 hover:bg-gray-100 line-through'
              }`}
              title={showAnnotations ? 'Hide annotations layer' : 'Show annotations layer'}
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* BACKSTITCH OUTLINE TOOLS */}
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-md border border-[#E8E1D5]">
            <button
              type="button"
              onClick={onOpenBackstitchDrawer}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded text-[#2C2523] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              title={
                language === 'fil'
                  ? 'Magdagdag ng dekoratibong backstitch outline o border at bumuo ng PDF Guide'
                  : 'Add decorative backstitch outlines & generate PDF Backstitch Guide'
              }
            >
              <Route className="w-3.5 h-3.5 text-[#B88E3C]" />
              <span>{language === 'fil' ? 'Backstitch' : 'Backstitch'}</span>
              {(pattern.backstitches?.length || 0) > 0 && (
                <span className="font-mono text-[10px] font-bold bg-[#FAF7F2] text-[#B88E3C] px-1 rounded border border-[#E8E1D5]">
                  {pattern.backstitches?.length}
                </span>
              )}
            </button>

            {/* Quick Toggle Backstitch Visibility */}
            <button
              type="button"
              onClick={() => setShowBackstitches(!showBackstitches)}
              className={`p-1 text-xs rounded transition-colors ${
                showBackstitches
                  ? 'text-[#B88E3C] hover:bg-amber-50'
                  : 'text-gray-400 hover:bg-gray-100 line-through'
              }`}
              title={showBackstitches ? 'Hide backstitch outlines' : 'Show backstitch outlines'}
            >
              {showBackstitches ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* SMART HIGHLIGHT MODE TOGGLE */}
          <button
            type="button"
            onClick={() => setSmartHighlight(!smartHighlight)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
              smartHighlight && activeColorFilter
                ? 'bg-amber-100 text-amber-950 border-amber-300 ring-1 ring-amber-300 font-bold'
                : smartHighlight
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-white text-[#5F554F] border-[#E8E1D5] hover:text-[#2C2523]'
            }`}
            title={
              language === 'fil'
                ? 'Smart Highlight: Awtomatikong pinadidilim ang lahat ng ibang sinulid upang lumitaw ang piniling kulay'
                : 'Smart Highlight: Automatically dims all threads except the one currently selected in Floss Legend'
            }
          >
            <Sparkles className={`w-3.5 h-3.5 ${smartHighlight ? 'text-amber-600' : 'text-gray-400'}`} />
            <span>{language === 'fil' ? 'Smart Highlight' : 'Smart Highlight'}</span>
            {smartHighlight && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse ml-0.5" />
            )}
          </button>

          {/* STITCH SIMULATION TOGGLE */}
          <button
            type="button"
            onClick={toggleStitchSimulation}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
              stitchSimulation
                ? 'bg-[#3A2213] text-[#FAF5EF] border-[#221208] ring-1 ring-amber-400/60 shadow-xs'
                : 'bg-white text-[#5F554F] border-[#E8E1D5] hover:text-[#2C2523]'
            }`}
            title={
              language === 'fil'
                ? 'Stitch Simulation: I-overlay ang realistiko at 3D na texture ng sinulid at telang Aida upang makita ang totoong hitsura ng natapos na burda (Pindutin ang [S])'
                : 'Stitch Simulation: Overlay realistic 3D thread texture and Aida cloth weave to preview the finished embroidery look (Press [S])'
            }
          >
            <span className="text-xs">🧵</span>
            <span>{language === 'fil' ? 'Simulasyon ng Tahi' : 'Stitch Simulation'}</span>
            {stitchSimulation && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5" />
            )}
          </button>

          {/* ORIGINAL PHOTO OVERLAY VALIDATION TOGGLE */}
          <input
            ref={overlayFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleOverlayFileChange}
            className="hidden"
            aria-label={language === 'fil' ? 'Mag-upload ng orihinal na larawan para sa overlay' : 'Upload original photo for overlay'}
          />
          <button
            type="button"
            onClick={handleTogglePhotoOverlay}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
              photoOverlayEnabled
                ? 'bg-indigo-900 text-indigo-50 border-indigo-950 ring-1 ring-indigo-400/60 shadow-xs'
                : 'bg-white text-[#5F554F] border-[#E8E1D5] hover:text-[#2C2523]'
            }`}
            title={
              language === 'fil'
                ? 'Photo Overlay: Mag-upload ng orihinal na larawan at ipatong sa pattern grid para suriin ang katumpakan ng kulay at detalye (Pindutin ang [O])'
                : 'Photo Overlay: Superimpose the original photo over the stitch grid at adjustable opacity for pattern validation (Press [O])'
            }
          >
            <ImageIcon className={`w-3.5 h-3.5 ${photoOverlayEnabled ? 'text-indigo-300' : 'text-indigo-600'}`} />
            <span>{language === 'fil' ? 'Overlay' : 'Overlay'}</span>
            {photoOverlayEnabled && overlayImageObj && (
              <span className="font-mono text-[10px] bg-indigo-950 text-indigo-200 px-1 py-0.2 rounded border border-indigo-400/40 font-bold">
                {overlayOpacity}%
              </span>
            )}
            {photoOverlayEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-pulse ml-0.5" />
            )}
          </button>

          {/* PREVIEW MODE (HIGH-CONTRAST SKETCH-STYLE BACKGROUND FILTER FOR CLEAR GRID LINES) */}
          <button
            type="button"
            onClick={togglePreviewMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
              previewMode
                ? 'bg-slate-900 text-white border-slate-950 ring-1 ring-sky-400/60 shadow-xs'
                : 'bg-white text-[#5F554F] border-[#E8E1D5] hover:text-[#2C2523]'
            }`}
            title={
              language === 'fil'
                ? 'Preview Mode: Maglagay ng high-contrast sketch-style filter sa background para mas malinaw makita ang mga linya ng grid sa kumplikadong larawan sa kasal (Pindutin ang [P])'
                : 'Preview Mode: Apply a high-contrast sketch-style filter to the background image so grid lines stand out clearly against complex wedding photos (Press [P])'
            }
          >
            <PenTool className={`w-3.5 h-3.5 ${previewMode ? 'text-sky-300' : 'text-slate-600'}`} />
            <span>{language === 'fil' ? 'Preview Mode' : 'Preview Mode'}</span>
            {previewMode && (
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse ml-0.5" />
            )}
          </button>

          {/* EMBROIDERY HOOP SIMULATOR TOGGLE */}
          <button
            type="button"
            onClick={toggleHoopSimulator}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
              hoopEnabled
                ? 'bg-amber-900 text-amber-50 border-amber-950 ring-1 ring-amber-400/60 shadow-xs'
                : 'bg-white text-[#5F554F] border-[#E8E1D5] hover:text-[#2C2523]'
            }`}
            title={
              language === 'fil'
                ? 'Embroidery Hoop Simulator: Ipatong ang bilog o hugis-itlog na bastidor sa pattern at ayusin ang posisyon at pag-ikot (Pindutin ang [E])'
                : 'Embroidery Hoop Simulator: Overlay a circular or oval embroidery hoop and adjust position, rotation, and size (Press [E])'
            }
          >
            <Disc className={`w-3.5 h-3.5 ${hoopEnabled ? 'text-amber-300' : 'text-amber-700'}`} />
            <span>{language === 'fil' ? 'Hoop' : 'Hoop'}</span>
            {hoopEnabled && (
              <span className="font-mono text-[10px] bg-amber-950 text-amber-200 px-1 py-0.2 rounded border border-amber-400/40 font-bold">
                {hoopShape === 'circle' ? `${hoopSizeInches}"` : `${hoopOvalSize.replace('x', '×')}"`}
              </span>
            )}
            {hoopEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse ml-0.5" />
            )}
          </button>

          {/* CONTRAST TOGGLE (HIGH-CONTRAST B&W MODE) */}
          <button
            type="button"
            onClick={toggleHighContrast}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
              highContrast
                ? 'bg-[#18181B] text-white border-black ring-1 ring-black shadow-xs'
                : 'bg-white text-[#5F554F] border-[#E8E1D5] hover:text-[#2C2523]'
            }`}
            title={
              language === 'fil'
                ? 'Contrast Toggle: Ipakita ang pattern sa high-contrast B&W mode para sa mas malinaw na pananahi sa gabi o mahinang ilaw'
                : 'Contrast Toggle: Display pattern in high-contrast (B&W) mode for enhanced visibility in low-light stitching sessions'
            }
          >
            <Contrast className={`w-3.5 h-3.5 ${highContrast ? 'text-amber-400' : 'text-[#7A6E65]'}`} />
            <span>{language === 'fil' ? 'High Contrast (B&W)' : 'Contrast (B&W)'}</span>
            {highContrast && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>

          {/* REVEAL MODE (SCRATCH-OFF PROGRESS EFFECT) */}
          <button
            type="button"
            onClick={toggleRevealMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
              revealMode
                ? 'bg-[#3B1736] text-[#FAF5F9] border-[#220B1F] ring-1 ring-amber-400/50 shadow-xs'
                : 'bg-white text-[#5F554F] border-[#E8E1D5] hover:text-[#2C2523]'
            }`}
            title={
              language === 'fil'
                ? 'Reveal Mode (Scratch-Off): Itago ang mga hindi pa tinatahing parte at unti-unting ibunyag ang pattern habang tinatahi'
                : 'Reveal Mode (Scratch-Off): Conceal unstitched grid under a scratch layer, gradually uncovering the pattern as you stitch'
            }
          >
            <Sparkles className={`w-3.5 h-3.5 ${revealMode ? 'text-amber-300' : 'text-[#8B5CF6]'}`} />
            <span>{language === 'fil' ? 'Reveal Mode' : 'Reveal Mode'}</span>
            <span
              className={`font-mono text-[10px] px-1 py-0.2 rounded font-bold ${
                revealMode
                  ? 'bg-[#220B1F] text-amber-300 border border-amber-400/40'
                  : 'bg-[#FAF7F2] text-[#7A6E65] border border-[#E8E1D5]'
              }`}
            >
              {completedPercentage}%
            </span>
            {revealMode && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5" />
            )}
          </button>

          {/* GHOST MODE TOGGLE (DIM COMPLETED STITCHES TO 20% OPACITY) */}
          <button
            type="button"
            onClick={toggleGhostMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
              ghostMode
                ? 'bg-slate-800 text-slate-100 border-slate-950 ring-1 ring-purple-300/60 shadow-xs'
                : 'bg-white text-[#5F554F] border-[#E8E1D5] hover:text-[#2C2523]'
            }`}
            title={
              language === 'fil'
                ? 'Ghost Mode: Pinapaliwanag nang bahagya (20% opacity) ang mga natapos nang tahi upang manatiling kita ang kabuuang disenyo habang nagtatrabaho sa bagong bahagi (Pindutin ang [D])'
                : 'Ghost Mode: Dims completed stitches to 20% opacity instead of hiding them so you keep design context while working on new sections (Press [D])'
            }
          >
            <Ghost className={`w-3.5 h-3.5 ${ghostMode ? 'text-purple-300' : 'text-slate-500'}`} />
            <span>{language === 'fil' ? 'Ghost Mode' : 'Ghost Mode'}</span>
            {ghostMode && (
              <span className="font-mono text-[10px] bg-slate-950 text-purple-200 px-1 py-0.2 rounded border border-purple-300/30 font-bold">
                20%
              </span>
            )}
            {ghostMode && (
              <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-pulse ml-0.5" />
            )}
          </button>

          {/* INTERACTIVE HEATMAP OVERLAY TOGGLE */}
          <button
            type="button"
            onClick={() => {
              if (viewMode === 'heatmap') {
                setViewMode('stitches');
                setHeatmapOverlayEnabled(false);
              } else {
                setHeatmapOverlayEnabled((prev) => !prev);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
              heatmapOverlayEnabled || viewMode === 'heatmap'
                ? 'bg-orange-950 text-amber-100 border-orange-900 ring-1 ring-orange-400/60 shadow-xs'
                : 'bg-white text-[#5F554F] border-[#E8E1D5] hover:text-[#2C2523]'
            }`}
            title={
              language === 'fil'
                ? 'Heatmap Overlay: Ipatong ang color-coded intensity layer sa grid upang matukoy ang siksik na detalye vs maluwag na background (Pindutin ang [H])'
                : 'Heatmap Overlay: Layer color-coded stitch intensity levels directly over the grid to compare dense detail vs sparse background (Press [H])'
            }
          >
            <Flame
              className={`w-3.5 h-3.5 ${
                heatmapOverlayEnabled || viewMode === 'heatmap' ? 'text-orange-400' : 'text-orange-600'
              }`}
            />
            <span>{language === 'fil' ? 'Heatmap' : 'Heatmap'}</span>
            {heatmapOverlayEnabled && viewMode !== 'heatmap' && (
              <span className="font-mono text-[10px] bg-orange-900 text-amber-200 px-1 py-0.2 rounded border border-orange-400/40 font-bold">
                {heatmapOverlayOpacity}%
              </span>
            )}
            {(heatmapOverlayEnabled || viewMode === 'heatmap') && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse ml-0.5" />
            )}
          </button>

          {/* GRID SNAP ALIGNMENT GUIDE & DYNAMIC RULERS TOGGLE */}
          <button
            type="button"
            onClick={toggleGridSnap}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
              gridSnapEnabled
                ? 'bg-amber-950 text-amber-100 border-amber-800 ring-1 ring-amber-400/60 shadow-xs'
                : 'bg-white text-[#5F554F] border-[#E8E1D5] hover:text-[#2C2523]'
            }`}
            title={
              language === 'fil'
                ? 'Grid Snap Rulers: Magpakita ng mga dinamikong ruler at crosshair habang tinututok ang mouse para madaling itugma sa mga butas ng Aida fabric (Pindutin ang [R])'
                : 'Grid Snap Alignment Guide: Dynamic perimeter rulers & Aida hole crosshair snap as you hover (Press [R])'
            }
          >
            <Ruler className={`w-3.5 h-3.5 ${gridSnapEnabled ? 'text-amber-300' : 'text-[#B88E3C]'}`} />
            <span>{language === 'fil' ? 'Grid Snap' : 'Grid Snap'}</span>
            {gridSnapEnabled && (
              <span className="font-mono text-[10px] bg-amber-900 text-amber-200 px-1 py-0.2 rounded border border-amber-400/40 font-bold">
                {pattern.fabricCount || 14}ct
              </span>
            )}
            {gridSnapEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse ml-0.5" />
            )}
          </button>

          {/* POMODORO TIMER TOGGLE */}
          <button
            type="button"
            onClick={() => setShowPomodoro(!showPomodoro)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
              showPomodoro
                ? 'bg-rose-100 text-rose-900 border-rose-300 ring-1 ring-rose-300'
                : 'bg-white text-[#5F554F] border-[#E8E1D5] hover:text-[#2C2523]'
            }`}
            title="Toggle Integrated Pomodoro Stitching Timer"
          >
            <span>🍅</span>
            <span>{language === 'fil' ? 'Pomodoro' : 'Pomodoro'}</span>
          </button>

          {/* Manual Stitch Editor Modal Trigger */}
          {onOpenManualEditor && (
            <button
              type="button"
              onClick={onOpenManualEditor}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-[#B88E3C] bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
              title={
                language === 'fil'
                  ? 'Manu-manong i-edit ang kulay ng mga tahi sa grid'
                  : 'Manually adjust stitch colors in the grid'
              }
            >
              <Paintbrush className="w-3.5 h-3.5 text-[#B88E3C]" />
              <span>{language === 'fil' ? 'Editor' : 'Edit Stitches'}</span>
            </button>
          )}

          {/* KEYBOARD SHORTCUTS QUICK CHEAT-SHEET BUTTON */}
          <button
            type="button"
            onClick={() => setShowKeyboardHelpModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-[#D7CBB9] bg-white hover:bg-[#FAF7F2] text-[#433936] transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
            title={
              language === 'fil'
                ? 'Buksan ang gabay sa mga keyboard shortcut (Arrow keys, Spacebar, Enter)'
                : 'Open keyboard shortcuts cheatsheet (Arrow keys, Spacebar, Enter)'
            }
          >
            <Keyboard className="w-3.5 h-3.5 text-[#B88E3C]" />
            <span className="hidden md:inline">
              {language === 'fil' ? 'Mga Shortcut' : 'Shortcuts'}
            </span>
            <span className="font-mono text-[10px] bg-[#FAF7F2] text-[#7A6E65] px-1 py-0.2 rounded border border-[#E8E1D5] font-bold">
              ?
            </span>
          </button>

          {/* BACKUP & RESTORE / EXPORT PROGRESS (JSON & CSV) */}
          <button
            type="button"
            onClick={() => setShowBackupModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-900 transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
            title={
              language === 'fil'
                ? 'I-backup at i-export ang progreso ng tahi (JSON / CSV) o i-import sa ibang device'
                : 'Backup and export stitch progress (JSON / CSV) or import from another device'
            }
          >
            <Database className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">
              {language === 'fil' ? 'Backup / Sync' : 'Backup & Sync'}
            </span>
            <span className="font-mono text-[10px] bg-white text-emerald-800 px-1 py-0.2 rounded border border-emerald-200 font-bold">
              {stitchedCells.size.toLocaleString()}
            </span>
          </button>

          {/* EXPORT PATTERN GRID AS HIGH-RES PNG / JPG */}
          <button
            type="button"
            onClick={() => setShowPatternImageExportModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-[#D7CBB9] bg-[#FAF7F2] hover:bg-[#F0ECE1] text-[#2C2523] transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
            title={
              language === 'fil'
                ? 'I-export ang pattern grid bilang high-quality PNG o JPG image'
                : 'Export the rendered pattern grid as a crisp PNG or JPG image'
            }
          >
            <Download className="w-3.5 h-3.5 text-[#B88E3C]" />
            <span>{language === 'fil' ? 'PNG / JPG' : 'Export Image'}</span>
          </button>

          {/* Standard Quick Stopwatch Timer */}
          <StitchSessionTimer
            pattern={pattern}
            stitchedCount={stitchedCells.size}
            sessionStitches={sessionStitches}
            onResetSessionStitches={onResetSessionStitches}
            language={language}
            compact={true}
            externalTimerData={externalTimerData}
            externalSessionSeconds={externalSessionSeconds}
            externalIsRunning={externalIsRunning}
            onExternalToggleTimer={onExternalToggleTimer}
          />
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#E8E1D5] shadow-2xs">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 text-[#5F554F] hover:text-[#2C2523] hover:bg-[#FAF7F2] rounded cursor-pointer transition-colors"
            title={language === 'fil' ? 'Zoom Out (Lumayo) [-]' : 'Zoom Out [-]'}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (Math.abs(zoom - 1.0) < 0.05) {
                handleFitToContainer();
              } else {
                handleSetExactZoom(1.0);
              }
            }}
            className="text-[11px] font-mono px-2 py-0.5 text-[#2C2523] hover:bg-[#FAF7F2] rounded font-bold transition-colors cursor-pointer min-w-[50px] text-center"
            title={language === 'fil' ? 'I-click para sa 100% / Fit [1 / 0]' : 'Click for 100% / Fit [1 / 0]'}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 text-[#5F554F] hover:text-[#2C2523] hover:bg-[#FAF7F2] rounded cursor-pointer transition-colors"
            title={language === 'fil' ? 'Zoom In (Lumapit) [+]' : 'Zoom In [+]'}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleFitToContainer}
            className="p-1.5 text-[#5F554F] hover:text-[#2C2523] hover:bg-[#FAF7F2] rounded ml-0.5 cursor-pointer transition-colors"
            title={language === 'fil' ? 'I-fit ang pattern sa screen [0]' : 'Fit pattern to screen [0]'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Integrated Pomodoro Focus Bar (Collapsible) */}
      {showPomodoro && (
        <div className="p-3 bg-[#FAF7F2] border-b border-[#E8E1D5] animate-fade-in">
          <PomodoroTimerWidget
            pattern={pattern}
            sessionStitches={sessionStitches}
            onResetSessionStitches={onResetSessionStitches}
            onLogToStreak={(stitches, minutes) => {
              if (onLogPomodoroSession) {
                onLogPomodoroSession(stitches, minutes);
              }
            }}
            language={language}
          />
        </div>
      )}

      {/* Filter notification banner if a color is isolated */}
      {activeColorFilter && (() => {
        const activeStat = pattern.colorStats.find((s) => s.color.code === activeColorFilter);
        return (
          <div className="bg-[#FAF2E1] px-4 py-2 border-b border-[#E8DFC9] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {smartHighlight ? (
                <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
              ) : (
                <Eye className="w-4 h-4 text-[#B88E3C]" />
              )}
              {activeStat && (
                <div
                  className="w-3.5 h-3.5 rounded-xs border border-black/20"
                  style={{ backgroundColor: activeStat.color.hex }}
                />
              )}
              <span className="text-[#2C2523] font-medium">
                {smartHighlight
                  ? language === 'fil'
                    ? 'Smart Highlight Aktibo:'
                    : 'Smart Highlight Active:'
                  : language === 'fil'
                  ? 'Naka-isolate ang kulay:'
                  : 'Active Highlight:'}{' '}
                <span className="font-bold font-mono">DMC {activeColorFilter}</span>
                {activeStat && (
                  <span className="text-[#7A6E65] ml-1">
                    ({activeStat.color.name} · {activeStat.count.toLocaleString()} stitches)
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSmartHighlight(!smartHighlight)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                  smartHighlight
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-white text-[#7A6E65] border-[#D7CBB9]'
                }`}
              >
                {smartHighlight ? '💡 Auto-Dim: ON' : 'Auto-Dim: OFF'}
              </button>

              <button
                onClick={() => onSelectColor(null)}
                className="text-xs text-[#7A6E65] hover:text-[#2C2523] underline cursor-pointer"
              >
                {language === 'fil' ? 'Ipakita ang Lahat ng Kulay' : 'Clear Isolation'}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Sticky Note / Annotate Mode Instruction Banner */}
      {annotateMode && (
        <div className="bg-amber-100/90 border-b border-amber-300 px-4 py-2 flex items-center justify-between text-xs text-amber-950 font-medium">
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-amber-700 animate-bounce" />
            <span>
              {language === 'fil'
                ? '📝 Sticky Note Mode Aktibo: I-click ang anumang coordinate sa grid upang magdagdag ng tip o paalala na lalabas bilang maliit na icon.'
                : '📝 Sticky Note Mode Active: Click any coordinate on the grid to add a tip or text annotation — it appears right on the grid as a Sticky Note icon.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAnnotateMode(false)}
            className="px-2.5 py-1 bg-amber-900 text-white rounded text-xs font-semibold hover:bg-amber-800 cursor-pointer"
          >
            {language === 'fil' ? 'Tapos na' : 'Exit Sticky Note Mode'}
          </button>
        </div>
      )}

      {/* Toast Notification for Snapshots */}
      {snapshotToast && (
        <div className="bg-emerald-800 text-white text-xs font-medium px-4 py-2 border-b border-emerald-900 flex items-center justify-between gap-2 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-300" />
            <span>{snapshotToast}</span>
          </div>
          {viewMode !== 'snapshots' && (
            <button
              type="button"
              onClick={() => setViewMode('snapshots')}
              className="text-[11px] underline font-bold hover:text-amber-200 cursor-pointer"
            >
              {language === 'fil' ? 'Tingnan ang Gallery →' : 'View Snapshots Gallery →'}
            </button>
          )}
        </div>
      )}

      {/* PROJECT SNAPSHOTS GALLERY VIEW */}
      {viewMode === 'snapshots' && (
        <div className="p-5 bg-[#FAF7F2] min-h-[460px] max-h-[620px] overflow-y-auto space-y-5">
          {/* Gallery Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E8E1D5] shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
                  <Camera className="w-4 h-4" />
                </div>
                <h4 className="font-serif text-lg font-bold text-[#2C2523]">
                  {language === 'fil' ? 'Project Snapshots & Milestones Gallery' : 'Project Snapshots & Milestones Gallery'}
                </h4>
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                  {snapshots.length} {snapshots.length === 1 ? 'milestone' : 'milestones'}
                </span>
              </div>
              <p className="text-xs text-[#7A6E65] mt-1">
                {language === 'fil'
                  ? 'I-save ang visual na progreso ng iyong pananahi sa bawat mahalagang yugto upang makita ang transpormasyon ng iyong disenyo.'
                  : 'Preserve visual milestone checkpoints as your wedding heirloom comes to life stitch by stitch.'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* EXPORT GIF / COLLAGE ACTION BUTTON */}
              {snapshots.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2C2523] hover:bg-[#433936] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                  title={
                    language === 'fil'
                      ? 'I-export bilang animated timelapse GIF o commemorative collage poster'
                      : 'Export saved snapshots as an animated timelapse GIF or commemorative collage'
                  }
                >
                  <Film className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {language === 'fil'
                      ? 'I-export ang GIF / Collage'
                      : 'Export GIF / Collage'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleTakeSnapshot()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{language === 'fil' ? 'Kumuha ng Bagong Snapshot' : 'Take New Snapshot'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('stitches')}
                className="px-3.5 py-2 text-xs text-[#5F554F] hover:text-[#2C2523] border border-[#E8DFC9] hover:bg-[#F2ECE1] rounded-lg transition-colors cursor-pointer"
              >
                {language === 'fil' ? 'Bumalik sa Grid' : 'Back to Grid'}
              </button>
            </div>
          </div>

          {/* Snapshots Cards Grid or Empty State */}
          {snapshots.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-xl border-2 border-dashed border-[#D7CBB9] space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Camera className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h5 className="font-serif text-base font-bold text-[#2C2523]">
                  {language === 'fil' ? 'Wala pang na-save na snapshot' : 'No milestone snapshots captured yet'}
                </h5>
                <p className="text-xs text-[#7A6E65]">
                  {language === 'fil'
                    ? 'Kumuha ng snapshot anumang oras upang i-save ang kasalukuyang hitsura ng iyong canvas bilang PNG at subaybayan ang iyong progreso.'
                    : 'Capture your stitched progress anytime to preserve milestone checkpoints as your wedding pattern develops.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTakeSnapshot()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2C2523] hover:bg-[#433936] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4 text-amber-400" />
                <span>{language === 'fil' ? 'Kumuha ng Unang Snapshot Ngayon' : 'Capture First Milestone Now'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {snapshots.map((snap) => {
                const isEditingThisNote = editingSnapshotNoteId === snap.id;
                return (
                  <div
                    key={snap.id}
                    className="bg-white border border-[#E8E1D5] hover:border-[#D7CBB9] rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
                  >
                    {/* Thumbnail Image Container */}
                    <div
                      onClick={() => setActiveLightboxSnapshot(snap)}
                      className="relative bg-[#FAF7F2] aspect-4/3 cursor-pointer overflow-hidden border-b border-[#F0ECE1] flex items-center justify-center group/thumb"
                    >
                      <img
                        src={snap.previewUrl}
                        alt={`Snapshot ${snap.dateFormatted}`}
                        className="w-full h-full object-contain p-2 group-hover/thumb:scale-105 transition-transform duration-200"
                      />

                      {/* Floating Percentage Badge */}
                      <div className="absolute top-2 left-2 bg-[#2C2523]/85 text-white backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 shadow-xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{snap.percentage.toFixed(1)}%</span>
                      </div>

                      {/* Floating Mode Tag */}
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        {snap.highContrast && (
                          <span className="bg-black text-white text-[9px] font-mono px-1.5 py-0.5 rounded shadow-xs">
                            B&W
                          </span>
                        )}
                        {snap.stitchSimulation && (
                          <span className="bg-[#3A2213] text-amber-200 text-[9px] font-mono px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                            🧵 SIM
                          </span>
                        )}
                        <span className="bg-white/90 text-[#5F554F] border border-[#E8E1D5] text-[9px] font-mono uppercase px-1.5 py-0.5 rounded shadow-xs">
                          {snap.viewMode}
                        </span>
                      </div>

                      {/* Hover Overlay Hint */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[1px]">
                        <ZoomIn className="w-4 h-4" />
                        <span>{language === 'fil' ? 'I-enlarge' : 'Enlarge'}</span>
                      </div>
                    </div>

                    {/* Card Content & Metadata */}
                    <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-[#7A6E65]">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#B88E3C]" />
                            <span className="font-mono">{snap.dateFormatted}</span>
                          </div>
                        </div>

                        {/* Stitched Count & Mini Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[#5F554F] font-bold">
                              {snap.stitchedCount.toLocaleString()}
                              <span className="text-[#8C8077] font-normal"> / {snap.totalStitches.toLocaleString()}</span>
                            </span>
                            <span className="text-[11px] text-[#7A6E65]">
                              {language === 'fil' ? 'tahi' : 'stitches'}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#EAE2D5] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, snap.percentage))}%` }}
                            />
                          </div>
                        </div>

                        {/* Editable Milestone Note */}
                        <div className="pt-1">
                          {isEditingThisNote ? (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                value={editingNoteValue}
                                onChange={(e) => setEditingNoteValue(e.target.value)}
                                placeholder={language === 'fil' ? 'Maglagay ng tala...' : 'Add milestone note...'}
                                className="w-full text-xs px-2 py-1 border border-[#B88E3C] rounded bg-[#FAF7F2] text-[#2C2523] focus:outline-hidden"
                                autoFocus
                              />
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingSnapshotNoteId(null)}
                                  className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveSnapshotNote(snap.id, editingNoteValue)}
                                  className="p-1 text-emerald-700 hover:text-emerald-900 cursor-pointer"
                                  title="Save Note"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-1 group/note">
                              <p className="text-xs text-[#2C2523] leading-snug italic line-clamp-2">
                                {snap.note || (language === 'fil' ? 'Walang tala' : 'No milestone note')}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSnapshotNoteId(snap.id);
                                  setEditingNoteValue(snap.note || '');
                                }}
                                className="p-1 text-[#8C8077] hover:text-[#2C2523] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                                title="Edit note"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 border-t border-[#F0ECE1] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveLightboxSnapshot(snap)}
                          className="text-[11px] font-semibold text-[#5F554F] hover:text-[#2C2523] flex items-center gap-1 cursor-pointer"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          <span>{language === 'fil' ? 'Tingnan' : 'View'}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadSnapshot(snap)}
                            className="p-1.5 text-[#5F554F] hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                            title={language === 'fil' ? 'I-download ang PNG' : 'Download PNG'}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const confirmDel = window.confirm(
                                language === 'fil'
                                  ? 'Sigurado ka bang nais mong burahin ang snapshot na ito?'
                                  : 'Are you sure you want to delete this snapshot?'
                              );
                              if (confirmDel) handleDeleteSnapshot(snap.id);
                            }}
                            className="p-1.5 text-[#8C8077] hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title={language === 'fil' ? 'Burahin' : 'Delete snapshot'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Canvas Viewport with Touch Gestures & Pinch-to-Zoom */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={`${
          viewMode === 'snapshots'
            ? 'hidden'
            : 'relative flex-1 min-h-[440px] max-h-[580px] overflow-hidden bg-[#FAF7F2] select-none touch-none'
        } ${
          annotateMode
            ? 'cursor-crosshair'
            : hoopEnabled && hoopMoveMode
            ? isDraggingHoop
              ? 'cursor-grabbing'
              : 'cursor-move'
            : isPanning || isGestureActive
            ? 'cursor-grabbing'
            : 'cursor-grab'
        }`}
        style={{ touchAction: 'none' }}
      >
        <div
          className={`absolute origin-top-left ${
            isGestureActive || isPanning || gridSnapEnabled
              ? 'transition-none'
              : 'transition-transform duration-100 ease-out'
          }`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setIsDraggingHoop(false);
              setIsPanning(false);
              if (isDraggingToMark) {
                setIsDraggingToMark(false);
                flushDragHistory();
              }
              setHoveredCell(null);
              setHoveredAnnotation(null);
            }}
            className="shadow-md rounded border border-[#E0D7C9]"
          />
        </div>

        {/* GRID SNAP ALIGNMENT GUIDE & DYNAMIC AIDA RULERS OVERLAY */}
        {gridSnapEnabled && (() => {
          const RULER_LEFT = 36;
          const RULER_TOP = 26;
          const cellPx = baseCellSize * zoom;
          const fabricCt = pattern.fabricCount || 14;
          const centerX = Math.floor(pattern.width / 2);
          const centerY = Math.floor(pattern.height / 2);
          const patternLeft = pan.x;
          const patternTop = pan.y;
          const patternRight = pan.x + pattern.width * cellPx;
          const patternBottom = pan.y + pattern.height * cellPx;

          // Choose adaptive tick step sizes cleanly so ruler labels never collide
          const minorStep =
            cellPx >= 14 ? 1 : cellPx >= 5 ? 5 : cellPx >= 2 ? 10 : 25;
          const majorStep =
            cellPx >= 24 ? 5 : cellPx >= 5 ? 10 : cellPx >= 2.2 ? 20 : 50;

          const startCol = Math.max(0, Math.floor((RULER_LEFT - pan.x) / cellPx) - 1);
          const endCol = Math.min(
            pattern.width,
            Math.ceil((viewportSize.width - pan.x) / cellPx) + 1
          );
          const startRow = Math.max(0, Math.floor((RULER_TOP - pan.y) / cellPx) - 1);
          const endRow = Math.min(
            pattern.height,
            Math.ceil((viewportSize.height - pan.y) / cellPx) + 1
          );

          const target = hoveredCell
            ? { x: hoveredCell.x - 1, y: hoveredCell.y - 1 }
            : keyboardCursor
            ? { x: keyboardCursor.x, y: keyboardCursor.y }
            : null;

          const formatCoordLabel = (idx: number, isX: boolean) => {
            if (gridSnapOrigin === 'center') {
              const delta = idx - (isX ? centerX : centerY);
              return delta > 0 ? `+${delta}` : `${delta}`;
            }
            return `${idx}`;
          };

          const formatPhysicalDist = (stitches: number) => {
            const inches = stitches / fabricCt;
            if (gridSnapUnit === 'cm') {
              return `${(inches * 2.54).toFixed(1)}cm`;
            }
            return `${inches.toFixed(2)}"`;
          };

          // Build visible tick arrays aligned relative to active origin (0 in Corner mode, centerX/centerY in Center mode)
          const originX = gridSnapOrigin === 'center' ? centerX : 0;
          const originY = gridSnapOrigin === 'center' ? centerY : 0;

          const xTicks: { idx: number; x: number; isMajor: boolean; isTen: boolean; isCenter: boolean }[] = [];
          const firstRelCol = Math.floor((startCol - originX) / minorStep) * minorStep;
          for (let col = originX + firstRelCol; col <= endCol; col += minorStep) {
            if (col < 0) continue;
            const rel = col - originX;
            const isMajor = Math.abs(rel) % majorStep === 0;
            const isTen = Math.abs(rel) % 10 === 0;
            const isCenter = col === centerX;
            xTicks.push({
              idx: col,
              x: pan.x + col * cellPx,
              isMajor,
              isTen,
              isCenter,
            });
          }

          const yTicks: { idx: number; y: number; isMajor: boolean; isTen: boolean; isCenter: boolean }[] = [];
          const firstRelRow = Math.floor((startRow - originY) / minorStep) * minorStep;
          for (let row = originY + firstRelRow; row <= endRow; row += minorStep) {
            if (row < 0) continue;
            const rel = row - originY;
            const isMajor = Math.abs(rel) % majorStep === 0;
            const isTen = Math.abs(rel) % 10 === 0;
            const isCenter = row === centerY;
            yTicks.push({
              idx: row,
              y: pan.y + row * cellPx,
              isMajor,
              isTen,
              isCenter,
            });
          }

          // Active snapped target screen geometry
          const snapLeft = target ? pan.x + target.x * cellPx : 0;
          const snapTop = target ? pan.y + target.y * cellPx : 0;
          const snapCenterX = target ? snapLeft + cellPx * 0.5 : 0;
          const snapCenterY = target ? snapTop + cellPx * 0.5 : 0;

          // Active 10x10 Aida Block bounds
          const blockCol = target ? Math.floor(target.x / 10) : 0;
          const blockRow = target ? Math.floor(target.y / 10) : 0;
          const blockLeft = pan.x + blockCol * 10 * cellPx;
          const blockTop = pan.y + blockRow * 10 * cellPx;
          const blockWidth = Math.min(10, pattern.width - blockCol * 10) * cellPx;
          const blockHeight = Math.min(10, pattern.height - blockRow * 10) * cellPx;
          const inBlockX = target ? (target.x % 10) + 1 : 1;
          const inBlockY = target ? (target.y % 10) + 1 : 1;

          // Physical coordinates relative to chosen origin
          const rawDistX = target
            ? gridSnapOrigin === 'center'
              ? target.x - centerX
              : target.x + 1
            : 0;
          const rawDistY = target
            ? gridSnapOrigin === 'center'
              ? target.y - centerY
              : target.y + 1
            : 0;

          // Callout box auto-placement so it never clips off edges
          const calloutFlipX = snapCenterX > viewportSize.width - 205;
          const calloutFlipY = snapCenterY < RULER_TOP + 68;
          const calloutX = calloutFlipX
            ? Math.max(RULER_LEFT + 6, snapLeft - 172)
            : Math.min(viewportSize.width - 174, snapLeft + cellPx + 10);
          const calloutY = calloutFlipY
            ? Math.min(viewportSize.height - 56, snapTop + cellPx + 10)
            : Math.max(RULER_TOP + 6, snapTop - 48);

          return (
            <>
              {/* On-Canvas Crosshair Sightlines, 10x10 Aida Block Bracket & Snapped Hole Frame */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                aria-hidden="true"
              >
                {target && (
                  <>
                    {/* Full-row & full-column soft sightline bands bounded to pattern */}
                    <rect
                      x={Math.max(RULER_LEFT, patternLeft)}
                      y={snapTop}
                      width={Math.max(
                        0,
                        Math.min(viewportSize.width, patternRight) - Math.max(RULER_LEFT, patternLeft)
                      )}
                      height={Math.max(1, cellPx)}
                      fill="rgba(217, 119, 6, 0.11)"
                    />
                    <rect
                      x={snapLeft}
                      y={Math.max(RULER_TOP, patternTop)}
                      width={Math.max(1, cellPx)}
                      height={Math.max(
                        0,
                        Math.min(viewportSize.height, patternBottom) - Math.max(RULER_TOP, patternTop)
                      )}
                      fill="rgba(217, 119, 6, 0.11)"
                    />

                    {/* Active 10x10 Gridded Aida Block Outline */}
                    <rect
                      x={blockLeft}
                      y={blockTop}
                      width={blockWidth}
                      height={blockHeight}
                      fill="none"
                      stroke="rgba(184, 142, 60, 0.72)"
                      strokeWidth={1.25}
                      strokeDasharray="4 3"
                    />

                    {/* Dynamic alignment hairlines extending directly to Top & Left rulers */}
                    <line
                      x1={snapCenterX}
                      y1={RULER_TOP}
                      x2={snapCenterX}
                      y2={viewportSize.height}
                      stroke="rgba(180, 83, 9, 0.65)"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={RULER_LEFT}
                      y1={snapCenterY}
                      x2={viewportSize.width}
                      y2={snapCenterY}
                      stroke="rgba(180, 83, 9, 0.65)"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />

                    {/* Snapped Stitch Cell Frame */}
                    <rect
                      x={snapLeft}
                      y={snapTop}
                      width={Math.max(2, cellPx)}
                      height={Math.max(2, cellPx)}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth={2.5}
                    />
                    <rect
                      x={snapLeft}
                      y={snapTop}
                      width={Math.max(2, cellPx)}
                      height={Math.max(2, cellPx)}
                      fill="none"
                      stroke="#D97706"
                      strokeWidth={1.5}
                    />

                    {/* 4 Physical Aida Corner Hole Pinpricks when zoomed in */}
                    {cellPx >= 9 && (
                      <>
                        {[
                          [snapLeft, snapTop],
                          [snapLeft + cellPx, snapTop],
                          [snapLeft, snapTop + cellPx],
                          [snapLeft + cellPx, snapTop + cellPx],
                        ].map(([hx, hy], hIdx) => (
                          <g key={hIdx}>
                            <circle
                              cx={hx}
                              cy={hy}
                              r={cellPx >= 20 ? 3.2 : 2.3}
                              fill="#FEF3C7"
                              stroke="#92400E"
                              strokeWidth={1}
                            />
                          </g>
                        ))}
                      </>
                    )}

                    {/* Floating Intra-Block & Physical Fabric Callout Tag */}
                    <g transform={`translate(${calloutX}, ${calloutY})`}>
                      <rect
                        x={0}
                        y={0}
                        width={164}
                        height={38}
                        rx={6}
                        fill="rgba(28, 25, 23, 0.92)"
                        stroke="rgba(245, 158, 11, 0.65)"
                        strokeWidth={1}
                      />
                      <text
                        x={8}
                        y={14}
                        fill="#FDE68A"
                        fontSize={10}
                        fontWeight={700}
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      >
                        {`B[${blockCol + 1},${blockRow + 1}] · +${inBlockX}→ +${inBlockY}↓`}
                      </text>
                      <text
                        x={8}
                        y={29}
                        fill="#E7E5E4"
                        fontSize={9.5}
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      >
                        {`${rawDistX >= 0 && gridSnapOrigin === 'center' ? '+' : ''}${formatPhysicalDist(
                          rawDistX
                        )} , ${rawDistY >= 0 && gridSnapOrigin === 'center' ? '+' : ''}${formatPhysicalDist(
                          rawDistY
                        )} (${fabricCt}ct)`}
                      </text>
                    </g>
                  </>
                )}
              </svg>

              {/* Corner Intersection Origin & Unit Quick Switch */}
              <button
                type="button"
                onClick={() => setGridSnapUnit((prev) => (prev === 'in' ? 'cm' : 'in'))}
                className="absolute top-0 left-0 w-[36px] h-[26px] z-30 bg-[#2C2523] hover:bg-[#433936] text-[#FDE68A] border-r border-b border-[#B88E3C]/60 flex flex-col items-center justify-center leading-none cursor-pointer transition-colors"
                title={
                  language === 'fil'
                    ? 'Magpalit ng yunit (pulgada / sentimetro)'
                    : 'Toggle ruler physical Aida units (inches / cm)'
                }
              >
                <span className="font-mono text-[9px] font-bold uppercase">{gridSnapUnit}</span>
                <span className="font-mono text-[7.5px] text-amber-200/80">{fabricCt}ct</span>
              </button>

              {/* Top Dynamic Horizontal Stitch Ruler */}
              <div className="absolute top-0 left-[36px] right-0 h-[26px] z-20 bg-[#FAF7F2]/95 backdrop-blur-xs border-b border-[#D7CBB9] pointer-events-none overflow-hidden shadow-2xs">
                <svg className="w-full h-full" aria-hidden="true">
                  {/* Pattern horizontal extent indicator */}
                  <rect
                    x={Math.max(0, patternLeft - RULER_LEFT)}
                    y={0}
                    width={Math.max(0, patternRight - Math.max(RULER_LEFT, patternLeft))}
                    height={26}
                    fill="rgba(184, 142, 60, 0.08)"
                  />

                  {/* Dynamic Adaptive Ticks */}
                  {xTicks.map((t) => {
                    const rx = t.x - RULER_LEFT;
                    if (rx < -20 || rx > viewportSize.width) return null;
                    const tickH = t.isCenter && gridSnapOrigin === 'center' ? 18 : t.isMajor ? 14 : t.isTen ? 11 : 6;
                    return (
                      <g key={t.idx}>
                        <line
                          x1={rx}
                          y1={26 - tickH}
                          x2={rx}
                          y2={26}
                          stroke={
                            t.isCenter && gridSnapOrigin === 'center'
                              ? '#DC2626'
                              : t.isTen
                              ? '#785E3A'
                              : '#A89B8C'
                          }
                          strokeWidth={t.isMajor || t.isTen ? 1.2 : 0.8}
                        />
                        {(t.isMajor || (t.isCenter && gridSnapOrigin === 'center')) && (
                          <text
                            x={rx + 3}
                            y={11}
                            fill={
                              t.isCenter && gridSnapOrigin === 'center'
                                ? '#B91C1C'
                                : '#433936'
                            }
                            fontSize={9.5}
                            fontWeight={t.isTen || t.isCenter ? 700 : 500}
                            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                          >
                            {formatCoordLabel(t.idx, true)}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Active Sliding Column Needle & Coordinate Badge */}
                  {target && snapCenterX >= RULER_LEFT && (
                    <g>
                      <rect
                        x={snapLeft - RULER_LEFT}
                        y={0}
                        width={Math.max(2, cellPx)}
                        height={26}
                        fill="rgba(245, 158, 11, 0.28)"
                      />
                      <polygon
                        points={`${snapCenterX - RULER_LEFT - 4},19 ${snapCenterX - RULER_LEFT + 4},19 ${snapCenterX - RULER_LEFT},26`}
                        fill="#B45309"
                      />
                      <rect
                        x={Math.min(
                          viewportSize.width - RULER_LEFT - 56,
                          Math.max(2, snapCenterX - RULER_LEFT - 24)
                        )}
                        y={2}
                        width={52}
                        height={15}
                        rx={3}
                        fill="#78350F"
                      />
                      <text
                        x={Math.min(
                          viewportSize.width - RULER_LEFT - 30,
                          Math.max(28, snapCenterX - RULER_LEFT + 2)
                        )}
                        y={12.5}
                        textAnchor="middle"
                        fill="#FEF3C7"
                        fontSize={9.5}
                        fontWeight={700}
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      >
                        {gridSnapOrigin === 'center'
                          ? `X${target.x - centerX >= 0 ? '+' : ''}${target.x - centerX}`
                          : `X:${target.x + 1}`}
                      </text>
                    </g>
                  )}
                </svg>
              </div>

              {/* Left Dynamic Vertical Stitch Ruler */}
              <div className="absolute top-[26px] left-0 bottom-0 w-[36px] z-20 bg-[#FAF7F2]/95 backdrop-blur-xs border-r border-[#D7CBB9] pointer-events-none overflow-hidden shadow-2xs">
                <svg className="w-full h-full" aria-hidden="true">
                  {/* Pattern vertical extent indicator */}
                  <rect
                    x={0}
                    y={Math.max(0, patternTop - RULER_TOP)}
                    width={36}
                    height={Math.max(0, patternBottom - Math.max(RULER_TOP, patternTop))}
                    fill="rgba(184, 142, 60, 0.08)"
                  />

                  {/* Dynamic Adaptive Ticks */}
                  {yTicks.map((t) => {
                    const ry = t.y - RULER_TOP;
                    if (ry < -20 || ry > viewportSize.height) return null;
                    const tickW = t.isCenter && gridSnapOrigin === 'center' ? 18 : t.isMajor ? 12 : t.isTen ? 9 : 5;
                    return (
                      <g key={t.idx}>
                        <line
                          x1={36 - tickW}
                          y1={ry}
                          x2={36}
                          y2={ry}
                          stroke={
                            t.isCenter && gridSnapOrigin === 'center'
                              ? '#DC2626'
                              : t.isTen
                              ? '#785E3A'
                              : '#A89B8C'
                          }
                          strokeWidth={t.isMajor || t.isTen ? 1.2 : 0.8}
                        />
                        {(t.isMajor || (t.isCenter && gridSnapOrigin === 'center')) && (
                          <text
                            x={23}
                            y={ry + 9}
                            textAnchor="end"
                            fill={
                              t.isCenter && gridSnapOrigin === 'center'
                                ? '#B91C1C'
                                : '#433936'
                            }
                            fontSize={9}
                            fontWeight={t.isTen || t.isCenter ? 700 : 500}
                            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                          >
                            {formatCoordLabel(t.idx, false)}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Active Sliding Row Needle & Coordinate Badge */}
                  {target && snapCenterY >= RULER_TOP && (
                    <g>
                      <rect
                        x={0}
                        y={snapTop - RULER_TOP}
                        width={36}
                        height={Math.max(2, cellPx)}
                        fill="rgba(245, 158, 11, 0.28)"
                      />
                      <polygon
                        points={`29,${snapCenterY - RULER_TOP - 4} 29,${snapCenterY - RULER_TOP + 4} 36,${snapCenterY - RULER_TOP}`}
                        fill="#B45309"
                      />
                      <rect
                        x={2}
                        y={Math.min(
                          viewportSize.height - RULER_TOP - 18,
                          Math.max(2, snapCenterY - RULER_TOP - 8)
                        )}
                        width={27}
                        height={15}
                        rx={3}
                        fill="#78350F"
                      />
                      <text
                        x={15.5}
                        y={Math.min(
                          viewportSize.height - RULER_TOP - 7.5,
                          Math.max(12.5, snapCenterY - RULER_TOP + 2.5)
                        )}
                        textAnchor="middle"
                        fill="#FEF3C7"
                        fontSize={8.5}
                        fontWeight={700}
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      >
                        {gridSnapOrigin === 'center'
                          ? `${target.y - centerY >= 0 ? '+' : ''}${target.y - centerY}`
                          : `${target.y + 1}`}
                      </text>
                    </g>
                  )}
                </svg>
              </div>
            </>
          );
        })()}

        {/* Top-Left Status HUD: Keyboard Cursor, Stitch Density Heatmap Legend, Stitch Simulation & Reveal HUD */}
        <div
          className={`absolute z-20 flex flex-col items-start gap-2 pointer-events-auto ${
            gridSnapEnabled ? 'top-9 left-11' : 'top-3 left-3'
          }`}
        >
          {gridSnapEnabled && (
            <div className="bg-amber-950/92 text-amber-50 backdrop-blur-md border border-amber-400/50 rounded-lg px-2.5 py-1.5 shadow-lg flex flex-wrap items-center gap-2 text-[11px] animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <strong className="text-amber-200">
                  {language === 'fil' ? 'Grid Snap' : 'Grid Snap'}
                </strong>
              </div>
              <div className="flex items-center bg-white/10 rounded p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setGridSnapOrigin('corner')}
                  className={`px-1.5 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                    gridSnapOrigin === 'corner'
                      ? 'bg-amber-500 text-amber-950'
                      : 'text-amber-100 hover:bg-white/10'
                  }`}
                >
                  {language === 'fil' ? 'Sulok (1,1)' : 'Corner (1,1)'}
                </button>
                <button
                  type="button"
                  onClick={() => setGridSnapOrigin('center')}
                  className={`px-1.5 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                    gridSnapOrigin === 'center'
                      ? 'bg-amber-500 text-amber-950'
                      : 'text-amber-100 hover:bg-white/10'
                  }`}
                >
                  {language === 'fil' ? 'Gitna (±0)' : 'Center (±0)'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setGridSnapUnit((prev) => (prev === 'in' ? 'cm' : 'in'))}
                className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-amber-100 font-mono text-[10px] font-bold cursor-pointer transition-colors"
                title={language === 'fil' ? 'Magpalit ng pulgada o cm' : 'Switch between inches and cm'}
              >
                {gridSnapUnit === 'in' ? 'Inches (")' : 'Metric (cm)'}
              </button>
              <button
                type="button"
                onClick={toggleGridSnap}
                className="p-0.5 rounded text-amber-300/70 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                title={language === 'fil' ? 'Isara ang Grid Snap [R]' : 'Turn off Grid Snap [R]'}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {ghostMode && (
            <div className="bg-slate-900/92 text-slate-100 backdrop-blur-md border border-purple-400/50 rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-2 text-[11px] animate-in fade-in duration-150">
              <Ghost className="w-3.5 h-3.5 text-purple-300 shrink-0" />
              <span>
                <strong className="text-purple-200">
                  {language === 'fil' ? 'Ghost Mode:' : 'Ghost Mode:'}
                </strong>{' '}
                {language === 'fil'
                  ? `${stitchedCells.size.toLocaleString()} natapos na tahi nasa 20% opacity`
                  : `${stitchedCells.size.toLocaleString()} completed stitches at 20% opacity`}
              </span>
              <button
                type="button"
                onClick={toggleGhostMode}
                className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                title={language === 'fil' ? 'I-off ang Ghost Mode [D]' : 'Turn off Ghost Mode [D]'}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {(viewMode === 'heatmap' || heatmapOverlayEnabled) && (
            <div className="bg-[#1C1917]/94 text-[#FAF7F2] backdrop-blur-md border border-orange-500/50 rounded-lg p-3 shadow-xl w-[300px] sm:w-[340px] space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span className="font-serif font-bold text-xs text-amber-200 truncate">
                    {language === 'fil' ? 'Heatmap ng Densidad ng Tahi' : 'Interactive Intensity Heatmap'}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-mono text-[10px] font-bold bg-red-600/80 text-white px-1.5 py-0.5 rounded">
                    {densityAnalysis.highPct}% {language === 'fil' ? 'Siksik' : 'Dense'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setHeatmapOverlayEnabled(false);
                      if (viewMode === 'heatmap') setViewMode('stitches');
                    }}
                    className="p-0.5 rounded text-stone-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                    title={language === 'fil' ? 'Isara ang Heatmap [H]' : 'Close Heatmap [H]'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Perceptual Thermal Ramp Bar */}
              <div className="space-y-1">
                <div className="w-full h-2 rounded-full bg-gradient-to-r from-[#1E3A8A] via-[#0D9488] via-[#F59E0B] via-[#EA580C] to-[#DC2626] border border-white/20" />
                <div className="flex items-center justify-between text-[9px] font-mono text-stone-300">
                  <span className="text-sky-300">
                    {language === 'fil' ? `Maluwag (${densityAnalysis.lowPct}%)` : `Sparse (${densityAnalysis.lowPct}%)`}
                  </span>
                  <span>
                    {language === 'fil' ? `Katamtaman (${densityAnalysis.moderatePct}%)` : `Moderate (${densityAnalysis.moderatePct}%)`}
                  </span>
                  <span className="text-orange-300 font-bold">
                    {language === 'fil' ? `Siksik (${densityAnalysis.highPct}%)` : `Dense (${densityAnalysis.highPct}%)`}
                  </span>
                </div>
              </div>

              {/* Overlay Opacity Control (when layered over Stitch/Symbol/Block Grid) */}
              {viewMode !== 'heatmap' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-stone-300">
                    <span>{language === 'fil' ? 'Linaw ng Heatmap Overlay' : 'Grid Overlay Opacity'}</span>
                    <span className="font-mono font-bold text-orange-300">{heatmapOverlayOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={90}
                    step={5}
                    value={heatmapOverlayOpacity}
                    onChange={(e) => setHeatmapOverlayOpacity(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-orange-400"
                    aria-label={language === 'fil' ? 'Opacity ng heatmap overlay' : 'Heatmap overlay opacity'}
                  />
                </div>
              )}

              {/* Intensity Tier Filter for Project Planning */}
              <div className="grid grid-cols-3 gap-1 bg-white/5 p-0.5 rounded-md border border-white/10 text-[10px]">
                {([
                  { id: 'all' as const, label: language === 'fil' ? 'Lahat' : 'All Zones' },
                  { id: 'dense' as const, label: language === 'fil' ? '🔥 Siksik ≥60%' : '🔥 Dense ≥60%' },
                  { id: 'sparse' as const, label: language === 'fil' ? '🌊 Maluwag' : '🌊 Sparse BG' },
                ]).map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => {
                      setHeatmapFocusTier(tier.id);
                      setHeatmapHotspotsOnly(tier.id === 'dense');
                    }}
                    className={`py-1 px-1.5 rounded font-semibold cursor-pointer transition-colors ${
                      heatmapFocusTier === tier.id
                        ? tier.id === 'dense'
                          ? 'bg-red-600 text-white'
                          : tier.id === 'sparse'
                          ? 'bg-sky-700 text-white'
                          : 'bg-orange-600 text-white'
                        : 'text-stone-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>

              {/* Mode Switch & Planning Jump Controls */}
              <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-white/10 text-[10px]">
                {viewMode === 'heatmap' ? (
                  <button
                    type="button"
                    onClick={() => setHeatmapStyle((prev) => (prev === 'thermal' ? 'blended' : 'thermal'))}
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[#FAF7F2] font-medium cursor-pointer transition-colors"
                  >
                    {heatmapStyle === 'thermal'
                      ? language === 'fil' ? '🌡️ Purong Thermal' : '🌡️ Pure Thermal'
                      : language === 'fil' ? '🎨 Disenyo + Heat' : '🎨 Pattern + Heat'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('heatmap');
                      setHeatmapOverlayEnabled(false);
                    }}
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[#FAF7F2] font-medium cursor-pointer transition-colors"
                  >
                    {language === 'fil' ? '🌡️ Buong Thermal View' : '🌡️ Full Thermal View'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const target =
                      heatmapFocusTier === 'sparse'
                        ? densityAnalysis.peakSparseCoord
                        : densityAnalysis.peakDenseCoord;
                    setJumpHighlight(target);
                    ensureCellInView(target.x, target.y);
                  }}
                  className="px-2 py-1 rounded bg-orange-500/20 hover:bg-orange-500/35 text-orange-200 border border-orange-400/30 font-semibold cursor-pointer transition-colors"
                  title={
                    language === 'fil'
                      ? 'Itutok sa pinaka-matinding bahagi para sa pagpaplano'
                      : 'Jump to peak dense or sparse area for project planning'
                  }
                >
                  {heatmapFocusTier === 'sparse'
                    ? language === 'fil' ? '📍 Puntahan Maluwag' : '📍 Find Sparse'
                    : language === 'fil' ? '📍 Puntahan Hotspot' : '📍 Peak Hotspot'}
                </button>
              </div>
            </div>
          )}
          {previewMode && (
            <div className="bg-[#0F172A]/92 text-[#FAF7F2] backdrop-blur-md border border-sky-400/50 rounded-lg p-3 shadow-xl w-[285px] sm:w-[315px] space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <PenTool className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="font-serif font-bold text-xs text-sky-200 truncate">
                    {language === 'fil' ? 'Preview Mode · Sketch Filter' : 'Preview Mode · Sketch'}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-mono text-[10px] font-bold bg-sky-500/25 text-sky-200 border border-sky-400/30 px-1.5 py-0.5 rounded">
                    {overlayImageObj
                      ? language === 'fil' ? 'Larawan' : 'Photo'
                      : language === 'fil' ? 'Pattern' : 'Grid'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewMode(false)}
                    className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                    title={language === 'fil' ? 'Isara ang Preview Mode' : 'Exit Preview Mode'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-300">
                  <span>{language === 'fil' ? 'Kontrast ng Sketch' : 'Sketch Line Contrast'}</span>
                  <span className="font-mono font-bold text-sky-300">{sketchContrast}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  step={5}
                  value={sketchContrast}
                  onChange={(e) => setSketchContrast(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  aria-label={language === 'fil' ? 'Kontrast ng sketch filter' : 'Sketch filter contrast'}
                />
              </div>

              <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-white/10 text-[10px]">
                <button
                  type="button"
                  onClick={() => setPreviewShowSymbols((prev) => !prev)}
                  className={`px-2 py-1 rounded font-semibold cursor-pointer transition-colors ${
                    previewShowSymbols
                      ? 'bg-sky-500 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-slate-200'
                  }`}
                >
                  {previewShowSymbols
                    ? language === 'fil' ? '🔤 Simbolo: ON' : '🔤 Symbols: ON'
                    : language === 'fil' ? '🔤 Simbolo: OFF' : '🔤 Symbols: OFF'}
                </button>
                <button
                  type="button"
                  onClick={() => overlayFileInputRef.current?.click()}
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-sky-100 font-semibold cursor-pointer transition-colors flex items-center gap-1"
                  title={
                    language === 'fil'
                      ? 'Mag-upload ng orihinal na larawan para i-apply ang sketch filter'
                      : 'Upload original wedding photo to apply sketch filter'
                  }
                >
                  <Upload className="w-2.5 h-2.5" />
                  <span>
                    {overlayImageObj
                      ? language === 'fil' ? 'Palitan Larawan' : 'Swap Photo'
                      : language === 'fil' ? 'Upload Larawan' : 'Upload Photo'}
                  </span>
                </button>
              </div>
            </div>
          )}
          {hoopEnabled && (
            <div className="bg-[#1C1917]/94 text-[#FAF7F2] backdrop-blur-md border border-amber-400/50 rounded-lg p-3 shadow-xl w-[300px] sm:w-[330px] space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Disc className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-serif font-bold text-xs text-amber-200 truncate">
                    {language === 'fil' ? 'Embroidery Hoop Simulator' : 'Hoop Simulator'}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(() => {
                    const fabricCt = pattern.fabricCount || 14;
                    const ovalDims: Record<'4x6' | '5x7' | '6x9' | '8x10', [number, number]> = {
                      '4x6': [4, 6],
                      '5x7': [5, 7],
                      '6x9': [6, 9],
                      '8x10': [8, 10],
                    };
                    const [wIn, hIn] =
                      hoopShape === 'circle' ? [hoopSizeInches, hoopSizeInches] : ovalDims[hoopOvalSize];
                    return (
                      <span className="font-mono text-[10px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30 px-1.5 py-0.5 rounded">
                        {Math.round(wIn * fabricCt)}×{Math.round(hIn * fabricCt)} sts · {fabricCt}ct
                      </span>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={toggleHoopSimulator}
                    className="p-0.5 rounded text-stone-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                    title={language === 'fil' ? 'Isara ang Hoop Simulator' : 'Close Hoop Simulator'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Shape Selector: Circle vs Oval */}
              <div className="grid grid-cols-2 gap-1 bg-white/5 p-0.5 rounded-md border border-white/10 text-[11px]">
                <button
                  type="button"
                  onClick={() => setHoopShape('circle')}
                  className={`py-1 rounded font-semibold cursor-pointer transition-colors ${
                    hoopShape === 'circle'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {language === 'fil' ? '⭕ Bilog (Circle)' : '⭕ Circle'}
                </button>
                <button
                  type="button"
                  onClick={() => setHoopShape('oval')}
                  className={`py-1 rounded font-semibold cursor-pointer transition-colors ${
                    hoopShape === 'oval'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {language === 'fil' ? '⬭ Hugis-Itlog (Oval)' : '⬭ Oval'}
                </button>
              </div>

              {/* Hoop Size Selector */}
              <div className="space-y-1">
                <span className="text-[10px] text-stone-300 font-medium block">
                  {language === 'fil' ? 'Laki ng Bastidor (Pulgada)' : 'Hoop Size (Inches)'}
                </span>
                {hoopShape === 'circle' ? (
                  <div className="grid grid-cols-7 gap-1">
                    {[4, 5, 6, 7, 8, 10, 12].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setHoopSizeInches(sz)}
                        className={`py-1 rounded font-mono text-[10px] font-bold cursor-pointer transition-colors border ${
                          hoopSizeInches === sz
                            ? 'bg-amber-500 text-[#1C1917] border-amber-300'
                            : 'bg-white/10 hover:bg-white/20 text-stone-200 border-white/10'
                        }`}
                      >
                        {sz}"
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1">
                    {(['4x6', '5x7', '6x9', '8x10'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setHoopOvalSize(sz)}
                        className={`py-1 rounded font-mono text-[10px] font-bold cursor-pointer transition-colors border ${
                          hoopOvalSize === sz
                            ? 'bg-amber-500 text-[#1C1917] border-amber-300'
                            : 'bg-white/10 hover:bg-white/20 text-stone-200 border-white/10'
                        }`}
                      >
                        {sz.replace('x', '×')}"
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Rotation Controls */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-stone-300">
                  <span className="flex items-center gap-1">
                    <RotateCw className="w-3 h-3 text-amber-400" />
                    <span>{language === 'fil' ? 'Pag-ikot (Rotation)' : 'Rotation'}</span>
                  </span>
                  <span className="font-mono font-bold text-amber-300">{hoopRotation}°</span>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={1}
                  value={hoopRotation}
                  onChange={(e) => setHoopRotation(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  aria-label={language === 'fil' ? 'Pag-ikot ng hoop' : 'Hoop rotation'}
                />
                <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
                  {[-45, 0, 45, 90].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => setHoopRotation(deg)}
                      className={`py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                        hoopRotation === deg
                          ? 'bg-amber-600 text-white'
                          : 'bg-white/10 hover:bg-white/20 text-stone-300'
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Position Drag & Nudge Controls */}
              <div className="space-y-1.5 pt-1 border-t border-white/10">
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHoopMoveMode((prev) => !prev)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                      hoopMoveMode
                        ? 'bg-amber-500 text-[#1C1917] ring-1 ring-amber-200'
                        : 'bg-white/10 hover:bg-white/20 text-stone-200'
                    }`}
                  >
                    <Move className="w-3 h-3" />
                    <span>
                      {hoopMoveMode
                        ? language === 'fil' ? 'I-drag sa Canvas: ON' : 'Drag Hoop: ON'
                        : language === 'fil' ? 'I-drag sa Canvas: OFF' : 'Drag Hoop: OFF'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCenterHoop}
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-stone-200 text-[10px] font-semibold cursor-pointer transition-colors"
                    title={language === 'fil' ? 'Igitna ang hoop sa pattern' : 'Center hoop on pattern'}
                  >
                    {language === 'fil' ? 'Igitna' : 'Center'}
                  </button>
                </div>

                {/* Fine Directional Nudge + Coordinates */}
                <div className="flex items-center justify-between gap-1 text-[10px]">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleNudgeHoop(-2, 0)}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-stone-200 cursor-pointer"
                      title={language === 'fil' ? 'Pakaliwa' : 'Nudge Left'}
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeHoop(0, -2)}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-stone-200 cursor-pointer"
                      title={language === 'fil' ? 'Pataas' : 'Nudge Up'}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeHoop(0, 2)}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-stone-200 cursor-pointer"
                      title={language === 'fil' ? 'Pababa' : 'Nudge Down'}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeHoop(2, 0)}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-stone-200 cursor-pointer"
                      title={language === 'fil' ? 'Pakanan' : 'Nudge Right'}
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="font-mono text-stone-400">
                    X:{Math.round(hoopPosition.x)} Y:{Math.round(hoopPosition.y)}
                  </span>
                </div>
              </div>

              {/* Wood Finish & Crop Outside Toggle */}
              <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-white/10 text-[10px]">
                <div className="flex items-center gap-1">
                  {([
                    { id: 'bamboo', label: language === 'fil' ? 'Kawayan' : 'Bamboo', dot: 'bg-[#DFBA83]' },
                    { id: 'walnut', label: 'Walnut', dot: 'bg-[#7B4F32]' },
                    { id: 'ebony', label: 'Ebony', dot: 'bg-[#262322]' },
                  ] as const).map((finish) => (
                    <button
                      key={finish.id}
                      type="button"
                      onClick={() => setHoopFinish(finish.id)}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                        hoopFinish === finish.id
                          ? 'bg-amber-600 text-white'
                          : 'bg-white/10 hover:bg-white/20 text-stone-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full border border-white/40 ${finish.dot}`} />
                      <span>{finish.label}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setHoopMaskOutside((prev) => !prev)}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                    hoopMaskOutside
                      ? 'bg-stone-700 text-amber-200 border border-amber-400/40'
                      : 'bg-white/10 hover:bg-white/20 text-stone-300'
                  }`}
                >
                  {hoopMaskOutside
                    ? language === 'fil' ? 'Crop: ON' : 'Crop: ON'
                    : language === 'fil' ? 'Crop: OFF' : 'Crop: OFF'}
                </button>
              </div>
            </div>
          )}
          {photoOverlayEnabled && (
            <div className="bg-[#1C1917]/92 text-[#FAF7F2] backdrop-blur-md border border-indigo-400/50 rounded-lg p-3 shadow-xl w-[285px] sm:w-[315px] space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="font-serif font-bold text-xs text-indigo-200 truncate">
                    {language === 'fil' ? 'Photo Overlay (Validation)' : 'Photo Overlay'}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {overlayImageObj && (
                    <span className="font-mono text-[10px] font-bold bg-indigo-600/80 text-white px-1.5 py-0.5 rounded">
                      {overlayOpacity}%
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setPhotoOverlayEnabled(false)}
                    className="p-0.5 rounded text-stone-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                    title={language === 'fil' ? 'Itago ang overlay' : 'Hide overlay'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {overlayImageObj ? (
                <>
                  <div className="flex items-center justify-between gap-2 text-[10px] bg-white/5 px-2 py-1 rounded border border-white/10">
                    <span className="truncate text-stone-200 font-mono" title={overlayPhotoName}>
                      {overlayPhotoName || (language === 'fil' ? 'Orihinal na larawan' : 'Original photo')}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => overlayFileInputRef.current?.click()}
                        className="px-1.5 py-0.5 rounded bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-100 font-semibold cursor-pointer transition-colors flex items-center gap-1"
                        title={language === 'fil' ? 'Palitan ang larawan' : 'Replace photo'}
                      >
                        <Upload className="w-2.5 h-2.5" />
                        <span>{language === 'fil' ? 'Palitan' : 'Replace'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClearOverlayPhoto}
                        className="p-1 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 cursor-pointer transition-colors"
                        title={language === 'fil' ? 'Alisin ang larawan' : 'Clear photo'}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-stone-300">
                      <span>{language === 'fil' ? 'Linaw ng Larawan (Opacity)' : 'Photo Opacity'}</span>
                      <span className="font-mono font-bold text-indigo-300">{overlayOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                      className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                      aria-label={language === 'fil' ? 'Linaw ng photo overlay' : 'Photo overlay opacity'}
                    />
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      {[25, 50, 75, 100].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setOverlayOpacity(preset)}
                          className={`flex-1 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                            overlayOpacity === preset
                              ? 'bg-indigo-500 text-white'
                              : 'bg-white/10 hover:bg-white/20 text-stone-300'
                          }`}
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2 text-center py-1">
                  <p className="text-[11px] text-stone-300 leading-snug">
                    {language === 'fil'
                      ? 'Mag-upload ng orihinal na larawan para ipatong sa pattern grid at i-validate ang disenyo.'
                      : 'Upload the original reference photo to superimpose over the stitch grid for validation.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => overlayFileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{language === 'fil' ? 'Mag-upload ng Larawan' : 'Upload Original Photo'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
          {keyboardCursor && (
            <div className="flex items-center gap-1.5 bg-[#1C1917]/92 text-white backdrop-blur-xs border border-amber-400/60 rounded-md px-2.5 py-1 text-[10px] font-mono shadow-xs animate-in fade-in duration-100">
              <span className="text-amber-400 font-bold">⌨️</span>
              <span className="font-bold text-amber-300">
                Col {keyboardCursor.x + 1}, Row {keyboardCursor.y + 1}
              </span>
              <span className="text-gray-300 text-[9px] hidden sm:inline">
                · [Space] {stitchedCells.has(`${keyboardCursor.x},${keyboardCursor.y}`) ? 'Unmark' : 'Mark'}
              </span>
            </div>
          )}
          {stitchSimulation && (
            <div className="flex items-center gap-1.5 bg-[#2C2117]/92 text-[#FAF7F2] backdrop-blur-xs border border-amber-500/40 rounded-md px-2.5 py-1 text-[10px] font-mono shadow-xs animate-in fade-in duration-150">
              <span className="text-amber-400">🧵</span>
              <span className="font-semibold">{language === 'fil' ? 'Simulasyon: 2-Ply Thread & Aida Weave' : 'Simulation: 2-Ply Thread & Aida Weave'}</span>
              <button
                type="button"
                onClick={toggleSimulationSheen}
                className="ml-1 px-1.5 py-0.2 rounded bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 font-bold cursor-pointer transition-colors"
                title="Toggle Mercerized Glossy Cotton vs Natural Matte Thread"
              >
                {simulationSheen === 'mercerized' ? '✨ Mercerized' : '🌾 Natural'}
              </button>
            </div>
          )}

          {highContrast && (
            <div className="flex items-center gap-1.5 bg-black/85 text-white backdrop-blur-xs border border-white/20 rounded-md px-2.5 py-1 text-[10px] font-mono shadow-xs pointer-events-none animate-in fade-in duration-150">
              <Contrast className="w-3 h-3 text-amber-400" />
              <span className="font-semibold">{language === 'fil' ? 'High Contrast B&W' : 'Contrast B&W Mode'}</span>
            </div>
          )}

          {revealMode && (
            <div className="bg-[#2C2523]/92 text-[#FAF7F2] backdrop-blur-md border border-amber-500/50 rounded-lg p-2.5 shadow-lg max-w-[270px] sm:max-w-[320px] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                  <span className="font-serif font-bold text-xs text-amber-200">
                    {language === 'fil' ? 'Reveal Mode (Scratch-Off)' : 'Scratch-Off Reveal'}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-white bg-amber-600/70 px-1.5 py-0.5 rounded">
                  {completedPercentage}%
                </span>
              </div>

              {/* Progress Bar & Stitched Count */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-[#D5CEBF]">
                  <span>
                    {stitchedCells.size.toLocaleString()} / {pattern.totalStitches.toLocaleString()}{' '}
                    {language === 'fil' ? 'tahi nabunyag' : 'stitches uncovered'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, Number(completedPercentage)))}%` }}
                  />
                </div>
              </div>

              {/* Cover Style and Ghost Watermark Options */}
              <div className="flex items-center justify-between gap-1 mt-2 pt-1.5 border-t border-white/10 text-[10px]">
                {/* Cover Style Switcher */}
                <button
                  type="button"
                  onClick={toggleRevealCoverStyle}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[#FAF7F2] cursor-pointer transition-colors"
                  title="Toggle scratch foil vs raw linen cloth texture"
                >
                  <Layers className="w-3 h-3 text-amber-300" />
                  <span>
                    {revealCoverStyle === 'foil'
                      ? language === 'fil' ? 'Metallic Foil' : 'Foil Cover'
                      : language === 'fil' ? 'Aida Linen' : 'Linen Cloth'}
                  </span>
                </button>

                {/* Ghost Watermark Guide Switcher */}
                <button
                  type="button"
                  onClick={toggleRevealGhostGuide}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[#FAF7F2] cursor-pointer transition-colors"
                  title="Toggle faint DMC symbols guide underneath scratch layer"
                >
                  {revealGhostGuide ? (
                    <Eye className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-gray-400" />
                  )}
                  <span>
                    {revealGhostGuide
                      ? language === 'fil' ? 'Gabay: ON' : 'Guide: ON'
                      : language === 'fil' ? 'Misteryo: ON' : 'Mystery: ON'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Floating Mouse-Wheel & Pinch-to-Zoom Level Indicator Badge */}
        {(wheelZoomIndicator !== null || activePinchZoom !== null) && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 z-30 bg-[#2C2523]/92 text-white backdrop-blur-md px-4 py-1.5 rounded-full shadow-lg font-mono text-xs font-bold flex items-center gap-2 pointer-events-none animate-in fade-in zoom-in duration-100 border border-white/20 ${
              gridSnapEnabled ? 'top-10' : 'top-4'
            }`}
          >
            <span className="text-[#E6C687]">🔍</span>
            <span>
              {activePinchZoom !== null
                ? Math.round(activePinchZoom * 100)
                : wheelZoomIndicator}% Zoom
            </span>
            <span className="text-[10px] text-gray-300 font-normal">
              {language === 'fil' ? 'Mouse wheel para mag-zoom' : 'Mouse wheel to zoom'}
            </span>
          </div>
        )}

        {/* Floating Quick Navigation & Direct Zoom Buttons HUD */}
        <div
          className={`absolute right-3 z-20 flex items-center gap-1 bg-white/92 backdrop-blur-xs border border-[#E8E1D5] rounded-lg p-1 shadow-md ${
            gridSnapEnabled ? 'top-9' : 'top-3'
          }`}
        >
          {/* Zoom Out Button */}
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 text-[#5F554F] hover:text-[#2C2523] hover:bg-[#FAF7F2] rounded cursor-pointer transition-colors"
            title={language === 'fil' ? 'Zoom Out [-]' : 'Zoom Out [-]'}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Current Zoom Indicator */}
          <span className="font-mono text-[11px] font-bold text-[#2C2523] px-1.5 min-w-[42px] text-center select-none">
            {Math.round(zoom * 100)}%
          </span>

          {/* Zoom In Button */}
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 text-[#5F554F] hover:text-[#2C2523] hover:bg-[#FAF7F2] rounded cursor-pointer transition-colors"
            title={language === 'fil' ? 'Zoom In [+]' : 'Zoom In [+]'}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-[#E8E1D5] mx-0.5" />

          {/* Presets */}
          <button
            type="button"
            onClick={handleFitToContainer}
            className="px-2 py-0.5 text-[11px] font-semibold text-[#5F554F] hover:text-[#2C2523] hover:bg-[#FAF7F2] rounded transition-colors cursor-pointer"
            title="Fit pattern to screen [0]"
          >
            Fit
          </button>
          <button
            type="button"
            onClick={() => handleSetExactZoom(1.0)}
            className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors cursor-pointer ${
              Math.abs(zoom - 1.0) < 0.05
                ? 'bg-[#2C2523] text-white font-bold'
                : 'text-[#5F554F] hover:text-[#2C2523] hover:bg-[#FAF7F2]'
            }`}
            title="100% 1:1 Scale [1]"
          >
            100%
          </button>
          <button
            type="button"
            onClick={() => handleSetExactZoom(2.0)}
            className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors cursor-pointer ${
              Math.abs(zoom - 2.0) < 0.05
                ? 'bg-[#2C2523] text-white font-bold'
                : 'text-[#5F554F] hover:text-[#2C2523] hover:bg-[#FAF7F2]'
            }`}
            title="200% High Detail View"
          >
            200%
          </button>
          <button
            type="button"
            onClick={() => handleSetExactZoom(4.0)}
            className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors cursor-pointer hidden sm:inline-block ${
              Math.abs(zoom - 4.0) < 0.05
                ? 'bg-[#2C2523] text-white font-bold'
                : 'text-[#5F554F] hover:text-[#2C2523] hover:bg-[#FAF7F2]'
            }`}
            title="400% Extreme Detail View"
          >
            400%
          </button>
        </div>

        {/* Navigation & Mouse-wheel Hint Pill */}
        <div className="absolute bottom-3 right-3 z-20 hidden sm:flex items-center gap-2 bg-[#FAF7F2]/90 backdrop-blur-xs border border-[#E8E1D5] text-[10px] text-[#7A6E65] px-2.5 py-1 rounded-lg pointer-events-none select-none shadow-2xs">
          <span>🖱️</span>
          <span>
            {language === 'fil'
              ? 'Mouse wheel para mag-zoom · I-drag para mag-pan · [+/-/0] Shortcuts'
              : 'Mouse wheel to zoom · Click & drag to pan · [+/-/0] Shortcuts'}
          </span>
        </div>
        <div className="absolute bottom-3 right-3 z-20 sm:hidden flex items-center gap-1.5 bg-[#FAF7F2]/90 backdrop-blur-xs border border-[#E8E1D5] text-[10px] text-[#7A6E65] px-2 py-0.5 rounded-lg pointer-events-none select-none">
          <span>🖐️</span>
          <span>
            {markMode
              ? language === 'fil'
                ? '2-daliri pan / pinch'
                : '2-finger pan / pinch'
              : language === 'fil'
              ? 'Pinch & Pan'
              : 'Pinch & Pan'}
          </span>
        </div>

        {/* Live Hover Inspector Badge */}
        {hoveredCell && (
          <div
            className={`absolute bottom-4 z-20 bg-white/95 backdrop-blur-xs border border-[#E8E1D5] rounded-lg px-3 py-2 shadow-lg flex items-center gap-3 text-xs pointer-events-none ${
              gridSnapEnabled ? 'left-11' : 'left-4'
            }`}
          >
            <div
              className="w-4 h-4 rounded-sm border border-black/20"
              style={{ backgroundColor: hoveredCell.hex }}
            />
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-[#2C2523]">
                DMC {hoveredCell.code}
              </span>
              <span className="text-[#7A6E65] max-w-[130px] truncate">
                {hoveredCell.name}
              </span>
            </div>
            <div className="border-l border-[#E8E1D5] pl-2 flex items-center gap-2">
              <span className="w-4 h-4 bg-[#FAF7F2] border border-[#D7CBB9] rounded flex items-center justify-center font-bold">
                {hoveredCell.symbol}
              </span>
              <span className="font-mono text-[#8C8077] text-[11px]">
                X:{hoveredCell.x} Y:{hoveredCell.y}
              </span>
              {keyboardCursor && keyboardCursor.x === hoveredCell.x - 1 && keyboardCursor.y === hoveredCell.y - 1 && (
                <span className="text-[10px] font-mono font-bold bg-amber-500/15 text-amber-900 border border-amber-400/50 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-2xs">
                  <span>⌨️</span>
                  <span>{language === 'fil' ? 'Naka-Focus' : 'Focused'}</span>
                </span>
              )}
              {/* If this stitch has an annotation/technique note */}
              {(() => {
                const ann = annotations.find(
                  (a) => a.x === hoveredCell.x - 1 && a.y === hoveredCell.y - 1
                );
                if (!ann) return null;
                const lower = (ann.text || '').toLowerCase();
                const isKnot = lower.includes('french knot') || lower.includes('knot');
                const isHalf = lower.includes('half-stitch') || lower.includes('half stitch') || lower.includes('half');
                return (
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-1 ${
                      isKnot
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : isHalf
                        ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                        : 'bg-amber-50 text-amber-900 border border-amber-200'
                    }`}
                  >
                    {isKnot ? '● FK' : isHalf ? '½ Half' : '📝 Note'}
                    <span className="max-w-[85px] truncate">{ann.text}</span>
                  </span>
                );
              })()}
              {(viewMode === 'heatmap' || heatmapOverlayEnabled) && (() => {
                const idx = (hoveredCell.y - 1) * pattern.width + (hoveredCell.x - 1);
                const score = densityAnalysis.scores[idx] || 0;
                const pct = Math.round(score * 100);
                const uniqueNearby = densityAnalysis.uniqueCounts[idx] || 1;
                const tier =
                  score >= 0.6
                    ? language === 'fil' ? 'Siksik' : 'Dense Detail'
                    : score >= 0.28
                    ? language === 'fil' ? 'Katamtaman' : 'Moderate'
                    : language === 'fil' ? 'Maluwag' : 'Sparse BG';
                return (
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                      score >= 0.6
                        ? 'bg-red-100 text-red-900 border-red-300'
                        : score >= 0.28
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-sky-100 text-sky-900 border-sky-300'
                    }`}
                  >
                    <span>🔥 {pct}% {tier}</span>
                    <span className="text-[9px] opacity-80">· {uniqueNearby}c/5×5</span>
                  </span>
                );
              })()}
              {revealMode && (
                <span
                  className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                    stitchedCells.has(`${hoveredCell.x - 1},${hoveredCell.y - 1}`)
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {stitchedCells.has(`${hoveredCell.x - 1},${hoveredCell.y - 1}`)
                    ? language === 'fil'
                      ? '✓ Nabunyag'
                      : '✓ Uncovered'
                    : language === 'fil'
                    ? '🔒 Scratch Cover'
                    : '🔒 Scratch Cover'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Hovered Sticky Note / Annotation Tooltip Card */}
        {hoveredAnnotation && (
          <div
            className={`absolute bottom-16 z-20 bg-white/95 backdrop-blur-md border border-[#B88E3C] rounded-xl p-3 shadow-xl max-w-xs space-y-1.5 animate-fade-in pointer-events-none ${
              gridSnapEnabled ? 'left-11' : 'left-4'
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#F0ECE1] pb-1.5">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: hoveredAnnotation.color }}
                />
                <span className="font-serif font-bold text-xs text-[#2C2523] uppercase">
                  {hoveredAnnotation.text.toLowerCase().includes('french knot')
                    ? '● French Knot Note'
                    : hoveredAnnotation.text.toLowerCase().includes('half-stitch') ||
                      hoveredAnnotation.text.toLowerCase().includes('half')
                    ? '½ Half-Stitch Note'
                    : hoveredAnnotation.type === 'label'
                    ? '🏷️ Grid Text Label'
                    : hoveredAnnotation.type === 'flag'
                    ? '🚩 Flag Marker'
                    : hoveredAnnotation.type === 'note'
                    ? '📝 Sticky Note'
                    : '📌 Pin Marker'}
                </span>
              </div>
              <span className="font-mono text-[11px] text-[#B88E3C] font-semibold">
                X:{hoveredAnnotation.x + 1}, Y:{hoveredAnnotation.y + 1}
              </span>
            </div>
            <p className="text-xs text-[#2C2523] leading-tight font-medium">
              {hoveredAnnotation.text}
            </p>
            <div className="text-[10px] text-[#8C8077] pt-0.5 flex items-center justify-between gap-3">
              <span>{hoveredAnnotation.resolved ? '✓ Resolved' : 'Sticky Note Tip'}</span>
              <span className="italic">Click icon to edit / delete</span>
            </div>
          </div>
        )}

        {/* Helper Instructions bottom right */}
        <div className="absolute bottom-4 right-4 z-10 bg-white/90 backdrop-blur-xs border border-[#E8E1D5] rounded-md px-2.5 py-1 text-[11px] text-[#7A6E65] pointer-events-none hidden sm:block">
          {annotateMode
            ? language === 'fil'
              ? 'I-click ang anumang coordinate para maglagay o mag-edit ng Sticky Note'
              : 'Click any coordinate to attach or edit a Sticky Note icon'
            : markMode
            ? language === 'fil'
              ? 'I-click o [Space] para magmarka · [Ctrl+Z] Undo · [Arrows] Ilipat'
              : 'Click or [Space] to mark · [Ctrl+Z] Undo · [Arrows] Navigate'
            : language === 'fil'
            ? '⌨️ [Arrows] Ilipat · [Space] Markahan · [Enter] Sticky Note · [P] Preview · [H] Heatmap · [S] Simulasyon'
            : '⌨️ [Arrows] Navigate · [Space] Mark · [Enter] Sticky Note · [P] Preview · [H] Heatmap · [S] Simulation'}
        </div>
      </div>

      {/* Add / Edit Annotation Modal */}
      <AnnotationModal
        isOpen={isAnnotationModalOpen}
        onClose={() => setIsAnnotationModalOpen(false)}
        x={activeModalCoord.x}
        y={activeModalCoord.y}
        existingAnnotation={editingAnnotation}
        onSave={handleSaveAnnotation}
        onDelete={handleDeleteAnnotation}
        language={language}
      />

      {/* Annotations Manager Drawer */}
      <AnnotationManagerDrawer
        isOpen={isAnnotationDrawerOpen}
        onClose={() => setIsAnnotationDrawerOpen(false)}
        annotations={annotations}
        onToggleResolved={handleToggleResolved}
        onDeleteAnnotation={handleDeleteAnnotation}
        onJumpToCoordinate={handleJumpToCoordinate}
        onEditAnnotation={(ann) => {
          setEditingAnnotation(ann);
          setActiveModalCoord({ x: ann.x, y: ann.y });
          setIsAnnotationModalOpen(true);
        }}
        onClearAllAnnotations={handleClearAllAnnotations}
        language={language}
      />

      {/* Lightbox Modal for Full-Size Snapshot Viewing */}
      {activeLightboxSnapshot && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveLightboxSnapshot(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-[#D7CBB9]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#FAF7F2] px-5 py-4 border-b border-[#E8E1D5] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-700" />
                  <h4 className="font-serif font-bold text-base text-[#2C2523]">
                    {language === 'fil' ? 'Milestone Snapshot ng Disenyo' : 'Pattern Milestone Snapshot'}
                  </h4>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-mono font-bold px-2 py-0.5 rounded">
                    {activeLightboxSnapshot.percentage.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-[#7A6E65] mt-0.5">
                  {pattern.title} · {activeLightboxSnapshot.dateFormatted}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveLightboxSnapshot(null)}
                className="w-8 h-8 rounded-lg bg-white border border-[#E8DFC9] hover:bg-[#F2ECE1] text-[#5F554F] hover:text-[#2C2523] flex items-center justify-center cursor-pointer transition-colors"
                title="Close Lightbox"
              >
                ✕
              </button>
            </div>

            {/* Modal Image Body */}
            <div className="p-4 bg-[#F2ECE1] flex-1 overflow-auto flex items-center justify-center min-h-[320px] max-h-[520px]">
              <img
                src={activeLightboxSnapshot.previewUrl}
                alt="Enlarged Milestone Snapshot"
                className="max-h-full max-w-full object-contain rounded-lg shadow-lg border border-[#D7CBB9]"
              />
            </div>

            {/* Modal Footer & Stats */}
            <div className="p-4 bg-white border-t border-[#E8E1D5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-[#2C2523]">
                  {activeLightboxSnapshot.stitchedCount.toLocaleString()} / {activeLightboxSnapshot.totalStitches.toLocaleString()} stitches complete
                </div>
                <p className="text-xs text-[#7A6E65] italic">
                  {activeLightboxSnapshot.note || (language === 'fil' ? 'Walang nakalagay na tala' : 'No milestone note')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadSnapshot(activeLightboxSnapshot)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{language === 'fil' ? 'I-download ang PNG' : 'Download PNG'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLightboxSnapshot(null)}
                  className="px-4 py-2 bg-[#FAF7F2] hover:bg-[#F2ECE1] text-[#2C2523] border border-[#E8DFC9] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {language === 'fil' ? 'Isara' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animated GIF and Milestone Collage Export Modal */}
      <SnapshotExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        snapshots={snapshots}
        pattern={pattern}
        language={language}
      />

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="bg-white rounded-2xl border border-[#E8E1D5] shadow-2xl max-w-lg w-full overflow-hidden animate-scale-up"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="bg-[#FAF7F2] border-b border-[#E8E1D5] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2C2523] text-[#E6C687] flex items-center justify-center shadow-xs">
                  <Keyboard className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#2C2523]">
                    {language === 'fil' ? 'Mga Keyboard Shortcut' : 'Keyboard Shortcuts & Navigation'}
                  </h3>
                  <p className="text-xs text-[#7A6E65]">
                    {language === 'fil'
                      ? 'Mabilis na pag-navigate at pananahi gamit ang keyboard'
                      : 'High-efficiency power-user grid controls'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyboardHelpModal(false)}
                className="p-1.5 text-[#7A6E65] hover:text-[#2C2523] rounded-lg hover:bg-[#EAE2D5] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of shortcuts */}
            <div className="p-6 space-y-2.5">
              <div className="grid grid-cols-1 gap-2 text-xs">
                {/* Navigation */}
                <div className="flex items-center justify-between p-2.5 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5]">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#2C2523]">
                      {language === 'fil' ? 'Ilipat ang Cursor sa Grid' : 'Navigate Grid Stitches'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono font-bold text-[11px]">
                    <kbd className="px-2 py-1 bg-white rounded border border-[#D7CBB9] shadow-2xs">↑</kbd>
                    <kbd className="px-2 py-1 bg-white rounded border border-[#D7CBB9] shadow-2xs">↓</kbd>
                    <kbd className="px-2 py-1 bg-white rounded border border-[#D7CBB9] shadow-2xs">←</kbd>
                    <kbd className="px-2 py-1 bg-white rounded border border-[#D7CBB9] shadow-2xs">→</kbd>
                  </div>
                </div>

                {/* 10-stitch jump */}
                <div className="flex items-center justify-between p-2.5 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5]">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#2C2523]">
                      {language === 'fil' ? 'Lumukso nang 10 Tahi (10x10 Block)' : 'Jump 10 Stitches (10x10 block)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono font-bold text-[11px]">
                    <kbd className="px-2 py-1 bg-white rounded border border-[#D7CBB9] shadow-2xs">Shift</kbd>
                    <span>+</span>
                    <kbd className="px-2 py-1 bg-white rounded border border-[#D7CBB9] shadow-2xs">Arrows</kbd>
                  </div>
                </div>

                {/* Toggle mark */}
                <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-emerald-950">
                      {language === 'fil' ? 'Markahan / I-unmark ang Tahi' : 'Toggle Stitch Mark (Completed)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono font-bold text-[11px]">
                    <kbd className="px-3 py-1 bg-white text-emerald-950 rounded border border-emerald-300 shadow-2xs">Spacebar</kbd>
                  </div>
                </div>

                {/* Enter for Sticky Note */}
                <div className="flex items-center justify-between p-2.5 bg-amber-50/70 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-amber-950">
                      {language === 'fil' ? 'Maglagay ng Sticky Note o Tip sa Coordinate' : 'Attach Sticky Note / Tip at Coordinate'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono font-bold text-[11px]">
                    <kbd className="px-2.5 py-1 bg-white text-amber-950 rounded border border-amber-300 shadow-2xs">Enter</kbd>
                  </div>
                </div>

                {/* Ctrl+Z / Ctrl+Shift+Z Undo & Redo */}
                <div className="flex items-center justify-between p-2.5 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5]">
                  <span className="font-medium text-[#2C2523]">
                    {language === 'fil' ? 'Undo / Redo sa Pagmamarka ng Tahi' : 'Undo / Redo Stitch Marking'}
                  </span>
                  <div className="flex items-center gap-1 font-mono font-bold text-[11px]">
                    <kbd className="px-2 py-1 bg-white rounded border border-[#D7CBB9] shadow-2xs">Ctrl+Z</kbd>
                    <span>/</span>
                    <kbd className="px-2 py-1 bg-white rounded border border-[#D7CBB9] shadow-2xs">Ctrl+Y</kbd>
                  </div>
                </div>

                {/* H: Density Heatmap */}
                <div className="flex items-center justify-between p-2.5 bg-orange-50/70 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-600" />
                    <span className="font-semibold text-orange-950">
                      {language === 'fil' ? 'I-toggle ang Heatmap Overlay' : 'Toggle Interactive Heatmap Overlay'}
                    </span>
                  </div>
                  <kbd className="px-2.5 py-1 bg-white text-orange-950 rounded border border-orange-300 shadow-2xs font-mono font-bold text-[11px]">H</kbd>
                </div>

                {/* O: Original Photo Overlay */}
                <div className="flex items-center justify-between p-2.5 bg-indigo-50/70 rounded-lg border border-indigo-200">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold text-indigo-950">
                      {language === 'fil' ? 'I-toggle ang Photo Overlay' : 'Toggle Original Photo Overlay'}
                    </span>
                  </div>
                  <kbd className="px-2.5 py-1 bg-white text-indigo-950 rounded border border-indigo-300 shadow-2xs font-mono font-bold text-[11px]">O</kbd>
                </div>

                {/* P: Sketch Preview Mode */}
                <div className="flex items-center justify-between p-2.5 bg-sky-50/70 rounded-lg border border-sky-200">
                  <div className="flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-sky-700" />
                    <span className="font-semibold text-sky-950">
                      {language === 'fil' ? 'I-toggle ang Sketch Preview Mode' : 'Toggle Sketch Preview Mode'}
                    </span>
                  </div>
                  <kbd className="px-2.5 py-1 bg-white text-sky-950 rounded border border-sky-300 shadow-2xs font-mono font-bold text-[11px]">P</kbd>
                </div>

                {/* E: Embroidery Hoop Simulator */}
                <div className="flex items-center justify-between p-2.5 bg-amber-50/70 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2">
                    <Disc className="w-4 h-4 text-amber-700" />
                    <span className="font-semibold text-amber-950">
                      {language === 'fil' ? 'I-toggle ang Embroidery Hoop Simulator' : 'Toggle Embroidery Hoop Simulator'}
                    </span>
                  </div>
                  <kbd className="px-2.5 py-1 bg-white text-amber-950 rounded border border-amber-300 shadow-2xs font-mono font-bold text-[11px]">E</kbd>
                </div>

                {/* D: Ghost Mode */}
                <div className="flex items-center justify-between p-2.5 bg-purple-50/70 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2">
                    <Ghost className="w-4 h-4 text-purple-700" />
                    <span className="font-semibold text-purple-950">
                      {language === 'fil' ? 'I-toggle ang Ghost Mode (20% natapos na tahi)' : 'Toggle Ghost Mode (20% completed stitches)'}
                    </span>
                  </div>
                  <kbd className="px-2.5 py-1 bg-white text-purple-950 rounded border border-purple-300 shadow-2xs font-mono font-bold text-[11px]">D</kbd>
                </div>

                {/* R: Grid Snap Rulers */}
                <div className="flex items-center justify-between p-2.5 bg-amber-50/70 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-amber-700" />
                    <span className="font-semibold text-amber-950">
                      {language === 'fil' ? 'I-toggle ang Grid Snap Rulers (Aida alignment)' : 'Toggle Grid Snap Alignment Rulers'}
                    </span>
                  </div>
                  <kbd className="px-2.5 py-1 bg-white text-amber-950 rounded border border-amber-300 shadow-2xs font-mono font-bold text-[11px]">R</kbd>
                </div>

                {/* S: Simulation */}
                <div className="flex items-center justify-between p-2.5 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5]">
                  <span className="font-medium text-[#2C2523]">
                    {language === 'fil' ? 'I-toggle ang 3D Stitch Simulation' : 'Toggle 3D Stitch Simulation'}
                  </span>
                  <kbd className="px-2.5 py-1 bg-white rounded border border-[#D7CBB9] shadow-2xs font-mono font-bold text-[11px]">S</kbd>
                </div>

                {/* M: Tracker */}
                <div className="flex items-center justify-between p-2.5 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5]">
                  <span className="font-medium text-[#2C2523]">
                    {language === 'fil' ? 'I-toggle ang Stitch Tracker Mode' : 'Toggle Stitch Tracker Mode'}
                  </span>
                  <kbd className="px-2.5 py-1 bg-white rounded border border-[#D7CBB9] shadow-2xs font-mono font-bold text-[11px]">M</kbd>
                </div>

                {/* C: High Contrast */}
                <div className="flex items-center justify-between p-2.5 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5]">
                  <span className="font-medium text-[#2C2523]">
                    {language === 'fil' ? 'I-toggle ang High Contrast (B&W)' : 'Toggle High Contrast (B&W)'}
                  </span>
                  <kbd className="px-2.5 py-1 bg-white rounded border border-[#D7CBB9] shadow-2xs font-mono font-bold text-[11px]">C</kbd>
                </div>

                {/* Zoom In & Out */}
                <div className="flex items-center justify-between p-2.5 bg-blue-50/70 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-950">
                      {language === 'fil' ? 'Mag-zoom In / Mag-zoom Out' : 'Zoom In / Zoom Out'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono font-bold text-[11px]">
                    <kbd className="px-2 py-1 bg-white text-blue-950 rounded border border-blue-300 shadow-2xs">+</kbd>
                    <span>/</span>
                    <kbd className="px-2 py-1 bg-white text-blue-950 rounded border border-blue-300 shadow-2xs">-</kbd>
                    <span className="text-gray-500 text-[10px] ml-1 hidden sm:inline">
                      ({language === 'fil' ? 'o Mouse Wheel' : 'or Mouse Wheel'})
                    </span>
                  </div>
                </div>

                {/* Reset Zoom & Fit */}
                <div className="flex items-center justify-between p-2.5 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5]">
                  <span className="font-medium text-[#2C2523]">
                    {language === 'fil' ? 'I-fit sa Screen [0] / 100% Laki [1]' : 'Fit to Screen [0] / 100% Actual [1]'}
                  </span>
                  <div className="flex items-center gap-1 font-mono font-bold text-[11px]">
                    <kbd className="px-2 py-1 bg-white rounded border border-[#D7CBB9] shadow-2xs">0</kbd>
                    <span>/</span>
                    <kbd className="px-2 py-1 bg-white rounded border border-[#D7CBB9] shadow-2xs">1</kbd>
                  </div>
                </div>

                {/* Esc: Dismiss */}
                <div className="flex items-center justify-between p-2.5 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5]">
                  <span className="font-medium text-[#7A6E65]">
                    {language === 'fil' ? 'Alisin ang Reticle Cursor' : 'Dismiss Reticle Cursor'}
                  </span>
                  <kbd className="px-2.5 py-1 bg-white rounded border border-[#D7CBB9] shadow-2xs font-mono font-bold text-[11px]">Esc</kbd>
                </div>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowKeyboardHelpModal(false)}
                  className="px-5 py-2 bg-[#2C2523] hover:bg-[#433936] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {language === 'fil' ? 'Naiintindihan ko na' : 'Got it'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STITCH PROGRESS EXPORT & IMPORT BACKUP MODAL (JSON / CSV) */}
      <ProgressBackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        pattern={pattern}
        stitchedCells={stitchedCells}
        onImportStitchedCells={onImportStitchedCells || (() => {})}
        language={language}
      />

      {/* HIGH-RESOLUTION PATTERN GRID IMAGE EXPORT MODAL (PNG / JPG) */}
      <PatternImageExportModal
        isOpen={showPatternImageExportModal}
        onClose={() => setShowPatternImageExportModal(false)}
        pattern={pattern}
        stitchedCells={stitchedCells}
        language={language}
        initialStyle={
          viewMode === 'blocks' ? 'blocks' : viewMode === 'symbols' ? 'symbols' : 'stitches'
        }
      />
    </div>
  );
};
