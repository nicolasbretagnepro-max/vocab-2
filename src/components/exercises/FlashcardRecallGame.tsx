import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlashcardConfidence, WordEntry } from '../../types/vocab';
import { Sparkles, Eye, RotateCcw, HelpCircle, CheckCircle2, Lightbulb } from 'lucide-react';
import { highlightTargetInExample } from '../../utils/clozeParser';

interface FlashcardRecallGameProps {
  wordEntry: WordEntry;
  onRate: (confidence: FlashcardConfidence) => void;
}

export const FlashcardRecallGame: React.FC<FlashcardRecallGameProps> = ({
  wordEntry,
  onRate,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const ex1Highlight = highlightTargetInExample(
    wordEntry.example_1,
    wordEntry.example_cloze_1,
    wordEntry.word
  );

  return (
    <div className="flex flex-col h-full justify-between pb-4">
      <div className="space-y-4">
        {/* Badge */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Rappel Éclair · Active Recall</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {wordEntry.nature}
          </span>
        </div>

        {/* Flashcard */}
        <motion.div
          layout
          onClick={() => !isFlipped && setIsFlipped(true)}
          className={`bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-ios border transition-colors ${
            isFlipped
              ? 'border-indigo-200 dark:border-indigo-900/50'
              : 'border-slate-200/80 dark:border-white/10 cursor-pointer active:scale-[0.99]'
          }`}
        >
          {/* Recto: Word */}
          <div className="text-center py-6 border-b border-slate-100 dark:border-white/10">
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mb-2">
              Connaissez-vous le sens exact de :
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              {wordEntry.word}
            </h1>
          </div>

          {/* Verso or Prompt */}
          <AnimatePresence mode="wait">
            {!isFlipped ? (
              <motion.div
                key="front-prompt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 flex flex-col items-center justify-center text-center space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Eye className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Formulez mentalement la définition…
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">
                  Puis touchez la carte pour révéler la réponse et auto-évaluer votre maîtrise.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="back-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-5 space-y-4 text-left"
              >
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mb-1">
                    L'essentiel
                  </p>
                  <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {wordEntry.definition_courte}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {wordEntry.definition}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200/60 dark:border-white/5">
                  <p className="text-sm text-slate-700 dark:text-slate-200 italic leading-relaxed">
                    « {ex1Highlight.prefix}
                    <span className="font-bold not-italic text-indigo-600 dark:text-indigo-400 underline decoration-indigo-500/30 underline-offset-4">
                      {ex1Highlight.highlighted}
                    </span>
                    {ex1Highlight.suffix} »
                  </p>
                </div>

                {wordEntry.memory_tip && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 flex gap-2.5 items-start">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900 dark:text-amber-200/90 leading-relaxed">
                      {wordEntry.memory_tip}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Bottom Action Bar */}
      <div className="pt-4">
        {!isFlipped ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsFlipped(true)}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-colors"
          >
            <Eye className="w-5 h-5" />
            <span>Révéler la définition</span>
          </motion.button>
        ) : (
          <div className="space-y-2">
            <p className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
              Comment évaluez-vous votre rappel ?
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onRate('forgot')}
                className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex flex-col items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-5 h-5 text-rose-500" />
                <span className="text-xs font-bold">Oublié</span>
                <span className="text-[11px] opacity-80">Revoir demain</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onRate('hesitant')}
                className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 flex flex-col items-center gap-1 transition-colors"
              >
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-bold">Hésitant</span>
                <span className="text-[11px] opacity-80">Sous 1-2 jours</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onRate('easy')}
                className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 flex flex-col items-center gap-1 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-bold">Évident</span>
                <span className="text-[11px] opacity-80">Espacer +</span>
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
