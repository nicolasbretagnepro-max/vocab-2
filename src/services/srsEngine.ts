import {
  DailyQuotaOption,
  ExerciseType,
  FlashcardConfidence,
  LeitnerLevel,
  SessionQueueItem,
  WordEntry,
  WordProgress,
} from '../types/vocab';
import { stripAccents } from '../utils/clozeParser';
import { findDuelOpponent } from '../utils/paronymEngine';

export const WIP_LIMIT_LEVEL_1_2 = 18;
export const LEECH_CONSECUTIVE_ERRORS_THRESHOLD = 3;

/**
 * Returns YYYY-MM-DD in local time for a Date or day offset from today
 */
export function getIsoDateString(daysOffset = 0, baseDate = new Date()): string {
  const d = new Date(baseDate);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Lot 3: Fuzzing / Smoothing of review intervals to prevent review spikes on the same day.
 * J+1 and J+2 remain strict for initial consolidation.
 */
export function getFuzzedIntervalDays(baseDays: number): number {
  if (baseDays <= 2) return baseDays;
  if (baseDays === 4) {
    return Math.random() < 0.5 ? 4 : 5;
  }
  if (baseDays === 5) {
    return Math.random() < 0.5 ? 5 : 6;
  }
  if (baseDays === 10) {
    const offsets = [-1, 0, 1];
    return 10 + offsets[Math.floor(Math.random() * offsets.length)];
  }
  if (baseDays === 30) {
    const offsets = [-2, -1, 0, 1, 2];
    return 30 + offsets[Math.floor(Math.random() * offsets.length)];
  }
  if (baseDays >= 90) {
    const offsets = [-5, -3, -1, 0, 2, 4, 5];
    return baseDays + offsets[Math.floor(Math.random() * offsets.length)];
  }
  return baseDays;
}

/**
 * Creates default Level 0 progress for a word
 */
export function createInitialProgress(word: string): WordProgress {
  return {
    word,
    level: 0,
    step: 0,
    nextReviewDate: null,
    lastReviewedDate: null,
    successCount: 0,
    errorCount: 0,
    consecutiveErrors: 0,
    isLeech: false,
    favorite: false,
  };
}

/**
 * Lot 1: Checks if a word is currently a "Mot Sangsue / Rebelle" (3+ consecutive errors)
 */
export function isWordLeech(progress: WordProgress | undefined): boolean {
  if (!progress) return false;
  return Boolean(
    progress.isLeech ||
      (progress.consecutiveErrors ?? 0) >= LEECH_CONSECUTIVE_ERRORS_THRESHOLD
  );
}

/**
 * Lot 1: Returns all current Leech words
 */
export function getLeechWords(
  allWords: WordEntry[],
  progressMap: Record<string, WordProgress>
): WordEntry[] {
  return allWords.filter((w) => isWordLeech(progressMap[w.word]));
}

/**
 * Checks if a word is due for review today (or overdue)
 */
export function isWordDueToday(
  progress: WordProgress | undefined,
  today = getIsoDateString(0)
): boolean {
  if (!progress || progress.level === 0) return false;
  if (!progress.nextReviewDate) return true;
  return progress.nextReviewDate <= today;
}

/**
 * Counts words currently in Level 1 and Level 2 (WIP limit check)
 */
export function getWipCount(progressMap: Record<string, WordProgress>): number {
  let count = 0;
  for (const p of Object.values(progressMap)) {
    if (p.level === 1 || p.level === 2) {
      count++;
    }
  }
  return count;
}

/**
 * Gets all words due for review today
 */
export function getDueWords(
  allWords: WordEntry[],
  progressMap: Record<string, WordProgress>,
  today = getIsoDateString(0)
): WordEntry[] {
  return allWords.filter((w) => {
    const p = progressMap[w.word];
    return isWordDueToday(p, today);
  });
}

/**
 * Calculates how many new words should be introduced today according to Anti-Avalanche rules:
 * - WIP Limit: Max 18 words in Level 1 + Level 2
 * - If dueCount >= 15 -> 0 new words
 * - If dueCount between 8 and 14 -> 3 new words (capped by user preference if 3)
 * - Otherwise -> user's dailyNewWordsQuota (3, 5, or 7)
 */
export function calculateDailyNewWordsAllowance(
  dueCount: number,
  wipCount: number,
  configuredQuota: DailyQuotaOption
): number {
  const availableWipSlots = Math.max(0, WIP_LIMIT_LEVEL_1_2 - wipCount);
  if (availableWipSlots === 0) return 0;
  if (dueCount >= 15) return 0;
  if (dueCount >= 8 && dueCount <= 14) {
    return Math.min(3, configuredQuota, availableWipSlots);
  }
  return Math.min(configuredQuota, availableWipSlots);
}

/**
 * Extracts normalized 3-letter prefix for Anti-Interference filtering
 */
export function getThreeLetterPrefix(word: string): string {
  const cleaned = stripAccents(word)
    .replace(/^\(?\s*se\s*\)?\s+/i, '')
    .replace(/^\(?\s*s['\u2019]\s*\)?/i, '')
    .replace(/[^a-z]/g, '');
  return cleaned.slice(0, 3);
}

/**
 * Selects N new words (Level 0) at random while enforcing the Anti-Interference rule:
 * No two selected words in the same session may share the same first 3 letters.
 */
export function selectNewWordsAntiInterference(
  allWords: WordEntry[],
  progressMap: Record<string, WordProgress>,
  count: number,
  existingSessionWords: WordEntry[] = []
): WordEntry[] {
  if (count <= 0) return [];

  const level0Words = allWords.filter((w) => {
    const p = progressMap[w.word];
    return !p || p.level === 0;
  });

  const shuffled = [...level0Words].sort(() => Math.random() - 0.5);
  const usedPrefixes = new Set<string>(
    existingSessionWords.map((w) => getThreeLetterPrefix(w.word))
  );

  const selected: WordEntry[] = [];
  for (const candidate of shuffled) {
    if (selected.length >= count) break;
    const prefix = getThreeLetterPrefix(candidate.word);
    if (prefix.length >= 3 && usedPrefixes.has(prefix)) {
      continue;
    }
    usedPrefixes.add(prefix);
    selected.push(candidate);
  }

  return selected;
}

/**
 * Determines the exercise type for a due word based on its current Leitner level and step
 */
export function getExerciseTypeForProgress(progress: WordProgress): ExerciseType {
  switch (progress.level) {
    case 1:
      return 'discovery';
    case 2:
      return progress.step === 0 ? 'qcm-def-to-word' : 'qcm-cloze-2';
    case 3:
      return progress.step === 0 ? 'syllable-builder' : 'typing-hinted';
    case 4:
      return 'typing-strict';
    case 5:
      return 'typing-strict';
    default:
      return 'discovery';
  }
}

/**
 * Builds the Daily Routine session queue:
 * - New words (and any incomplete Level 1 words) go through 3 passes in the SAME session.
 * - Due review words are scheduled according to their Level and Step.
 * - Level 2 (step 0) words are included in a PairMatchingGame at the end of the session.
 * - Lot 4: Includes a Paronym / Nuance Duel at the end of the session on one of the session words.
 */
export function buildDailyRoutineQueue(
  allWords: WordEntry[],
  progressMap: Record<string, WordProgress>,
  configuredQuota: DailyQuotaOption,
  today = getIsoDateString(0)
): {
  queue: SessionQueueItem[];
  newWordsCount: number;
  reviewWordsCount: number;
} {
  const dueWords = getDueWords(allWords, progressMap, today);
  const dueLevel1Words = dueWords.filter((w) => progressMap[w.word]?.level === 1);
  const dueHigherWords = dueWords.filter((w) => (progressMap[w.word]?.level || 0) >= 2);

  const wipCount = getWipCount(progressMap);
  const newAllowance = calculateDailyNewWordsAllowance(
    dueWords.length,
    wipCount,
    configuredQuota
  );

  const newWords = selectNewWordsAntiInterference(
    allWords,
    progressMap,
    newAllowance,
    dueWords
  );

  const threePassWords = [...dueLevel1Words, ...newWords];

  const reviewItems: SessionQueueItem[] = dueHigherWords.map((w, idx) => {
    const p = progressMap[w.word];
    return {
      id: `rev-${idx}-${w.word}`,
      wordEntry: w,
      exerciseType: getExerciseTypeForProgress(p),
      targetLevel: p.level,
      targetStep: p.step,
    };
  });

  const mainTimeline: (SessionQueueItem | null)[] = [];

  const placeAtOrAfter = (startIndex: number, item: SessionQueueItem) => {
    let idx = Math.max(0, startIndex);
    while (mainTimeline[idx] !== undefined && mainTimeline[idx] !== null) {
      idx++;
    }
    mainTimeline[idx] = item;
    return idx;
  };

  let cursor = 0;
  let reviewCursor = 0;

  for (let i = 0; i < threePassWords.length; i++) {
    const word = threePassWords[i];
    const pass1Index = placeAtOrAfter(cursor, {
      id: `l1-p1-${i}-${word.word}`,
      wordEntry: word,
      exerciseType: 'discovery',
      targetLevel: 1,
      targetStep: 0,
      passIndex: 1,
    });
    cursor = pass1Index + 1;

    const offset = 2 + (i % 2);
    placeAtOrAfter(pass1Index + offset, {
      id: `l1-p2-${i}-${word.word}`,
      wordEntry: word,
      exerciseType: 'qcm-word-to-def',
      targetLevel: 1,
      targetStep: 1,
      passIndex: 2,
    });

    if (reviewCursor < reviewItems.length) {
      placeAtOrAfter(cursor, reviewItems[reviewCursor++]);
    }
  }

  while (reviewCursor < reviewItems.length) {
    placeAtOrAfter(cursor, reviewItems[reviewCursor++]);
  }

  const compactedMain: SessionQueueItem[] = mainTimeline.filter(
    (item): item is SessionQueueItem => item !== null && item !== undefined
  );

  const pass3Items: SessionQueueItem[] = threePassWords.map((word, i) => ({
    id: `l1-p3-${i}-${word.word}`,
    wordEntry: word,
    exerciseType: 'qcm-cloze-1',
    targetLevel: 1,
    targetStep: 2,
    passIndex: 3,
  }));

  const finalQueue: SessionQueueItem[] = [...compactedMain, ...pass3Items];

  const level2Step0Words = dueHigherWords.filter((w) => {
    const p = progressMap[w.word];
    return p && p.level === 2 && p.step === 0;
  });

  if (level2Step0Words.length > 0 || threePassWords.length >= 4) {
    const pairPool: WordEntry[] = [...level2Step0Words];
    const extras = [...threePassWords, ...dueHigherWords, ...allWords];
    for (const candidate of extras) {
      if (pairPool.length >= 4) break;
      if (!pairPool.some((p) => p.word === candidate.word)) {
        pairPool.push(candidate);
      }
    }

    if (pairPool.length === 4) {
      finalQueue.push({
        id: `pairs-end-${Date.now()}`,
        wordEntry: pairPool[0],
        exerciseType: 'pair-matching',
        targetLevel: 2,
        targetStep: 0,
        pairWords: pairPool.slice(0, 4),
      });
    }
  }

  // Lot 4: Add a Paronym / Nuance Duel on one of the session's studied words
  const sessionCandidates = [...dueHigherWords, ...threePassWords];
  for (const candidate of sessionCandidates) {
    const match = findDuelOpponent(candidate, allWords);
    if (match) {
      finalQueue.push({
        id: `duel-end-${candidate.word}`,
        wordEntry: candidate,
        exerciseType: 'paronym-duel',
        targetLevel: progressMap[candidate.word]?.level || 2,
        targetStep: progressMap[candidate.word]?.step || 0,
        duelOpponent: match.opponent,
      });
      break;
    }
  }

  return {
    queue: finalQueue,
    newWordsCount: newWords.length,
    reviewWordsCount: dueWords.length,
  };
}

/**
 * Lot 1: Builds a focused training queue for Leech ("Mots Rebelles") words
 */
export function buildLeechTrainingQueue(
  allWords: WordEntry[],
  progressMap: Record<string, WordProgress>
): SessionQueueItem[] {
  const leeches = getLeechWords(allWords, progressMap).slice(0, 6);
  if (leeches.length === 0) return [];

  const queue: SessionQueueItem[] = [];
  // Step 1: Active Discovery reminder for each leech
  leeches.forEach((w, i) => {
    queue.push({
      id: `leech-disc-${i}-${w.word}`,
      wordEntry: w,
      exerciseType: 'discovery',
      targetLevel: progressMap[w.word]?.level || 1,
      targetStep: 0,
    });
  });

  // Step 2: Syllable Builder or Cloze Context to re-anchor
  leeches.forEach((w, i) => {
    queue.push({
      id: `leech-prac-${i}-${w.word}`,
      wordEntry: w,
      exerciseType: i % 2 === 0 ? 'syllable-builder' : 'qcm-cloze-1',
      targetLevel: progressMap[w.word]?.level || 1,
      targetStep: 0,
    });
  });

  return queue;
}

/**
 * Lot 2: Builds a 10-card Flashcard Active Recall ("Rappel Éclair") queue
 * prioritizing due words and recently seen words (or new words if none seen yet)
 */
export function buildFlashcardRecallQueue(
  allWords: WordEntry[],
  progressMap: Record<string, WordProgress>,
  count = 10
): SessionQueueItem[] {
  const due = getDueWords(allWords, progressMap);
  const seen = allWords.filter(
    (w) =>
      (progressMap[w.word]?.level ?? 0) >= 1 &&
      !due.some((d) => d.word === w.word)
  );
  const unseen = allWords.filter((w) => (progressMap[w.word]?.level ?? 0) === 0);

  const combined = [
    ...[...due].sort(() => Math.random() - 0.5),
    ...[...seen].sort(() => Math.random() - 0.5),
    ...[...unseen].sort(() => Math.random() - 0.5),
  ].slice(0, count);

  return combined.map((w, i) => {
    const p = progressMap[w.word];
    return {
      id: `flashcard-${i}-${w.word}`,
      wordEntry: w,
      exerciseType: 'flashcard-recall',
      targetLevel: p?.level || 1,
      targetStep: p?.step || 0,
    };
  });
}

/**
 * Builds a Bonus Session (+3 new words in 3 passes)
 */
export function buildBonusNewWordsQueue(
  allWords: WordEntry[],
  progressMap: Record<string, WordProgress>,
  count = 3
): SessionQueueItem[] {
  const newWords = selectNewWordsAntiInterference(allWords, progressMap, count);
  if (newWords.length === 0) return [];

  const pass1: SessionQueueItem[] = newWords.map((w, i) => ({
    id: `bonus-p1-${i}-${w.word}`,
    wordEntry: w,
    exerciseType: 'discovery',
    targetLevel: 1,
    targetStep: 0,
    passIndex: 1,
  }));

  const pass2: SessionQueueItem[] = newWords.map((w, i) => ({
    id: `bonus-p2-${i}-${w.word}`,
    wordEntry: w,
    exerciseType: 'qcm-word-to-def',
    targetLevel: 1,
    targetStep: 1,
    passIndex: 2,
  }));

  const pass3: SessionQueueItem[] = newWords.map((w, i) => ({
    id: `bonus-p3-${i}-${w.word}`,
    wordEntry: w,
    exerciseType: 'qcm-cloze-1',
    targetLevel: 1,
    targetStep: 2,
    passIndex: 3,
  }));

  const queue: SessionQueueItem[] = [];
  if (newWords.length === 3) {
    queue.push(pass1[0], pass1[1], pass1[2], pass2[0], pass2[1], pass2[2], ...pass3);
  } else {
    queue.push(...pass1, ...pass2, ...pass3);
  }
  return queue;
}

export function buildFreeReviewQueue(
  allWords: WordEntry[],
  progressMap: Record<string, WordProgress>,
  count = 10
): SessionQueueItem[] {
  const seenWords = allWords.filter((w) => (progressMap[w.word]?.level || 0) >= 1);
  const pool = seenWords.length >= 4 ? seenWords : allWords;
  const selected = [...pool].sort(() => Math.random() - 0.5).slice(0, count);

  const types: ExerciseType[] = [
    'qcm-word-to-def',
    'qcm-def-to-word',
    'qcm-cloze-1',
    'qcm-cloze-2',
    'syllable-builder',
  ];

  return selected.map((w, i) => {
    const p = progressMap[w.word];
    return {
      id: `free-${i}-${w.word}`,
      wordEntry: w,
      exerciseType: types[i % types.length],
      targetLevel: p?.level || 1,
      targetStep: p?.step || 0,
    };
  });
}

/**
 * Lot 2: Updates WordProgress based on Flashcard self-evaluation ('forgot' | 'hesitant' | 'easy')
 */
export function updateWordProgressOnFlashcard(
  current: WordProgress | undefined,
  word: string,
  confidence: FlashcardConfidence,
  today = getIsoDateString(0)
): WordProgress {
  const base: WordProgress = current
    ? { ...current }
    : createInitialProgress(word);

  base.lastReviewedDate = today;

  if (confidence === 'forgot') {
    base.errorCount += 1;
    base.consecutiveErrors = (base.consecutiveErrors || 0) + 1;
    base.isLeech =
      base.consecutiveErrors >= LEECH_CONSECUTIVE_ERRORS_THRESHOLD;
    const effectiveLevel = base.level === 0 ? 1 : base.level;
    base.level = (
      effectiveLevel >= 3 ? effectiveLevel - 1 : effectiveLevel
    ) as LeitnerLevel;
    base.step = 0;
    base.nextReviewDate = getIsoDateString(1);
    return base;
  }

  // 'hesitant' or 'easy' resets consecutive errors
  base.successCount += 1;
  base.consecutiveErrors = 0;
  base.isLeech = false;

  if (confidence === 'hesitant') {
    // Consolidate at current level with a short 1-2 day review
    if (base.level === 0) base.level = 1;
    base.nextReviewDate = getIsoDateString(base.level >= 3 ? 2 : 1);
    return base;
  }

  // confidence === 'easy': advance step/level with fuzzed interval
  if (base.level <= 1) {
    base.level = 2;
    base.step = 0;
    base.nextReviewDate = getIsoDateString(1);
  } else if (base.level === 2) {
    if (base.step === 0) {
      base.step = 1;
      base.nextReviewDate = getIsoDateString(2);
    } else {
      base.level = 3;
      base.step = 0;
      base.nextReviewDate = getIsoDateString(getFuzzedIntervalDays(4));
    }
  } else if (base.level === 3) {
    if (base.step === 0) {
      base.step = 1;
      base.nextReviewDate = getIsoDateString(getFuzzedIntervalDays(5));
    } else {
      base.level = 4;
      base.step = 0;
      base.nextReviewDate = getIsoDateString(getFuzzedIntervalDays(10));
    }
  } else if (base.level === 4) {
    base.level = 5;
    base.step = 0;
    base.nextReviewDate = getIsoDateString(getFuzzedIntervalDays(30));
  } else {
    base.step = 1;
    base.nextReviewDate = getIsoDateString(getFuzzedIntervalDays(90));
  }

  return base;
}

/**
 * Computes the updated WordProgress after an exercise completion.
 * Includes Lot 1 (consecutiveErrors / isLeech) and Lot 3 (fuzzed intervals).
 */
export function updateWordProgressOnAnswer(
  current: WordProgress | undefined,
  word: string,
  isCorrect: boolean,
  queueItem: SessionQueueItem,
  hintsUsed = 0,
  today = getIsoDateString(0)
): WordProgress {
  const base: WordProgress = current
    ? { ...current }
    : createInitialProgress(word);

  base.lastReviewedDate = today;

  // Pair matching or Paronym Duel bonus consolidation step
  if (
    queueItem.exerciseType === 'pair-matching' ||
    queueItem.exerciseType === 'paronym-duel'
  ) {
    if (isCorrect) {
      base.successCount += 1;
      base.consecutiveErrors = 0;
      base.isLeech = false;
    } else {
      base.errorCount += 1;
      base.consecutiveErrors = (base.consecutiveErrors || 0) + 1;
      base.isLeech =
        base.consecutiveErrors >= LEECH_CONSECUTIVE_ERRORS_THRESHOLD;
    }
    return base;
  }

  if (!isCorrect) {
    base.errorCount += 1;
    base.consecutiveErrors = (base.consecutiveErrors || 0) + 1;
    base.isLeech =
      base.consecutiveErrors >= LEECH_CONSECUTIVE_ERRORS_THRESHOLD;

    const effectiveLevel = base.level === 0 ? 1 : base.level;
    if (effectiveLevel >= 3) {
      base.level = (effectiveLevel - 1) as LeitnerLevel;
      base.step = 0;
      base.nextReviewDate = getIsoDateString(1);
    } else {
      base.level = effectiveLevel as LeitnerLevel;
      base.step = 0;
      base.nextReviewDate = getIsoDateString(1);
    }
    return base;
  }

  // Correct answer: reset consecutive errors (Lot 1)
  base.successCount += 1;
  base.consecutiveErrors = 0;
  base.isLeech = false;

  if (queueItem.isRetry && queueItem.targetLevel >= 2) {
    return base;
  }

  // Handle Level 1 3-pass progression
  if (queueItem.targetLevel === 1 || base.level <= 1) {
    if (base.level === 2 && queueItem.isRetry) {
      return base;
    }
    if (queueItem.passIndex === 1) {
      base.level = 1;
      base.step = Math.max(base.step, 1);
      base.nextReviewDate = today;
    } else if (queueItem.passIndex === 2) {
      base.level = 1;
      base.step = Math.max(base.step, 2);
      base.nextReviewDate = today;
    } else if (queueItem.passIndex === 3) {
      base.level = 2;
      base.step = 0;
      base.nextReviewDate = getIsoDateString(1);
    } else {
      base.level = Math.max(1, base.level) as LeitnerLevel;
      if (!base.nextReviewDate) base.nextReviewDate = getIsoDateString(1);
    }
    return base;
  }

  // Level 2 progression (with Lot 3 fuzzing on J+4)
  if (base.level === 2) {
    if (base.step === 0) {
      base.step = 1;
      base.nextReviewDate = getIsoDateString(2);
    } else {
      base.level = 3;
      base.step = 0;
      base.nextReviewDate = getIsoDateString(getFuzzedIntervalDays(4));
    }
    return base;
  }

  // Level 3 progression (with Lot 3 fuzzing on J+5 and J+10)
  if (base.level === 3) {
    if (base.step === 0) {
      base.step = 1;
      base.nextReviewDate = getIsoDateString(getFuzzedIntervalDays(5));
    } else {
      if (hintsUsed <= 1) {
        base.level = 4;
        base.step = 0;
        base.nextReviewDate = getIsoDateString(getFuzzedIntervalDays(10));
      } else {
        base.step = 1;
        base.nextReviewDate = getIsoDateString(1);
      }
    }
    return base;
  }

  // Level 4 progression (with Lot 3 fuzzing on J+30)
  if (base.level === 4) {
    if (hintsUsed === 0) {
      base.level = 5;
      base.step = 0;
      base.nextReviewDate = getIsoDateString(getFuzzedIntervalDays(30));
    } else {
      base.step = 0;
      base.nextReviewDate = getIsoDateString(2);
    }
    return base;
  }

  // Level 5 progression (J+30 -> J+90 fuzzed)
  if (base.level === 5) {
    base.step = 1;
    base.nextReviewDate = getIsoDateString(getFuzzedIntervalDays(90));
    return base;
  }

  return base;
}

/**
 * Selects 3 distractors of the SAME grammatical nature as targetWord.
 */
export function selectSameNatureDistractors(
  targetWord: WordEntry,
  allWords: WordEntry[],
  count = 3
): WordEntry[] {
  const exactNaturePool = allWords.filter(
    (w) =>
      w.word !== targetWord.word &&
      w.nature.trim().toLowerCase() === targetWord.nature.trim().toLowerCase() &&
      w.definition_courte !== targetWord.definition_courte
  );

  const shuffledExact = [...exactNaturePool].sort(() => Math.random() - 0.5);
  if (shuffledExact.length >= count) {
    return shuffledExact.slice(0, count);
  }

  const baseFamily = targetWord.nature.split(' ')[0].toLowerCase();
  const familyPool = allWords.filter(
    (w) =>
      w.word !== targetWord.word &&
      !shuffledExact.some((e) => e.word === w.word) &&
      w.nature.toLowerCase().includes(baseFamily)
  );
  const shuffledFamily = [...familyPool].sort(() => Math.random() - 0.5);

  const combined = [...shuffledExact, ...shuffledFamily];
  if (combined.length >= count) {
    return combined.slice(0, count);
  }

  const remaining = allWords
    .filter(
      (w) =>
        w.word !== targetWord.word && !combined.some((c) => c.word === w.word)
    )
    .sort(() => Math.random() - 0.5);

  return [...combined, ...remaining].slice(0, count);
}
