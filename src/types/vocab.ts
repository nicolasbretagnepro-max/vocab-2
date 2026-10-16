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
  favorite: boolean;
  customMemoryTip?: string;
}

export type ThemeMode = 'light' | 'dark' | 'auto';
export type DailyQuotaOption = 3 | 5 | 7;

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
}

export interface UserStats {
  streak: number;
  lastActiveDate: string | null;
  dailyXp: number;
  dailyXpDate: string;
  totalXp: number;
  routineCompletedDate: string | null;
  highScores: ArcadeHighScores;
}

export interface AppSaveData {
  version: number;
  exportedAt: string;
  progress: Record<string, WordProgress>;
  settings: UserSettings;
  stats: UserStats;
  customWords: WordEntry[];
}

export type ExerciseType =
  | 'discovery'
  | 'qcm-word-to-def'
  | 'qcm-def-to-word'
  | 'qcm-cloze-1'
  | 'qcm-cloze-2'
  | 'syllable-builder'
  | 'typing-hinted'
  | 'typing-strict'
  | 'pair-matching';

export interface SessionQueueItem {
  id: string;
  wordEntry: WordEntry;
  exerciseType: ExerciseType;
  targetLevel: LeitnerLevel;
  targetStep: number;
  passIndex?: 1 | 2 | 3; // For Level 1 3-pass discovery in same session
  isRetry?: boolean;
  pairWords?: WordEntry[]; // When exerciseType === 'pair-matching'
}
