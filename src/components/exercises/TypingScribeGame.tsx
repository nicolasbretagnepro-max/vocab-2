import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Lightbulb,
  PenTool,
  RotateCcw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { WordEntry } from '../../types/vocab';
import {
  parseCloze,
  validateUserSpelling,
} from '../../utils/clozeParser';

interface TypingScribeGameProps {
  word: WordEntry;
  allowHints?: boolean;
  useSecondExample?: boolean;
  customMemoryTip?: string;
  onAnswer: (isCorrect: boolean, hintsUsed: number) => void;
  badgeLabel?: string;
}

export const TypingScribeGame: React.FC<TypingScribeGameProps> = ({
  word,
  allowHints = true,
  useSecondExample = true,
  customMemoryTip,
  onAnswer,
  badgeLabel,
}) => {
  const exampleText =
    useSecondExample && word.example_2 ? word.example_2 : word.example_1;
  const clozeText =
    useSecondExample && word.example_cloze_2
      ? word.example_cloze_2
      : word.example_cloze_1;

  const parsed = useMemo(
    () => parseCloze(exampleText, clozeText, word.word),
    [exampleText, clozeText, word.word]
  );

  // Target used for the visual mask & anagram (exactHole fits directly into […])
  const maskTarget = parsed.exactHole || word.word;

  const [inputValue, setInputValue] = useState('');
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2 | 3>(0);
  const [usedAnagramIndices, setUsedAnagramIndices] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    isAlmostPerfect: boolean;
    feedbackMessage: string | null;
  } | null>(null);

  // Scrambled letters for Hint 3 (Anagram mode)
  const scrambledLetters = useMemo(() => {
    const chars = maskTarget.split('').map((char, idx) => ({
      char,
      originalIndex: idx,
    }));
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars;
  }, [maskTarget]);

  // Compute visual mask (_ _ _ _ _ _) according to current hintLevel
  const visualMask = useMemo(() => {
    const chars = maskTarget.split('');
    const totalLen = chars.length;

    return chars.map((ch, idx) => {
      if (ch === ' ' || ch === "'" || ch === '-') {
        return ch;
      }
      if (hintLevel >= 1) {
        if (idx === 0) return ch;
        if (totalLen >= 7 && idx === totalLen - 1) return ch;
      }
      if (hintLevel >= 2) {
        if (idx % 3 === 0) return ch;
      }
      return '_';
    });
  }, [maskTarget, hintLevel]);

  const handleTriggerHint = () => {
    if (!allowHints || hintLevel >= 3 || submitted) return;
    const nextLevel = (hintLevel + 1) as 1 | 2 | 3;
    setHintLevel(nextLevel);
    if (nextLevel === 3) {
      setInputValue('');
      setUsedAnagramIndices([]);
    }
  };

  const handleAnagramTap = (itemIndex: number, char: string) => {
    if (submitted) return;
    if (usedAnagramIndices.includes(itemIndex)) return;
    setUsedAnagramIndices([...usedAnagramIndices, itemIndex]);
    setInputValue((prev) => prev + char);
  };

  const handleResetAnagram = () => {
    if (submitted) return;
    setUsedAnagramIndices([]);
    setInputValue('');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitted || !inputValue.trim()) return;

    const result = validateUserSpelling(
      inputValue,
      exampleText,
      clozeText,
      word.word
    );
    setSubmitted(true);
    setValidationState(result);

    setTimeout(
      () => {
        onAnswer(result.isValid, hintLevel);
      },
      result.isAlmostPerfect ? 1800 : result.isValid ? 750 : 500
    );
  };

  const clozeParts = (clozeText || '').split(/\[(?:…|\.{3}|\.)\]/);
  const tip = customMemoryTip || word.memory_tip;

  return (
    <motion.div
      key={`${word.word}-${useSecondExample}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-4"
    >
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 sm:p-6 shadow-ios border border-slate-200/70 dark:border-white/10 space-y-4">
        {/* Top Row: Badge & Nature */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
            <PenTool className="w-3.5 h-3.5" />
            {badgeLabel || (allowHints ? 'Saisie guidée • Niv. 3.2' : 'Ancrage profond • Sans indice')}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
            {word.nature}
          </span>
        </div>

        {/* Short Definition */}
        <div>
          <p className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white leading-snug">
            « {word.definition_courte} »
          </p>
        </div>

        {/* Cloze Sentence */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E]/80 border border-slate-200/60 dark:border-white/10 text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
          «{' '}
          {clozeParts.map((part, idx) => (
            <React.Fragment key={idx}>
              {part}
              {idx < clozeParts.length - 1 && (
                <span className="inline-block mx-1 px-2.5 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 font-bold">
                  {inputValue.trim() || '[…]'}
                </span>
              )}
            </React.Fragment>
          ))}{' '}
          »
        </div>

        {/* Visual Letter Mask (_ _ _ _ _ _) */}
        <div className="py-2 text-center">
          <div className="inline-flex flex-wrap justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
            {visualMask.map((char, idx) => (
              <span
                key={idx}
                className={`font-mono text-base sm:text-lg font-bold ${
                  char === '_'
                    ? 'text-slate-400 dark:text-slate-500'
                    : 'text-indigo-600 dark:text-indigo-400'
                }`}
              >
                {char}
              </span>
            ))}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {maskTarget.length} caractères attendus dans le trou (ou tapez « {word.nature} » au complet)
          </div>
        </div>

        {/* Hint 2 Box: Long Definition & Memory Tip */}
        {hintLevel >= 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/25 text-xs sm:text-sm text-amber-900 dark:text-amber-200 space-y-1.5"
          >
            <div className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Indice 2 : Définition complète & Mémo</span>
            </div>
            <p>{word.definition}</p>
            {tip && (
              <p className="font-medium text-amber-800 dark:text-amber-300 pt-1">
                💡 Astuce : {tip}
              </p>
            )}
          </motion.div>
        )}

        {/* Almost Perfect Feedback Banner */}
        {validationState?.isAlmostPerfect && validationState.feedbackMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/20 border-2 border-amber-400 text-amber-900 dark:text-amber-200 flex items-center gap-2.5 text-sm font-medium"
          >
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <span>{validationState.feedbackMessage}</span>
          </motion.div>
        )}
      </div>

      {/* Input or Hint 3 Anagram Mode */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios border border-slate-200/70 dark:border-white/10 space-y-4"
      >
        {hintLevel < 3 ? (
          <div>
            <input
              type="text"
              value={inputValue}
              disabled={submitted}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Tapez le mot ici…"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className={`w-full px-4 py-3.5 rounded-2xl text-lg font-serif font-bold border-2 outline-none transition-all ${
                submitted
                  ? validationState?.isValid
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-200'
                    : 'border-rose-500 bg-rose-50 dark:bg-rose-500/15 text-rose-900 dark:text-rose-200'
                  : 'border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#2C2C2E] text-slate-900 dark:text-white focus:border-indigo-500'
              }`}
            />
          </div>
        ) : (
          /* Hint 3: Clickable Anagram Mode */
          <div className="space-y-3">
            <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200 dark:border-white/10 min-h-[3.25rem]">
              <span className="font-serif font-bold text-xl text-indigo-600 dark:text-indigo-400 tracking-wide">
                {inputValue || 'Touchez les lettres dans l’ordre…'}
              </span>
              {inputValue && !submitted && (
                <button
                  type="button"
                  onClick={handleResetAnagram}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {scrambledLetters.map((item, idx) => {
                const used = usedAnagramIndices.includes(idx);
                return (
                  <button
                    key={`anagram-${idx}-${item.char}`}
                    type="button"
                    disabled={used || submitted}
                    onClick={() => handleAnagramTap(idx, item.char)}
                    className={`w-10 h-11 rounded-xl font-serif font-bold text-lg border-2 transition-all ${
                      used
                        ? 'bg-slate-100 dark:bg-white/5 border-slate-200/40 dark:border-white/5 text-slate-300 dark:text-slate-600 scale-90'
                        : 'bg-slate-50 dark:bg-[#2C2C2E] border-slate-200 dark:border-white/15 text-slate-900 dark:text-white hover:border-indigo-500 active:scale-95'
                    }`}
                  >
                    {item.char === ' ' ? '␣' : item.char}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2.5">
          {allowHints && (
            <button
              type="button"
              disabled={hintLevel >= 3 || submitted}
              onClick={handleTriggerHint}
              className="px-4 py-3.5 rounded-2xl border-2 border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 font-semibold text-sm flex items-center gap-1.5 disabled:opacity-45 transition-all shrink-0"
            >
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Indice 💡 ({hintLevel}/3)</span>
            </button>
          )}

          <button
            type="submit"
            disabled={!inputValue.trim() || submitted}
            className="flex-1 py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-white/10 disabled:text-slate-400 text-white font-semibold text-base shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <Check className="w-5 h-5" />
            <span>Valider</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
};
