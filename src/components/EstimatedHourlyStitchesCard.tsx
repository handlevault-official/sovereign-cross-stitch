import React, { useState } from 'react';
import {
  Gauge,
  Play,
  Pause,
  Check,
  RotateCcw,
  Clock,
  Target,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react';
import { PatternData, StitchTimerData } from '../types';
import {
  formatTimeHMS,
  formatTimeReadable,
  formatRemainingTime,
} from '../utils/timerStorage';

interface EstimatedHourlyStitchesCardProps {
  pattern: PatternData;
  stitchedCount: number;
  sessionStitches: number;
  todayStitches: number;
  dailyGoalTarget: number;
  timerData: StitchTimerData;
  sessionSeconds: number;
  isRunning: boolean;
  onToggleTimer: () => void;
  onFinishSession: () => void;
  onResetSession: () => void;
  onUpdatePace: (newPace: number) => void;
  language: 'en' | 'fil';
}

export const EstimatedHourlyStitchesCard: React.FC<EstimatedHourlyStitchesCardProps> = ({
  pattern,
  stitchedCount,
  sessionStitches,
  todayStitches,
  dailyGoalTarget,
  timerData,
  sessionSeconds,
  isRunning,
  onToggleTimer,
  onFinishSession,
  onResetSession,
  onUpdatePace,
  language,
}) => {
  const [showSessionsBreakdown, setShowSessionsBreakdown] = useState(false);

  const baselinePace = timerData.customPace || 90;
  const sessions = timerData.sessions || [];

  // 1. Live session hourly velocity (available once >= 10s elapsed and >= 1 stitch marked)
  const hasLiveVelocity = sessionSeconds >= 10 && sessionStitches > 0;
  const liveHourlyRate = hasLiveVelocity
    ? Math.round((sessionStitches / (sessionSeconds / 3600)) * 10) / 10
    : null;

  // 2. Historical average across saved sessions
  const loggedStitches = sessions.reduce((sum, s) => sum + s.stitchesCount, 0);
  const loggedSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const hasHistoricalVelocity = loggedSeconds >= 30 && loggedStitches > 0;
  const historicalHourlyRate = hasHistoricalVelocity
    ? Math.round((loggedStitches / (loggedSeconds / 3600)) * 10) / 10
    : null;

  // 3. Combined active + logged rate (gives true overall session average)
  const combinedStitches = loggedStitches + sessionStitches;
  const combinedSeconds = loggedSeconds + sessionSeconds;
  const combinedAvgRate =
    combinedSeconds >= 30 && combinedStitches > 0
      ? Math.round((combinedStitches / (combinedSeconds / 3600)) * 10) / 10
      : null;

  // Primary effective hourly stitches & data source label
  let effectiveHourly = baselinePace;
  let sourceLabel = language === 'fil' ? 'Naka-set na Baseline' : 'Calibrated Baseline';
  let isMeasured = false;

  if (liveHourlyRate !== null && liveHourlyRate > 0) {
    effectiveHourly = liveHourlyRate;
    sourceLabel = language === 'fil' ? 'Live sa Session Ngayon' : 'Live Active Session';
    isMeasured = true;
  } else if (historicalHourlyRate !== null && historicalHourlyRate > 0) {
    effectiveHourly = historicalHourlyRate;
    sourceLabel =
      language === 'fil'
        ? `Avg mula sa ${sessions.length} Session`
        : `Avg from ${sessions.length} Session${sessions.length === 1 ? '' : 's'}`;
    isMeasured = true;
  }

  // Clamp extreme spikes during first few seconds to keep velocity realistic (e.g. 5–500 st/hr)
  const displayHourly = Math.min(500, Math.max(1, Math.round(effectiveHourly)));

  // Stitching Velocity Score (0–100 scale benchmarked against 150 st/hr peak speed, 90 st/hr = 60 pts)
  const velocityScore = Math.min(100, Math.max(5, Math.round((displayHourly / 150) * 100)));
  const baselineDeltaPct = Math.round(((displayHourly - 90) / 90) * 100);

  const velocityTier =
    velocityScore >= 85
      ? {
          label: language === 'fil' ? 'Master Velocity' : 'Master Velocity',
          badgeClass: 'bg-[#2C2523] text-[#E6C687] border-[#B88E3C]',
          barClass: 'from-amber-500 via-amber-600 to-emerald-600',
        }
      : velocityScore >= 63
      ? {
          label: language === 'fil' ? 'Mabilis na Daloy' : 'Brisk Flow',
          badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          barClass: 'from-emerald-500 to-teal-600',
        }
      : velocityScore >= 40
      ? {
          label: language === 'fil' ? 'Matatag na Ritmo' : 'Steady Rhythm',
          badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
          barClass: 'from-amber-400 to-amber-600',
        }
      : {
          label: language === 'fil' ? 'Masusing Detalye' : 'Precision Detail',
          badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
          barClass: 'from-sky-400 to-indigo-500',
        };

  // Session duration & per-session stats
  const totalTrackedSeconds = timerData.totalSeconds + sessionSeconds;
  const totalSessionCount = sessions.length + (sessionSeconds > 0 ? 1 : 0);
  const avgSessionSeconds =
    totalSessionCount > 0 ? Math.round(totalTrackedSeconds / totalSessionCount) : 0;

  // Daily Goal Accelerator calculations
  const actualToday = Math.max(todayStitches || 0, sessionStitches || 0);
  const safeTarget = Math.max(10, dailyGoalTarget || 100);
  const dailyRemaining = Math.max(0, safeTarget - actualToday);
  const dailyPct = Math.min(100, Math.round((actualToday / safeTarget) * 100));
  const dailyGoalAchieved = dailyRemaining === 0;

  const etaMinutesCurrent =
    dailyRemaining > 0 ? Math.max(1, Math.round((dailyRemaining / displayHourly) * 60)) : 0;
  const boostedHourly = displayHourly + 20;
  const etaMinutesBoosted =
    dailyRemaining > 0 ? Math.max(1, Math.round((dailyRemaining / boostedHourly) * 60)) : 0;
  const minutesSavedWithBoost = Math.max(0, etaMinutesCurrent - etaMinutesBoosted);

  const remainingPatternStitches = Math.max(0, pattern.totalStitches - stitchedCount);
  const totalEtaText = formatRemainingTime(remainingPatternStitches, displayHourly, language);

  return (
    <div className="bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl p-4.5 sm:p-5 space-y-4">
      {/* Header Row with Live Session Stopwatch & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E8DFC9] pb-3.5">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#2C2523] text-[#E6C687] flex items-center justify-center shadow-xs shrink-0">
            <Gauge className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-serif font-bold text-base text-[#2C2523]">
                {language === 'fil'
                  ? 'Estimated Hourly Stitches & Stitching Velocity'
                  : 'Estimated Hourly Stitches & Velocity'}
              </h4>
              {isRunning ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>
                    {language === 'fil' ? 'Aktibo' : 'Active'} · {formatTimeHMS(sessionSeconds)}
                  </span>
                </span>
              ) : sessionSeconds > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {language === 'fil' ? 'Naka-pause' : 'Paused'} · {formatTimeHMS(sessionSeconds)}
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-white text-[#7A6E65] border border-[#E8E1D5]">
                  {language === 'fil'
                    ? 'Awtomatikong magsisimula sa 1st stitch'
                    : 'Auto-starts on 1st stitch'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#7A6E65] mt-0.5">
              {language === 'fil'
                ? 'Kinakalkula ang bilis ng tahi bawat oras mula sa oras ng iyong session upang mas mabilis maabot ang daily goal.'
                : 'Calculates active time spent stitching per session to compute your velocity score and daily goal finish ETA.'}
            </p>
          </div>
        </div>

        {/* Direct Session Stopwatch Controls */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={onToggleTimer}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700'
                : 'bg-[#2C2523] hover:bg-[#433936] text-white border-[#2C2523]'
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
                <span>
                  {sessionSeconds > 0
                    ? language === 'fil'
                      ? 'Ituloy'
                      : 'Resume'
                    : language === 'fil'
                    ? 'Simulan Session'
                    : 'Start Session'}
                </span>
              </>
            )}
          </button>

          {(sessionSeconds >= 5 || sessionStitches > 0) && (
            <button
              type="button"
              onClick={onFinishSession}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 transition-colors cursor-pointer"
              title={
                language === 'fil'
                  ? 'I-save ang session na ito sa velocity history'
                  : 'Save this session to your velocity history'
              }
            >
              <Check className="w-3.5 h-3.5 text-emerald-700" />
              <span>{language === 'fil' ? 'I-log Session' : 'Log Session'}</span>
            </button>
          )}

          {sessionSeconds > 0 && (
            <button
              type="button"
              onClick={onResetSession}
              className="p-1.5 text-[#7A6E65] hover:text-red-700 hover:bg-red-50 bg-white rounded-lg border border-[#D7CBB9] transition-colors cursor-pointer"
              title={language === 'fil' ? 'I-reset ang kasalukuyang timer' : 'Reset current session timer'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4 Velocity & Goal Accelerator Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Estimated Hourly Stitches */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E8E1D5] shadow-2xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-[11px] text-[#7A6E65] font-medium">
            <span>{language === 'fil' ? 'Tantiyang Tahi / Oras' : 'Estimated Hourly Stitches'}</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#B88E3C]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-bold text-[#2C2523] tracking-tight">
              {displayHourly}
            </span>
            <span className="text-xs font-semibold text-[#7A6E65]">st/hr</span>
          </div>
          <div className="flex items-center justify-between gap-1 text-[10px]">
            <span
              className={`px-1.5 py-0.5 rounded font-medium border ${
                isMeasured
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-[#FAF7F2] text-[#7A6E65] border-[#E8E1D5]'
              }`}
            >
              {sourceLabel}
            </span>
            {!isMeasured && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onUpdatePace(Math.max(20, baselinePace - 10))}
                  className="px-1.5 py-0.5 rounded border border-[#D7CBB9] bg-[#FAF7F2] hover:bg-[#EAE2D5] text-[#2C2523] font-mono font-bold cursor-pointer"
                  title="Decrease baseline pace"
                >
                  -10
                </button>
                <button
                  type="button"
                  onClick={() => onUpdatePace(Math.min(300, baselinePace + 10))}
                  className="px-1.5 py-0.5 rounded border border-[#D7CBB9] bg-[#FAF7F2] hover:bg-[#EAE2D5] text-[#2C2523] font-mono font-bold cursor-pointer"
                  title="Increase baseline pace"
                >
                  +10
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Stitching Velocity Score */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E8E1D5] shadow-2xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-1 text-[11px] text-[#7A6E65] font-medium">
            <span>{language === 'fil' ? 'Stitching Velocity Score' : 'Stitching Velocity Score'}</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${velocityTier.badgeClass}`}
            >
              {velocityTier.label}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-2xl font-bold text-[#2C2523]">{velocityScore}</span>
              <span className="font-mono text-xs text-[#8C8077]">/100</span>
            </div>
            <span
              className={`font-mono text-[10px] font-bold ${
                baselineDeltaPct >= 0 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {baselineDeltaPct >= 0 ? `+${baselineDeltaPct}%` : `${baselineDeltaPct}%`} vs 90 st/hr
            </span>
          </div>
          <div className="w-full h-2 bg-[#EFEAE1] rounded-full overflow-hidden border border-[#E0D7C9]">
            <div
              className={`h-full bg-gradient-to-r ${velocityTier.barClass} rounded-full transition-all duration-300`}
              style={{ width: `${velocityScore}%` }}
            />
          </div>
        </div>

        {/* Card 3: Session Time & Avg Per Session */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E8E1D5] shadow-2xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-[11px] text-[#7A6E65] font-medium">
            <span>{language === 'fil' ? 'Oras Bawat Session' : 'Session Time Spent'}</span>
            <Clock className="w-3.5 h-3.5 text-[#8C8077]" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-xl font-bold text-[#2C2523] tracking-tight">
              {formatTimeHMS(sessionSeconds)}
            </span>
            <span className="font-mono text-xs font-semibold text-emerald-700">
              +{sessionStitches.toLocaleString()} {language === 'fil' ? 'tahi' : 'sts'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#7A6E65]">
            <span>
              {language === 'fil' ? 'Kabuuan:' : 'Total:'}{' '}
              <strong className="font-mono text-[#2C2523]">
                {formatTimeReadable(totalTrackedSeconds, language)}
              </strong>
            </span>
            <span>
              {totalSessionCount > 0 ? (
                <>
                  {language === 'fil' ? 'Avg:' : 'Avg:'}{' '}
                  <strong className="font-mono text-[#2C2523]">
                    {formatTimeReadable(avgSessionSeconds, language)}
                  </strong>
                </>
              ) : combinedAvgRate ? (
                `${Math.round(combinedAvgRate)} st/hr`
              ) : (
                language === 'fil' ? '0 na-log' : '0 logged'
              )}
            </span>
          </div>
        </div>

        {/* Card 4: Daily Goal Velocity Accelerator */}
        <div
          className={`p-3.5 rounded-xl border shadow-2xs flex flex-col justify-between gap-2 ${
            dailyGoalAchieved
              ? 'bg-emerald-50/80 border-emerald-200'
              : 'bg-amber-50/60 border-amber-200/90'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-medium">
            <span className={dailyGoalAchieved ? 'text-emerald-900' : 'text-amber-950'}>
              {language === 'fil' ? 'Bilis sa Daily Goal' : 'Daily Goal Pace ETA'}
            </span>
            {dailyGoalAchieved ? (
              <Zap className="w-3.5 h-3.5 text-emerald-700" />
            ) : (
              <Target className="w-3.5 h-3.5 text-amber-700" />
            )}
          </div>

          {dailyGoalAchieved ? (
            <>
              <div className="font-serif font-bold text-base text-emerald-900 flex items-center gap-1.5">
                <span>🎯 {language === 'fil' ? 'Naabot ang Daily Goal!' : 'Daily Goal Reached!'}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-emerald-800">
                <span className="font-mono font-bold">
                  {actualToday.toLocaleString()} / {safeTarget.toLocaleString()} sts
                </span>
                <span>
                  {language === 'fil' ? 'Pattern ETA:' : 'Project ETA:'} <strong>{totalEtaText}</strong>
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-xl font-bold text-amber-950">
                  {etaMinutesCurrent >= 60
                    ? `${Math.floor(etaMinutesCurrent / 60)}h ${etaMinutesCurrent % 60}m`
                    : `~${etaMinutesCurrent}m`}
                </span>
                <span className="font-mono text-[10px] font-semibold text-amber-900">
                  {dailyRemaining.toLocaleString()} {language === 'fil' ? 'tahi pa' : 'sts left'} ({dailyPct}%)
                </span>
              </div>
              <div className="text-[10px] text-amber-900/90 leading-snug">
                {minutesSavedWithBoost > 0 ? (
                  language === 'fil' ? (
                    <>
                      ⚡ +20 st/hr = <strong>{minutesSavedWithBoost} min mas mabilis</strong> sa goal ngayon
                    </>
                  ) : (
                    <>
                      ⚡ +20 st/hr saves <strong>{minutesSavedWithBoost}m</strong> toward today&apos;s goal
                    </>
                  )
                ) : (
                  language === 'fil'
                    ? `Target ngayon: ${actualToday}/${safeTarget} tahi`
                    : `Today's pace: ${actualToday}/${safeTarget} stitches`
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expandable Recent Session Velocity History */}
      {sessions.length > 0 && (
        <div className="pt-1 border-t border-[#E8DFC9]">
          <button
            type="button"
            onClick={() => setShowSessionsBreakdown((prev) => !prev)}
            className="flex items-center justify-between w-full text-[11px] font-semibold text-[#5F554F] hover:text-[#2C2523] cursor-pointer py-0.5"
          >
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#B88E3C]" />
              <span>
                {language === 'fil'
                  ? `Kasaysayan ng Velocity (${sessions.length} session)`
                  : `Session Velocity Log (${sessions.length} recorded)`}
              </span>
              {combinedAvgRate && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white border border-[#E8E1D5] text-[#2C2523]">
                  Overall: {Math.round(combinedAvgRate)} st/hr
                </span>
              )}
            </span>
            {showSessionsBreakdown ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showSessionsBreakdown && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-[#E8E1D5] bg-white divide-y divide-[#F0ECE1]">
              {sessions.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="px-3 py-1.5 flex items-center justify-between text-[11px] hover:bg-[#FAF7F2]"
                >
                  <span className="text-[#5F554F]">{log.formattedDate}</span>
                  <div className="flex items-center gap-4 font-mono">
                    <span className="text-[#2C2523] font-medium">
                      {formatTimeReadable(log.durationSeconds, language)}
                    </span>
                    <span className="text-emerald-700 font-semibold">
                      +{log.stitchesCount} {language === 'fil' ? 'tahi' : 'sts'}
                    </span>
                    <span className="text-amber-900 font-bold w-16 text-right">
                      {Math.round(log.speedPerHour)} st/hr
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
