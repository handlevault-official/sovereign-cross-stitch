import { StitchTimerData, StitchSessionLog } from '../types';

const TIMER_STORAGE_PREFIX = 'sovereign_stitch_timer_';

export function loadTimerData(patternId: string): StitchTimerData {
  try {
    const raw = localStorage.getItem(`${TIMER_STORAGE_PREFIX}${patternId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading stitch timer data:', e);
  }
  return {
    totalSeconds: 0,
    sessions: [],
    customPace: 90,
  };
}

export function saveTimerData(patternId: string, data: StitchTimerData): void {
  try {
    localStorage.setItem(`${TIMER_STORAGE_PREFIX}${patternId}`, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving stitch timer data:', e);
  }
}

export function formatTimeHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  const pad = (num: number) => num.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatTimeReadable(totalSeconds: number, language: 'en' | 'fil' = 'en'): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);

  if (hours === 0 && minutes === 0) {
    return language === 'fil' ? '< 1 minuto' : '< 1 min';
  }

  if (hours === 0) {
    return language === 'fil' ? `${minutes} min` : `${minutes} mins`;
  }

  if (minutes === 0) {
    return language === 'fil' ? `${hours} oras` : `${hours} hrs`;
  }

  return language === 'fil' ? `${hours} oras ${minutes} min` : `${hours}h ${minutes}m`;
}

export function formatRemainingTime(
  remainingStitches: number,
  speedPerHour: number,
  language: 'en' | 'fil' = 'en'
): string {
  if (remainingStitches <= 0) {
    return language === 'fil' ? 'Kumpleto na!' : 'Completed!';
  }

  const speed = Math.max(1, speedPerHour);
  const totalHours = remainingStitches / speed;

  if (totalHours < 1) {
    const mins = Math.max(1, Math.round(totalHours * 60));
    return language === 'fil' ? `~${mins} minuto` : `~${mins} mins`;
  }

  if (totalHours < 24) {
    const hrs = Math.floor(totalHours);
    const mins = Math.round((totalHours - hrs) * 60);
    if (mins === 0) {
      return language === 'fil' ? `~${hrs} oras` : `~${hrs} hours`;
    }
    return language === 'fil' ? `~${hrs} oras ${mins} min` : `~${hrs}h ${mins}m`;
  }

  // More than 24 hours
  const days = Math.floor(totalHours / 24);
  const remHours = Math.round(totalHours % 24);
  if (remHours === 0) {
    return language === 'fil' ? `~${days} araw` : `~${days} days`;
  }
  return language === 'fil' ? `~${days} araw ${remHours} oras` : `~${days}d ${remHours}h`;
}
