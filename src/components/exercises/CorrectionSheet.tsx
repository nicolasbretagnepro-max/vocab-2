import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Lightbulb, RotateCcw } from 'lucide-react';
import { WordEntry } from '../../types/vocab';
import { highlightTargetInExample } from '../../utils/clozeParser';

interface CorrectionSheetProps {
  word: WordEntry;
  customMemoryTip?: string;
  onContinue: () => void;
}

export const CorrectionSheet: React.FC<CorrectionSheetProps> = ({
  word,
  customMemoryTip,
  onContinue,
}) => {
  const ex1 = highlightTargetInExample(
    word.example_1,
    word.example_cloze_1,
    word.word
  );
  const tip = customMemoryTip || word.memory_tip;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-4"
    >
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-ios-lg border-2 border-rose-400/70 dark:border-rose-500/50 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            Fiche de correction
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            <RotateCcw className="w-3.5 h-3.5" />
            Reviendra en fin de séance
          </span>
        </div>

        <div className="pb-2 border-b border-slate-100 dark:border-white/10">
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            {word.nature}
          </div>
          <h2 className="font-serif text-3xl font-bold text-slate-900 dark:text-white mt-0.5">
            {word.word}
          </h2>
          <p className="mt-1.5 text-base font-semibold text-indigo-600 dark:text-indigo-400">
            {word.definition_courte}
          </p>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
          {word.definition}
        </p>

        {word.example_1 && (
          <blockquote className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E]/80 border-l-4 border-indigo-500 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            « {ex1.prefix}
            {ex1.highlighted && (
              <strong className="font-bold text-indigo-600 dark:text-indigo-400">
                {ex1.highlighted}
              </strong>
            )}
            {ex1.suffix} »
          </blockquote>
        )}

        {tip && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/25 flex items-start gap-2.5 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Astuce mémo : </span>
              {tip}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="w-full py-4 px-6 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-base shadow-lg flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
      >
        <span>Continuer la séance</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </motion.div>
  );
};
