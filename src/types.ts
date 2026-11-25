export interface DMCColor {
  code: string;
  name: string;
  hex: string;
  r: number;
  g: number;
  b: number;
  symbol: string;
  symbolDark?: boolean;
}

export interface StitchGridCell {
  colorIndex: number; // index into active palette
  dmcCode: string;
  stitched?: boolean;
}

export interface PatternColorStats {
  color: DMCColor;
  count: number;
  percentage: number;
  skeinsNeeded: number;
}

export type DifficultyTier = 'Beginner' | 'Intermediate' | 'Masterpiece';

export interface ComplexityAnalysis {
  tier: DifficultyTier;
  tagalogTier: string;
  confettiPercentage: number;
  confettiLevel: 'Low (Smooth Blocks)' | 'Moderate (Fine Shading)' | 'High (Intricate Confetti)';
  colorCount: number;
  totalStitches: number;
  estimatedMonths: string;
  stitchingAdvice: string;
  tagalogAdvice: string;
  score: number; // 1 to 10
  confettiReducedCount?: number;
}

export interface PatternData {
  id: string;
  title: string;
  coupleNames?: string;
  weddingDate?: string;
  width: number; // stitch width
  height: number; // stitch height
  grid: StitchGridCell[][]; // [row][col]
  palette: DMCColor[];
  colorStats: PatternColorStats[];
  totalStitches: number;
  previewUrl: string;
  fabricCount: number; // 14, 16, 18, 22
  createdDate: string;
  complexity: ComplexityAnalysis;
  noiseReductionLevel?: number;
  confettiThreshold?: number;
  cleanedConfettiCount?: number;
  annotations?: ProjectAnnotation[];
  backstitches?: BackstitchSegment[];
}

export interface FabricSpecs {
  count: number;
  widthInches: number;
  heightInches: number;
  widthCm: number;
  heightCm: number;
  cutFabricInchesW: number;
  cutFabricInchesH: number;
  recommendedFrame: string;
}

export interface TemplateDesign {
  id: string;
  title: string;
  tagalogTitle: string;
  description: string;
  dimensions: string;
  defaultWidth: number;
  defaultHeight: number;
  imageSrc: string;
  defaultColors: number;
  sampleCouple: string;
  sampleDate: string;
}

export interface UploadedItem {
  id: string;
  file: File;
  url: string;
  name: string;
  sizeFormatted: string;
}

export interface ThreadStashEntry {
  dmcCode: string;
  skeins: number; // default 1
  dateAdded?: string;
  notes?: string;
}

export interface StitchSessionLog {
  id: string;
  timestamp: number;
  durationSeconds: number;
  stitchesCount: number;
  speedPerHour: number;
  formattedDate: string;
}

export interface StitchTimerData {
  totalSeconds: number;
  sessions: StitchSessionLog[];
  customPace?: number; // manual pace calibration in stitches/hr
}

export interface WeeklyChallengeItem {
  id: string;
  title: string;
  tagalogTitle: string;
  category: 'floral' | 'sampler' | 'wedding' | 'marathon' | 'heritage';
  icon: string;
  targetStitches: number;
  currentStitches: number;
  description: string;
  tagalogDescription: string;
  lore: string;
  tagalogLore: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  rewardBadge: string;
  rewardTitle: string;
  tagalogRewardTitle: string;
  completed: boolean;
  active: boolean;
}

export interface DailyStreakData {
  dailyTarget: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  history: Record<string, number>; // dateString -> count of stitches
  completedDaysCount: number;
}

export interface ProjectMilestone {
  id: string;
  patternId?: string;
  title: string;
  tagalogTitle?: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  colorTheme?: 'emerald' | 'amber' | 'indigo' | 'rose' | 'cyan';
  createdAt?: number;
}

export type AnnotationType = 'note' | 'flag' | 'marker' | 'label';

export interface ProjectAnnotation {
  id: string;
  patternId: string;
  x: number; // 0-indexed column
  y: number; // 0-indexed row
  type: AnnotationType;
  text: string;
  color: string;
  createdAt: number;
  resolved?: boolean;
}

export interface ProjectSnapshot {
  id: string;
  patternId: string;
  timestamp: number;
  dateFormatted: string;
  previewUrl: string;
  stitchedCount: number;
  totalStitches: number;
  percentage: number;
  viewMode: string;
  highContrast: boolean;
  stitchSimulation?: boolean;
  note?: string;
}

export interface PercentageMilestone {
  id: string;
  patternId: string;
  percentage: number; // 1 to 100
  title: string;
  description?: string;
  icon?: string;
  colorTheme?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'gold';
  unlockedAt?: number;
}

export interface BackstitchPoint {
  x: number; // 0 to pattern.width (vertex coordinate along grid lines)
  y: number; // 0 to pattern.height
}

export interface BackstitchSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string; // hex color string e.g. '#2C2523'
  dmcCode?: string; // e.g. '310'
  strands?: number; // 1 or 2
}

export interface SuggestedBackstitchPath {
  id: string;
  title: string;
  tagalogTitle: string;
  category: 'silhouette' | 'contrast-edge' | 'detail' | 'monogram';
  colorContrastScore: number; // average gradient/contrast (0-100)
  length: number; // segment count
  points: BackstitchPoint[];
  segments: { x1: number; y1: number; x2: number; y2: number }[];
  suggestedDmc: string;
  suggestedHex: string;
  confidence: number; // 0 to 100
  applied?: boolean;
}

export interface StitchHistoryDelta {
  added: string[];
  removed: string[];
  description?: string;
}



