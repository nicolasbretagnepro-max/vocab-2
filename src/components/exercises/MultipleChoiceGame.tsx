import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { WordEntry } from '../../types/vocab';
import { selectSameNatureDistractors } from '../../services/srsEngine';

export type QcmMode = 'word-to-def' | 'def-to-word' | 'cloze-1' | 'cloze-2';

interface MultipleChoiceGameProps {
  word: WordEntry;
  allWords: WordEntry[];
  mode: QcmMode;
  onAnswer: (isCorrect: boolean) => void;
  badgeLabel?: string;
}

export const MultipleChoiceGame: React.FC<MultipleChoiceGameProps> = ({
  word,
  allWords,
  mode,
  onAnswer,
  badgeLabel,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  const options = useMemo(() => {
    const distractors = selectSameNatureDistractors(word, allWords, 3);
    const combined = [
      { entry: word, isCorrect: true },
      ...distractors.map((d) => ({ entry: d, isCorrect: false })),
    ];
    // Deterministic-free shuffle per question mount
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }
    return combined;
  }, [word, allWords, mode]);

  const handleSelect = (idx: number) => {
    if (locked) return;
    setSelectedIndex(idx);
    setLocked(true);
    const isCorrect = options[idx].isCorrect;

    setTimeout(() => {
      onAnswer(isCorrect);
    }, isCorrect ? 650 : 450);
  };

  const renderPrompt = () => {
    if (mode === 'word-to-def') {
      return (
        <div className="space-y-2 text-center py-2">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
            {word.nature}
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white pt-1">
            {word.word}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Quelle est la définition exacte de ce mot ?
          </p>
        </div>
      );
    }

    if (mode === 'def-to-word') {
      return (
        <div className="space-y-3 text-center py-2">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
            {word.nature}
          </span>
          <p className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white leading-snug px-2">
            « {word.definition_courte} »
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 px-2">
            {word.definition}
          </p>
        </div>
      );
    }

    const clozeSentence =
      mode === 'cloze-2' && word.example_cloze_2
        ? word.example_cloze_2
        : word.example_cloze_1;

    const parts = clozeSentence.split(/\[(?:…|\.{3}|\.)\]/);

    return (
      <div className="space-y-3 py-2">
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
            {word.nature}
          </span>
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Complétez la phrase
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E]/80 border border-slate-200/60 dark:border-white/10 text-base sm:text-lg leading-relaxed text-slate-800 dark:text-slate-100">
          «{' '}
          {parts.map((part, idx) => (
            <React.Fragment key={idx}>
              {part}
              {idx < parts.length - 1 && (
                <span className="inline-block mx-1 px-3 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-300/60 dark:border-indigo-400/30">
                  […]
                </span>
              )}
            </React.Fragment>
          ))}{' '}
          »
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Indice de sens : <span className="font-medium text-slate-700 dark:text-slate-300">{word.definition_courte}</span>
        </p>
      </div>
    );
  };

  return (
    <motion.div
      key={`${word.word}-${mode}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col justify-between space-y-4"
    >
      {/* Question Card */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 sm:p-6 shadow-ios border border-slate-200/70 dark:border-white/10">
        {badgeLabel && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{badgeLabel}</span>
          </div>
        )}
        {renderPrompt()}
      </div>

      {/* 4 Choice Buttons (Thumb-friendly bottom stack) */}
      <div className="grid grid-cols-1 gap-2.5">
        {options.map((opt, idx) => {
          const isSelected = selectedIndex === idx;
          let styleClass =
            'bg-white dark:bg-[#1C1C1E] border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-100 hover:border-indigo-400 dark:hover:border-indigo-500';

          if (locked) {
            if (opt.isCorrect) {
              styleClass =
                'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30';
            } else if (isSelected && !opt.isCorrect) {
              styleClass =
                'bg-rose-50 dark:bg-rose-500/20 border-rose-500 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/30';
            } else {
              styleClass =
                'bg-white/60 dark:bg-[#1C1C1E]/50 border-slate-200/40 dark:border-white/5 text-slate-400 dark:text-slate-500 opacity-65';
            }
          }

          const label =
            mode === 'word-to-def' ? opt.entry.definition_courte : opt.entry.word;

          return (
            <motion.button
              key={opt.entry.word + idx}
              type="button"
              disabled={locked}
              whileTap={!locked ? { scale: 0.985 } : undefined}
              onClick={() => handleSelect(idx)}
              className={`w-full text-left p-4 rounded-2xl border-2 shadow-sm transition-all flex items-center justify-between gap-3 ${styleClass}`}
            >
              <span
                className={`${
                  mode === 'word-to-def'
                    ? 'text-sm sm:text-base font-medium'
                    : 'font-serif text-lg sm:text-xl font-bold'
                } leading-snug`}
              >
                {label}
              </span>

              {locked && opt.isCorrect && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              {locked && isSelected && !opt.isCorrect && (
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};
