import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  Target,
  Flame,
  Sparkles,
  Edit2,
  Check,
  Award,
  Timer,
  Play,
  Pause,
  Square,
  Plus,
  Minus,
  Clock,
  Zap,
  Undo2,
  Trophy,
  Flag,
  Trash2,
  X as XIcon,
  Database,
} from 'lucide-react';
import { PatternData, ProjectMilestone, PercentageMilestone, StitchTimerData } from '../types';
import { StitchSessionTimer } from './StitchSessionTimer';
import { MilestoneTracker } from './MilestoneTracker';
import { PercentageMilestoneCelebration } from './PercentageMilestoneCelebration';
import { ProgressBackupModal } from './ProgressBackupModal';

interface StitchProgressTrackerProps {
  pattern: PatternData;
  stitchedCount: number;
  sessionStitches: number;
  onResetSessionStitches: () => void;
  markMode: boolean;
  setMarkMode: (mode: boolean) => void;
  onClearProgress: () => void;
  onMarkColorComplete?: (dmcCode: string) => void;
  activeColorFilter: string | null;
  language: 'en' | 'fil';
  stitchedCells: Set<string>;
  onBatchMarkStitches?: (keys: string[], mark: boolean) => void;
  highlightedMilestone?: ProjectMilestone | null;
  onHighlightMilestone?: (milestone: ProjectMilestone | null) => void;
  dailyTarget?: number;
  onUpdateDailyTarget?: (newTarget: number) => void;
  todayStitches?: number;
  onLogFocusProgress?: (stitchesCount: number, elapsedMinutes: number) => void;
  onImportStitchedCells?: (cells: Set<string>, mode: 'replace' | 'merge') => void;
  externalTimerData?: StitchTimerData;
  externalSessionSeconds?: number;
  externalIsRunning?: boolean;
  onExternalToggleTimer?: () => void;
  onExternalFinishSession?: () => void;
  onExternalResetSession?: () => void;
  onExternalUpdatePace?: (newPace: number) => void;
  onExternalClearHistory?: () => void;
}

export const StitchProgressTracker: React.FC<StitchProgressTrackerProps> = ({
  pattern,
  stitchedCount,
  sessionStitches,
  onResetSessionStitches,
  markMode,
  setMarkMode,
  onClearProgress,
  onMarkColorComplete,
  activeColorFilter,
  language,
  stitchedCells,
  onBatchMarkStitches = () => {},
  highlightedMilestone = null,
  onHighlightMilestone = () => {},
  dailyTarget = 100,
  onUpdateDailyTarget,
  todayStitches = 0,
  onLogFocusProgress,
  onImportStitchedCells,
  externalTimerData,
  externalSessionSeconds,
  externalIsRunning,
  onExternalToggleTimer,
  onExternalFinishSession,
  onExternalResetSession,
  onExternalUpdatePace,
  onExternalClearHistory,
}) => {
  const [localTarget, setLocalTarget] = useState<number>(dailyTarget || 100);
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [goalInput, setGoalInput] = useState<string>(String(dailyTarget || 100));
  const [showBackupModal, setShowBackupModal] = useState<boolean>(false);

  // Focus Timer Feature State
  const [isFocusRunning, setIsFocusRunning] = useState<boolean>(false);
  const [focusSeconds, setFocusSeconds] = useState<number>(0);
  const [focusTargetMinutes, setFocusTargetMinutes] = useState<number>(25); // 0 = open, 20, 25, 30, 45
  const [showLogDialog, setShowLogDialog] = useState<boolean>(false);
  const [manualStitchesToLog, setManualStitchesToLog] = useState<number>(35);
  const [focusToast, setFocusToast] = useState<string | null>(null);

  // Focus Timer tick effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isFocusRunning) {
      interval = setInterval(() => {
        setFocusSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isFocusRunning]);

  // Estimated stitches based on average cross-stitch pace (~1.5 stitches/minute)
  const estimatedStitches = Math.max(1, Math.round((focusSeconds / 60) * 1.5));

  const handleStartFocusTimer = () => {
    setIsFocusRunning(true);
  };

  const handlePauseFocusTimer = () => {
    setIsFocusRunning(false);
  };

  const handleResetFocusTimer = () => {
    setIsFocusRunning(false);
    setFocusSeconds(0);
    setShowLogDialog(false);
  };

  const handleOpenLogFocus = () => {
    setIsFocusRunning(false);
    setManualStitchesToLog(estimatedStitches);
    setShowLogDialog(true);
  };

  const handleConfirmLogFocus = () => {
    const elapsedMinutes = Math.max(1, Math.round(focusSeconds / 60));
    const stitches = Math.max(1, manualStitchesToLog);
    if (onLogFocusProgress) {
      onLogFocusProgress(stitches, elapsedMinutes);
    }
    setFocusToast(
      language === 'fil'
        ? `🎉 Na-log ang +${stitches} tahi mula sa iyong ${elapsedMinutes}-minutong focus session!`
        : `🎉 Logged +${stitches} stitches from your ${elapsedMinutes}-minute focus session!`
    );
    setTimeout(() => setFocusToast(null), 3500);
    setShowLogDialog(false);
    setFocusSeconds(0);
  };

  const formatTimerDigits = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const next = dailyTarget || 100;
    setLocalTarget(next);
    setGoalInput(String(next));
  }, [dailyTarget]);

  const total = pattern.totalStitches;
  const percentage = total > 0 ? (stitchedCount / total) * 100 : 0;
  const remaining = Math.max(0, total - stitchedCount);

  // Default Percentage-based Milestones with user-requested examples: '25% Complete', 'Wedding Day Ready'
  const DEFAULT_PERCENTAGE_MILESTONES: PercentageMilestone[] = [
    {
      id: `pct_25_${pattern.id}`,
      patternId: pattern.id,
      percentage: 25,
      title: language === 'fil' ? '25% Tapos na (Unang Yugto)' : '25% Complete',
      description:
        language === 'fil'
          ? 'Unang sangkapat ng disensyo! Nabubuo na ang pangunahing outline at mga bulaklak.'
          : 'First quarter completed! The fundamental outlines and bridal motifs are clearly emerging.',
      icon: '✨',
      colorTheme: 'amber',
    },
    {
      id: `pct_50_${pattern.id}`,
      patternId: pattern.id,
      percentage: 50,
      title: language === 'fil' ? 'Kalahati ng Pamanang Puso' : '50% Halfway Cherished',
      description:
        language === 'fil'
          ? 'Nasa kalahati ka na! Ang gitnang disenyo ng kasal ay buhay na buhay na.'
          : 'Halfway point reached! The central wedding composition and vibrant colors are alive.',
      icon: '🌸',
      colorTheme: 'emerald',
    },
    {
      id: `pct_75_${pattern.id}`,
      patternId: pattern.id,
      percentage: 75,
      title: language === 'fil' ? 'Panghuling Detalye at Gilid' : '75% Final Details & Accents',
      description:
        language === 'fil'
          ? 'Papalapit na sa finish line! Ang mga detalyadong beadwork at mga lace border na lang.'
          : 'The home stretch! Intricate floral borders, veil highlights, and fine French knots underway.',
      icon: '💍',
      colorTheme: 'indigo',
    },
    {
      id: `pct_100_${pattern.id}`,
      patternId: pattern.id,
      percentage: 100,
      title: language === 'fil' ? 'Handa na sa Araw ng Kasal' : 'Wedding Day Ready',
      description:
        language === 'fil'
          ? '100% Ganap na Natapos! Handa nang i-frame at i-display bilang walang kupas na pamana!'
          : '100% Flawlessly completed! Your heirloom wedding embroidery is framed and ready for the altar!',
      icon: '🎉',
      colorTheme: 'gold',
    },
  ];

  const [percentageMilestones, setPercentageMilestones] = useState<PercentageMilestone[]>(() => {
    try {
      const raw = localStorage.getItem(`sovereign_pct_milestones_${pattern.id}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_PERCENTAGE_MILESTONES;
  });

  const [celebratedMilestoneIds, setCelebratedMilestoneIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`sovereign_celebrated_pct_${pattern.id}`);
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  });

  const [activeCelebration, setActiveCelebration] = useState<PercentageMilestone | null>(null);
  const [isAddingMilestone, setIsAddingMilestone] = useState<boolean>(false);
  const [newPctValue, setNewPctValue] = useState<number>(30);
  const [newPctTitle, setNewPctTitle] = useState<string>('');
  const [newPctDescription, setNewPctDescription] = useState<string>('');
  const [newPctIcon, setNewPctIcon] = useState<string>('💍');
  const [newPctColor, setNewPctColor] = useState<'emerald' | 'amber' | 'rose' | 'indigo' | 'gold'>('gold');

  // Reload percentage milestones when pattern changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`sovereign_pct_milestones_${pattern.id}`);
      setPercentageMilestones(raw ? JSON.parse(raw) : DEFAULT_PERCENTAGE_MILESTONES);
      const celebratedRaw = localStorage.getItem(`sovereign_celebrated_pct_${pattern.id}`);
      setCelebratedMilestoneIds(celebratedRaw ? new Set(JSON.parse(celebratedRaw)) : new Set());
    } catch {
      setPercentageMilestones(DEFAULT_PERCENTAGE_MILESTONES);
      setCelebratedMilestoneIds(new Set());
    }
  }, [pattern.id]);

  // Automatically trigger celebration animation when a milestone is newly reached!
  useEffect(() => {
    if (percentage <= 0) return;

    percentageMilestones.forEach((m) => {
      if (percentage >= m.percentage && !celebratedMilestoneIds.has(m.id)) {
        // Trigger celebration animation!
        setActiveCelebration(m);

        setCelebratedMilestoneIds((prev) => {
          const next = new Set(prev);
          next.add(m.id);
          try {
            localStorage.setItem(
              `sovereign_celebrated_pct_${pattern.id}`,
              JSON.stringify(Array.from(next))
            );
          } catch {}
          return next;
        });
      }
    });
  }, [percentage, percentageMilestones, celebratedMilestoneIds, pattern.id]);

  const handleAddPercentageMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = newPctTitle.trim();
    if (!cleanTitle) return;

    const validPct = Math.max(1, Math.min(100, Number(newPctValue) || 25));
    const newMilestone: PercentageMilestone = {
      id: `pct_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      patternId: pattern.id,
      percentage: validPct,
      title: cleanTitle,
      description: newPctDescription.trim() || undefined,
      icon: newPctIcon,
      colorTheme: newPctColor,
    };

    const nextList = [...percentageMilestones, newMilestone].sort((a, b) => a.percentage - b.percentage);
    setPercentageMilestones(nextList);
    try {
      localStorage.setItem(`sovereign_pct_milestones_${pattern.id}`, JSON.stringify(nextList));
    } catch {}

    // If already at or above this percentage, celebrate immediately!
    if (percentage >= validPct) {
      setActiveCelebration(newMilestone);
      setCelebratedMilestoneIds((prev) => {
        const next = new Set(prev);
        next.add(newMilestone.id);
        try {
          localStorage.setItem(
            `sovereign_celebrated_pct_${pattern.id}`,
            JSON.stringify(Array.from(next))
          );
        } catch {}
        return next;
      });
    }

    // Reset form
    setNewPctTitle('');
    setNewPctDescription('');
    setIsAddingMilestone(false);
  };

  const handleDeletePercentageMilestone = (id: string) => {
    const nextList = percentageMilestones.filter((m) => m.id !== id);
    setPercentageMilestones(nextList);
    try {
      localStorage.setItem(`sovereign_pct_milestones_${pattern.id}`, JSON.stringify(nextList));
    } catch {}
  };

  // Daily Stitch Goal comparison calculation
  const actualToday = Math.max(todayStitches || 0, sessionStitches || 0);
  const target = onUpdateDailyTarget ? (dailyTarget || 100) : localTarget;
  const goalPercentage = Math.round((actualToday / Math.max(1, target)) * 100);
  const isGoalAchieved = actualToday >= target;
  const stitchesNeededToday = Math.max(0, target - actualToday);

  const handleSaveGoal = (val: number) => {
    const valid = Math.max(10, Math.min(5000, Math.round(val) || 100));
    setLocalTarget(valid);
    if (onUpdateDailyTarget) {
      onUpdateDailyTarget(valid);
    }
    setGoalInput(String(valid));
    setIsEditingGoal(false);
  };

  return (
    <div className="bg-white rounded-xl border border-[#E8E1D5] shadow-xs p-5 space-y-5">
      {/* Header with Title and Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0ECE1] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif text-lg font-bold text-[#2C2523] leading-snug">
              {language === 'fil' ? 'Stitch Progress Tracker' : 'Visual Stitch Progress Tracker'}
            </h4>
            <p className="text-[11px] text-[#7A6E65]">
              {language === 'fil'
                ? 'I-click o i-drag ang cursor sa stitch viewer upang i-marka ang natapos nang mga tahi.'
                : 'Click or drag across the stitch viewer to mark completed stitches in real-time.'}
            </p>
          </div>
        </div>

        {/* Toggle Marking Mode */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMarkMode(!markMode)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              markMode
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                : 'bg-[#FAF7F2] text-[#2C2523] border-[#D7CBB9] hover:bg-[#F3EFE7]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {markMode
                ? (language === 'fil' ? 'Marking Mode: AKTIBO' : 'Stitch Marking: ACTIVE')
                : (language === 'fil' ? 'Simulan ang Pag-marka' : 'Enable Stitch Marking')}
            </span>
          </button>

          {/* Backup & Restore Progress (JSON & CSV) */}
          <button
            type="button"
            onClick={() => setShowBackupModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#D7CBB9] bg-[#FAF7F2] hover:bg-[#F2ECE1] text-[#2C2523] transition-colors cursor-pointer"
            title={
              language === 'fil'
                ? 'I-export ang mga tahi bilang JSON / CSV o I-restore mula sa ibang device'
                : 'Export stitched cells as JSON / CSV or restore from another device'
            }
          >
            <Database className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">
              {language === 'fil' ? 'Backup / Sync' : 'Backup & Restore'}
            </span>
          </button>

          {stitchedCount > 0 && (
            <button
              type="button"
              onClick={onClearProgress}
              className="p-1.5 text-[#8C8077] hover:text-red-700 hover:bg-red-50 rounded-lg border border-[#E8E1D5] transition-colors cursor-pointer"
              title={language === 'fil' ? 'I-reset ang progress' : 'Reset progress'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* DAILY STITCH GOAL INPUT & PROGRESS BAR */}
      <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E0D7C9] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#2C2523] text-[#E6C687] flex items-center justify-center shadow-xs shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-serif font-bold text-sm text-[#2C2523]">
                  {language === 'fil' ? 'Daily Stitch Goal' : 'Daily Stitch Goal'}
                </span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  {target.toLocaleString()} {language === 'fil' ? 'tahi / araw' : 'stitches / target'}
                </span>
                {sessionStitches > 0 && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {language === 'fil'
                      ? `Session: +${sessionStitches.toLocaleString()}`
                      : `Session: +${sessionStitches.toLocaleString()}`}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#7A6E65]">
                {language === 'fil'
                  ? 'Magtakda ng target na tahi bawat session o araw at subaybayan kung gaano ka na kalapit.'
                  : 'Set your target stitches per session or day and track how close you are to reaching it.'}
              </p>
            </div>
          </div>

          {/* Goal Input & Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {!isEditingGoal ? (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-[#2C2523] bg-white px-2.5 py-1 rounded-lg border border-[#D7CBB9]">
                  {actualToday.toLocaleString()} / {target.toLocaleString()}{' '}
                  {language === 'fil' ? 'ngayon' : 'today'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setGoalInput(String(target));
                    setIsEditingGoal(true);
                  }}
                  className="px-2 py-1 text-xs font-medium text-[#5F554F] hover:text-[#2C2523] bg-white hover:bg-[#F2ECE1] border border-[#D7CBB9] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  title={language === 'fil' ? 'Palitan ang target na tahi' : 'Set target number of stitches'}
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#B88E3C]" />
                  <span>{language === 'fil' ? 'I-edit' : 'Set Goal'}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#B88E3C]">
                <input
                  type="number"
                  min="10"
                  max="5000"
                  step="10"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveGoal(parseInt(goalInput, 10) || 100);
                    } else if (e.key === 'Escape') {
                      setIsEditingGoal(false);
                    }
                  }}
                  autoFocus
                  className="w-20 px-2 py-0.5 text-xs font-mono font-bold text-[#2C2523] focus:outline-none"
                  aria-label={language === 'fil' ? 'Target na bilang ng tahi' : 'Target number of stitches'}
                />
                <button
                  type="button"
                  onClick={() => handleSaveGoal(parseInt(goalInput, 10) || 100)}
                  className="px-2 py-0.5 bg-[#2C2523] hover:bg-[#433936] text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3 text-[#E6C687]" />
                  <span>{language === 'fil' ? 'I-save' : 'Save'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingGoal(false)}
                  className="px-1.5 py-0.5 text-xs text-[#7A6E65] hover:text-[#2C2523] cursor-pointer"
                  aria-label="Cancel"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Quick Presets */}
            <div className="flex items-center gap-1 flex-wrap">
              {[50, 100, 200, 300, 500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSaveGoal(preset)}
                  className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                    target === preset
                      ? 'bg-[#2C2523] text-white font-bold shadow-2xs'
                      : 'bg-white text-[#5F554F] border border-[#E8E1D5] hover:bg-[#F2ECE1]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* COMPARISON PROGRESS BAR: ACTUAL VS GOAL */}
        <div className="space-y-1.5 bg-white p-3 rounded-lg border border-[#E8E1D5]">
          <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
            <span className="font-semibold text-[#5F554F]">
              {language === 'fil' ? 'Progreso Ngayong Araw laban sa Target:' : "Today's Progress Toward Goal:"}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-[#2C2523]">
                {actualToday.toLocaleString()} / {target.toLocaleString()} {language === 'fil' ? 'tahi' : 'stitches'}
              </span>
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                  isGoalAchieved
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-900 border border-amber-200'
                }`}
              >
                {goalPercentage}%
              </span>
            </div>
          </div>

          {/* Comparison Bar */}
          <div className="w-full h-3.5 bg-[#EAE2D5] rounded-full overflow-hidden p-0.5 border border-[#D7CBB9]">
            <div
              className={`h-full rounded-full transition-all duration-300 shadow-xs ${
                isGoalAchieved
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600'
                  : 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, goalPercentage))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#7A6E65] pt-0.5 gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              {isGoalAchieved ? (
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {language === 'fil'
                      ? `🎉 Naabot ang daily goal para sa araw na ito! (+${(actualToday - target).toLocaleString()} dagdag na tahi)`
                      : `🎉 Daily stitch goal reached! (+${(actualToday - target).toLocaleString()} extra stitches)`}
                  </span>
                </span>
              ) : (
                <span>
                  {language === 'fil'
                    ? `Kailangan pa ng ${stitchesNeededToday.toLocaleString()} tahi (${Math.max(0, 100 - goalPercentage)}% pa) upang maabot ang target ngayong araw`
                    : `${stitchesNeededToday.toLocaleString()} stitches left (${Math.max(0, 100 - goalPercentage)}% to go) to reach today's goal`}
                </span>
              )}
            </div>

            {sessionStitches > 0 && (
              <button
                type="button"
                onClick={onResetSessionStitches}
                className="text-[10px] text-[#8C8077] hover:text-[#2C2523] underline cursor-pointer"
                title={language === 'fil' ? 'I-reset ang bilang ng kasalukuyang session' : 'Reset current session counter'}
              >
                {language === 'fil' ? 'I-reset ang session' : 'Reset session'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FOCUS TIMER & SPRINT LOGGER */}
      <div className="bg-[#FBF9F5] border border-[#E8DFC9] rounded-xl p-4 space-y-3.5 relative">
        {/* Floating Toast Notification */}
        {focusToast && (
          <div className="absolute top-2 right-2 bg-emerald-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-md flex items-center gap-2 animate-fade-in z-20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{focusToast}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              isFocusRunning
                ? 'bg-amber-100 border border-amber-300 text-amber-800'
                : 'bg-[#EFEAE1] border border-[#D7CBB9] text-[#5F554F]'
            }`}>
              <Timer className={`w-4 h-4 ${isFocusRunning ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-sm text-[#2C2523]">
                  {language === 'fil' ? 'Focus Timer & Stitch Sprint' : 'Focus Timer & Stitch Sprint'}
                </span>
                <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                  isFocusRunning
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : focusSeconds > 0
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : 'bg-[#EAE2D5] text-[#7A6E65]'
                }`}>
                  {isFocusRunning
                    ? (language === 'fil' ? 'Aktibo' : 'Active Sprint')
                    : focusSeconds > 0
                    ? (language === 'fil' ? 'Naka-pause' : 'Paused')
                    : (language === 'fil' ? 'Handa' : 'Ready')}
                </span>
              </div>
              <p className="text-[11px] text-[#7A6E65]">
                {language === 'fil'
                  ? 'Orasan ang stitching session at awtomatikong i-log ang mga natapos na tahi sa iyong daily goal.'
                  : 'Time focused stitching sessions and convert elapsed time directly into logged daily progress.'}
              </p>
            </div>
          </div>

          {/* Sprint Presets */}
          <div className="flex items-center gap-1 self-start sm:self-auto flex-wrap">
            {[
              { label: language === 'fil' ? 'Malaya' : 'Open', min: 0 },
              { label: '20m', min: 20 },
              { label: '25m (Pomo)', min: 25 },
              { label: '30m', min: 30 },
              { label: '45m', min: 45 },
            ].map((preset) => (
              <button
                key={preset.min}
                type="button"
                onClick={() => {
                  if (!isFocusRunning) {
                    setFocusTargetMinutes(preset.min);
                  }
                }}
                disabled={isFocusRunning}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  focusTargetMinutes === preset.min
                    ? 'bg-[#2C2523] text-white font-bold shadow-2xs'
                    : 'bg-white text-[#5F554F] border border-[#E8DFC9] hover:bg-[#F2ECE1]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timer Digital Display & Controls */}
        <div className="bg-white rounded-lg p-3.5 border border-[#E8E1D5] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Monospace Digits */}
            <div className="bg-[#FAF7F2] border border-[#E0D7C9] px-4 py-2 rounded-lg text-center min-w-[120px]">
              <div className="font-mono text-3xl font-extrabold text-[#2C2523] tracking-wider">
                {formatTimerDigits(focusSeconds)}
              </div>
              <div className="text-[10px] text-[#8C8077] uppercase font-mono tracking-widest mt-0.5">
                {focusTargetMinutes > 0
                  ? `/ ${focusTargetMinutes}:00 min`
                  : (language === 'fil' ? 'Orasan' : 'Stopwatch')}
              </div>
            </div>

            {/* Estimated Stitches Pill */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[#5F554F]">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-medium">
                  {language === 'fil' ? 'Tinatayang Natahi:' : 'Estimated Output:'}
                </span>
                <span className="font-mono font-bold text-sm text-[#2C2523]">
                  ~{estimatedStitches} {language === 'fil' ? 'tahi' : 'stitches'}
                </span>
              </div>
              <p className="text-[11px] text-[#8C8077]">
                {language === 'fil'
                  ? 'Batay sa standard na bilis (~1.5 tahi bawat minuto)'
                  : 'Based on standard pace (~1.5 stitches/min) • Customizable on log'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isFocusRunning ? (
              <button
                type="button"
                onClick={handleStartFocusTimer}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {focusSeconds > 0
                    ? (language === 'fil' ? 'Ituloy ang Sprint' : 'Resume Sprint')
                    : (language === 'fil' ? 'Simulan ang Focus Timer' : 'Start Focus Timer')}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePauseFocusTimer}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>{language === 'fil' ? 'I-pause' : 'Pause Timer'}</span>
              </button>
            )}

            {/* Log Stitches Button (Available whenever some time has elapsed) */}
            {focusSeconds >= 5 && (
              <button
                type="button"
                onClick={handleOpenLogFocus}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2C2523] hover:bg-[#433936] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'fil' ? 'I-log ang Tahi' : 'Log Stitches'}</span>
              </button>
            )}

            {/* Reset Button */}
            {focusSeconds > 0 && (
              <button
                type="button"
                onClick={handleResetFocusTimer}
                className="px-2.5 py-2 text-xs text-[#7A6E65] hover:text-[#2C2523] border border-[#E8DFC9] hover:bg-[#F2ECE1] rounded-lg transition-colors cursor-pointer"
                title={language === 'fil' ? 'I-reset ang timer' : 'Reset timer'}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* LOG PROGRESS MODAL / POP-IN */}
        {showLogDialog && (
          <div className="bg-white border-2 border-emerald-600/40 rounded-xl p-4 space-y-3 mt-2 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0ECE1]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <h5 className="font-serif font-bold text-sm text-[#2C2523]">
                  {language === 'fil' ? 'I-log ang Natapos na Tahi' : 'Log Stitched Progress'}
                </h5>
              </div>
              <button
                type="button"
                onClick={() => setShowLogDialog(false)}
                className="text-xs text-[#7A6E65] hover:text-[#2C2523] px-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#5F554F]">
              {language === 'fil'
                ? `Natapos mo ang ${Math.max(1, Math.round(focusSeconds / 60))} minutong focus session! Ilang tahi ang aktuwal mong nakumpleto?`
                : `You finished a ${Math.max(1, Math.round(focusSeconds / 60))}-minute focus sprint! Confirm how many stitches you completed:`}
            </p>

            <div className="flex items-center gap-3">
              <div className="flex items-center border border-[#D7CBB9] rounded-lg overflow-hidden bg-[#FAF7F2]">
                <button
                  type="button"
                  onClick={() => setManualStitchesToLog((prev) => Math.max(1, prev - 5))}
                  className="px-2.5 py-1.5 hover:bg-[#EAE2D5] text-[#5F554F] font-bold cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={manualStitchesToLog}
                  onChange={(e) => setManualStitchesToLog(Math.max(1, Number(e.target.value) || 1))}
                  className="w-20 px-2 py-1 text-center font-mono font-bold text-base text-[#2C2523] bg-transparent focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setManualStitchesToLog((prev) => prev + 5)}
                  className="px-2.5 py-1.5 hover:bg-[#EAE2D5] text-[#5F554F] font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick increment buttons */}
              <div className="flex items-center gap-1">
                {[10, 25, 50].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => setManualStitchesToLog((prev) => prev + inc)}
                    className="px-2 py-1 text-[11px] font-mono rounded bg-[#F5EFE6] border border-[#E0D7C9] hover:bg-[#EAE2D5] text-[#4F4640] cursor-pointer"
                  >
                    +{inc}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#F0ECE1]">
              <span className="text-[11px] text-[#7A6E65]">
                {language === 'fil'
                  ? `Madadagdag sa ${actualToday} tahi na na-record ngayong araw`
                  : `Will add to ${actualToday} stitches recorded today`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogDialog(false)}
                  className="px-3 py-1.5 text-xs text-[#5F554F] hover:bg-[#F2ECE1] rounded-lg cursor-pointer"
                >
                  {language === 'fil' ? 'Kanselahin' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLogFocus}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {language === 'fil'
                      ? `I-rekord ang +${manualStitchesToLog} Tahi`
                      : `Confirm & Record +${manualStitchesToLog} Stitches`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overall Pattern Progress Bar & Numerical Metrics */}
      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[11px] text-[#7A6E65] font-medium uppercase tracking-wider">
              {language === 'fil' ? 'Kabuuan ng Natapos sa Buong Disenyo:' : 'Overall Project Completion:'}
            </span>
            <div className="font-mono text-2xl font-bold text-[#2C2523] leading-none mt-1">
              {percentage.toFixed(1)}%
            </div>
          </div>
          <div className="text-right font-mono text-xs text-[#5F554F]">
            <span className="font-bold text-[#2C2523]">{stitchedCount.toLocaleString()}</span>
            <span className="text-[#8C8077]"> / {total.toLocaleString()} stitches</span>
            <span className="text-[10px] text-[#8C8077] block mt-0.5">
              ({remaining.toLocaleString()} remaining in pattern)
            </span>
          </div>
        </div>

        {/* Progress Bar Container with Interactive Percentage Milestone Markers */}
        <div className="relative pt-1 pb-7">
          <div className="w-full h-3.5 bg-[#EFEAE1] rounded-full overflow-hidden p-0.5 border border-[#E0D7C9]">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-full transition-all duration-300 shadow-xs"
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
          </div>

          {/* Interactive Milestone Pins along the bar */}
          {percentageMilestones.map((m) => {
            const isReached = percentage >= m.percentage;
            return (
              <div
                key={m.id}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center group cursor-pointer z-10"
                style={{ left: `${m.percentage}%` }}
                onClick={() => setActiveCelebration(m)}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-xs transition-all duration-200 ${
                    isReached
                      ? 'bg-amber-100 border-2 border-amber-500 scale-110 shadow-sm ring-2 ring-amber-300/60 animate-pulse'
                      : 'bg-white border-2 border-[#D7CBB9] text-[#7A6E65] opacity-75 hover:opacity-100 hover:scale-105'
                  }`}
                  title={`${m.title} (${m.percentage}%)${isReached ? ' - Reached! Click to celebrate' : ''}`}
                >
                  <span className="leading-none">{m.icon || '📍'}</span>
                </div>
                <span
                  className={`text-[9px] font-mono font-bold mt-1 px-1 rounded shadow-2xs transition-colors whitespace-nowrap ${
                    isReached
                      ? 'bg-amber-100 text-amber-950 font-extrabold border border-amber-300'
                      : 'bg-white/90 text-[#7A6E65] border border-[#E8E1D5]'
                  }`}
                >
                  {m.percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CUSTOM PERCENTAGE MILESTONES & CELEBRATION MANAGER */}
      <div className="bg-[#FBF9F5] border border-[#E8DFC9] rounded-xl p-4.5 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#B88E3C] to-amber-300 flex items-center justify-center text-white shadow-xs">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h5 className="font-serif font-bold text-base text-[#2C2523]">
                  {language === 'fil'
                    ? 'Mga Custom Milestone at Pagdiriwang'
                    : 'Custom Percentage Milestones & Celebrations'}
                </h5>
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  {percentageMilestones.length} {language === 'fil' ? 'milestones' : 'milestones'}
                </span>
              </div>
              <p className="text-xs text-[#7A6E65]">
                {language === 'fil'
                  ? 'Magtakda ng mga porsyentong layunin (hal. "25% Complete", "Wedding Day Ready") na awtomatikong nagpapasiklab ng confetti at audio chimes kapag naabot!'
                  : 'Define custom percentage milestones (e.g. "25% Complete", "Wedding Day Ready") that burst into confetti and fanfare when reached!'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingMilestone(!isAddingMilestone)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2C2523] hover:bg-[#433936] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-amber-300" />
            <span>
              {isAddingMilestone
                ? (language === 'fil' ? 'Isara ang Form' : 'Close Form')
                : (language === 'fil' ? 'Magdagdag ng Milestone' : 'Add Milestone')}
            </span>
          </button>
        </div>

        {/* Add Milestone Form */}
        {isAddingMilestone && (
          <form
            onSubmit={handleAddPercentageMilestone}
            className="bg-white border-2 border-[#B88E3C]/40 rounded-xl p-4 space-y-4 shadow-sm animate-fade-in"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#F0ECE1]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="font-serif font-bold text-sm text-[#2C2523]">
                  {language === 'fil' ? 'Lumikha ng Bagong Milestone' : 'Create Custom Percentage Milestone'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingMilestone(false)}
                className="text-xs text-[#7A6E65] hover:text-[#2C2523]"
              >
                ✕
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#5F554F] uppercase tracking-wider block">
                {language === 'fil' ? 'Mabilisang Halimbawa:' : 'Quick Presets:'}
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { pct: 25, title: '25% Complete', icon: '✨' },
                  { pct: 50, title: '50% Halfway Heart', icon: '🌸' },
                  { pct: 75, title: '75% Home Stretch', icon: '💍' },
                  { pct: 100, title: 'Wedding Day Ready', icon: '🎉' },
                ].map((preset) => (
                  <button
                    key={preset.pct}
                    type="button"
                    onClick={() => {
                      setNewPctValue(preset.pct);
                      setNewPctTitle(preset.title);
                      setNewPctIcon(preset.icon);
                    }}
                    className="px-2.5 py-1 text-xs bg-[#FAF7F2] border border-[#E0D7C9] hover:bg-[#F2ECE1] rounded-lg text-[#2C2523] flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.title}</span>
                    <span className="text-[10px] text-[#7A6E65] font-mono">({preset.pct}%)</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              {/* Milestone Title Input */}
              <div className="sm:col-span-7 space-y-1">
                <label className="text-xs font-semibold text-[#2C2523] block">
                  {language === 'fil' ? 'Pangalan ng Milestone:' : 'Milestone Title:'}
                </label>
                <input
                  type="text"
                  required
                  value={newPctTitle}
                  onChange={(e) => setNewPctTitle(e.target.value)}
                  placeholder={language === 'fil' ? 'hal. "Wedding Day Ready"' : 'e.g. "Wedding Day Ready" or "25% Complete"'}
                  className="w-full px-3 py-1.5 text-xs border border-[#D7CBB9] rounded-lg bg-[#FAF7F2] text-[#2C2523] focus:outline-hidden focus:border-[#B88E3C] focus:bg-white"
                />
              </div>

              {/* Target Percentage */}
              <div className="sm:col-span-5 space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-[#2C2523]">
                  <label>{language === 'fil' ? 'Target na Porsyento:' : 'Target Percentage:'}</label>
                  <span className="font-mono font-bold text-amber-800">{newPctValue}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={newPctValue}
                    onChange={(e) => setNewPctValue(Number(e.target.value))}
                    className="flex-1 accent-amber-600 cursor-pointer"
                  />
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newPctValue}
                    onChange={(e) => setNewPctValue(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                    className="w-16 px-2 py-1 text-center font-mono font-bold text-xs border border-[#D7CBB9] rounded-lg bg-[#FAF7F2]"
                  />
                </div>
              </div>

              {/* Icon Picker */}
              <div className="sm:col-span-12 space-y-1">
                <label className="text-xs font-semibold text-[#2C2523] block">
                  {language === 'fil' ? 'Pumili ng Icon ng Pagdiriwang:' : 'Celebration Icon:'}
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['💍', '✨', '🌸', '🎉', '🏆', '💐', '🧵', '🕊️', '🥂', '❤️', '👑'].map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewPctIcon(icon)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all cursor-pointer ${
                        newPctIcon === icon
                          ? 'bg-amber-100 border-2 border-amber-600 scale-110 shadow-xs'
                          : 'bg-[#FAF7F2] border border-[#E0D7C9] hover:bg-[#F2ECE1]'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Encouragement note */}
              <div className="sm:col-span-12 space-y-1">
                <label className="text-xs font-semibold text-[#2C2523] block">
                  {language === 'fil' ? 'Mensahe ng Pagdiriwang (Opsyonal):' : 'Celebration Note (Optional):'}
                </label>
                <input
                  type="text"
                  value={newPctDescription}
                  onChange={(e) => setNewPctDescription(e.target.value)}
                  placeholder={
                    language === 'fil'
                      ? 'hal. "Natapos ang floral border para sa damit pangkasal!"'
                      : 'e.g. "Finished the bridal veil and floral border!"'
                  }
                  className="w-full px-3 py-1.5 text-xs border border-[#D7CBB9] rounded-lg bg-[#FAF7F2] text-[#2C2523] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0ECE1]">
              <button
                type="button"
                onClick={() => setIsAddingMilestone(false)}
                className="px-3 py-1.5 text-xs text-[#5F554F] hover:bg-[#F2ECE1] rounded-lg cursor-pointer"
              >
                {language === 'fil' ? 'Kanselahin' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'fil' ? 'I-save ang Milestone' : 'Save Milestone'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Milestones Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {percentageMilestones.map((m) => {
            const isReached = percentage >= m.percentage;
            return (
              <div
                key={m.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-2.5 ${
                  isReached
                    ? 'bg-gradient-to-b from-amber-50/60 to-white border-amber-300 shadow-2xs'
                    : 'bg-white border-[#E8E1D5] hover:border-[#D7CBB9]'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl leading-none">{m.icon || '📍'}</span>
                      <span className="font-mono text-xs font-bold text-[#2C2523] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E8E1D5]">
                        {m.percentage}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => {
                          const confirmDelete = window.confirm(
                            language === 'fil'
                              ? `Nais mo bang burahin ang milestone na "${m.title}"?`
                              : `Delete the milestone "${m.title}"?`
                          );
                          if (confirmDelete) handleDeletePercentageMilestone(m.id);
                        }}
                        className="p-1 text-[#8C8077] hover:text-rose-700 rounded transition-colors cursor-pointer"
                        title="Delete milestone"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h6 className="font-serif font-bold text-xs text-[#2C2523] leading-snug">
                      {m.title}
                    </h6>
                    {m.description && (
                      <p className="text-[11px] text-[#7A6E65] line-clamp-2 mt-0.5 leading-tight">
                        {m.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F0ECE1] flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {isReached ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{language === 'fil' ? 'Naabot Na!' : 'Reached!'}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#7A6E65] font-mono">
                        {(m.percentage - percentage).toFixed(1)}% to go
                      </span>
                    )}
                  </div>

                  {/* Celebrate / Replay Celebration Button */}
                  <button
                    type="button"
                    onClick={() => setActiveCelebration(m)}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                      isReached
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 shadow-2xs'
                        : 'bg-[#FAF7F2] hover:bg-[#F2ECE1] text-[#5F554F] border border-[#E0D7C9]'
                    }`}
                    title={
                      isReached
                        ? 'Replay celebration animation'
                        : 'Preview celebration animation'
                    }
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>
                      {isReached
                        ? (language === 'fil' ? 'Ipagdiwang' : 'Celebrate')
                        : (language === 'fil' ? 'I-preview' : 'Preview')}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick completion tools for isolated colors */}
      {activeColorFilter && onMarkColorComplete && (
        <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E8DFC9] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[#2C2523] font-medium">
              {language === 'fil' ? 'Naka-isolate ang DMC' : 'Isolated DMC'}{' '}
              <span className="font-bold">{activeColorFilter}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onMarkColorComplete(activeColorFilter)}
            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            {language === 'fil' ? 'I-marka Lahat ng Kulay na Ito' : 'Mark All of This Color'}
          </button>
        </div>
      )}

      {/* Custom Project Milestones Linked to Specific Coordinate Ranges */}
      <MilestoneTracker
        pattern={pattern}
        stitchedCells={stitchedCells}
        onBatchMarkStitches={onBatchMarkStitches}
        highlightedMilestone={highlightedMilestone}
        onHighlightMilestone={onHighlightMilestone}
        language={language}
      />

      {/* Stitching Session Timer Integration */}
      <StitchSessionTimer
        pattern={pattern}
        stitchedCount={stitchedCount}
        sessionStitches={sessionStitches}
        onResetSessionStitches={onResetSessionStitches}
        language={language}
        externalTimerData={externalTimerData}
        externalSessionSeconds={externalSessionSeconds}
        externalIsRunning={externalIsRunning}
        onExternalToggleTimer={onExternalToggleTimer}
        onExternalFinishSession={onExternalFinishSession}
        onExternalResetSession={onExternalResetSession}
        onExternalUpdatePace={onExternalUpdatePace}
        onExternalClearHistory={onExternalClearHistory}
      />

      {/* Percentage Milestone Celebration Animation Modal */}
      {activeCelebration && (
        <PercentageMilestoneCelebration
          milestone={activeCelebration}
          currentPercentage={percentage}
          stitchedCount={stitchedCount}
          totalStitches={total}
          patternTitle={pattern.title}
          language={language}
          onClose={() => setActiveCelebration(null)}
        />
      )}

      {/* Progress Backup & Restore Modal */}
      <ProgressBackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        pattern={pattern}
        stitchedCells={stitchedCells}
        onImportStitchedCells={onImportStitchedCells || (() => {})}
        language={language}
      />
    </div>
  );
};
