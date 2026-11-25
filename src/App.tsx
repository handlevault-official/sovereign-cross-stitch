import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download,
  Sparkles,
  ShieldCheck,
  Printer,
  Heart,
  Layers,
  FileCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Share2,
  Image as ImageIcon,
  X,
  HardDrive,
  AlertTriangle
} from 'lucide-react';
import { Header } from './components/Header';
import { DesignSelector } from './components/DesignSelector';
import { PatternConfigurator } from './components/PatternConfigurator';
import { StitchViewer } from './components/StitchViewer';
import { StitchProgressTracker } from './components/StitchProgressTracker';
import { FlossLegendTable } from './components/FlossLegendTable';
import { PageOverviewMap } from './components/PageOverviewMap';
import { CheckoutModal } from './components/CheckoutModal';
import { CodeViewerModal } from './components/CodeViewerModal';
import { FabricCalculator } from './components/FabricCalculator';
import { MaterialCostEstimator } from './components/MaterialCostEstimator';
import { ThreadDistributionChart } from './components/ThreadDistributionChart';
import { ShareProgressModal } from './components/ShareProgressModal';
import { PatternImageExportModal } from './components/PatternImageExportModal';
import { EstimatedHourlyStitchesCard } from './components/EstimatedHourlyStitchesCard';
import { TEMPLATES } from './data/dmcPalette';
import { processImageToPattern, calculateFabricSpecs } from './utils/colorMatcher';
import { generatePatternPdf } from './utils/pdfGenerator';
import { loadAnnotations } from './utils/annotationStorage';
import { loadTimerData, saveTimerData } from './utils/timerStorage';
import {
  PatternData,
  UploadedItem,
  StitchHistoryDelta,
  DMCColor,
  StitchTimerData,
  StitchSessionLog,
} from './types';

export default function App() {
  const [language, setLanguage] = useState<'fil' | 'en'>('fil');
  const [activeSection, setActiveSection] = useState<string>('generator');

  // PRO Licensing State (Persistent)
  const [isPro, setIsPro] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('sovereign_cross_stitch_pro');
      return stored === 'true';
    } catch {
      return false;
    }
  });
  const [showCheckout, setShowCheckout] = useState<boolean>(false);
  const [showCodeBox, setShowCodeBox] = useState<boolean>(false);

  // Design selection state
  const [uploadOption, setUploadOption] = useState<'upload' | 'template'>('template');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('rings');
  const [customImageFile, setCustomImageFile] = useState<File | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedItem[]>([]);

  // Personalization
  const [coupleNames, setCoupleNames] = useState<string>('Sarah & David');
  const [weddingDate, setWeddingDate] = useState<string>('September 14, 2026');

  // Specs
  const [gridPreset, setGridPreset] = useState<string>('150x150');
  const [customWidth, setCustomWidth] = useState<number>(150);
  const [customHeight, setCustomHeight] = useState<number>(225);
  const [fabricCount, setFabricCount] = useState<number>(14);
  const [maxColors, setMaxColors] = useState<number>(28);
  const [noiseReduction, setNoiseReduction] = useState<number>(0);
  const [confettiThreshold, setConfettiThreshold] = useState<number>(7);

  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [pattern, setPattern] = useState<PatternData | null>(null);
  const originalGeneratedPatternRef = useRef<PatternData | null>(null);
  const [swappedColorMap, setSwappedColorMap] = useState<Record<string, string[]>>({});
  const [activeColorFilter, setActiveColorFilter] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [showShareProgressModal, setShowShareProgressModal] = useState<boolean>(false);
  const [showPatternImageExportModal, setShowPatternImageExportModal] = useState<boolean>(false);

  // Stitch Progress Tracker State
  const [stitchedCells, setStitchedCells] = useState<Set<string>>(new Set());
  const stitchedCellsRef = useRef<Set<string>>(stitchedCells);
  stitchedCellsRef.current = stitchedCells;

  const [sessionStitches, setSessionStitches] = useState<number>(0);
  const [markMode, setMarkMode] = useState<boolean>(false);

  // Daily Stitch Goal Target & Today's Stitch Counter (Persisted in localStorage per local calendar date)
  const getTodayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [dailyGoalTarget, setDailyGoalTarget] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('sovereign_daily_goal_target');
      const parsed = raw ? parseInt(raw, 10) : 100;
      return Number.isFinite(parsed) && parsed >= 10 ? Math.min(5000, parsed) : 100;
    } catch {
      return 100;
    }
  });

  const [todayStitches, setTodayStitches] = useState<number>(() => {
    try {
      const todayKey = getTodayKey();
      const raw = localStorage.getItem('sovereign_daily_stitch_progress');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.date === todayKey && typeof parsed.count === 'number') {
          return Math.max(0, parsed.count);
        }
      }
    } catch {
      // ignore storage errors
    }
    return 0;
  });

  // Session Stopwatch & Hourly Velocity State (shared across Summary Card, Progress Tracker & Viewer)
  const [timerData, setTimerData] = useState<StitchTimerData>({
    totalSeconds: 0,
    sessions: [],
    customPace: 90,
  });
  const [isSessionTimerRunning, setIsSessionTimerRunning] = useState<boolean>(false);
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const sessionPausedByUserRef = useRef<boolean>(false);

  useEffect(() => {
    if (!pattern) {
      setTimerData({ totalSeconds: 0, sessions: [], customPace: 90 });
      setIsSessionTimerRunning(false);
      setSessionSeconds(0);
      setSessionStartTime(null);
      sessionPausedByUserRef.current = false;
      return;
    }
    const loaded = loadTimerData(pattern.id);
    setTimerData(loaded);
    setIsSessionTimerRunning(false);
    setSessionSeconds(0);
    setSessionStartTime(null);
    sessionPausedByUserRef.current = false;
  }, [pattern?.id]);

  useEffect(() => {
    if (!isSessionTimerRunning) return;
    const intervalId = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isSessionTimerRunning]);

  const handleToggleSessionTimer = useCallback(() => {
    setIsSessionTimerRunning((prev) => {
      const next = !prev;
      if (next) {
        sessionPausedByUserRef.current = false;
        setSessionStartTime((s) => s ?? Date.now());
      } else {
        sessionPausedByUserRef.current = true;
      }
      return next;
    });
  }, []);

  const handleFinishSession = useCallback(() => {
    if (!pattern) return;
    if (sessionSeconds === 0 && sessionStitches === 0) return;

    const duration = Math.max(1, sessionSeconds);
    const stitches = sessionStitches;
    const baseline = timerData.customPace || 90;
    const speed =
      duration >= 10 && stitches > 0
        ? Math.round((stitches / (duration / 3600)) * 10) / 10
        : baseline;

    const newLog: StitchSessionLog = {
      id: `session_${Date.now()}`,
      timestamp: sessionStartTime || Date.now(),
      durationSeconds: duration,
      stitchesCount: stitches,
      speedPerHour: Math.max(1, speed),
      formattedDate: new Date().toLocaleDateString(
        language === 'fil' ? 'fil-PH' : 'en-US',
        { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      ),
    };

    const updated: StitchTimerData = {
      totalSeconds: timerData.totalSeconds + duration,
      sessions: [newLog, ...(timerData.sessions || [])].slice(0, 30),
      customPace: timerData.customPace || 90,
    };

    setTimerData(updated);
    saveTimerData(pattern.id, updated);
    setIsSessionTimerRunning(false);
    setSessionSeconds(0);
    setSessionStartTime(null);
    setSessionStitches(0);
    sessionPausedByUserRef.current = false;
  }, [pattern, sessionSeconds, sessionStitches, timerData, sessionStartTime, language]);

  const handleResetSession = useCallback(() => {
    setIsSessionTimerRunning(false);
    setSessionSeconds(0);
    setSessionStartTime(null);
    setSessionStitches(0);
    sessionPausedByUserRef.current = false;
  }, []);

  const handleUpdateTimerPace = useCallback(
    (newPace: number) => {
      const val = Math.max(10, Math.min(400, Math.round(newPace)));
      setTimerData((prev) => {
        const updated = { ...prev, customPace: val };
        if (pattern) {
          saveTimerData(pattern.id, updated);
        }
        return updated;
      });
    },
    [pattern]
  );

  const handleClearTimerHistory = useCallback(() => {
    if (!pattern) return;
    setTimerData((prev) => {
      const resetData: StitchTimerData = {
        totalSeconds: 0,
        sessions: [],
        customPace: prev.customPace || 90,
      };
      saveTimerData(pattern.id, resetData);
      return resetData;
    });
    setIsSessionTimerRunning(false);
    setSessionSeconds(0);
    setSessionStartTime(null);
    setSessionStitches(0);
    sessionPausedByUserRef.current = false;
  }, [pattern]);

  const adjustStitchCounters = useCallback((delta: number) => {
    if (delta === 0) return;
    if (delta > 0 && !sessionPausedByUserRef.current) {
      setIsSessionTimerRunning((running) => {
        if (!running) {
          setSessionStartTime((s) => s ?? Date.now());
        }
        return true;
      });
    }
    setSessionStitches((prev) => Math.max(0, prev + delta));
    setTodayStitches((prev) => {
      const next = Math.max(0, prev + delta);
      try {
        localStorage.setItem(
          'sovereign_daily_stitch_progress',
          JSON.stringify({ date: getTodayKey(), count: next })
        );
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const handleUpdateDailyTarget = useCallback((newTarget: number) => {
    const clamped = Math.max(10, Math.min(5000, Math.round(newTarget) || 100));
    setDailyGoalTarget(clamped);
    try {
      localStorage.setItem('sovereign_daily_goal_target', String(clamped));
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleLogFocusProgress = useCallback(
    (stitchesCount: number, elapsedMinutes?: number) => {
      const safeStitches = Math.max(1, stitchesCount);
      setTodayStitches((prev) => {
        const next = Math.max(0, prev + safeStitches);
        try {
          localStorage.setItem(
            'sovereign_daily_stitch_progress',
            JSON.stringify({ date: getTodayKey(), count: next })
          );
        } catch {
          // ignore storage errors
        }
        return next;
      });
      if (pattern && elapsedMinutes && elapsedMinutes > 0) {
        const durationSec = Math.round(elapsedMinutes * 60);
        const speed = Math.round((safeStitches / (durationSec / 3600)) * 10) / 10;
        const focusLog: StitchSessionLog = {
          id: `focus_${Date.now()}`,
          timestamp: Date.now(),
          durationSeconds: durationSec,
          stitchesCount: safeStitches,
          speedPerHour: Math.max(1, speed),
          formattedDate: new Date().toLocaleDateString(
            language === 'fil' ? 'fil-PH' : 'en-US',
            { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
          ),
        };
        setTimerData((prev) => {
          const updated: StitchTimerData = {
            totalSeconds: prev.totalSeconds + durationSec,
            sessions: [focusLog, ...(prev.sessions || [])].slice(0, 30),
            customPace: prev.customPace || 90,
          };
          saveTimerData(pattern.id, updated);
          return updated;
        });
      }
    },
    [pattern, language]
  );

  // Undo / Redo History Stack for Stitch Marking Actions (max 60 steps)
  const [undoStack, setUndoStack] = useState<StitchHistoryDelta[]>([]);
  const [redoStack, setRedoStack] = useState<StitchHistoryDelta[]>([]);

  // Auto-save Toast Notification State for stitchedCells persistence
  const [saveToast, setSaveToast] = useState<{
    id: number;
    stitchedCount: number;
    totalStitches: number;
    timestamp: string;
    isError?: boolean;
  } | null>(null);
  const saveToastDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveToastHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveToastDebounceRef.current) clearTimeout(saveToastDebounceRef.current);
      if (saveToastHideRef.current) clearTimeout(saveToastHideRef.current);
    };
  }, []);

  const persistStitchedCells = useCallback(
    (next: Set<string>) => {
      if (!pattern) return;
      let saveFailed = false;
      try {
        if (next.size === 0) {
          localStorage.removeItem(`sovereign_stitched_${pattern.id}`);
        } else {
          localStorage.setItem(`sovereign_stitched_${pattern.id}`, JSON.stringify(Array.from(next)));
        }
      } catch {
        saveFailed = true;
      }

      if (saveToastDebounceRef.current) clearTimeout(saveToastDebounceRef.current);
      if (saveToastHideRef.current) clearTimeout(saveToastHideRef.current);

      const totalStitches = pattern.totalStitches;
      const savedCount = next.size;

      saveToastDebounceRef.current = setTimeout(() => {
        const nowStr = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setSaveToast({
          id: Date.now(),
          stitchedCount: savedCount,
          totalStitches,
          timestamp: nowStr,
          isError: saveFailed,
        });

        saveToastHideRef.current = setTimeout(() => {
          setSaveToast(null);
        }, 2800);
      }, 380);
    },
    [pattern]
  );

  const pushHistoryDelta = useCallback((delta: StitchHistoryDelta) => {
    if (delta.added.length === 0 && delta.removed.length === 0) return;
    setUndoStack((prev) => [...prev.slice(-59), delta]);
    setRedoStack([]);
  }, []);

  // Load saved progress for the pattern from localStorage
  useEffect(() => {
    setUndoStack([]);
    setRedoStack([]);
    if (saveToastDebounceRef.current) clearTimeout(saveToastDebounceRef.current);
    if (saveToastHideRef.current) clearTimeout(saveToastHideRef.current);
    setSaveToast(null);
    if (pattern) {
      try {
        const saved = localStorage.getItem(`sovereign_stitched_${pattern.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          const loaded = new Set<string>(parsed);
          stitchedCellsRef.current = loaded;
          setStitchedCells(loaded);
        } else {
          const empty = new Set<string>();
          stitchedCellsRef.current = empty;
          setStitchedCells(empty);
        }
      } catch {
        const empty = new Set<string>();
        stitchedCellsRef.current = empty;
        setStitchedCells(empty);
      }
    }
  }, [pattern?.id]);

  const handleToggleStitch = useCallback(
    (key: string) => {
      const prev = stitchedCellsRef.current;
      const next = new Set(prev);
      const wasStitched = next.has(key);
      if (wasStitched) {
        next.delete(key);
      } else {
        next.add(key);
      }
      stitchedCellsRef.current = next;
      setStitchedCells(next);
      persistStitchedCells(next);
      adjustStitchCounters(wasStitched ? -1 : 1);
      pushHistoryDelta({
        added: wasStitched ? [] : [key],
        removed: wasStitched ? [key] : [],
      });
    },
    [persistStitchedCells, pushHistoryDelta, adjustStitchCounters]
  );

  const handleMarkStitch = useCallback(
    (key: string, mark: boolean, skipHistory = false) => {
      const prev = stitchedCellsRef.current;
      if (mark && prev.has(key)) return;
      if (!mark && !prev.has(key)) return;
      const next = new Set(prev);
      if (mark) {
        next.add(key);
      } else {
        next.delete(key);
      }
      stitchedCellsRef.current = next;
      setStitchedCells(next);
      persistStitchedCells(next);
      adjustStitchCounters(mark ? 1 : -1);
      if (!skipHistory) {
        pushHistoryDelta({
          added: mark ? [key] : [],
          removed: mark ? [] : [key],
        });
      }
    },
    [persistStitchedCells, pushHistoryDelta, adjustStitchCounters]
  );

  const handleCommitHistory = useCallback(
    (delta: StitchHistoryDelta) => {
      pushHistoryDelta(delta);
    },
    [pushHistoryDelta]
  );

  const handleUndo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) return prevUndo;
      const lastDelta = prevUndo[prevUndo.length - 1];
      const next = new Set(stitchedCellsRef.current);
      lastDelta.added.forEach((k) => next.delete(k));
      lastDelta.removed.forEach((k) => next.add(k));
      stitchedCellsRef.current = next;
      setStitchedCells(next);
      persistStitchedCells(next);
      adjustStitchCounters(lastDelta.removed.length - lastDelta.added.length);
      setRedoStack((prevRedo) => [...prevRedo.slice(-59), lastDelta]);
      return prevUndo.slice(0, -1);
    });
  }, [persistStitchedCells, adjustStitchCounters]);

  const handleRedo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;
      const deltaToReapply = prevRedo[prevRedo.length - 1];
      const next = new Set(stitchedCellsRef.current);
      deltaToReapply.added.forEach((k) => next.add(k));
      deltaToReapply.removed.forEach((k) => next.delete(k));
      stitchedCellsRef.current = next;
      setStitchedCells(next);
      persistStitchedCells(next);
      adjustStitchCounters(deltaToReapply.added.length - deltaToReapply.removed.length);
      setUndoStack((prevUndo) => [...prevUndo.slice(-59), deltaToReapply]);
      return prevRedo.slice(0, -1);
    });
  }, [persistStitchedCells, adjustStitchCounters]);

  const handleImportStitchedCells = (importedCells: Set<string>, mode: 'replace' | 'merge') => {
    const prev = stitchedCellsRef.current;
    const next =
      mode === 'replace'
        ? new Set(importedCells)
        : new Set([...Array.from(prev), ...Array.from(importedCells)]);
    const added: string[] = [];
    const removed: string[] = [];
    next.forEach((k) => {
      if (!prev.has(k)) added.push(k);
    });
    prev.forEach((k) => {
      if (!next.has(k)) removed.push(k);
    });
    stitchedCellsRef.current = next;
    setStitchedCells(next);
    persistStitchedCells(next);
    pushHistoryDelta({ added, removed, description: 'Import progress' });
  };

  const handleClearProgress = () => {
    const prev = stitchedCellsRef.current;
    if (prev.size === 0) return;
    const removed = Array.from(prev);
    const empty = new Set<string>();
    stitchedCellsRef.current = empty;
    setStitchedCells(empty);
    persistStitchedCells(empty);
    pushHistoryDelta({ added: [], removed, description: 'Clear progress' });
  };

  const handleMarkColorComplete = (dmcCode: string) => {
    if (!pattern) return;
    const prev = stitchedCellsRef.current;
    const next = new Set(prev);
    const added: string[] = [];
    for (let y = 0; y < pattern.height; y++) {
      for (let x = 0; x < pattern.width; x++) {
        if (pattern.grid[y][x].dmcCode === dmcCode) {
          const key = `${x},${y}`;
          if (!next.has(key)) {
            next.add(key);
            added.push(key);
          }
        }
      }
    }
    if (added.length === 0) return;
    stitchedCellsRef.current = next;
    setStitchedCells(next);
    persistStitchedCells(next);
    adjustStitchCounters(added.length);
    pushHistoryDelta({ added, removed: [], description: `Mark DMC ${dmcCode}` });
  };

  // Initialize with default template on mount
  useEffect(() => {
    handleGeneratePattern(false);
  }, []);

  const handleCustomImageSelected = (file: File) => {
    setCustomImageFile(file);
    const url = URL.createObjectURL(file);
    setCustomImageUrl(url);
    const newItem: UploadedItem = {
      id: `${file.name}-${Date.now()}`,
      file,
      url,
      name: file.name,
      sizeFormatted: `${(file.size / 1024).toFixed(0)} KB`,
    };
    setUploadedImages((prev) => [newItem, ...prev.filter((p) => p.name !== file.name)]);
  };

  const handleMultipleImagesUploaded = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const newItems: UploadedItem[] = fileArray.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      sizeFormatted: `${(file.size / 1024).toFixed(0)} KB`,
    }));

    setUploadedImages((prev) => [...newItems, ...prev]);
    // Automatically select the first uploaded image
    setCustomImageFile(newItems[0].file);
    setCustomImageUrl(newItems[0].url);
    setUploadOption('upload');
  };

  const handleSelectUploadedImage = (item: UploadedItem) => {
    setCustomImageFile(item.file);
    setCustomImageUrl(item.url);
    setUploadOption('upload');
  };

  const handleRemoveUploadedImage = (id: string) => {
    setUploadedImages((prev) => {
      const remaining = prev.filter((i) => i.id !== id);
      if (customImageUrl && prev.find((i) => i.id === id)?.url === customImageUrl) {
        if (remaining.length > 0) {
          setCustomImageFile(remaining[0].file);
          setCustomImageUrl(remaining[0].url);
        } else {
          setCustomImageFile(null);
          setCustomImageUrl(null);
          setUploadOption('template');
        }
      }
      return remaining;
    });
  };

  const handleUnlockPro = (refNumber: string) => {
    setIsPro(true);
    try {
      localStorage.setItem('sovereign_cross_stitch_pro', 'true');
      localStorage.setItem('sovereign_gcash_ref', refNumber);
    } catch {
      // Storage fallback
    }
  };

  const handleNavClick = (section: string) => {
    setActiveSection(section);
    if (section === 'generator') {
      document.getElementById('creator-workflow')?.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'templates') {
      setUploadOption('template');
      document.getElementById('creator-workflow')?.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'calculator') {
      document.getElementById('calculator-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'licensing') {
      document.getElementById('licensing')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleApplyDimensionsFromCalculator = (w: number, h: number, count: number) => {
    setFabricCount(count);
    if (w === 300 && h === 450) {
      setGridPreset('300x450');
    } else if (w === 200 && h === 300) {
      setGridPreset('200x300');
    } else if (w === 150 && h === 150) {
      setGridPreset('150x150');
    } else if (w === 100 && h === 100) {
      setGridPreset('100x100');
    } else {
      setGridPreset('custom');
      setCustomWidth(w);
      setCustomHeight(h);
    }
    setActiveSection('generator');
    document.getElementById('creator-workflow')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleGeneratePattern = async (scrollToOutput = true) => {
    setIsGenerating(true);

    try {
      // Determine dimensions
      let targetW = 150;
      let targetH = 150;
      if (gridPreset === '300x450') {
        targetW = 300;
        targetH = 450;
      } else if (gridPreset === '200x300') {
        targetW = 200;
        targetH = 300;
      } else if (gridPreset === '150x150') {
        targetW = 150;
        targetH = 150;
      } else if (gridPreset === '100x100') {
        targetW = 100;
        targetH = 100;
      } else {
        targetW = customWidth;
        targetH = customHeight;
      }

      // Determine image source
      let source: string | File;
      let title = 'Wedding Cross Stitch Pattern';

      if (uploadOption === 'upload' && customImageFile) {
        source = customImageFile;
        title = coupleNames ? `${coupleNames} Wedding Heirloom` : 'Custom Wedding Heirloom';
      } else {
        const t = TEMPLATES[selectedTemplateKey] || TEMPLATES.rings;
        source = t.imageSrc;
        title = language === 'fil' ? t.tagalogTitle : t.title;
      }

      const generated = await processImageToPattern(
        source,
        targetW,
        targetH,
        maxColors,
        fabricCount,
        {
          title,
          coupleNames,
          weddingDate,
        }
      );

      originalGeneratedPatternRef.current = generated;
      setSwappedColorMap({});
      setPattern(generated);
      setActiveColorFilter(null);

      if (scrollToOutput) {
        setTimeout(() => {
          document.getElementById('pattern-output-section')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 150);
      }
    } catch (err) {
      console.error('Pattern generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async (proDownload: boolean) => {
    if (!pattern) return;
    setIsDownloadingPdf(true);

    try {
      const savedAnnotations = loadAnnotations(pattern.id);
      const patternWithAnnotations: PatternData = {
        ...pattern,
        annotations: savedAnnotations,
      };

      const blob = await generatePatternPdf(patternWithAnnotations, {
        isPro: proDownload,
        language,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanTitle = (pattern.coupleNames || pattern.title).replace(/[^a-zA-Z0-9]/g, '_');
      a.download = proDownload
        ? `${cleanTitle}_PRO_Wedding_Masterpiece_Booklet.pdf`
        : `${cleanTitle}_Sample_Preview_Chart.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSwapThreadColor = useCallback(
    (sourceCode: string, targetColor: DMCColor) => {
      if (sourceCode === targetColor.code) return;

      setPattern((prev) => {
        if (!prev) return prev;
        const sourceIdx = prev.palette.findIndex((c) => c.code === sourceCode);
        if (sourceIdx === -1) return prev;

        const existingTargetIdx = prev.palette.findIndex((c) => c.code === targetColor.code);
        const usedOtherSymbols = new Set<string>();
        prev.palette.forEach((c, idx) => {
          if (idx !== sourceIdx) usedOtherSymbols.add(c.symbol);
        });

        let newPalette: DMCColor[];
        if (existingTargetIdx !== -1) {
          // Merge sourceColor into existing targetColor in palette
          newPalette = prev.palette.filter((_, idx) => idx !== sourceIdx);
        } else {
          const assignedSymbol = usedOtherSymbols.has(targetColor.symbol)
            ? prev.palette[sourceIdx].symbol
            : targetColor.symbol;
          const updatedColor: DMCColor = {
            ...targetColor,
            symbol: assignedSymbol,
          };
          newPalette = prev.palette.map((c, idx) => (idx === sourceIdx ? updatedColor : c));
        }

        const codeToIndex = new Map<string, number>();
        newPalette.forEach((c, idx) => codeToIndex.set(c.code, idx));

        const counts = new Int32Array(newPalette.length);
        const newGrid = prev.grid.map((row) =>
          row.map((cell) => {
            const nextCode = cell.dmcCode === sourceCode ? targetColor.code : cell.dmcCode;
            const nextIdx = codeToIndex.get(nextCode) ?? 0;
            counts[nextIdx]++;
            return {
              ...cell,
              dmcCode: nextCode,
              colorIndex: nextIdx,
            };
          })
        );

        const total = Math.max(1, prev.totalStitches);
        const stitchesPerSkein =
          prev.fabricCount === 18
            ? 2200
            : prev.fabricCount === 16
            ? 2000
            : prev.fabricCount === 22
            ? 2600
            : 1800;

        const newColorStats = newPalette
          .map((c, idx) => {
            const count = counts[idx];
            return {
              color: c,
              count,
              percentage: (count / total) * 100,
              skeinsNeeded: Math.max(1, Math.ceil((count * 1.15) / stitchesPerSkein)),
            };
          })
          .filter((s) => s.count > 0)
          .sort((a, b) => b.count - a.count);

        const newBackstitches = prev.backstitches?.map((seg) =>
          seg.dmcCode === sourceCode
            ? { ...seg, dmcCode: targetColor.code, color: targetColor.hex }
            : seg
        );

        return {
          ...prev,
          palette: newPalette,
          grid: newGrid,
          colorStats: newColorStats,
          backstitches: newBackstitches,
          complexity: prev.complexity
            ? { ...prev.complexity, colorCount: newColorStats.length }
            : prev.complexity,
        };
      });

      setSwappedColorMap((prevMap) => {
        const nextMap: Record<string, string[]> = {};
        const inheritedSources = prevMap[sourceCode] || [sourceCode];
        Object.entries(prevMap).forEach(([code, list]) => {
          if (code !== sourceCode) {
            nextMap[code] = list;
          }
        });
        const existingTargetSources = nextMap[targetColor.code] || [];
        nextMap[targetColor.code] = Array.from(
          new Set([...existingTargetSources, ...inheritedSources])
        );
        return nextMap;
      });

      setActiveColorFilter((prevFilter) =>
        prevFilter === sourceCode ? targetColor.code : prevFilter
      );
    },
    []
  );

  const handleResetColorSwaps = useCallback(() => {
    if (!originalGeneratedPatternRef.current) return;
    setPattern(originalGeneratedPatternRef.current);
    setSwappedColorMap({});
    setActiveColorFilter(null);
  }, []);

  const fabricSpecs = pattern
    ? calculateFabricSpecs(pattern.width, pattern.height, pattern.fabricCount)
    : null;

  return (
    <div className="min-h-screen bg-linen flex flex-col font-sans">
      {/* 3-Zone Header Contract */}
      <Header
        isPro={isPro}
        onOpenCheckout={() => setShowCheckout(true)}
        onOpenCodeBox={() => setShowCodeBox(true)}
        language={language}
        setLanguage={setLanguage}
        activeSection={activeSection}
        setActiveSection={handleNavClick}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Editorial Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden border border-[#E8E1D5] bg-white shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Left Copy */}
            <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#8C7A6B] tracking-wider uppercase">
                  <span>🧵 Wedding & Heirloom Edition</span>
                  <span aria-hidden="true">·</span>
                  <span>Commercial PDF Pattern Creator</span>
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#2C2523] leading-[1.15] text-balance">
                  {language === 'fil'
                    ? 'Gawing professional multi-page cross-stitch pattern ang iyong wedding photos!'
                    : 'Transform your cherished wedding portraits into heirloom cross-stitch patterns.'}
                </h1>

                <p className="text-sm sm:text-base text-[#5F554F] leading-relaxed max-w-xl">
                  {language === 'fil'
                    ? 'Eksaktong DMC floss palette matching, 10x10 bold grid lines, kalkulasyon ng Aida cloth, at print-ready multi-page PDF booklets para sa mga wedding keepsakes at commercial pattern sellers.'
                    : 'Authentic DMC thread color quantization, 10x10 bold grid printable charts, physical Aida fabric dimensions, and high-resolution commercial multi-page PDF booklets.'}
                </p>
              </div>

              {/* Action and trust */}
              <div className="pt-8 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      document.getElementById('creator-workflow')?.scrollIntoView({
                        behavior: 'smooth',
                      });
                    }}
                    className="py-3 px-6 rounded-xl font-serif text-sm font-bold text-white bg-[#2C2523] hover:bg-[#433936] shadow-sm transition-all flex items-center gap-2"
                  >
                    <span>{language === 'fil' ? 'Simulan ang Paggawa ng Pattern' : 'Begin Pattern Creator'}</span>
                    <ArrowRight className="w-4 h-4 text-[#E6C687]" />
                  </button>

                  {!isPro ? (
                    <button
                      onClick={() => setShowCheckout(true)}
                      className="py-3 px-5 rounded-xl text-xs font-semibold text-[#2C2523] bg-[#FAF7F2] hover:bg-[#F0ECE1] border border-[#D7CBB9] transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#B88E3C]" />
                      <span>{language === 'fil' ? 'Pro License (₱499 via GCash)' : 'Pro License (₱499 GCash)'}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span>{language === 'fil' ? 'PRO Wedding License Aktibo' : 'Commercial License Active'}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-[#7A6E65] pt-2">
                  <span>DMC Mouliné Spécial</span>
                  <span aria-hidden="true">·</span>
                  <span>14 / 16 / 18 Count Aida</span>
                  <span aria-hidden="true">·</span>
                  <span>Philippines GCash Ready</span>
                </div>
              </div>
            </div>

            {/* Right Showcase Photo */}
            <div className="lg:col-span-5 relative min-h-[300px] lg:min-h-full bg-[#EAE2D5] border-t lg:border-t-0 lg:border-l border-[#E8E1D5]">
              <img
                src="/src/assets/images/hero_wedding_stitch_1793018916709.jpg"
                alt="Heirloom wedding cross stitch in embroidery hoop"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 text-white text-xs bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/20">
                <span className="font-serif font-semibold text-sm">Heirloom Handcraft Masterpiece</span>
                <p className="text-[11px] text-white/80 mt-0.5">
                  1-Year 300x450 stitch tapestry rendered with authentic DMC threads.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Section: Step 1 (Upload/Select) & Step 2 (Specs) */}
        <div id="creator-workflow" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Step 1 */}
            <DesignSelector
              uploadOption={uploadOption}
              setUploadOption={setUploadOption}
              selectedTemplateKey={selectedTemplateKey}
              setSelectedTemplateKey={setSelectedTemplateKey}
              customImageFile={customImageFile}
              customImageUrl={customImageUrl}
              uploadedImages={uploadedImages}
              onCustomImageSelected={handleCustomImageSelected}
              onMultipleImagesUploaded={handleMultipleImagesUploaded}
              onSelectUploadedImage={handleSelectUploadedImage}
              onRemoveUploadedImage={handleRemoveUploadedImage}
              coupleNames={coupleNames}
              setCoupleNames={setCoupleNames}
              weddingDate={weddingDate}
              setWeddingDate={setWeddingDate}
              language={language}
            />

            {/* Step 2 */}
            <PatternConfigurator
              gridPreset={gridPreset}
              setGridPreset={setGridPreset}
              customWidth={customWidth}
              setCustomWidth={setCustomWidth}
              customHeight={customHeight}
              setCustomHeight={setCustomHeight}
              fabricCount={fabricCount}
              setFabricCount={setFabricCount}
              maxColors={maxColors}
              setMaxColors={setMaxColors}
              noiseReduction={noiseReduction}
              setNoiseReduction={setNoiseReduction}
              confettiThreshold={confettiThreshold}
              setConfettiThreshold={setConfettiThreshold}
              activePattern={pattern}
              onGenerate={() => handleGeneratePattern(true)}
              isGenerating={isGenerating}
              language={language}
            />
          </div>
        </div>

        {/* Output Section: Grid, Downloads, Legend & Tiling Map */}
        {pattern && (
          <div id="pattern-output-section" className="space-y-8 pt-4">
            {/* Generated Summary Card & Download Action Bar */}
            <div className="bg-white rounded-2xl border border-[#E8E1D5] shadow-xs p-6 sm:p-8 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[#F0ECE1] pb-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md w-fit mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      {language === 'fil'
                        ? '🎉 Tagumpay! Handa na ang iyong Wedding Cross Stitch Pattern.'
                        : 'Success! Your Wedding Cross Stitch Pattern is ready.'}
                    </span>
                  </div>

                  <h2 className="font-serif text-3xl font-bold text-[#2C2523]">
                    {pattern.title}
                  </h2>

                  {(pattern.coupleNames || pattern.weddingDate) && (
                    <p className="text-sm text-[#7A6E65] mt-1">
                      {[pattern.coupleNames, pattern.weddingDate].filter(Boolean).join(' · ')}
                    </p>
                  )}

                  {/* Difficulty Rating Pill Badge */}
                  {pattern.complexity && (
                    <div className="flex flex-wrap items-center gap-2.5 mt-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-[#7A6E65] uppercase tracking-wider">
                          {language === 'fil' ? 'Antas ng Hirap:' : 'Difficulty Rating:'}
                        </span>
                        {pattern.complexity.tier === 'Beginner' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            <span>{language === 'fil' ? pattern.complexity.tagalogTier : 'Beginner Friendly'}</span>
                          </span>
                        )}
                        {pattern.complexity.tier === 'Intermediate' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-amber-600" />
                            <span>{language === 'fil' ? pattern.complexity.tagalogTier : 'Intermediate Level'}</span>
                          </span>
                        )}
                        {pattern.complexity.tier === 'Masterpiece' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#2C2523] text-[#E6C687] border border-[#B88E3C] shadow-sm">
                            <Sparkles className="w-3.5 h-3.5 text-[#E6C687]" />
                            <span>{language === 'fil' ? pattern.complexity.tagalogTier : '1-Year Heirloom Masterpiece'}</span>
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-mono text-[#8C8077]">
                        · {pattern.complexity.confettiPercentage}% Confetti Frequency
                      </span>
                    </div>
                  )}
                </div>

                {/* Download CTA cluster */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {isPro ? (
                    <button
                      onClick={() => handleDownloadPdf(true)}
                      disabled={isDownloadingPdf}
                      className="py-3 px-6 rounded-xl font-serif text-sm font-bold text-white bg-[#2C2523] hover:bg-[#433936] active:scale-[0.99] shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-75"
                    >
                      {isDownloadingPdf ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 text-[#E6C687]" />
                      )}
                      <span>
                        {language === 'fil'
                          ? '📥 I-download ang Buong PRO PDF Pattern (Multi-Page)'
                          : '📥 Download Full PRO PDF Booklet (Multi-Page)'}
                      </span>
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => handleDownloadPdf(false)}
                        disabled={isDownloadingPdf}
                        className="py-2.5 px-4 rounded-xl text-xs font-semibold text-[#2C2523] bg-[#FAF7F2] hover:bg-[#F0ECE1] border border-[#D7CBB9] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                      >
                        {isDownloadingPdf ? (
                          <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5 text-[#5F554F]" />
                        )}
                        <span>
                          {language === 'fil'
                            ? '📥 I-download ang Free Preview PDF'
                            : '📥 Download Free Preview PDF'}
                        </span>
                      </button>

                      <button
                        onClick={() => setShowCheckout(true)}
                        className="py-2.5 px-5 rounded-xl font-serif text-xs font-bold text-white bg-[#2C2523] hover:bg-[#433936] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#E6C687]" />
                        <span>
                          {language === 'fil'
                            ? 'Bumili ng Pro License (₱499 via GCash)'
                            : 'Unlock Full Multi-Page Booklet (₱499)'}
                        </span>
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowPatternImageExportModal(true)}
                    className="py-2.5 px-4 rounded-xl text-xs font-semibold text-[#2C2523] bg-[#FAF7F2] hover:bg-[#F0ECE1] border border-[#D7CBB9] transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                    title={
                      language === 'fil'
                        ? 'I-export ang pattern grid bilang high-quality PNG o JPG image'
                        : 'Export the rendered pattern grid as a high-quality PNG or JPG image'
                    }
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-[#B88E3C]" />
                    <span>{language === 'fil' ? 'Export PNG / JPG' : 'Export PNG / JPG'}</span>
                  </button>
                </div>
              </div>

              {/* Free Tier Notice if not Pro */}
              {!isPro && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950">
                  <div className="space-y-0.5">
                    <span className="font-bold">
                      💡 {language === 'fil' ? 'Paalala ukol sa Free Tier:' : 'Free Tier Preview Mode:'}
                    </span>
                    <p className="text-amber-900/90">
                      {language === 'fil'
                        ? 'Na-generate ang Free Sample Preview (Page 1 na may watermark). Para ma-download ang buong Multi-Page booklet, 10x10 print charts, at kumpletong DMC floss key, mag-upgrade sa PRO (₱499 via GCash).'
                        : 'Free tier includes Page 1 Sample Preview with watermark. Upgrade to PRO (₱499 GCash) for complete multi-page chart sheets, commercial sales rights, and full DMC legend.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCheckout(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-900 text-white font-medium hover:bg-amber-850 shrink-0 text-xs"
                  >
                    {language === 'fil' ? 'I-upgrade sa PRO' : 'Upgrade to PRO'}
                  </button>
                </div>
              )}

              {/* Quick specs grid */}
              {fabricSpecs && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs pt-1">
                  <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5]">
                    <span className="text-[11px] text-[#7A6E65]">Total Stitches</span>
                    <div className="font-mono font-bold text-sm text-[#2C2523] mt-0.5">
                      {pattern.totalStitches.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-[#8C8077]">{pattern.width} x {pattern.height}</span>
                  </div>

                  <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5]">
                    <span className="text-[11px] text-[#7A6E65]">DMC Palette</span>
                    <div className="font-mono font-bold text-sm text-[#2C2523] mt-0.5">
                      {pattern.palette.length} Colors
                    </div>
                    <span className="text-[10px] text-[#8C8077]">Authentic Floss</span>
                  </div>

                  <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5]">
                    <span className="text-[11px] text-[#7A6E65]">Fabric Count</span>
                    <div className="font-mono font-bold text-sm text-[#2C2523] mt-0.5">
                      {pattern.fabricCount} Count
                    </div>
                    <span className="text-[10px] text-[#8C8077]">Standard Aida</span>
                  </div>

                  <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5]">
                    <span className="text-[11px] text-[#7A6E65]">Design Dimensions</span>
                    <div className="font-mono font-bold text-sm text-[#2C2523] mt-0.5">
                      {fabricSpecs.widthInches}" × {fabricSpecs.heightInches}"
                    </div>
                    <span className="text-[10px] text-[#8C8077]">{fabricSpecs.widthCm} x {fabricSpecs.heightCm} cm</span>
                  </div>

                  <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5]">
                    <span className="text-[11px] text-[#7A6E65]">Cut Fabric (+3")</span>
                    <div className="font-mono font-bold text-sm text-[#2C2523] mt-0.5">
                      {fabricSpecs.cutFabricInchesW}" × {fabricSpecs.cutFabricInchesH}"
                    </div>
                    <span className="text-[10px] text-[#8C8077]">For Framing</span>
                  </div>

                  <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5]">
                    <span className="text-[11px] text-[#7A6E65]">Total Skeins</span>
                    <div className="font-mono font-bold text-sm text-[#2C2523] mt-0.5">
                      ~{pattern.colorStats.reduce((acc, c) => acc + c.skeinsNeeded, 0)} Skeins
                    </div>
                    <span className="text-[10px] text-[#8C8077]">8m 2-Strand Use</span>
                  </div>
                </div>
              )}

              {/* Pattern Complexity Analysis & Project Expectations Panel */}
              {pattern.complexity && (
                <div className="bg-white border border-[#E8E1D5] rounded-xl p-5 space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0ECE1] pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] border border-[#E8E1D5] flex items-center justify-center text-[#B88E3C] font-bold text-sm">
                        📊
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-lg text-[#2C2523] leading-snug">
                          {language === 'fil' ? 'Pagsusuri sa Complexity at Inaasahang Oras' : 'Pattern Complexity & Project Expectations'}
                        </h4>
                        <p className="text-[11px] text-[#7A6E65]">
                          {language === 'fil'
                            ? 'Pagtatasa sa dami ng kulay, dalas ng confetti stitches, at gabay sa pagtatahi.'
                            : 'Analyzed from thread count, confetti frequency, and stitch distribution to manage project expectations.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-xs text-[#7A6E65]">Complexity Index:</span>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#E8E1D5] text-[#2C2523]">
                        {pattern.complexity.score}/10
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    {/* Metric 1: Difficulty Tier */}
                    <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5] space-y-1">
                      <div className="text-[11px] text-[#7A6E65] font-medium uppercase tracking-wider">
                        {language === 'fil' ? 'Antas ng Hirap (Difficulty)' : 'Difficulty Tier'}
                      </div>
                      <div className="font-serif font-bold text-base text-[#2C2523]">
                        {pattern.complexity.tier}
                      </div>
                      <div className="text-[11px] text-[#7A6E65]">
                        {language === 'fil' ? pattern.complexity.tagalogTier : `${pattern.palette.length} active DMC colors`}
                      </div>
                    </div>

                    {/* Metric 2: Confetti Frequency */}
                    <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5] space-y-1">
                      <div className="text-[11px] text-[#7A6E65] font-medium uppercase tracking-wider">
                        {language === 'fil' ? 'Dalas ng Confetti (Speckling)' : 'Confetti Stitching Frequency'}
                      </div>
                      <div className="font-mono font-bold text-base text-[#2C2523]">
                        {pattern.complexity.confettiPercentage}%
                      </div>
                      <div className="text-[11px] text-[#7A6E65]">
                        {pattern.complexity.confettiLevel}
                      </div>
                    </div>

                    {/* Metric 3: Timeline Expectation */}
                    <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5] space-y-1">
                      <div className="text-[11px] text-[#7A6E65] font-medium uppercase tracking-wider">
                        {language === 'fil' ? 'Tantiya ng Panahon (Timeline)' : 'Estimated Duration'}
                      </div>
                      <div className="font-serif font-bold text-base text-[#2C2523]">
                        {pattern.complexity.estimatedMonths}
                      </div>
                      <div className="text-[11px] text-[#7A6E65]">
                        Standard pace (~90 stitches/hour)
                      </div>
                    </div>
                  </div>

                  {/* Recommendation / Advice Box */}
                  <div className="p-3.5 bg-[#FBF9F5] border border-[#EBE4D8] rounded-lg text-xs space-y-1">
                    <div className="font-semibold text-[#2C2523] flex items-center gap-1.5">
                      <span>💡</span>
                      <span>{language === 'fil' ? 'Payo para sa Matagumpay na Pananahi:' : 'Stitcher Recommendation & Technique Guide:'}</span>
                    </div>
                    <p className="text-[11px] text-[#5F554F] leading-relaxed">
                      {language === 'fil' ? pattern.complexity.tagalogAdvice : pattern.complexity.stitchingAdvice}
                    </p>
                  </div>
                </div>
              )}

              {/* Visual Breakdown: D3.js Thread Color Distribution Pie Chart */}
              <ThreadDistributionChart
                pattern={pattern}
                language={language}
                activeColorFilter={activeColorFilter}
                onSelectColor={setActiveColorFilter}
              />

              {/* Estimated Cost of Materials (Thread + Aida Fabric) for Client Quotes */}
              {fabricSpecs && (
                <MaterialCostEstimator
                  pattern={pattern}
                  fabricSpecs={fabricSpecs}
                  language={language}
                />
              )}

              {/* Estimated Hourly Stitches & Stitching Velocity Tracker in Summary Card */}
              <EstimatedHourlyStitchesCard
                pattern={pattern}
                stitchedCount={stitchedCells.size}
                sessionStitches={sessionStitches}
                todayStitches={todayStitches}
                dailyGoalTarget={dailyGoalTarget}
                timerData={timerData}
                sessionSeconds={sessionSeconds}
                isRunning={isSessionTimerRunning}
                onToggleTimer={handleToggleSessionTimer}
                onFinishSession={handleFinishSession}
                onResetSession={handleResetSession}
                onUpdatePace={handleUpdateTimerPace}
                language={language}
              />

              {/* Visual Percentage Completion Bar in Summary Card */}
              <div className="bg-[#FAF7F2] p-4.5 rounded-xl border border-[#E8E1D5] space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-serif font-bold text-base text-[#2C2523]">
                      {language === 'fil' ? 'Stitch Progress & Completion Bar' : 'Stitch Progress & Completion'}
                    </span>
                    <span className="text-[11px] text-[#7A6E65]">
                      · {language === 'fil' ? 'I-click ang mga tahi sa chart para i-marka' : 'Click stitches in viewer to mark'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold text-emerald-800">
                        {((stitchedCells.size / pattern.totalStitches) * 100).toFixed(1)}%
                      </span>
                      <span className="font-mono text-xs text-[#5F554F]">
                        ({stitchedCells.size.toLocaleString()} / {pattern.totalStitches.toLocaleString()} stitches)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowShareProgressModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2C2523] hover:bg-[#433936] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      title={
                        language === 'fil'
                          ? 'Gumawa ng progress image at social media post para sa Instagram o Facebook'
                          : 'Generate a pre-filled social post and progress percentage image for Instagram or Facebook'
                      }
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#E6C687]" />
                      <span>{language === 'fil' ? 'Share Progress' : 'Share Progress'}</span>
                    </button>
                  </div>
                </div>

                {/* Animated Gradient Bar */}
                <div className="w-full h-3.5 bg-[#EAE2D5] rounded-full overflow-hidden p-0.5 border border-[#D7CBB9]">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 rounded-full transition-all duration-300 shadow-xs"
                    style={{
                      width: `${Math.min(100, Math.max(0, (stitchedCells.size / pattern.totalStitches) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Visual Progress Tracker Interactive Control Strip */}
            <StitchProgressTracker
              pattern={pattern}
              stitchedCount={stitchedCells.size}
              sessionStitches={sessionStitches}
              onResetSessionStitches={handleResetSession}
              markMode={markMode}
              setMarkMode={setMarkMode}
              onClearProgress={handleClearProgress}
              onMarkColorComplete={handleMarkColorComplete}
              activeColorFilter={activeColorFilter}
              language={language}
              stitchedCells={stitchedCells}
              onImportStitchedCells={handleImportStitchedCells}
              dailyTarget={dailyGoalTarget}
              onUpdateDailyTarget={handleUpdateDailyTarget}
              todayStitches={todayStitches}
              onLogFocusProgress={handleLogFocusProgress}
              externalTimerData={timerData}
              externalSessionSeconds={sessionSeconds}
              externalIsRunning={isSessionTimerRunning}
              onExternalToggleTimer={handleToggleSessionTimer}
              onExternalFinishSession={handleFinishSession}
              onExternalResetSession={handleResetSession}
              onExternalUpdatePace={handleUpdateTimerPace}
              onExternalClearHistory={handleClearTimerHistory}
            />

            {/* Interactive Stitch Viewer */}
            <div id="stitch-viewer-section">
              <StitchViewer
                pattern={pattern}
                activeColorFilter={activeColorFilter}
                onSelectColor={setActiveColorFilter}
                language={language}
                stitchedCells={stitchedCells}
                onToggleStitch={handleToggleStitch}
                onMarkStitch={handleMarkStitch}
                markMode={markMode}
                setMarkMode={setMarkMode}
                sessionStitches={sessionStitches}
                onResetSessionStitches={handleResetSession}
                onImportStitchedCells={handleImportStitchedCells}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onCommitHistory={handleCommitHistory}
                externalTimerData={timerData}
                externalSessionSeconds={sessionSeconds}
                externalIsRunning={isSessionTimerRunning}
                onExternalToggleTimer={handleToggleSessionTimer}
              />
            </div>

            {/* Two Column Row: Booklet Page Tiling Map & DMC Floss Key Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5">
                <PageOverviewMap
                  pattern={pattern}
                  isPro={isPro}
                  onOpenCheckout={() => setShowCheckout(true)}
                  language={language}
                />
              </div>

              <div className="lg:col-span-7">
                <FlossLegendTable
                  pattern={pattern}
                  activeColorFilter={activeColorFilter}
                  onSelectColor={setActiveColorFilter}
                  language={language}
                  onSwapThreadColor={handleSwapThreadColor}
                  swappedFromMap={swappedColorMap}
                  onResetColorSwaps={handleResetColorSwaps}
                />
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Final Stitched Dimensions & AIDA Fabric Calculator */}
        <div id="calculator-section" className="space-y-6">
          <FabricCalculator
            initialWidth={pattern ? pattern.width : customWidth}
            initialHeight={pattern ? pattern.height : customHeight}
            initialCount={fabricCount}
            onApplyToGenerator={handleApplyDimensionsFromCalculator}
            language={language}
          />
        </div>

        {/* Commercial Licensing & FAQ Section */}
        <div id="licensing" className="bg-white rounded-2xl border border-[#E8E1D5] shadow-xs p-8 space-y-6">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold text-[#8C7A6B] uppercase tracking-wider mb-1">
              {language === 'fil' ? '💎 Commercial Licensing & Pagpepresyo' : '💎 Commercial Licensing & Pricing'}
            </div>
            <h3 className="font-serif text-3xl font-bold text-[#2C2523]">
              {language === 'fil' ? 'Binuo para sa mga Artisano, Crafters, at Tindahan' : 'Crafted for Artisans, Keepsake Makers & Commercial Sellers'}
            </h3>
            <p className="text-xs sm:text-sm text-[#5F554F] mt-1.5">
              {language === 'fil'
                ? 'Mag-stitch para sa sarili o ibenta ang inyong mga natapos na wedding tapestries sa mga kasalan at bazaars nang may buong commercial rights.'
                : 'Stitch for personal heirlooms or sell physical completed tapestries and digital patterns with zero royalties.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Free Tier */}
            <div className="border border-[#E8E1D5] rounded-xl p-6 bg-[#FAF7F2] space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-xl font-bold text-[#2C2523]">
                    {language === 'fil' ? 'Libreng Bersyon (Free Tier)' : 'Free Tier Preview'}
                  </h4>
                  <span className="font-mono text-xs font-bold text-[#7A6E65]">₱0</span>
                </div>
                <p className="text-xs text-[#7A6E65]">
                  {language === 'fil'
                    ? 'Magandang simula para subukan ang kulay at tingnan ang 1-page sample preview ng pattern.'
                    : 'Ideal for testing photo conversion, previewing thread palette, and sampling 1 page of the grid.'}
                </p>
                <div className="space-y-2 text-xs text-[#5F554F] pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700">✓</span>
                    <span>Interactive Real Stitch & Symbol Viewer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700">✓</span>
                    <span>Fabric Sizing & DMC Thread Counter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700">✓</span>
                    <span>1-Page Sample PDF Chart (Watermarked)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#A89C92]">
                    <span>✕</span>
                    <span>Full Multi-Page Printable PDF Booklet</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#A89C92]">
                    <span>✕</span>
                    <span>Commercial Selling License</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E8E1D5]">
                <div className="text-xs text-[#8C8077] italic">
                  {language === 'fil' ? 'Kasalukuyang kasama bilang libreng preview' : 'Included by default as free preview'}
                </div>
              </div>
            </div>

            {/* PRO Wedding Bundle */}
            <div className="border-2 border-[#2C2523] rounded-xl p-6 bg-white space-y-4 shadow-sm flex flex-col justify-between relative">
              <div className="absolute -top-3 right-6 bg-[#2C2523] text-[#E6C687] text-[11px] font-bold px-3 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                {language === 'fil' ? 'Inirerekomenda' : 'Recommended'}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-xl font-bold text-[#2C2523]">
                    {language === 'fil' ? 'PRO Wedding Bundle' : 'PRO Wedding & Commercial Bundle'}
                  </h4>
                  <span className="font-mono text-xl font-bold text-[#2C2523]">₱499</span>
                </div>
                <p className="text-xs text-[#7A6E65]">
                  {language === 'fil'
                    ? 'Walang limitasyong High-Res Multi-Page PDF Patterns + Buong DMC Legend & 10x10 Grid Tiling.'
                    : 'Unlimited high-resolution multi-page PDF patterns + full DMC legend, 10x10 bold tiling & commercial license.'}
                </p>
                <div className="space-y-2 text-xs text-[#2C2523] pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span>{language === 'fil' ? 'Unlimited Multi-Page PDF Pattern Booklets' : 'Unlimited Multi-Page PDF Pattern Booklets'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span>{language === 'fil' ? '100% Watermark-Free & Print-Ready (300 DPI)' : '100% Watermark-Free & Print-Ready (300 DPI)'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span>{language === 'fil' ? 'Full DMC Floss Breakdown at CSV Export' : 'Full DMC Thread Legend & CSV Export'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span>{language === 'fil' ? 'Commercial License para sa pagbenta ng gawa' : 'Commercial License to sell completed tapestries'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span>{language === 'fil' ? 'Suporta para sa 1-Year Heirloom scale (300x450)' : 'Support for 1-Year Masterpiece scale (300x450)'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#F0ECE1]">
                {isPro ? (
                  <div className="w-full py-2.5 px-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>{language === 'fil' ? 'Aktibo na ang iyong PRO License' : 'Your PRO License is Active'}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCheckout(true)}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#2C2523] hover:bg-[#433936] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#E6C687]" />
                    <span>
                      {language === 'fil'
                        ? 'Bumili ng Pro License (₱499 via GCash)'
                        : 'Upgrade to PRO (₱499 GCash)'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8E1D5] bg-white py-8 mt-12 text-xs text-[#7A6E65]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-sm text-[#2C2523]">Sovereign Cross Stitch</span>
            <span>·</span>
            <span>Wedding & Heirloom Edition</span>
          </div>

          <div className="flex items-center gap-4 text-[#8C8077]">
            <span>Authentic DMC Thread Database</span>
            <span>·</span>
            <span>10x10 Bold Grid Standard</span>
            <span>·</span>
            <span>GCash Supported</span>
          </div>

          <div className="text-[#8C8077]">
            © {new Date().getFullYear()} Sovereign Needlework Studio.
          </div>
        </div>
      </footer>

      {/* GCash Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onUnlockPro={handleUnlockPro}
        language={language}
      />

      {/* Clean Code Box Modal */}
      <CodeViewerModal
        isOpen={showCodeBox}
        onClose={() => setShowCodeBox(false)}
        language={language}
      />

      {/* Social Share Progress Modal */}
      {pattern && (
        <ShareProgressModal
          isOpen={showShareProgressModal}
          onClose={() => setShowShareProgressModal(false)}
          pattern={pattern}
          stitchedCells={stitchedCells}
          todayStitches={todayStitches}
          language={language}
        />
      )}

      {/* High-Resolution Pattern Grid Image Export Modal (PNG / JPG) */}
      {pattern && (
        <PatternImageExportModal
          isOpen={showPatternImageExportModal}
          onClose={() => setShowPatternImageExportModal(false)}
          pattern={pattern}
          stitchedCells={stitchedCells}
          language={language}
        />
      )}

      {/* Auto-Save Progress Toast Notification */}
      {saveToast && (
        <div
          key={saveToast.id}
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 max-w-xs sm:max-w-sm rounded-xl shadow-2xl border px-3.5 py-2.5 flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            saveToast.isError
              ? 'bg-rose-950 text-rose-50 border-rose-500/60'
              : 'bg-[#2C2523] text-[#FAF7F2] border-[#B88E3C]/60'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              saveToast.isError
                ? 'bg-rose-500/20 text-rose-300'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
            }`}
          >
            {saveToast.isError ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <HardDrive className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-bold leading-tight">
              <span>
                {saveToast.isError
                  ? language === 'fil'
                    ? 'Hindi na-save sa browser storage'
                    : 'Local storage quota full'
                  : language === 'fil'
                  ? 'Na-save ang progreso'
                  : 'Progress auto-saved'}
              </span>
              {!saveToast.isError && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#E6C687]/90 mt-0.5 truncate">
              {saveToast.isError
                ? language === 'fil'
                  ? 'Gumamit ng Backup & Sync export'
                  : 'Use Backup & Sync to save file'
                : `${saveToast.stitchedCount.toLocaleString()} / ${saveToast.totalStitches.toLocaleString()} ${
                    language === 'fil' ? 'tahi' : 'sts'
                  } (${
                    saveToast.totalStitches > 0
                      ? ((saveToast.stitchedCount / saveToast.totalStitches) * 100).toFixed(1)
                      : '0.0'
                  }%) · ${saveToast.timestamp}`}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSaveToast(null)}
            className="p-1 rounded-md text-[#A69B92] hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label={language === 'fil' ? 'Isara ang abiso' : 'Dismiss save notification'}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
