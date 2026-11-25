import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Zap,
  Gauge,
  History,
  Check,
  Sliders,
  ChevronDown,
  ChevronUp,
  Trash2,
  Calendar,
} from 'lucide-react';
import { PatternData, StitchSessionLog, StitchTimerData } from '../types';
import {
  loadTimerData,
  saveTimerData,
  formatTimeHMS,
  formatTimeReadable,
  formatRemainingTime,
} from '../utils/timerStorage';

interface StitchSessionTimerProps {
  pattern: PatternData;
  stitchedCount: number;
  sessionStitches: number;
  onResetSessionStitches: () => void;
  language: 'en' | 'fil';
  compact?: boolean;
  externalTimerData?: StitchTimerData;
  externalSessionSeconds?: number;
  externalIsRunning?: boolean;
  onExternalToggleTimer?: () => void;
  onExternalFinishSession?: () => void;
  onExternalResetSession?: () => void;
  onExternalUpdatePace?: (newPace: number) => void;
  onExternalClearHistory?: () => void;
}

export const StitchSessionTimer: React.FC<StitchSessionTimerProps> = ({
  pattern,
  stitchedCount,
  sessionStitches,
  onResetSessionStitches,
  language,
  compact = false,
  externalTimerData,
  externalSessionSeconds,
  externalIsRunning,
  onExternalToggleTimer,
  onExternalFinishSession,
  onExternalResetSession,
  onExternalUpdatePace,
  onExternalClearHistory,
}) => {
  const isControlled = externalTimerData !== undefined;

  // Timer data from storage (fallback when uncontrolled)
  const [internalTimerData, setInternalTimerData] = useState<StitchTimerData>(() =>
    loadTimerData(pattern.id)
  );

  // Active session stopwatch state (fallback when uncontrolled)
  const [internalIsRunning, setInternalIsRunning] = useState<boolean>(false);
  const [internalSessionSeconds, setInternalSessionSeconds] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  const timerData = isControlled ? externalTimerData! : internalTimerData;
  const isRunning = isControlled ? Boolean(externalIsRunning) : internalIsRunning;
  const sessionSeconds = isControlled ? externalSessionSeconds ?? 0 : internalSessionSeconds;

  // Calibration and display settings
  const [showPaceSettings, setShowPaceSettings] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [customPace, setCustomPace] = useState<number>(timerData.customPace || 90);
  const [useLiveSpeed, setUseLiveSpeed] = useState<boolean>(true);

  // Sync timerData when pattern changes or external timerData updates
  useEffect(() => {
    if (isControlled) {
      setCustomPace(externalTimerData?.customPace || 90);
      return;
    }
    const loaded = loadTimerData(pattern.id);
    setInternalTimerData(loaded);
    setCustomPace(loaded.customPace || 90);
    setInternalIsRunning(false);
    setInternalSessionSeconds(0);
    setSessionStartTime(null);
  }, [pattern.id, isControlled, externalTimerData?.customPace]);

  // Interval ticker when running (uncontrolled mode only)
  useEffect(() => {
    if (isControlled) return;
    let intervalId: any = null;
    if (internalIsRunning) {
      intervalId = setInterval(() => {
        setInternalSessionSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [internalIsRunning, isControlled]);

  // Handle Play / Pause
  const handleToggleTimer = () => {
    if (isControlled && onExternalToggleTimer) {
      onExternalToggleTimer();
      return;
    }
    if (!internalIsRunning) {
      if (!sessionStartTime) {
        setSessionStartTime(Date.now());
      }
      setInternalIsRunning(true);
    } else {
      setInternalIsRunning(false);
    }
  };

  // Finish and log current session
  const handleFinishSession = () => {
    if (isControlled && onExternalFinishSession) {
      onExternalFinishSession();
      return;
    }
    if (internalSessionSeconds === 0) return;

    const sessionDuration = internalSessionSeconds;
    const stitches = sessionStitches;
    const speed =
      sessionDuration >= 10 && stitches > 0
        ? Math.round((stitches / (sessionDuration / 3600)) * 10) / 10
        : customPace;

    const newLog: StitchSessionLog = {
      id: `session_${Date.now()}`,
      timestamp: sessionStartTime || Date.now(),
      durationSeconds: sessionDuration,
      stitchesCount: stitches,
      speedPerHour: Math.max(1, speed),
      formattedDate: new Date().toLocaleDateString(
        language === 'fil' ? 'fil-PH' : 'en-US',
        {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      ),
    };

    const updatedData: StitchTimerData = {
      totalSeconds: internalTimerData.totalSeconds + sessionDuration,
      sessions: [newLog, ...(internalTimerData.sessions || [])].slice(0, 30),
      customPace,
    };

    setInternalTimerData(updatedData);
    saveTimerData(pattern.id, updatedData);

    // Reset current active session
    setInternalIsRunning(false);
    setInternalSessionSeconds(0);
    setSessionStartTime(null);
    onResetSessionStitches();
  };

  // Reset active session without saving
  const handleResetSession = () => {
    if (isControlled && onExternalResetSession) {
      onExternalResetSession();
      return;
    }
    if (internalSessionSeconds > 0) {
      const confirmReset = window.confirm(
        language === 'fil'
          ? 'Sigurado ka bang nais mong i-reset ang kasalukuyang session nang hindi sine-save?'
          : 'Discard and reset current active session without saving?'
      );
      if (!confirmReset) return;
    }
    setInternalIsRunning(false);
    setInternalSessionSeconds(0);
    setSessionStartTime(null);
    onResetSessionStitches();
  };

  // Clear all recorded time history
  const handleClearAllHistory = () => {
    if (isControlled && onExternalClearHistory) {
      onExternalClearHistory();
      return;
    }
    const confirmClear = window.confirm(
      language === 'fil'
        ? 'Burahin ang lahat ng naitalang oras at mga session para sa disenyong ito?'
        : 'Clear all tracked time and session history for this design?'
    );
    if (!confirmClear) return;

    const resetData: StitchTimerData = {
      totalSeconds: 0,
      sessions: [],
      customPace,
    };
    setInternalTimerData(resetData);
    saveTimerData(pattern.id, resetData);
    setInternalIsRunning(false);
    setInternalSessionSeconds(0);
    setSessionStartTime(null);
    onResetSessionStitches();
  };

  // Update custom calibrated pace
  const handleUpdatePace = (newPace: number) => {
    const val = Math.max(10, Math.min(400, Math.round(newPace)));
    setCustomPace(val);
    if (isControlled && onExternalUpdatePace) {
      onExternalUpdatePace(val);
      return;
    }
    const updated = { ...internalTimerData, customPace: val };
    setInternalTimerData(updated);
    saveTimerData(pattern.id, updated);
  };

  // Calculations
  const currentTotalSeconds = timerData.totalSeconds + sessionSeconds;
  const remainingStitches = Math.max(0, pattern.totalStitches - stitchedCount);

  // Speed calculations:
  // 1. Live session speed (if session >= 30 seconds and has stitches)
  const hasLiveSpeed = sessionSeconds >= 30 && sessionStitches > 0;
  const liveSpeed = hasLiveSpeed
    ? Math.round((sessionStitches / (sessionSeconds / 3600)) * 10) / 10
    : null;

  // 2. Historical logged speed from past sessions
  const historicalLoggedStitches = (timerData.sessions || []).reduce(
    (sum, s) => sum + s.stitchesCount,
    0
  );
  const historicalLoggedSeconds = (timerData.sessions || []).reduce(
    (sum, s) => sum + s.durationSeconds,
    0
  );
  const historicalSpeed =
    historicalLoggedSeconds >= 60 && historicalLoggedStitches > 0
      ? Math.round(
          (historicalLoggedStitches / (historicalLoggedSeconds / 3600)) * 10
        ) / 10
      : null;

  // Effective speed used for remaining time estimation
  let activeSpeed = customPace;
  let speedSourceLabel = language === 'fil' ? 'Naka-set na Bilis' : 'Calibrated Pace';

  if (useLiveSpeed && liveSpeed && liveSpeed >= 10) {
    activeSpeed = liveSpeed;
    speedSourceLabel = language === 'fil' ? 'Kasalukuyang Session' : 'Live Session';
  } else if (historicalSpeed && historicalSpeed >= 10) {
    activeSpeed = historicalSpeed;
    speedSourceLabel = language === 'fil' ? 'Kasaysayan ng Bilis' : 'Historical Avg';
  }

  const estimatedRemainingText = formatRemainingTime(
    remainingStitches,
    activeSpeed,
    language
  );

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-[#E8E1D5] shadow-2xs">
        <button
          type="button"
          onClick={handleToggleTimer}
          className={`p-1 rounded cursor-pointer transition-colors ${
            isRunning
              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
              : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
          }`}
          title={isRunning ? 'Pause Session' : 'Start Session'}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>
        <span className="font-mono text-xs font-bold text-[#2C2523] min-w-[54px]">
          {formatTimeHMS(sessionSeconds)}
        </span>
        {isRunning && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#FAF7F2] rounded-xl border border-[#E8E1D5] p-4.5 space-y-4">
      {/* Header with Title and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8DFC9] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shadow-2xs">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-serif font-bold text-base text-[#2C2523]">
                {language === 'fil' ? 'Stitching Session Timer' : 'Stitching Session Timer'}
              </h4>
              {isRunning ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  {language === 'fil' ? 'Aktibo' : 'Active'}
                </span>
              ) : sessionSeconds > 0 ? (
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-800 border border-amber-300">
                  {language === 'fil' ? 'Naka-pause' : 'Paused'}
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-[#7A6E65]">
              {language === 'fil'
                ? 'Subaybayan ang iyong oras sa pananahi at kalkulahin ang natitirang oras batay sa bilis mo.'
                : 'Track active stitching sessions and calculate remaining time based on your stitching pace.'}
            </p>
          </div>
        </div>

        {/* Stopwatch Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleTimer}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-xs ${
              isRunning
                ? 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700'
                : 'bg-[#2C2523] text-white border-[#2C2523] hover:bg-[#433935]'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>{language === 'fil' ? 'I-pause' : 'Pause'}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{sessionSeconds > 0 ? (language === 'fil' ? 'Ipagpatuloy' : 'Resume') : (language === 'fil' ? 'Magsimula' : 'Start Session')}</span>
              </>
            )}
          </button>

          {sessionSeconds > 0 && (
            <>
              <button
                type="button"
                onClick={handleFinishSession}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                title={language === 'fil' ? 'I-save at itala ang session' : 'Log & Save Session'}
              >
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">
                  {language === 'fil' ? 'I-save' : 'Save Session'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleResetSession}
                className="p-1.5 text-[#7A6E65] hover:text-red-700 hover:bg-red-50 rounded-lg border border-[#D7CBB9] transition-colors cursor-pointer"
                title={language === 'fil' ? 'I-reset ang kasalukuyang session' : 'Discard session'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowPaceSettings(!showPaceSettings)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              showPaceSettings
                ? 'bg-[#EAE2D5] border-[#B88E3C] text-[#2C2523]'
                : 'bg-white border-[#D7CBB9] text-[#7A6E65] hover:text-[#2C2523]'
            }`}
            title={language === 'fil' ? 'I-calibrate ang Bilis' : 'Calibrate Stitching Pace'}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Current Active Session Timer */}
        <div className="bg-white p-3 rounded-lg border border-[#E8E1D5] shadow-2xs">
          <div className="flex items-center justify-between text-[11px] text-[#7A6E65]">
            <span className="font-medium">
              {language === 'fil' ? 'Kasalukuyang Session' : 'Current Session'}
            </span>
            {isRunning && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </div>
          <div className="font-mono text-2xl font-bold text-[#2C2523] mt-1 tracking-tight">
            {formatTimeHMS(sessionSeconds)}
          </div>
          <div className="text-[10px] text-[#8C8077] mt-0.5 flex items-center justify-between">
            <span>+{sessionStitches} {language === 'fil' ? 'tahi ngayon' : 'stitches'}</span>
            {hasLiveSpeed && (
              <span className="font-mono text-emerald-700 font-semibold">{liveSpeed} st/h</span>
            )}
          </div>
        </div>

        {/* Total Time Spent on Pattern */}
        <div className="bg-white p-3 rounded-lg border border-[#E8E1D5] shadow-2xs">
          <div className="text-[11px] text-[#7A6E65] font-medium">
            {language === 'fil' ? 'Kabuuang Oras' : 'Total Time Tracked'}
          </div>
          <div className="font-mono text-2xl font-bold text-[#2C2523] mt-1 tracking-tight">
            {formatTimeReadable(currentTotalSeconds, language)}
          </div>
          <div className="text-[10px] text-[#8C8077] mt-0.5">
            {(timerData.sessions || []).length}{' '}
            {language === 'fil' ? 'nakaraang session' : 'logged sessions'}
          </div>
        </div>

        {/* Current Stitching Speed */}
        <div className="bg-white p-3 rounded-lg border border-[#E8E1D5] shadow-2xs">
          <div className="flex items-center justify-between text-[11px] text-[#7A6E65] font-medium">
            <span>{language === 'fil' ? 'Bilis ng Tahi' : 'Stitching Speed'}</span>
            <Gauge className="w-3.5 h-3.5 text-[#B88E3C]" />
          </div>
          <div className="font-mono text-2xl font-bold text-amber-900 mt-1 flex items-baseline gap-1">
            <span>{activeSpeed}</span>
            <span className="text-xs font-normal text-[#7A6E65]">st/hr</span>
          </div>
          <div className="text-[10px] text-[#8C8077] mt-0.5 truncate" title={speedSourceLabel}>
            {speedSourceLabel}
          </div>
        </div>

        {/* Dynamic Estimated Remaining Time */}
        <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] text-emerald-900 font-medium">
            <span>{language === 'fil' ? 'Natitirang Oras' : 'Remaining Time'}</span>
            <Zap className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-emerald-950 mt-1 tracking-tight">
            {estimatedRemainingText}
          </div>
          <div className="text-[10px] text-emerald-800/80 mt-0.5 truncate">
            {remainingStitches.toLocaleString()} {language === 'fil' ? 'tahi pa' : 'stitches left'}
          </div>
        </div>
      </div>

      {/* Speed Calibration Dropdown Panel */}
      {showPaceSettings && (
        <div className="bg-white p-4 rounded-lg border border-[#E8DFC9] space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-xs text-[#2C2523] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#B88E3C]" />
              <span>{language === 'fil' ? 'Pag-calibrate sa Bilis ng Pananahi' : 'Stitching Pace Calibration'}</span>
            </div>
            <span className="text-[11px] text-[#7A6E65]">
              {language === 'fil' ? 'Ayusin ayon sa iyong natural na bilis' : 'Tune estimates to your craft pace'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#5F554F]">
              {language === 'fil' ? 'Mga Karaniwang Bilis:' : 'Preset Speeds:'}
            </span>
            {[
              { label: '60 st/hr (Relaxed / Shading)', value: 60 },
              { label: '80 st/hr (Standard)', value: 80 },
              { label: '100 st/hr (Brisk)', value: 100 },
              { label: '120 st/hr (Master / Fast)', value: 120 },
            ].map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => handleUpdatePace(p.value)}
                className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
                  customPace === p.value
                    ? 'bg-[#2C2523] text-white border-[#2C2523] font-semibold'
                    : 'bg-[#FAF7F2] text-[#5F554F] border-[#D7CBB9] hover:bg-[#F0ECE1]'
                }`}
              >
                {p.value} st/hr
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <label className="text-xs text-[#5F554F] flex items-center gap-2">
              <span>{language === 'fil' ? 'Manu-manong Bilis (Stitches / Oras):' : 'Custom Pace (Stitches / Hour):'}</span>
              <input
                type="number"
                min="10"
                max="400"
                value={customPace}
                onChange={(e) => handleUpdatePace(Number(e.target.value))}
                className="w-20 px-2 py-1 text-xs font-mono font-bold bg-[#FAF7F2] border border-[#D7CBB9] rounded focus:outline-none focus:ring-1 focus:ring-[#B88E3C]"
              />
            </label>

            <label className="flex items-center gap-1.5 text-xs text-[#5F554F] cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={useLiveSpeed}
                onChange={(e) => setUseLiveSpeed(e.target.checked)}
                className="accent-[#B88E3C] rounded"
              />
              <span>{language === 'fil' ? 'Gamitin ang live session speed kung available' : 'Prioritize live session speed'}</span>
            </label>
          </div>
        </div>
      )}

      {/* Session History Toggle and Accordion */}
      {(timerData.sessions || []).length > 0 && (
        <div className="border-t border-[#E8DFC9] pt-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#5F554F] hover:text-[#2C2523] transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-[#B88E3C]" />
              <span>
                {language === 'fil' ? 'Kasaysayan ng mga Session' : 'Logged Sessions History'} ({timerData.sessions.length})
              </span>
              {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={handleClearAllHistory}
              className="text-[11px] text-red-600 hover:text-red-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>{language === 'fil' ? 'Burahin ang Oras' : 'Clear All Logged Time'}</span>
            </button>
          </div>

          {showHistory && (
            <div className="mt-2.5 max-h-48 overflow-y-auto rounded-lg border border-[#E8E1D5] bg-white divide-y divide-[#F0ECE1]">
              {timerData.sessions.map((log) => (
                <div
                  key={log.id}
                  className="px-3.5 py-2 flex items-center justify-between text-xs hover:bg-[#FAF7F2] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-[#8C8077]" />
                    <span className="text-[#5F554F]">{log.formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-4 font-mono text-[11px]">
                    <span className="text-[#2C2523] font-semibold">
                      {formatTimeReadable(log.durationSeconds, language)}
                    </span>
                    <span className="text-emerald-700">
                      +{log.stitchesCount} {language === 'fil' ? 'tahi' : 'st'}
                    </span>
                    <span className="text-[#8C8077] w-16 text-right">
                      {log.speedPerHour} st/h
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
