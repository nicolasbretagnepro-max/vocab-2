import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { WordEntry } from '../../types/vocab';

interface PairMatchingGameProps {
  words: WordEntry[];
  onComplete: (mistakesCount: number) => void;
  titleLabel?: string;
}

export const PairMatchingGame: React.FC<PairMatchingGameProps> = ({
  words,
  onComplete,
  titleLabel = 'Consolidation • Reliez les 4 paires',
}) => {
  const pairItems = useMemo(() => words.slice(0, 4), [words]);

  const leftWords = useMemo(() => {
    const arr = [...pairItems];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [pairItems]);

  const rightDefs = useMemo(() => {
    const arr = [...pairItems];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [pairItems]);

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedWords, setMatchedWords] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<{ left: string; right: string } | null>(null);
  const [mistakes, setMistakes] = useState(0);

  const checkMatch = (leftWord: string, rightWord: string) => {
    if (leftWord === rightWord) {
      const next = new Set(matchedWords);
      next.add(leftWord);
      setMatchedWords(next);
      setSelectedLeft(null);
      setSelectedRight(null);

      if (next.size === pairItems.length) {
        setTimeout(() => {
          onComplete(mistakes);
        }, 550);
      }
    } else {
      setMistakes((m) => m + 1);
      setWrongPair({ left: leftWord, right: rightWord });
      setTimeout(() => {
        setWrongPair(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 500);
    }
  };

  const handleSelectLeft = (wordKey: string) => {
    if (matchedWords.has(wordKey) || wrongPair) return;
    if (selectedLeft === wordKey) {
      setSelectedLeft(null);
      return;
    }
    setSelectedLeft(wordKey);
    if (selectedRight) {
      checkMatch(wordKey, selectedRight);
    }
  };

  const handleSelectRight = (wordKey: string) => {
    if (matchedWords.has(wordKey) || wrongPair) return;
    if (selectedRight === wordKey) {
      setSelectedRight(null);
      return;
    }
    setSelectedRight(wordKey);
    if (selectedLeft) {
      checkMatch(selectedLeft, wordKey);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-4"
    >
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios border border-slate-200/70 dark:border-white/10">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
            <Sparkles className="w-3.5 h-3.5" />
            {titleLabel}
          </span>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            {matchedWords.size} / {pairItems.length} reliés
          </span>
        </div>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Touchez un mot à gauche puis sa définition courte à droite.
        </p>
      </div>

      {/* 2-Column Interactive Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* Left Column: 4 Words */}
        <div className="space-y-2.5">
          {leftWords.map((item) => {
            const isMatched = matchedWords.has(item.word);
            const isSelected = selectedLeft === item.word;
            const isWrong = wrongPair?.left === item.word;

            let cls =
              'bg-white dark:bg-[#1C1C1E] border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white';
            if (isMatched) {
              cls =
                'bg-emerald-50/80 dark:bg-emerald-500/15 border-emerald-400/60 text-emerald-700 dark:text-emerald-300 opacity-65';
            } else if (isWrong) {
              cls =
                'bg-rose-50 dark:bg-rose-500/20 border-rose-500 text-rose-800 dark:text-rose-200';
            } else if (isSelected) {
              cls =
                'bg-indigo-50 dark:bg-indigo-500/25 border-indigo-600 dark:border-indigo-400 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/25';
            }

            return (
              <motion.button
                key={`left-${item.word}`}
                type="button"
                disabled={isMatched}
                animate={isWrong ? { x: [-5, 5, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => handleSelectLeft(item.word)}
                className={`w-full min-h-[5.25rem] p-3.5 rounded-2xl border-2 shadow-sm flex flex-col justify-center items-start text-left transition-all ${cls}`}
              >
                <div className="flex items-center justify-between w-full gap-1">
                  <span className="font-serif font-bold text-base sm:text-lg leading-tight break-words">
                    {item.word}
                  </span>
                  {isMatched && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  {item.nature}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Right Column: 4 Short Definitions */}
        <div className="space-y-2.5">
          {rightDefs.map((item) => {
            const isMatched = matchedWords.has(item.word);
            const isSelected = selectedRight === item.word;
            const isWrong = wrongPair?.right === item.word;

            let cls =
              'bg-white dark:bg-[#1C1C1E] border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200';
            if (isMatched) {
              cls =
                'bg-emerald-50/80 dark:bg-emerald-500/15 border-emerald-400/60 text-emerald-700 dark:text-emerald-300 opacity-65';
            } else if (isWrong) {
              cls =
                'bg-rose-50 dark:bg-rose-500/20 border-rose-500 text-rose-800 dark:text-rose-200';
            } else if (isSelected) {
              cls =
                'bg-indigo-50 dark:bg-indigo-500/25 border-indigo-600 dark:border-indigo-400 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/25';
            }

            return (
              <motion.button
                key={`right-${item.word}`}
                type="button"
                disabled={isMatched}
                animate={isWrong ? { x: [-5, 5, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => handleSelectRight(item.word)}
                className={`w-full min-h-[5.25rem] p-3.5 rounded-2xl border-2 shadow-sm flex items-center justify-between text-left transition-all ${cls}`}
              >
                <span className="text-xs sm:text-sm font-medium leading-snug">
                  {item.definition_courte}
                </span>
                {isMatched && <Check className="w-4 h-4 text-emerald-500 shrink-0 ml-1" />}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
