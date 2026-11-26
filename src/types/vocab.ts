export type LeitnerLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface WordEntry {
  word: string;
  nature: string;
  definition_courte: string;
  definition: string;
  example_1: string;
  example_cloze_1: string;
  example_2: string;
  example_cloze_2: string;
  memory_tip?: string;
  isCustom?: boolean;
}

export interface WordProgress {
  word: string;
  level: LeitnerLevel;
  step: number; // Level 1: 0,1,2 (in-session passes) | Level 2: 0,1 | Level 3: 0,1 | Level 4: 0 | Level 5: 0,1 (30d -> 90d)
  nextReviewDate: string | null; // YYYY-MM-DD
  lastReviewedDate: string | null; // YYYY-MM-DD
  successCount: number;
  errorCount: number;
  consecutiveErrors?: number; // Lot 1: Leech detection (3 consecutive errors -> leech, reset to 0 on success)
  isLeech?: boolean;
  favorite: boolean;
  customMemoryTip?: string;
  introducedOn?: string; // First actual learning encounter; absent in historical profiles.
}

export type ThemeMode = 'light' | 'dark' | 'auto';
export type DailyQuotaOption = 1 | 2;

export interface UserSettings {
  dailyNewWordsQuota: DailyQuotaOption;
  theme: ThemeMode;
  dailyXpGoal: number;
}

export interface ArcadeHighScores {
  chrono2min: number;
  motJuste: number;
  tapisExpress: number;
  scribe: number;
  duelParonymes?: number;
}

export interface DailyActivityLog {
  xp: number;
  reviews: number;
}

export interface UserStats {
  streak: number;
  lastActiveDate: string | null;
  dailyXp: number;
  dailyXpDate: string;
  totalXp: number;
  routineCompletedDate: string | null;
  highScores: ArcadeHighScores;
  activityHistory?: Record<string, DailyActivityLog>; // YYYY-MM-DD -> { xp, reviews }
}

export interface AppSaveData {
  version: number;
  exportedAt: string;
  progress: Record<string, WordProgress>;
  settings: UserSettings;
  stats: UserStats;
  customWords: WordEntry[];
}

export type FlashcardConfidence = 'forgot' | 'hesitant' | 'easy';

export type ExerciseType =
  | 'discovery'
  | 'qcm-word-to-def'
  | 'qcm-def-to-word'
  | 'qcm-cloze-1'
  | 'qcm-cloze-2'
  | 'syllable-builder'
  | 'typing-hinted'
  | 'typing-strict'
  | 'pair-matching'
  | 'paronym-duel'
  | 'flashcard-recall';

export interface SessionQueueItem {
  id: string;
  wordEntry: WordEntry;
  exerciseType: ExerciseType;
  targetLevel: LeitnerLevel;
  targetStep: number;
  passIndex?: 1 | 2 | 3; // For Level 1 3-pass discovery in same session
  isRetry?: boolean;
  pairWords?: WordEntry[]; // When exerciseType === 'pair-matching'
  duelOpponent?: WordEntry; // When exerciseType === 'paronym-duel'
  reviewTargets?: ReviewTarget[]; // Canonical reviews replaced by a bounded routine game.
}

export type ReviewTarget = Pick<SessionQueueItem, 'id' | 'wordEntry' | 'exerciseType' | 'targetLevel' | 'targetStep' | 'passIndex'>;
export interface ShortRoutinePlan {
  queue: SessionQueueItem[];
  newWordsCount: number;
  reviewWordsCount: number;
  dueCount: number;
  deferredCount: number;
  plannedUnits: number;
  maxUnits: number;
  retryUnits: number;
}
