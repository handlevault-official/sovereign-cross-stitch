import React, { useState } from 'react';
import {
  Flame,
  Trophy,
  Target,
  Calendar,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Plus,
  RotateCcw,
  Medal,
  Award,
  Users,
  Compass,
  ArrowUpRight,
} from 'lucide-react';
import { DailyStreakData, WeeklyChallengeItem } from '../types';
import {
  getLocalDateString,
  getPast7DaysSummary,
  calculateStreak,
  saveDailyStreak,
  saveWeeklyChallenges,
} from '../utils/challengeStorage';

interface WeeklyChallengeProps {
  language: 'fil' | 'en';
  streakData: DailyStreakData;
  onUpdateStreakData: (updater: (prev: DailyStreakData) => DailyStreakData) => void;
  challenges: WeeklyChallengeItem[];
  onUpdateChallenges: (updater: (prev: WeeklyChallengeItem[]) => WeeklyChallengeItem[]) => void;
  onJumpToGenerator?: () => void;
}

const PRESET_TARGETS = [
  { value: 50, labelEn: '50 Casual', labelFil: '50 Banayad' },
  { value: 100, labelEn: '100 Daily Rhythm', labelFil: '100 Pang-araw-araw' },
  { value: 200, labelEn: '200 Committed', labelFil: '200 Masugid' },
  { value: 500, labelEn: '500 Tapestry Marathon', labelFil: '500 Marathon' },
];

export const WeeklyChallenge: React.FC<WeeklyChallengeProps> = ({
  language,
  streakData,
  onUpdateStreakData,
  challenges,
  onUpdateChallenges,
  onJumpToGenerator,
}) => {
  const todayStr = getLocalDateString();
  const todayStitches = streakData.history[todayStr] || 0;
  const isTodayGoalMet = todayStitches >= streakData.dailyTarget;
  const todayProgressPercent = Math.min(
    100,
    Math.round((todayStitches / Math.max(1, streakData.dailyTarget)) * 100)
  );

  const [customTargetInput, setCustomTargetInput] = useState<string>('');
  const [showCustomTarget, setShowCustomTarget] = useState<boolean>(false);
  const [manualStitchCount, setManualStitchCount] = useState<string>('25');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'rewards'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleSelectPresetTarget = (target: number) => {
    onUpdateStreakData((prev) => {
      const { currentStreak, longestStreak, completedDaysCount } = calculateStreak(prev.history, target);
      const updated: DailyStreakData = {
        ...prev,
        dailyTarget: target,
        currentStreak,
        longestStreak,
        completedDaysCount,
      };
      saveDailyStreak(updated);
      return updated;
    });
    setShowCustomTarget(false);
    showToast(
      language === 'fil'
        ? `Bagong target: ${target} tahi bawat araw!`
        : `Daily target updated to ${target} stitches!`
    );
  };

  const handleApplyCustomTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customTargetInput, 10);
    if (!isNaN(val) && val >= 10 && val <= 5000) {
      handleSelectPresetTarget(val);
      setCustomTargetInput('');
    }
  };

  const handleAddManualStitches = (amount: number) => {
    if (amount <= 0) return;

    onUpdateStreakData((prev) => {
      const currentToday = prev.history[todayStr] || 0;
      const nextToday = currentToday + amount;
      const nextHistory = {
        ...prev.history,
        [todayStr]: nextToday,
      };

      const { currentStreak, longestStreak, completedDaysCount } = calculateStreak(
        nextHistory,
        prev.dailyTarget
      );

      const updated: DailyStreakData = {
        ...prev,
        history: nextHistory,
        currentStreak,
        longestStreak,
        completedDaysCount,
        lastActiveDate: todayStr,
      };
      saveDailyStreak(updated);
      return updated;
    });

    // Also contribute to currently active challenge
    onUpdateChallenges((prev) => {
      const next = prev.map((c) => {
        if (c.active) {
          const nextCount = c.currentStitches + amount;
          const completed = nextCount >= c.targetStitches;
          return {
            ...c,
            currentStitches: nextCount,
            completed,
          };
        }
        return c;
      });
      saveWeeklyChallenges(next);
      return next;
    });

    showToast(
      language === 'fil'
        ? `+${amount} tahi ang naidagdag sa iyong streak at hamon!`
        : `+${amount} stitches added to your streak & active challenge!`
    );
  };

  const handleResetToday = () => {
    onUpdateStreakData((prev) => {
      const nextHistory = { ...prev.history, [todayStr]: 0 };
      const { currentStreak, longestStreak, completedDaysCount } = calculateStreak(
        nextHistory,
        prev.dailyTarget
      );
      const updated: DailyStreakData = {
        ...prev,
        history: nextHistory,
        currentStreak,
        longestStreak,
        completedDaysCount,
      };
      saveDailyStreak(updated);
      return updated;
    });
    showToast(
      language === 'fil' ? 'Nai-reset ang bilang ngayong araw' : "Today's stitch count reset"
    );
  };

  const handleSetActiveChallenge = (challengeId: string) => {
    onUpdateChallenges((prev) => {
      const next = prev.map((c) => ({
        ...c,
        active: c.id === challengeId,
      }));
      saveWeeklyChallenges(next);
      return next;
    });

    const ch = challenges.find((c) => c.id === challengeId);
    if (ch) {
      showToast(
        language === 'fil'
          ? `Aktibo na ang hamon: "${ch.tagalogTitle}"`
          : `Active challenge set to "${ch.title}"`
      );
    }
  };

  const past7Days = getPast7DaysSummary(streakData.history, streakData.dailyTarget);
  const activeChallenge = challenges.find((c) => c.active) || challenges[0];
  const completedChallenges = challenges.filter((c) => c.completed || c.currentStitches >= c.targetStitches);

  const displayedChallenges =
    activeTab === 'active'
      ? challenges.filter((c) => c.active)
      : activeTab === 'rewards'
      ? completedChallenges
      : challenges;

  return (
    <div id="weekly-challenge-section" className="space-y-8 scroll-mt-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2C2523] text-[#FAF7F2] text-xs sm:text-sm font-medium px-4 py-2.5 rounded-lg shadow-xl border border-[#B88E3C]/30 flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-[#E6C687]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Section Header */}
      <div className="bg-white rounded-2xl border border-[#E8E1D5] shadow-xs p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[#F0ECE1] pb-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#B88E3C]">
              <Compass className="w-4 h-4" />
              <span>
                {language === 'fil'
                  ? 'Komunidad at Disiplina sa Pananahi'
                  : 'Community Stitching & Daily Habit'}
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2C2523]">
              {language === 'fil'
                ? 'Lingguhang Hamon sa Pananahi at Daily Streak'
                : 'Weekly Stitching Challenge & Daily Streak'}
            </h2>
            <p className="text-xs sm:text-sm text-[#5F554F] leading-relaxed">
              {language === 'fil'
                ? 'Bumuo ng pang-araw-araw na ritmo sa pagtatahi ng iyong paboritong wedding pattern. Bawat tahi na minamarkahan sa chart o offline ay awtomatikong nagpapatuloy sa iyong streak at sumasagot sa mga hamon ng komunidad.'
                : 'Cultivate a rewarding daily stitching rhythm for your wedding heirloom. Every stitch logged in the interactive viewer or added offline builds your streak and advances community-wide craft goals.'}
            </p>
          </div>

          {/* High-level Streak Badges */}
          <div className="grid grid-cols-3 gap-3 self-start lg:self-auto shrink-0 w-full lg:w-auto">
            {/* Current Streak */}
            <div className="bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl p-3.5 text-center flex flex-col items-center justify-center min-w-[100px]">
              <div className="flex items-center gap-1 text-orange-600 mb-1">
                <Flame className="w-5 h-5 fill-orange-500 animate-pulse" />
                <span className="font-mono text-xl sm:text-2xl font-bold text-[#2C2523]">
                  {streakData.currentStreak}
                </span>
              </div>
              <span className="text-[11px] font-medium text-[#7A6E65]">
                {language === 'fil' ? 'Araw na Streak' : 'Day Streak'}
              </span>
            </div>

            {/* Longest Streak */}
            <div className="bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl p-3.5 text-center flex flex-col items-center justify-center min-w-[100px]">
              <div className="flex items-center gap-1 text-[#B88E3C] mb-1">
                <Trophy className="w-5 h-5 text-[#B88E3C]" />
                <span className="font-mono text-xl sm:text-2xl font-bold text-[#2C2523]">
                  {streakData.longestStreak}
                </span>
              </div>
              <span className="text-[11px] font-medium text-[#7A6E65]">
                {language === 'fil' ? 'Pinakamahaba' : 'Best Streak'}
              </span>
            </div>

            {/* Total Goals Met */}
            <div className="bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl p-3.5 text-center flex flex-col items-center justify-center min-w-[100px]">
              <div className="flex items-center gap-1 text-emerald-700 mb-1">
                <Medal className="w-5 h-5 text-emerald-600" />
                <span className="font-mono text-xl sm:text-2xl font-bold text-[#2C2523]">
                  {streakData.completedDaysCount}
                </span>
              </div>
              <span className="text-[11px] font-medium text-[#7A6E65]">
                {language === 'fil' ? 'Araw na Natapos' : 'Days Met'}
              </span>
            </div>
          </div>
        </div>

        {/* Top Cards: Daily Target Configurator & 7-Day Rolling Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
          {/* Left Card: Daily Target & Progress Gauge */}
          <div className="lg:col-span-6 bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8E1D5] pb-3.5">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#B88E3C]" />
                <h3 className="font-serif font-bold text-lg text-[#2C2523]">
                  {language === 'fil' ? 'Target Ngayong Araw' : "Today's Stitch Target"}
                </h3>
              </div>
              <div className="text-xs font-mono font-bold text-[#5F554F] bg-white px-2.5 py-1 rounded border border-[#E8E1D5]">
                {streakData.dailyTarget} {language === 'fil' ? 'tahi/araw' : 'stitches/day'}
              </div>
            </div>

            {/* Target Selector Buttons */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-[#7A6E65] uppercase tracking-wider">
                {language === 'fil' ? 'Pumili ng Pang-araw-araw na Target' : 'Select Daily Pace Target'}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_TARGETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleSelectPresetTarget(preset.value)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-left ${
                      streakData.dailyTarget === preset.value
                        ? 'bg-[#2C2523] text-white border-[#2C2523] shadow-xs font-semibold'
                        : 'bg-white text-[#5F554F] border-[#E8E1D5] hover:bg-[#F2ECE1] hover:text-[#2C2523]'
                    }`}
                  >
                    <div className="font-mono text-sm font-bold">
                      {preset.value}
                    </div>
                    <div className="text-[10px] opacity-80 truncate">
                      {language === 'fil' ? preset.labelFil.split(' ')[1] || preset.labelFil : preset.labelEn.split(' ')[1] || preset.labelEn}
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Target Toggle */}
              <div className="pt-1 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowCustomTarget(!showCustomTarget)}
                  className="text-[#B88E3C] hover:text-[#8C6B24] font-medium underline underline-offset-2 flex items-center gap-1"
                >
                  <span>
                    {showCustomTarget
                      ? (language === 'fil' ? 'Isara ang custom target' : 'Hide custom target')
                      : (language === 'fil' ? 'Mag-set ng ibang bilang...' : 'Set custom number...')}
                  </span>
                </button>
              </div>

              {showCustomTarget && (
                <form
                  onSubmit={handleApplyCustomTarget}
                  className="pt-2 flex items-center gap-2"
                >
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    placeholder="Hal. 150"
                    value={customTargetInput}
                    onChange={(e) => setCustomTargetInput(e.target.value)}
                    className="w-32 px-3 py-1.5 text-xs bg-white border border-[#D5C9B8] rounded-md font-mono focus:outline-hidden focus:ring-1 focus:ring-[#B88E3C]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-medium bg-[#2C2523] text-white rounded-md hover:bg-[#433936] transition-colors"
                  >
                    {language === 'fil' ? 'I-apply' : 'Apply'}
                  </button>
                </form>
              )}
            </div>

            {/* Live Progress Bar for Today */}
            <div className="bg-white border border-[#E8E1D5] rounded-xl p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-[#7A6E65] font-medium">
                    {language === 'fil' ? 'Nagawa Ngayong Araw' : 'Completed Today'}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-bold text-[#2C2523]">
                      {todayStitches.toLocaleString()}
                    </span>
                    <span className="font-mono text-xs text-[#7A6E65]">
                      / {streakData.dailyTarget.toLocaleString()} {language === 'fil' ? 'tahi' : 'stitches'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-mono text-xl font-bold ${
                      isTodayGoalMet ? 'text-emerald-700' : 'text-[#B88E3C]'
                    }`}
                  >
                    {todayProgressPercent}%
                  </span>
                  <div className="text-[10px] text-[#7A6E65]">
                    {isTodayGoalMet
                      ? (language === 'fil' ? '🎉 Naabot ang target!' : '🎉 Goal achieved!')
                      : `${Math.max(0, streakData.dailyTarget - todayStitches)} ${language === 'fil' ? 'natitira' : 'to go'}`}
                  </div>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full h-3 bg-[#EAE2D5] rounded-full overflow-hidden p-0.5 border border-[#D7CBB9]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isTodayGoalMet
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500'
                  }`}
                  style={{ width: `${todayProgressPercent}%` }}
                />
              </div>

              {/* Quick Offline Stitch Logger */}
              <div className="pt-2 border-t border-[#F0ECE1] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[11px] text-[#7A6E65] font-medium">
                  {language === 'fil' ? 'Magdagdag ng tahi mula sa telang ginawa:' : 'Log stitches completed offline:'}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleAddManualStitches(10)}
                    className="px-2 py-1 bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#E8E1D5] rounded text-[11px] font-mono font-medium text-[#2C2523] transition-colors"
                  >
                    +10
                  </button>
                  <button
                    onClick={() => handleAddManualStitches(25)}
                    className="px-2 py-1 bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#E8E1D5] rounded text-[11px] font-mono font-medium text-[#2C2523] transition-colors"
                  >
                    +25
                  </button>
                  <button
                    onClick={() => handleAddManualStitches(50)}
                    className="px-2 py-1 bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#E8E1D5] rounded text-[11px] font-mono font-medium text-[#2C2523] transition-colors"
                  >
                    +50
                  </button>
                  {todayStitches > 0 && (
                    <button
                      onClick={handleResetToday}
                      title={language === 'fil' ? 'I-reset ang araw' : 'Reset today'}
                      className="p-1 text-[#8C7A6B] hover:text-red-700 transition-colors ml-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Card: 7-Day Rolling Streak Tracker */}
          <div className="lg:col-span-6 bg-[#FAF7F2] border border-[#E8E1D5] rounded-xl p-5 sm:p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E1D5] pb-3.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#B88E3C]" />
                  <h3 className="font-serif font-bold text-lg text-[#2C2523]">
                    {language === 'fil' ? '7-Araw na Talaan ng Streak' : 'Past 7 Days Activity'}
                  </h3>
                </div>
                <span className="text-xs text-[#7A6E65]">
                  {language === 'fil' ? 'Lokal na oras' : 'Local daily record'}
                </span>
              </div>

              {/* 7-Day Visual Strip */}
              <div className="grid grid-cols-7 gap-2">
                {past7Days.map((d) => (
                  <div
                    key={d.date}
                    className={`flex flex-col items-center justify-between p-2 rounded-lg border text-center transition-all ${
                      d.isToday
                        ? 'bg-white border-[#B88E3C] ring-2 ring-[#B88E3C]/20 shadow-xs'
                        : d.metTarget
                        ? 'bg-emerald-50/80 border-emerald-200'
                        : 'bg-white border-[#E8E1D5]'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase text-[#7A6E65]">
                      {d.dayName}
                    </span>
                    <span className="text-[9px] text-[#A89C92] mb-1">{d.shortDate}</span>

                    <div className="w-6 h-6 rounded-full flex items-center justify-center my-0.5">
                      {d.metTarget ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                      ) : d.isToday ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-[#B88E3C] animate-ping" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#E0D7C9]" />
                      )}
                    </div>

                    <span className="font-mono text-[10px] font-bold text-[#2C2523] mt-1">
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>

              {/* Encouragement / Status Advice Banner */}
              <div className="p-3.5 bg-white border border-[#E8E1D5] rounded-lg text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[#2C2523]">
                  <span>🔥</span>
                  <span>
                    {isTodayGoalMet
                      ? (language === 'fil'
                          ? `Galing! Napanatili mo ang ${streakData.currentStreak}-araw na streak!`
                          : `Stellar work! Your ${streakData.currentStreak}-day streak is secured for today!`)
                      : streakData.currentStreak > 0
                      ? (language === 'fil'
                          ? `Kailangan pa ng ${Math.max(0, streakData.dailyTarget - todayStitches)} tahi para manatili ang ${streakData.currentStreak}-araw na streak!`
                          : `Stitch ${Math.max(0, streakData.dailyTarget - todayStitches)} more today to extend your ${streakData.currentStreak}-day streak!`)
                      : (language === 'fil'
                          ? `Umpisahan ang bagong streak! Kumpletuhin ang ${streakData.dailyTarget} tahi ngayon.`
                          : `Ignite a new streak today by completing ${streakData.dailyTarget} stitches!`)}
                  </span>
                </div>
                <p className="text-[11px] text-[#5F554F] leading-relaxed">
                  {language === 'fil'
                    ? 'Tip: Ang 15 minuto ng tuluy-tuloy na cross-stitching ay karaniwang nakakakumpleto ng 25-40 tahi.'
                    : 'Tip: 15 minutes of relaxed stitching typically yields 25–40 stitches with 14-count Aida.'}
                </p>
              </div>
            </div>

            {/* Jump to interactive generator */}
            {onJumpToGenerator && (
              <div className="pt-3 border-t border-[#E8E1D5] flex items-center justify-between text-xs">
                <span className="text-[#7A6E65]">
                  {language === 'fil' ? 'Gusto mo bang magtahi sa chart?' : 'Ready to stitch on the active chart?'}
                </span>
                <button
                  type="button"
                  onClick={onJumpToGenerator}
                  className="inline-flex items-center gap-1 text-[#B88E3C] hover:text-[#8C6B24] font-semibold"
                >
                  <span>{language === 'fil' ? 'Pumunta sa Interactive Viewer' : 'Open Stitch Viewer'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Community-Inspired Weekly Challenges List */}
      <div className="bg-white rounded-2xl border border-[#E8E1D5] shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0ECE1] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#B88E3C]">
              <Users className="w-4 h-4" />
              <span>{language === 'fil' ? 'Mga Hamon ng Komunidad' : 'Community Quests'}</span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#2C2523]">
              {language === 'fil'
                ? 'Pumili ng Lingguhang Hamon sa Pagbuburda'
                : 'Curated Weekly Community Challenges'}
            </h3>
            <p className="text-xs text-[#7A6E65]">
              {language === 'fil'
                ? 'Sumali sa isang lingguhang pakikipagsapalaran. Ang bawat tahi mo ay idinadagdag sa aktibong hamon para makamit ang heirloom badges.'
                : 'Select an inspiring community quest. Stitches logged in the app automatically tally toward your active challenge goal.'}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-lg border border-[#E8E1D5] self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-[#2C2523] shadow-xs font-semibold'
                  : 'text-[#7A6E65] hover:text-[#2C2523]'
              }`}
            >
              {language === 'fil' ? 'Lahat (5)' : 'All Goals (5)'}
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'active'
                  ? 'bg-white text-[#2C2523] shadow-xs font-semibold'
                  : 'text-[#7A6E65] hover:text-[#2C2523]'
              }`}
            >
              {language === 'fil' ? 'Kasalukuyang Aktibo' : 'Active Only'}
            </button>
            <button
              onClick={() => setActiveTab('rewards')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                activeTab === 'rewards'
                  ? 'bg-white text-[#2C2523] shadow-xs font-semibold'
                  : 'text-[#7A6E65] hover:text-[#2C2523]'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-[#B88E3C]" />
              <span>{language === 'fil' ? 'Mga Badge' : 'Rewards'}</span>
              {completedChallenges.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-emerald-100 text-emerald-800">
                  {completedChallenges.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Challenges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {displayedChallenges.map((challenge) => {
            const percent = Math.min(
              100,
              Math.round((challenge.currentStitches / challenge.targetStitches) * 100)
            );
            const isCompleted = challenge.completed || challenge.currentStitches >= challenge.targetStitches;

            return (
              <div
                key={challenge.id}
                className={`rounded-xl border p-5 flex flex-col justify-between transition-all space-y-4 ${
                  challenge.active
                    ? 'bg-[#FAF7F2] border-[#B88E3C] ring-2 ring-[#B88E3C]/20 shadow-sm'
                    : isCompleted
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-white border-[#E8E1D5] hover:border-[#D5C9B8]'
                }`}
              >
                <div className="space-y-3">
                  {/* Top status bar of card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-white border border-[#E8E1D5] flex items-center justify-center text-xl shadow-2xs">
                        {challenge.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif font-bold text-base text-[#2C2523]">
                            {language === 'fil' ? challenge.tagalogTitle : challenge.title}
                          </h4>
                        </div>
                        <div className="text-[11px] text-[#7A6E65] flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-[#B88E3C]">
                            {challenge.difficulty}
                          </span>
                          <span>·</span>
                          <span>
                            {challenge.targetStitches.toLocaleString()} {language === 'fil' ? 'kabuuang tahi' : 'target stitches'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {challenge.active ? (
                      <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-[#2C2523] text-white whitespace-nowrap">
                        {language === 'fil' ? 'Aktibo' : 'Active'}
                      </span>
                    ) : isCompleted ? (
                      <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1 whitespace-nowrap">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{language === 'fil' ? 'Tapos Na' : 'Done'}</span>
                      </span>
                    ) : null}
                  </div>

                  {/* Lore & description */}
                  <p className="text-xs text-[#5F554F] leading-relaxed">
                    {language === 'fil' ? challenge.tagalogDescription : challenge.description}
                  </p>

                  <div className="text-[11px] text-[#8C7A6B] bg-white/70 p-2.5 rounded-md border border-[#E8E1D5]/80 flex items-start gap-1.5 italic">
                    <span className="not-italic shrink-0">📍</span>
                    <span>{language === 'fil' ? challenge.tagalogLore : challenge.lore}</span>
                  </div>
                </div>

                {/* Progress bar & action */}
                <div className="space-y-3 pt-2 border-t border-[#E8E1D5]/70">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] font-mono text-[#7A6E65]">
                        {challenge.currentStitches.toLocaleString()} / {challenge.targetStitches.toLocaleString()} {language === 'fil' ? 'tahi' : 'stitches'}
                      </span>
                      <span className="font-mono font-bold text-[#2C2523]">{percent}%</span>
                    </div>

                    <div className="w-full h-2.5 bg-[#EAE2D5] rounded-full overflow-hidden p-0.5 border border-[#D7CBB9]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCompleted
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                            : 'bg-gradient-to-r from-[#B88E3C] to-amber-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Reward & Join button */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-[#5F554F] truncate">
                      <span className="text-base">{challenge.rewardBadge}</span>
                      <span className="font-medium truncate">
                        {language === 'fil' ? challenge.tagalogRewardTitle : challenge.rewardTitle}
                      </span>
                    </div>

                    {!challenge.active && (
                      <button
                        onClick={() => handleSetActiveChallenge(challenge.id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-[#FAF7F2] border border-[#D5C9B8] text-[#2C2523] transition-colors whitespace-nowrap shadow-2xs"
                      >
                        {language === 'fil' ? 'Gawing Aktibo' : 'Set as Goal'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
