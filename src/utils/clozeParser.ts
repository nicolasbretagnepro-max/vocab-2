export interface ClozeParseResult {
  exactHole: string;
  attachedWord: string;
  inflectedWord: string;
  canonicalWord: string;
  acceptedAnswers: string[];
  beforeCloze: string;
  afterCloze: string;
}

export interface ValidationResult {
  isValid: boolean;
  isAlmostPerfect: boolean;
  feedbackMessage: string | null;
  matchedTarget: string;
}

export interface HighlightedExample {
  prefix: string;
  highlighted: string;
  suffix: string;
}

const CLOZE_TOKEN_REGEX = /\[(?:…|\.{3}|\.)\]/g;
const SINGLE_CLOZE_REGEX = /\[(?:…|\.{3}|\.)\]/;

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes whitespace, apostrophes, and case for comparison
 */
export function normalizeText(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC`´]/g, "'")
    .replace(/\s+/g, ' ');
}

/**
 * Strips diacritics/accents while preserving base letters (including œ -> oe, æ -> ae)
 */
export function stripAccents(input: string): string {
  return normalizeText(input)
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Computes standard Levenshtein edit distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Compares example_X and example_cloze_X to extract:
 * - exactHole: exact string replacing […]
 * - attachedWord: word including any directly attached prefix/suffix letters (e.g. […]e -> latente)
 * - inflectedWord: full inflected form (e.g. "se rebiffe", "latente", "l'aconit")
 * - canonicalWord: dictionary entry word (e.g. "Se rebiffer", "Latent")
 */
export function parseCloze(
  example: string,
  exampleCloze: string,
  canonicalWord: string
): ClozeParseResult {
  const cleanExample = (example || '').trim();
  const cleanCloze = (exampleCloze || '').trim().replace(/\[\.\.\.\]/g, '[…]');
  const cleanCanonical = (canonicalWord || '').trim();

  let exactHole = cleanCanonical;
  let beforeCloze = cleanCloze;
  let afterCloze = '';

  const holes = cleanCloze.match(CLOZE_TOKEN_REGEX) || [];

  if (holes.length === 1) {
    const match = SINGLE_CLOZE_REGEX.exec(cleanCloze);
    if (match && match.index !== undefined) {
      beforeCloze = cleanCloze.slice(0, match.index);
      afterCloze = cleanCloze.slice(match.index + match[0].length);

      if (
        cleanExample.startsWith(beforeCloze) &&
        cleanExample.endsWith(afterCloze) &&
        cleanExample.length >= beforeCloze.length + afterCloze.length
      ) {
        exactHole = cleanExample.slice(
          beforeCloze.length,
          cleanExample.length - afterCloze.length
        );
      } else {
        // Fallback regex alignment in case of minor punctuation/whitespace difference
        const pattern =
          '^' +
          escapeRegExp(beforeCloze) +
          '(.+?)' +
          escapeRegExp(afterCloze) +
          '$';
        const m = new RegExp(pattern, 'i').exec(cleanExample);
        if (m && m[1]) {
          exactHole = m[1];
        }
      }
    }
  } else if (holes.length > 1) {
    // Handle multi-hole clozes (e.g. "la […] de la […]")
    const firstMatch = SINGLE_CLOZE_REGEX.exec(cleanCloze);
    const parts = cleanCloze.split(CLOZE_TOKEN_REGEX);
    beforeCloze = parts[0] ?? '';
    afterCloze = parts[parts.length - 1] ?? '';

    if (
      cleanExample.startsWith(beforeCloze) &&
      cleanExample.endsWith(afterCloze) &&
      cleanExample.length >= beforeCloze.length + afterCloze.length
    ) {
      // Full span between first hole start and last hole end
      exactHole = cleanExample.slice(
        beforeCloze.length,
        cleanExample.length - afterCloze.length
      );
    } else if (firstMatch) {
      beforeCloze = cleanCloze.slice(0, firstMatch.index);
      afterCloze = cleanCloze.slice(firstMatch.index + firstMatch[0].length);
    }
  }

  // Extract any directly attached letters around […] (e.g., `[…]e` -> `e`, `l'[…]` -> `l'`)
  const attachedPrefixMatch = beforeCloze.match(/([a-zA-ZÀ-ÿœŒæÆ'-]+)$/);
  const attachedSuffixMatch = afterCloze.match(/^([a-zA-ZÀ-ÿœŒæÆ'-]+)/);

  const attachedPrefix = attachedPrefixMatch ? attachedPrefixMatch[1] : '';
  const attachedSuffix = attachedSuffixMatch ? attachedSuffixMatch[1] : '';

  // Pure morphological attachment (letters without apostrophe, e.g., `[…]e` -> `latente`, `[…]s` -> `nantis`)
  const pureLetterPrefixMatch = beforeCloze.match(/([a-zA-ZÀ-ÿœŒæÆ]+)$/);
  const pureLetterSuffixMatch = afterCloze.match(/^([a-zA-ZÀ-ÿœŒæÆ]+)/);
  const purePrefix = pureLetterPrefixMatch ? pureLetterPrefixMatch[1] : '';
  const pureSuffix = pureLetterSuffixMatch ? pureLetterSuffixMatch[1] : '';

  const attachedWord = `${purePrefix}${exactHole}${pureSuffix}`.trim();

  // Check for pronominal prefix like "se ", "s'", "me ", "te ", "nous ", "vous "
  const pronominalBeforeMatch = beforeCloze.match(
    /(?:^|\s)(se\s+|s['\u2019]|me\s+|m['\u2019]|te\s+|t['\u2019]|nous\s+|vous\s+)$/i
  );

  let inflectedWord = attachedWord;
  if (pronominalBeforeMatch) {
    inflectedWord = `${pronominalBeforeMatch[1]}${attachedWord}`.trim();
  } else if (attachedPrefix || attachedSuffix) {
    inflectedWord = `${attachedPrefix}${exactHole}${attachedSuffix}`.trim();
  }

  // Build deduplicated list of accepted answers
  const candidates = new Set<string>();
  const addCandidate = (val: string) => {
    const trimmed = val.trim();
    if (trimmed) {
      candidates.add(trimmed);
    }
  };

  addCandidate(exactHole);
  addCandidate(attachedWord);
  addCandidate(inflectedWord);
  addCandidate(cleanCanonical);

  // If canonical word has "(Se) " or "Se " or "S'", also accept the bare verb stem
  const strippedPronominal = cleanCanonical
    .replace(/^\(?\s*se\s*\)?\s+/i, '')
    .replace(/^\(?\s*s['\u2019]\s*\)?/i, '');
  if (strippedPronominal && strippedPronominal !== cleanCanonical) {
    addCandidate(strippedPronominal);
    addCandidate(`se ${ exactHole }`);
  }

  return {
    exactHole,
    attachedWord,
    inflectedWord,
    canonicalWord: cleanCanonical,
    acceptedAnswers: Array.from(candidates),
    beforeCloze,
    afterCloze,
  };
}

/**
 * Validates user keyboard input against:
 * 1. Exact hole string (e.g. "rebiffe", "latent")
 * 2. Full inflected word (e.g. "se rebiffe", "latente")
 * 3. Canonical dictionary word (e.g. "se rebiffer", "latent")
 *
 * Accepts minor accent errors or 1-char typo on 6+ letter words with a visual warning message.
 */
export function validateUserSpelling(
  userInput: string,
  example: string,
  exampleCloze: string,
  canonicalWord: string
): ValidationResult {
  const parsed = parseCloze(example, exampleCloze, canonicalWord);
  const normalizedUser = normalizeText(userInput);

  if (!normalizedUser) {
    return {
      isValid: false,
      isAlmostPerfect: false,
      feedbackMessage: null,
      matchedTarget: parsed.attachedWord || parsed.canonicalWord,
    };
  }

  // 1. Check exact match (case-insensitive, trimmed)
  for (const candidate of parsed.acceptedAnswers) {
    if (normalizeText(candidate) === normalizedUser) {
      return {
        isValid: true,
        isAlmostPerfect: false,
        feedbackMessage: null,
        matchedTarget: candidate,
      };
    }
  }

  // 2. Check accent-only error (e.g. "abime" instead of "abîme")
  const userWithoutAccents = stripAccents(normalizedUser);
  for (const candidate of parsed.acceptedAnswers) {
    if (stripAccents(candidate) === userWithoutAccents) {
      return {
        isValid: true,
        isAlmostPerfect: true,
        feedbackMessage: `Presque parfait ! Attention à l'orthographe exacte : ${candidate}`,
        matchedTarget: candidate,
      };
    }
  }

  // 3. Check minor typo (Levenshtein distance <= 1 on a word of 6+ letters)
  for (const candidate of parsed.acceptedAnswers) {
    const normCandidate = normalizeText(candidate);
    if (normCandidate.length >= 6) {
      const distExact = levenshteinDistance(normalizedUser, normCandidate);
      const distUnaccented = levenshteinDistance(
        userWithoutAccents,
        stripAccents(normCandidate)
      );
      if (distExact <= 1 || distUnaccented <= 1) {
        return {
          isValid: true,
          isAlmostPerfect: true,
          feedbackMessage: `Presque parfait ! Attention à l'orthographe exacte : ${candidate}`,
          matchedTarget: candidate,
        };
      }
    }
  }

  return {
    isValid: false,
    isAlmostPerfect: false,
    feedbackMessage: null,
    matchedTarget: parsed.attachedWord || parsed.canonicalWord,
  };
}

/**
 * Splits an example sentence into { prefix, highlighted, suffix } so DiscoveryCard
 * can highlight the target word in bold/color.
 */
export function highlightTargetInExample(
  example: string,
  exampleCloze: string,
  canonicalWord: string
): HighlightedExample {
  const cleanExample = (example || '').trim();
  const parsed = parseCloze(cleanExample, exampleCloze, canonicalWord);

  // Include attached suffix/prefix letters in the highlight
  const purePrefixMatch = parsed.beforeCloze.match(/([a-zA-ZÀ-ÿœŒæÆ]+)$/);
  const pureSuffixMatch = parsed.afterCloze.match(/^([a-zA-ZÀ-ÿœŒæÆ]+)/);
  const pLen = purePrefixMatch ? purePrefixMatch[1].length : 0;
  const sLen = pureSuffixMatch ? pureSuffixMatch[1].length : 0;

  if (
    cleanExample.startsWith(parsed.beforeCloze) &&
    cleanExample.endsWith(parsed.afterCloze) &&
    cleanExample.length >= parsed.beforeCloze.length + parsed.afterCloze.length
  ) {
    const startIdx = Math.max(0, parsed.beforeCloze.length - pLen);
    const endIdx = Math.min(
      cleanExample.length,
      cleanExample.length - parsed.afterCloze.length + sLen
    );
    return {
      prefix: cleanExample.slice(0, startIdx),
      highlighted: cleanExample.slice(startIdx, endIdx),
      suffix: cleanExample.slice(endIdx),
    };
  }

  // Fallback: case-insensitive search for canonicalWord or exactHole
  const lowerEx = cleanExample.toLowerCase();
  const target = (parsed.attachedWord || canonicalWord).toLowerCase();
  const idx = lowerEx.indexOf(target);
  if (idx !== -1) {
    return {
      prefix: cleanExample.slice(0, idx),
      highlighted: cleanExample.slice(idx, idx + target.length),
      suffix: cleanExample.slice(idx + target.length),
    };
  }

  return {
    prefix: cleanExample,
    highlighted: '',
    suffix: '',
  };
}

/**
 * Splits a target word into 2-3 character blocks for SyllableBuilderGame,
 * plus 1 or 2 plausible distractor blocks.
 */
export function buildSyllableChunks(targetWord: string): {
  targetChunks: string[];
  allChunks: { id: string; text: string; isDistractor: boolean }[];
  normalizedTarget: string;
} {
  const clean = targetWord.trim();
  const chunks: string[] = [];

  let i = 0;
  while (i < clean.length) {
    const remaining = clean.length - i;
    if (remaining <= 3) {
      chunks.push(clean.slice(i));
      break;
    }
    if (remaining === 4) {
      chunks.push(clean.slice(i, i + 2));
      chunks.push(clean.slice(i + 2, i + 4));
      break;
    }
    // Prefer 3-char chunk if next char is space/apostrophe/hyphen or alternating 2/3
    const slice3 = clean.slice(i, i + 3);
    if (slice3.includes(' ') || slice3.includes("'") || slice3.includes('-')) {
      chunks.push(slice3);
      i += 3;
    } else {
      const size = chunks.length % 2 === 0 ? 3 : 2;
      chunks.push(clean.slice(i, i + size));
      i += size;
    }
  }

  const distractorPool = [
    'men', 'tion', 'pré', 'con', 'dé', 'pro', 'sur', 'ant', 'ent', 'iste', 'eur', 'ité', 'ble', 'ique', 'ver'
  ];

  const lowerChunks = new Set(chunks.map((c) => c.toLowerCase()));
  const selectedDistractors: string[] = [];

  for (const d of distractorPool.sort(() => Math.random() - 0.5)) {
    if (!lowerChunks.has(d) && !clean.toLowerCase().includes(d)) {
      selectedDistractors.push(d);
      if (selectedDistractors.length >= 2) break;
    }
  }

  const items = [
    ...chunks.map((text, idx) => ({
      id: `target-${idx}-${text}`,
      text,
      isDistractor: false,
    })),
    ...selectedDistractors.map((text, idx) => ({
      id: `distractor-${idx}-${text}`,
      text,
      isDistractor: true,
    })),
  ];

  // Shuffle items
  for (let j = items.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [items[j], items[k]] = [items[k], items[j]];
  }

  return {
    targetChunks: chunks,
    allChunks: items,
    normalizedTarget: clean,
  };
}
