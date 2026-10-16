import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Lightbulb, Sparkles, Star, ArrowRight } from 'lucide-react';
import { WordEntry } from '../../types/vocab';
import { highlightTargetInExample } from '../../utils/clozeParser';

interface DiscoveryCardProps {
  word: WordEntry;
  customMemoryTip?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onComplete: () => void;
  passLabel?: string;
}

export const DiscoveryCard: React.FC<DiscoveryCardProps> = ({
  word,
  customMemoryTip,
  isFavorite = false,
  onToggleFavorite,
  onComplete,
  passLabel = 'Découverte • Passe 1/3',
}) => {
  const ex1 = highlightTargetInExample(word.example_1, word.example_cloze_1, word.word);
  const ex2 = highlightTargetInExample(word.example_2, word.example_cloze_2, word.word);
  const tip = customMemoryTip || word.memory_tip;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col justify-between h-full"
    >
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-ios border border-slate-200/70 dark:border-white/10 space-y-5">
        {/* Top badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
              <Sparkles className="w-3.5 h-3.5" />
              {passLabel}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {word.nature}
            </span>
          </div>

          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label="Ajouter aux favoris"
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <Star
                className={`w-5 h-5 ${
                  isFavorite
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              />
            </button>
          )}
        </div>

        {/* Hero Word (Serif) */}
        <div className="pt-1 pb-2 border-b border-slate-100 dark:border-white/10">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            {word.word}
          </h2>
          <p className="mt-2 text-base sm:text-lg font-semibold text-indigo-600 dark:text-indigo-400">
            {word.definition_courte}
          </p>
        </div>

        {/* Detailed Definition */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Sens & Nuance</span>
          </div>
          <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-200 pretty-text">
            {word.definition}
          </p>
        </div>

        {/* Examples with bold/colored target word */}
        <div className="space-y-3 pt-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Exemples en contexte
          </div>

          {word.example_1 && (
            <blockquote className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E]/70 border-l-4 border-indigo-500 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              « {ex1.prefix}
              {ex1.highlighted && (
                <strong className="font-bold text-indigo-600 dark:text-indigo-400 underline decoration-indigo-400/40 underline-offset-2">
                  {ex1.highlighted}
                </strong>
              )}
              {ex1.suffix} »
            </blockquote>
          )}

          {word.example_2 && (
            <blockquote className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E]/70 border-l-4 border-indigo-400/60 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              « {ex2.prefix}
              {ex2.highlighted && (
                <strong className="font-bold text-indigo-600 dark:text-indigo-400 underline decoration-indigo-400/40 underline-offset-2">
                  {ex2.highlighted}
                </strong>
              )}
              {ex2.suffix} »
            </blockquote>
          )}
        </div>

        {/* Memory Tip if present */}
        {tip && (
          <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/25 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-amber-900 dark:text-amber-200">
              <span className="font-semibold block mb-0.5">Astuce mémo</span>
              {tip}
            </div>
          </div>
        )}
      </div>

      {/* Thumb-friendly CTA */}
      <div className="mt-5">
        <button
          type="button"
          onClick={onComplete}
          className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-base shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all"
        >
          <span>J'ai mémorisé ce mot</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
};
