import {
  AppSaveData,
  UserSettings,
  UserStats,
  WordEntry,
  WordProgress,
} from '../types/vocab';
import { getIsoDateString } from './srsEngine';

const STORAGE_KEYS = {
  PROGRESS: 'vocab_srs_progress_v2',
  SETTINGS: 'vocab_user_settings_v2',
  STATS: 'vocab_user_stats_v2',
  CUSTOM_WORDS: 'vocab_custom_words_v2',
};

export const DEFAULT_SETTINGS: UserSettings = {
  dailyNewWordsQuota: 5,
  theme: 'auto',
  dailyXpGoal: 100,
};

export function getDefaultStats(): UserStats {
  const today = getIsoDateString(0);
  return {
    streak: 0,
    lastActiveDate: null,
    dailyXp: 0,
    dailyXpDate: today,
    totalXp: 0,
    routineCompletedDate: null,
    highScores: {
      chrono2min: 0,
      motJuste: 0,
      tapisExpress: 0,
      scribe: 0,
    },
  };
}

export function loadProgressMap(): Record<string, WordProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function saveProgressMap(progress: Record<string, WordProgress>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      dailyNewWordsQuota:
        parsed.dailyNewWordsQuota === 3 ||
        parsed.dailyNewWordsQuota === 5 ||
        parsed.dailyNewWordsQuota === 7
          ? parsed.dailyNewWordsQuota
          : 5,
      theme:
        parsed.theme === 'light' ||
        parsed.theme === 'dark' ||
        parsed.theme === 'auto'
          ? parsed.theme
          : 'auto',
      dailyXpGoal:
        typeof parsed.dailyXpGoal === 'number' ? parsed.dailyXpGoal : 100,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function loadStats(): UserStats {
  const today = getIsoDateString(0);
  const yesterday = getIsoDateString(-1);
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) return getDefaultStats();
    const parsed = JSON.parse(raw) as UserStats;
    const defaults = getDefaultStats();

    let streak = typeof parsed.streak === 'number' ? parsed.streak : 0;
    const lastActiveDate = parsed.lastActiveDate || null;

    // Reset streak if last activity was before yesterday
    if (
      lastActiveDate &&
      lastActiveDate !== today &&
      lastActiveDate !== yesterday
    ) {
      streak = 0;
    }

    const dailyXp = parsed.dailyXpDate === today ? parsed.dailyXp || 0 : 0;

    return {
      streak,
      lastActiveDate,
      dailyXp,
      dailyXpDate: today,
      totalXp: typeof parsed.totalXp === 'number' ? parsed.totalXp : 0,
      routineCompletedDate: parsed.routineCompletedDate || null,
      highScores: {
        ...defaults.highScores,
        ...(parsed.highScores || {}),
      },
    };
  } catch {
    return getDefaultStats();
  }
}

export function saveStats(stats: UserStats): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats:', e);
  }
}

export function recordActivityAndXp(
  currentStats: UserStats,
  xpGained: number,
  markRoutineDone = false
): UserStats {
  const today = getIsoDateString(0);
  const yesterday = getIsoDateString(-1);

  let streak = currentStats.streak;
  if (currentStats.lastActiveDate !== today) {
    if (currentStats.lastActiveDate === yesterday) {
      streak += 1;
    } else {
      streak = 1;
    }
  } else if (streak === 0) {
    streak = 1;
  }

  const baseDailyXp =
    currentStats.dailyXpDate === today ? currentStats.dailyXp : 0;

  const updated: UserStats = {
    ...currentStats,
    streak,
    lastActiveDate: today,
    dailyXp: baseDailyXp + xpGained,
    dailyXpDate: today,
    totalXp: currentStats.totalXp + xpGained,
    routineCompletedDate: markRoutineDone
      ? today
      : currentStats.routineCompletedDate,
  };

  saveStats(updated);
  return updated;
}

export function loadCustomWords(): WordEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_WORDS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomWords(words: WordEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_WORDS, JSON.stringify(words));
  } catch (e) {
    console.error('Failed to save custom words:', e);
  }
}

export function createBackupObject(
  progress: Record<string, WordProgress>,
  settings: UserSettings,
  stats: UserStats,
  customWords: WordEntry[]
): AppSaveData {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    progress,
    settings,
    stats,
    customWords,
  };
}

export function encodeBackupString(data: AppSaveData): string {
  const json = JSON.stringify(data);
  return btoa(encodeURIComponent(json));
}

export function decodeBackupString(rawInput: string): AppSaveData {
  const trimmed = rawInput.trim();
  let jsonStr = trimmed;

  if (!trimmed.startsWith('{')) {
    try {
      jsonStr = decodeURIComponent(atob(trimmed));
    } catch {
      throw new Error('Code de sauvegarde invalide ou corrompu.');
    }
  }

  const parsed = JSON.parse(jsonStr);
  if (!parsed || typeof parsed !== 'object' || !parsed.progress) {
    throw new Error('Structure de sauvegarde non reconnue.');
  }

  return {
    version: parsed.version || 2,
    exportedAt: parsed.exportedAt || new Date().toISOString(),
    progress: parsed.progress || {},
    settings: {
      ...DEFAULT_SETTINGS,
      ...(parsed.settings || {}),
    },
    stats: {
      ...getDefaultStats(),
      ...(parsed.stats || {}),
    },
    customWords: Array.isArray(parsed.customWords) ? parsed.customWords : [],
  };
}
