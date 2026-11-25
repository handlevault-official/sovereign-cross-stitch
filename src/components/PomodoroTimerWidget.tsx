import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Flame,
  Volume2,
  VolumeX,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Award,
} from 'lucide-react';
import { PatternData } from '../types';

interface PomodoroTimerWidgetProps {
  pattern: PatternData;
  sessionStitches: number;
  onResetSessionStitches: () => void;
  onLogToStreak: (stitchesCount: number, minutesSpent: number) => void;
  language: 'en' | 'fil';
  isCompactByDefault?: boolean;
}

type PomodoroMode = 'work' | 'shortBreak' | 'longBreak';

export const PomodoroTimerWidget: React.FC<PomodoroTimerWidgetProps> = ({
  pattern,
  sessionStitches,
  onResetSessionStitches,
  onLogToStreak,
  language,
  isCompactByDefault = false,
}) => {
  // Preset durations in minutes
  const [workDuration, setWorkDuration] = useState<number>(25);
  const [breakDuration, setBreakDuration] = useState<number>(5);
  const [longBreakDuration] = useState<number>(15);

  const [mode, setMode] = useState<PomodoroMode>('work');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(workDuration * 60);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [completedSessionsCount, setCompletedSessionsCount] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(!isCompactByDefault);
  const [loggedToast, setLoggedToast] = useState<string | null>(null);

  // Stitches tracked specifically during this pomodoro interval
  const [pomodoroStitchesStart, setPomodoroStitchesStart] = useState<number>(0);

  // Sound chime synthesizer using Web Audio API
  const playSoundChime = (type: 'workEnd' | 'breakEnd') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'workEnd') {
        // High upbeat bell chord: E5 -> G#5 -> B5
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime);
        osc.frequency.setValueAtTime(830.61, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(987.77, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.9);
      } else {
        // Calming bell: A5 -> E5
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.7);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Set initial duration when mode or setting changes
  useEffect(() => {
    if (!isRunning) {
      if (mode === 'work') {
        setSecondsLeft(workDuration * 60);
      } else if (mode === 'shortBreak') {
        setSecondsLeft(breakDuration * 60);
      } else {
        setSecondsLeft(longBreakDuration * 60);
      }
    }
  }, [mode, workDuration, breakDuration, longBreakDuration]);

  // Main countdown ticker
  useEffect(() => {
    let timer: any = null;
    if (isRunning) {
      timer = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            // Timer finished
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, mode, completedSessionsCount]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    if (mode === 'work') {
      playSoundChime('workEnd');
      const nextCount = completedSessionsCount + 1;
      setCompletedSessionsCount(nextCount);
      // Automatically switch to break
      if (nextCount % 4 === 0) {
        setMode('longBreak');
        setSecondsLeft(longBreakDuration * 60);
      } else {
        setMode('shortBreak');
        setSecondsLeft(breakDuration * 60);
      }
    } else {
      playSoundChime('breakEnd');
      setMode('work');
      setSecondsLeft(workDuration * 60);
    }
  };

  const toggleTimer = () => {
    if (!isRunning && mode === 'work' && secondsLeft === workDuration * 60) {
      setPomodoroStitchesStart(sessionStitches);
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (mode === 'work') {
      setSecondsLeft(workDuration * 60);
    } else if (mode === 'shortBreak') {
      setSecondsLeft(breakDuration * 60);
    } else {
      setSecondsLeft(longBreakDuration * 60);
    }
  };

  // Log stitches and time to streak
  const handleLogToDailyStreak = () => {
    const totalDurationSeconds =
      mode === 'work'
        ? workDuration * 60 - secondsLeft
        : workDuration * 60; // if completed or mid-session

    const minutesSpent = Math.max(1, Math.round(totalDurationSeconds / 60));
    // Determine stitches: either current session stitches or default to 1 if none marked
    const stitchesToLog = sessionStitches > 0 ? sessionStitches : 1;

    onLogToStreak(stitchesToLog, minutesSpent);

    const msg =
      language === 'fil'
        ? `Naitala ang ${stitchesToLog} tahi (${minutesSpent} min) sa iyong Daily Streak!`
        : `Logged ${stitchesToLog} stitches (${minutesSpent}m) to your Daily Streak!`;

    setLoggedToast(msg);
    setTimeout(() => setLoggedToast(null), 3500);
  };

  // Time format MM:SS
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const currentTotalSeconds =
    mode === 'work'
      ? workDuration * 60
      : mode === 'shortBreak'
      ? breakDuration * 60
      : longBreakDuration * 60;

  const progressPercentage = Math.max(
    0,
    Math.min(100, ((currentTotalSeconds - secondsLeft) / currentTotalSeconds) * 100)
  );

  return (
    <div className="bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl overflow-hidden shadow-2xs transition-all">
      {/* Header bar */}
      <div className="px-3 py-2 bg-[#F3EDE2] border-b border-[#E8E1D5] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
              mode === 'work'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-emerald-600 text-white shadow-2xs'
            }`}
          >
            {mode === 'work' ? '🍅' : '☕'}
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5 font-serif font-bold text-xs text-[#2C2523]">
              <span>{language === 'fil' ? 'Stitch Pomodoro Focus' : 'Pomodoro Stitch Timer'}</span>
              <span className="text-[10px] font-sans font-medium px-1.5 py-0.2 bg-white rounded border border-[#E0D7C9] text-[#7A6E65]">
                {mode === 'work'
                  ? language === 'fil'
                    ? 'Work Focus'
                    : 'Work Focus'
                  : language === 'fil'
                  ? 'Break Time'
                  : 'Break Time'}
              </span>
            </div>
          </div>
        </div>

        {/* Right side compact controls */}
        <div className="flex items-center gap-1.5">
          {/* Quick sound toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 text-[#7A6E65] hover:text-[#2C2523] rounded hover:bg-white transition-colors"
            title={soundEnabled ? 'Mute alert chime' : 'Enable alert chime'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-gray-400" />}
          </button>

          {/* Completed rounds indicator */}
          <div
            className="hidden sm:flex items-center gap-0.5 px-2 py-0.5 bg-white rounded border border-[#E8E1D5] text-[11px] font-mono text-[#7A6E65]"
            title={`${completedSessionsCount} Pomodoro focus cycles completed`}
          >
            <span>🍅</span>
            <span className="font-bold text-[#2C2523]">{completedSessionsCount}</span>
          </div>

          {/* Expand / Collapse toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-[#7A6E65] hover:text-[#2C2523] rounded hover:bg-white transition-colors"
            title={isExpanded ? 'Collapse Pomodoro widget' : 'Expand Pomodoro widget'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Timer Body */}
      {isExpanded ? (
        <div className="p-3.5 space-y-3">
          {/* Toast Notification */}
          {loggedToast && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 animate-fade-in shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{loggedToast}</span>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-[#EAE2D5] p-1 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setMode('work');
                setIsRunning(false);
              }}
              className={`py-1 rounded text-center transition-all ${
                mode === 'work'
                  ? 'bg-white text-[#2C2523] shadow-xs font-bold'
                  : 'text-[#7A6E65] hover:text-[#2C2523]'
              }`}
            >
              {language === 'fil' ? '🍅 Work (25m)' : '🍅 Work (25m)'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('shortBreak');
                setIsRunning(false);
              }}
              className={`py-1 rounded text-center transition-all ${
                mode === 'shortBreak'
                  ? 'bg-white text-[#2C2523] shadow-xs font-bold'
                  : 'text-[#7A6E65] hover:text-[#2C2523]'
              }`}
            >
              {language === 'fil' ? '☕ Break (5m)' : '☕ Break (5m)'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('longBreak');
                setIsRunning(false);
              }}
              className={`py-1 rounded text-center transition-all ${
                mode === 'longBreak'
                  ? 'bg-white text-[#2C2523] shadow-xs font-bold'
                  : 'text-[#7A6E65] hover:text-[#2C2523]'
              }`}
            >
              {language === 'fil' ? '🛋️ Rest (15m)' : '🛋️ Rest (15m)'}
            </button>
          </div>

          {/* Timer Clock and Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-[#E8E1D5]">
            <div className="flex items-center gap-4">
              <div className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-[#2C2523]">
                {timeFormatted}
              </div>

              <div className="space-y-0.5">
                <div className="text-[11px] text-[#7A6E65]">
                  {mode === 'work'
                    ? language === 'fil'
                      ? 'Manatiling nakatutok sa pagtahi'
                      : 'Stay focused on stitching'
                    : language === 'fil'
                    ? 'Mag-inat at magpahinga'
                    : 'Stretch eyes and relax hands'}
                </div>
                <div className="text-xs font-semibold text-[#2C2523] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    {sessionStitches} {language === 'fil' ? 'tahing natapos ngayon' : 'session stitches'}
                  </span>
                </div>
              </div>
            </div>

            {/* Play, Pause, Reset Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTimer}
                className={`px-4 py-2 rounded-lg font-serif text-xs font-bold text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  isRunning
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : mode === 'work'
                    ? 'bg-rose-700 hover:bg-rose-800'
                    : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>{language === 'fil' ? 'I-pause' : 'Pause'}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>{language === 'fil' ? 'Simulan' : 'Start Focus'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetTimer}
                className="p-2 text-[#7A6E65] hover:text-[#2C2523] hover:bg-[#FAF7F2] rounded-lg border border-[#E8E1D5] transition-colors"
                title="Reset current interval"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#EAE2D5] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                mode === 'work' ? 'bg-rose-600' : 'bg-emerald-600'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Bottom Streak Logging Action Strip */}
          <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-[#F0ECE1]">
            <div className="text-[11px] text-[#7A6E65] flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {language === 'fil'
                  ? 'I-log ang oras at tahi sa iyong Daily Streak:'
                  : 'Log actual time and stitches to Daily Streak:'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogToDailyStreak}
              className="px-3 py-1.5 bg-[#2C2523] hover:bg-[#453935] text-[#E6C687] rounded-lg font-serif text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-[#E6C687]" />
              <span>{language === 'fil' ? 'I-log sa Daily Streak' : 'Log to Daily Streak'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Collapsed minimal status strip */
        <div className="px-3.5 py-2 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-[#2C2523]">{timeFormatted}</span>
            <span className="text-[11px] text-[#7A6E65]">
              ({sessionStitches} {language === 'fil' ? 'tahi' : 'stitches'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTimer}
              className="p-1 px-2.5 bg-[#2C2523] text-white rounded text-xs font-medium flex items-center gap-1 hover:bg-[#433936]"
            >
              {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isRunning ? 'Pause' : 'Start'}</span>
            </button>

            <button
              type="button"
              onClick={handleLogToDailyStreak}
              className="px-2 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[11px] font-semibold hover:bg-amber-200"
            >
              {language === 'fil' ? 'I-log sa Streak' : 'Log to Streak'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
