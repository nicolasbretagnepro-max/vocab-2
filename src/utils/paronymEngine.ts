import editorialGroupsRaw from '../data/editorialGroups.json';
import { WordEntry } from '../types/vocab';
import { levenshteinDistance, stripAccents } from './clozeParser';

const editorialGroups = editorialGroupsRaw as string[][];

export interface ParonymDuelPair {
  wordA: WordEntry;
  wordB: WordEntry;
  relationType: 'nuance' | 'paronyme';
}

/**
 * Finds the best duel opponent for a target word:
 * 1. First checks the 109 curated editorial groups (semantic nuances / classic confusions)
 * 2. Then checks orthographic/phonetic paronyms (Levenshtein distance 1 or 2)
 * 3. Falls back to same grammatical nature with similar length
 */
export function findDuelOpponent(
  target: WordEntry,
  allWords: WordEntry[]
): { opponent: WordEntry; relationType: 'nuance' | 'paronyme' } | null {
  const wordByLower = new Map<string, WordEntry>();
  for (const w of allWords) {
    wordByLower.set(w.word.trim().toLowerCase(), w);
  }

  const targetLower = target.word.trim().toLowerCase();

  // 1. Check 109 curated editorial groups
  for (const group of editorialGroups) {
    const hasTarget = group.some((g) => g.trim().toLowerCase() === targetLower);
    if (hasTarget) {
      const candidates = group
        .map((g) => wordByLower.get(g.trim().toLowerCase()))
        .filter((w): w is WordEntry => w !== undefined && w.word !== target.word);
      if (candidates.length > 0) {
        const picked =
          candidates[Math.floor(Math.random() * candidates.length)];
        return { opponent: picked, relationType: 'nuance' };
      }
    }
  }

  // 2. Check phonetic / orthographic paronyms (Levenshtein 1 or 2)
  const normTarget = stripAccents(target.word).replace(/[^a-z]/g, '');
  if (normTarget.length >= 5) {
    const paronymCandidates: WordEntry[] = [];
    for (const candidate of allWords) {
      if (candidate.word === target.word) continue;
      const normCand = stripAccents(candidate.word).replace(/[^a-z]/g, '');
      if (
        normCand.length >= 5 &&
        Math.abs(normCand.length - normTarget.length) <= 2
      ) {
        const dist = levenshteinDistance(normTarget, normCand);
        if (dist >= 1 && dist <= 2) {
          paronymCandidates.push(candidate);
        }
      }
    }
    if (paronymCandidates.length > 0) {
      const picked =
        paronymCandidates[Math.floor(Math.random() * paronymCandidates.length)];
      return { opponent: picked, relationType: 'paronyme' };
    }
  }

  // 3. Fallback: same nature and shared prefix or similar length
  const sameNature = allWords.filter(
    (w) =>
      w.word !== target.word &&
      w.nature.toLowerCase() === target.nature.toLowerCase()
  );
  if (sameNature.length > 0) {
    const picked = sameNature[Math.floor(Math.random() * sameNature.length)];
    return { opponent: picked, relationType: 'nuance' };
  }

  return null;
}

/**
 * Generates N high-interest Paronym & Nuance Duels for Arcade or Routine
 */
export function generateDuelPairs(
  poolWords: WordEntry[],
  allWords: WordEntry[],
  count = 5
): ParonymDuelPair[] {
  const wordByLower = new Map<string, WordEntry>();
  for (const w of allWords) {
    wordByLower.set(w.word.trim().toLowerCase(), w);
  }

  const poolSet = new Set(poolWords.map((w) => w.word));
  const candidatePairs: ParonymDuelPair[] = [];

  // 1. Build pairs from curated 109 editorial groups
  for (const group of editorialGroups) {
    const resolved = group
      .map((name) => wordByLower.get(name.trim().toLowerCase()))
      .filter((w): w is WordEntry => Boolean(w));
    if (resolved.length >= 2) {
      // Check if at least one word is in poolWords
      if (resolved.some((w) => poolSet.has(w.word))) {
        const shuffledGroup = [...resolved].sort(() => Math.random() - 0.5);
        candidatePairs.push({
          wordA: shuffledGroup[0],
          wordB: shuffledGroup[1],
          relationType: 'nuance',
        });
      }
    }
  }

  // 2. Add automatic orthographic paronym pairs from poolWords
  const shuffledPool = [...poolWords].sort(() => Math.random() - 0.5);
  for (const w of shuffledPool.slice(0, 60)) {
    const match = findDuelOpponent(w, allWords);
    if (match && match.relationType === 'paronyme') {
      candidatePairs.push({
        wordA: w,
        wordB: match.opponent,
        relationType: 'paronyme',
      });
    }
  }

  // Shuffle and pick unique pairs
  const shuffledPairs = candidatePairs.sort(() => Math.random() - 0.5);
  const selected: ParonymDuelPair[] = [];
  const usedWords = new Set<string>();

  for (const pair of shuffledPairs) {
    if (selected.length >= count) break;
    if (usedWords.has(pair.wordA.word) || usedWords.has(pair.wordB.word)) {
      continue;
    }
    usedWords.add(pair.wordA.word);
    usedWords.add(pair.wordB.word);
    selected.push(pair);
  }

  return selected;
}
