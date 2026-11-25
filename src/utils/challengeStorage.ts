import { DailyStreakData, WeeklyChallengeItem } from '../types';

export const STREAK_STORAGE_KEY = 'sovereign_daily_streak';
export const CHALLENGES_STORAGE_KEY = 'sovereign_weekly_challenges';

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDate(dateStr: string, daysOffset: number): string {
  const parts = dateStr.split('-');
  const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  date.setDate(date.getDate() + daysOffset);
  return getLocalDateString(date);
}

export const INITIAL_COMMUNITY_CHALLENGES: WeeklyChallengeItem[] = [
  {
    id: 'floral-garland',
    title: 'Sampaguita & Floral Garland Sprint',
    tagalogTitle: 'Hamon sa Sampaguita at Koronang Bulaklak',
    category: 'floral',
    icon: '🌸',
    targetStitches: 250,
    currentStitches: 140,
    description: 'Stitch delicate floral vines, petals, and calado lace borders honoring traditional Philippine bridal garlands.',
    tagalogDescription: 'Magtahi ng mga pinong bulaklak, dahon, at calado lace borders na sumisimbolo sa tradisyunal na kasalang Pilipino.',
    lore: 'Community Favorite: Over 420 stitchers in Manila and Cebu are currently completing floral garlands this week.',
    tagalogLore: 'Paborito ng Komunidad: Mahigit 420 crafters sa Maynila at Cebu ang nagtutulungan para sa floral challenge ngayong linggo.',
    difficulty: 'Beginner',
    rewardBadge: '🌸',
    rewardTitle: 'Sampaguita Laurel Badge',
    tagalogRewardTitle: 'Gintong Karangalan ng Sampaguita',
    completed: false,
    active: true,
  },
  {
    id: 'wedding-sampler',
    title: 'Heritage Wedding Sampler Quest',
    tagalogTitle: 'Paghahanap sa Tradisyonal na Wedding Sampler',
    category: 'sampler',
    icon: '🏛️',
    targetStitches: 500,
    currentStitches: 215,
    description: 'Work through geometric filigree border rows and archival cross-stitch sampler corners.',
    tagalogDescription: 'Tapusin ang mga hanay ng geometric filigree at klasikong sulok ng heirloom cross-stitch sampler.',
    lore: 'Archival Collection: Modeled after 19th-century church registry samplers created by master needleworkers.',
    tagalogLore: 'Koleksyong Pangkasaysayan: Hango sa mga siglo-19 na sampler mula sa mga makasaysayang kasalan sa simbahan.',
    difficulty: 'Intermediate',
    rewardBadge: '🏛️',
    rewardTitle: 'Master Sampler Guild Crest',
    tagalogRewardTitle: 'Kalasag ng Dalubhasang Mananahi',
    completed: false,
    active: false,
  },
  {
    id: 'monogram-marathon',
    title: 'Golden Monogram & Lettering Marathon',
    tagalogTitle: 'Marathon ng Gintong Letra at Petsa ng Kasal',
    category: 'wedding',
    icon: '💍',
    targetStitches: 750,
    currentStitches: 0,
    description: 'Perfect the intricate typography, couple initials, and wedding vow date typography.',
    tagalogDescription: 'Gawing perpekto ang mga gintong letra, inisyal ng mag-asawa, at petsa ng kanilang sumpaan.',
    lore: 'Handcrafted Precision: Dedicated to couples and keepsake creators framing personalized wedding banners.',
    tagalogLore: 'Personal na Alaala: Binuo para sa mga mag-asawa at artisanong gumagawa ng de-kalidad na wedding tapestry.',
    difficulty: 'Intermediate',
    rewardBadge: '💍',
    rewardTitle: 'Royal Calligrapher Medal',
    tagalogRewardTitle: 'Medalya ng Maharlikang Tagasulat',
    completed: false,
    active: false,
  },
  {
    id: 'grand-tapestry',
    title: "Crafter's 1,200 Grand Tapestry Marathon",
    tagalogTitle: "Grandeng 1,200 Stitch Marathon ng Komunidad",
    category: 'marathon',
    icon: '✨',
    targetStitches: 1200,
    currentStitches: 320,
    description: 'A dedicated 7-day endurance marathon for makers working through large background motifs and rich shading.',
    tagalogDescription: 'Isang linggong hamon para sa mga masugid na crafters na nagtatapos ng malalawak na disenyo at shades.',
    lore: 'National Stitchathon: Connect with fellow heirloom creators working to beat their weekly record.',
    tagalogLore: 'Pambansang Stitchathon: Maging bahagi ng daan-daang mananahi na sabay-sabay nagbubuo ng kanilang likhang-sining.',
    difficulty: 'Advanced',
    rewardBadge: '✨',
    rewardTitle: 'Heirloom Masterpiece Trophy',
    tagalogRewardTitle: 'Kopa ng Obra-Maestra',
    completed: false,
    active: false,
  },
  {
    id: 'inabel-heritage',
    title: 'Inabel Geometric Waves Sprint',
    tagalogTitle: 'Hamon sa Heometrikong Alon ng Inabel',
    category: 'heritage',
    icon: '🌾',
    targetStitches: 400,
    currentStitches: 0,
    description: 'Honor the symmetry of Northern Luzon weaving traditions with high-contrast rhythmic stitches.',
    tagalogDescription: 'Bigyang pugay ang simetriya ng habing Inabel mula Hilagang Luzon gamit ang paulit-ulit na tahi.',
    lore: 'Living Tradition: Celebrating indigenous Philippine weaving patterns translated into cross-stitch grids.',
    tagalogLore: 'Buhay na Tradisyon: Pagdiriwang sa katutubong habi ng Pilipinas na isinalin sa cross-stitch grid.',
    difficulty: 'Intermediate',
    rewardBadge: '🌾',
    rewardTitle: 'Inabel Artisan Crest',
    tagalogRewardTitle: 'Sagisag ng Artisanong Inabel',
    completed: false,
    active: false,
  },
];

export function calculateStreak(
  history: Record<string, number>,
  target: number
): { currentStreak: number; longestStreak: number; completedDaysCount: number } {
  const today = getLocalDateString();
  const yesterday = shiftDate(today, -1);

  // Count total completed days
  let completedDaysCount = 0;
  for (const date in history) {
    if (history[date] >= target) {
      completedDaysCount++;
    }
  }

  // Calculate current streak
  let currentStreak = 0;
  const todayCount = history[today] || 0;
  const yesterdayCount = history[yesterday] || 0;

  // Determine starting point for backwards crawl
  let startDate: string | null = null;
  if (todayCount >= target) {
    startDate = today;
  } else if (yesterdayCount >= target) {
    // If today hasn't met target yet, but yesterday did, streak remains alive!
    startDate = yesterday;
  }

  if (startDate) {
    let checkDate = startDate;
    while (true) {
      if ((history[checkDate] || 0) >= target) {
        currentStreak++;
        checkDate = shiftDate(checkDate, -1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak across all history
  const sortedDates = Object.keys(history).sort();
  let longestStreak = 0;
  let runningStreak = 0;
  let prevDate: string | null = null;

  for (const d of sortedDates) {
    if (history[d] >= target) {
      if (!prevDate) {
        runningStreak = 1;
      } else {
        const expectedNext = shiftDate(prevDate, 1);
        if (d === expectedNext) {
          runningStreak++;
        } else {
          runningStreak = 1;
        }
      }
      prevDate = d;
      if (runningStreak > longestStreak) {
        longestStreak = runningStreak;
      }
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  return { currentStreak, longestStreak, completedDaysCount };
}

export function loadDailyStreak(): DailyStreakData {
  const today = getLocalDateString();
  const yesterday = shiftDate(today, -1);
  const twoDaysAgo = shiftDate(today, -2);

  // Default seed history so user immediately experiences an active streak context on first load
  const defaultHistory: Record<string, number> = {
    [twoDaysAgo]: 120,
    [yesterday]: 145,
    [today]: 65,
  };

  try {
    const raw = localStorage.getItem(STREAK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const target = typeof parsed.dailyTarget === 'number' && parsed.dailyTarget > 0 ? parsed.dailyTarget : 100;
      const history = parsed.history && typeof parsed.history === 'object' ? parsed.history : defaultHistory;
      const { currentStreak, longestStreak, completedDaysCount } = calculateStreak(history, target);

      return {
        dailyTarget: target,
        currentStreak,
        longestStreak: Math.max(parsed.longestStreak || 0, longestStreak),
        lastActiveDate: parsed.lastActiveDate || today,
        history,
        completedDaysCount,
      };
    }
  } catch (e) {
    console.warn('Failed to load streak from localStorage', e);
  }

  const { currentStreak, longestStreak, completedDaysCount } = calculateStreak(defaultHistory, 100);
  return {
    dailyTarget: 100,
    currentStreak,
    longestStreak: Math.max(longestStreak, 3),
    lastActiveDate: today,
    history: defaultHistory,
    completedDaysCount,
  };
}

export function saveDailyStreak(data: DailyStreakData): void {
  try {
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save streak to localStorage', e);
  }
}

export function loadWeeklyChallenges(): WeeklyChallengeItem[] {
  try {
    const raw = localStorage.getItem(CHALLENGES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load challenges from localStorage', e);
  }
  return INITIAL_COMMUNITY_CHALLENGES;
}

export function saveWeeklyChallenges(challenges: WeeklyChallengeItem[]): void {
  try {
    localStorage.setItem(CHALLENGES_STORAGE_KEY, JSON.stringify(challenges));
  } catch (e) {
    console.warn('Failed to save challenges to localStorage', e);
  }
}

export interface DayProgressSummary {
  date: string;
  dayName: string;
  shortDate: string;
  count: number;
  metTarget: boolean;
  isToday: boolean;
  target: number;
}

export function getPast7DaysSummary(history: Record<string, number>, target: number): DayProgressSummary[] {
  const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayStr = getLocalDateString();
  const result: DayProgressSummary[] = [];

  for (let i = 6; i >= 0; i--) {
    const dStr = shiftDate(todayStr, -i);
    const parts = dStr.split('-');
    const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const dayName = dayNamesEn[dateObj.getDay()];
    const shortDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
    const count = history[dStr] || 0;

    result.push({
      date: dStr,
      dayName,
      shortDate,
      count,
      metTarget: count >= target,
      isToday: dStr === todayStr,
      target,
    });
  }

  return result;
}
