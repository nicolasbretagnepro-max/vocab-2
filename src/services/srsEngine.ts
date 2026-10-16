import {
  DailyQuotaOption,
  ExerciseType,
  LeitnerLevel,
  SessionQueueItem,
  WordEntry,
  WordProgress,
} from '../types/vocab';
import { stripAccents } from '../utils/clozeParser';

export const WIP_LIMIT_LEVEL_1_2 = 18;

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
    favorite: false,
  };
}

/**
 * Checks if a word is due for review today (or overdue)
 */
export function isWordDueToday(progress: WordProgress | undefined, today = getIsoDateString(0)): boolean {
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

  // Shuffle candidates
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
 * - New words (and any incomplete Level 1 words) go through 3 passes in the SAME session:
 *   Pass 1: DiscoveryCard
 *   Pass 2 (2 to 4 questions later): QCM Definition (word -> definition_courte)
 *   Pass 3 (end of session): QCM Context (example_cloze_1 -> word)
 * - Due review words are scheduled according to their Level and Step.
 * - Level 2 (step 0) words are also included in a PairMatchingGame at the end of the session.
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

  // All words requiring the 3-pass Level 1 flow in this session
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

  // Interleave Pass 1 and Pass 2 (2 to 4 questions after Pass 1), then reviews, then Pass 3 at end
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

    // Schedule Pass 2 exactly 2 to 4 slots after Pass 1
    const offset = 2 + (i % 2); // 2 or 3 slots later
    placeAtOrAfter(pass1Index + offset, {
      id: `l1-p2-${i}-${word.word}`,
      wordEntry: word,
      exerciseType: 'qcm-word-to-def',
      targetLevel: 1,
      targetStep: 1,
      passIndex: 2,
    });

    // Fill intermediate gaps with review items if available
    if (reviewCursor < reviewItems.length) {
      placeAtOrAfter(cursor, reviewItems[reviewCursor++]);
    }
  }

  // Place any remaining review items into available slots
  while (reviewCursor < reviewItems.length) {
    placeAtOrAfter(cursor, reviewItems[reviewCursor++]);
  }

  const compactedMain: SessionQueueItem[] = mainTimeline.filter(
    (item): item is SessionQueueItem => item !== null && item !== undefined
  );

  // Ensure every Pass 2 occurs after its Pass 1 (even when session has very few total items)
  // Pass 3 items go at the end of the session
  const pass3Items: SessionQueueItem[] = threePassWords.map((word, i) => ({
    id: `l1-p3-${i}-${word.word}`,
    wordEntry: word,
    exerciseType: 'qcm-cloze-1',
    targetLevel: 1,
    targetStep: 2,
    passIndex: 3,
  }));

  const finalQueue: SessionQueueItem[] = [...compactedMain, ...pass3Items];

  // Level 2 step 0 words also trigger the PairMatchingGame at the end of the session
  const level2Step0Words = dueHigherWords.filter((w) => {
    const p = progressMap[w.word];
    return p && p.level === 2 && p.step === 0;
  });

  if (level2Step0Words.length > 0 || threePassWords.length >= 4) {
    // Build a 4-word pair matching game prioritizing Level 2 step 0 words
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

  return {
    queue: finalQueue,
    newWordsCount: newWords.length,
    reviewWordsCount: dueWords.length,
  };
}

/**
 * Builds a Bonus Session (+3 new words in 3 passes) or Free Review (10 questions)
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

  // Interleave pass1 and pass2 so Pass 2 is 2-3 items after Pass 1
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
 * Computes the updated WordProgress after an exercise completion.
 *
 * Rules:
 * - On Error:
 *   - Level 3, 4, or 5 -> downgrade by 1 level (level - 1, step: 0), nextReviewDate = J+1
 *   - Level 0, 1, or 2 -> keep level (or Level 1 if it was Level 0 in discovery), reset step to 0, nextReviewDate = J+1
 * - On Success:
 *   - Level 1:
 *     - Pass 1 (discovery) -> level: 1, step: 1, nextReviewDate = today
 *     - Pass 2 (qcm-word-to-def) -> level: 1, step: 2, nextReviewDate = today
 *     - Pass 3 (qcm-cloze-1) -> level: 2, step: 0, nextReviewDate = J+1
 *   - Level 2:
 *     - step 0 -> level: 2, step: 1, nextReviewDate = J+2
 *     - step 1 -> level: 3, step: 0, nextReviewDate = J+4
 *   - Level 3:
 *     - step 0 (syllable-builder) -> level: 3, step: 1, nextReviewDate = J+5
 *     - step 1 (typing-hinted): if hintsUsed <= 1 -> level: 4, step: 0, nextReviewDate = J+10
 *       (if hintsUsed > 1 -> remains level: 3, step: 1, nextReviewDate = J+1)
 *   - Level 4:
 *     - step 0 (typing-strict): if hintsUsed === 0 -> level: 5, step: 0, nextReviewDate = J+30
 *       (if hintsUsed > 0 -> remains level: 4, step: 0, nextReviewDate = J+2)
 *   - Level 5:
 *     - step 0 -> level: 5, step: 1, nextReviewDate = J+90
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

  // Pair matching is a bonus consolidation step; don't double-increment level if already updated
  if (queueItem.exerciseType === 'pair-matching') {
    if (isCorrect) {
      base.successCount += 1;
    }
    return base;
  }

  if (!isCorrect) {
    base.errorCount += 1;
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

  // Correct answer
  base.successCount += 1;

  // If this was a retry of a previously failed question in the same session,
  // we don't promote it beyond the downgrade target — we just validate the retry.
  if (queueItem.isRetry && queueItem.targetLevel >= 2) {
    return base;
  }

  // Handle Level 1 3-pass progression
  if (queueItem.targetLevel === 1 || base.level <= 1) {
    if (queueItem.passIndex === 1) {
      base.level = 1;
      base.step = 1;
      base.nextReviewDate = today;
    } else if (queueItem.passIndex === 2) {
      base.level = 1;
      base.step = 2;
      base.nextReviewDate = today;
    } else if (queueItem.passIndex === 3) {
      // All 3 passes completed in the same session -> Level 2 (step: 0), J+1
      base.level = 2;
      base.step = 0;
      base.nextReviewDate = getIsoDateString(1);
    } else {
      // Fallback if practiced in free review
      base.level = Math.max(1, base.level) as LeitnerLevel;
      if (!base.nextReviewDate) base.nextReviewDate = getIsoDateString(1);
    }
    return base;
  }

  // Level 2 progression
  if (base.level === 2) {
    if (base.step === 0) {
      base.step = 1;
      base.nextReviewDate = getIsoDateString(2);
    } else {
      base.level = 3;
      base.step = 0;
      base.nextReviewDate = getIsoDateString(4);
    }
    return base;
  }

  // Level 3 progression
  if (base.level === 3) {
    if (base.step === 0) {
      base.step = 1;
      base.nextReviewDate = getIsoDateString(5);
    } else {
      // step 1: typing with hints (0 or 1 hint max to advance to Level 4)
      if (hintsUsed <= 1) {
        base.level = 4;
        base.step = 0;
        base.nextReviewDate = getIsoDateString(10);
      } else {
        base.step = 1;
        base.nextReviewDate = getIsoDateString(1);
      }
    }
    return base;
  }

  // Level 4 progression
  if (base.level === 4) {
    if (hintsUsed === 0) {
      base.level = 5;
      base.step = 0;
      base.nextReviewDate = getIsoDateString(30);
    } else {
      base.step = 0;
      base.nextReviewDate = getIsoDateString(2);
    }
    return base;
  }

  // Level 5 progression (J+30 -> J+90)
  if (base.level === 5) {
    base.step = 1;
    base.nextReviewDate = getIsoDateString(90);
    return base;
  }

  return base;
}

/**
 * Selects 3 distractors of the SAME grammatical nature as targetWord.
 * Falls back to broader grammatical family only if an ultra-rare nature has < 4 words in the dataset.
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

  // Fallback for rare natures with fewer than 4 entries in JSON (e.g., "locution verbale")
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
