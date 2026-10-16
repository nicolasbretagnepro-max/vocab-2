import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  Lightbulb,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Crown,
  Save,
} from 'lucide-react';
import { WordEntry, WordProgress } from '../../types/vocab';
import { highlightTargetInExample } from '../../utils/clozeParser';

interface WordDetailModalProps {
  word: WordEntry | null;
  progress?: WordProgress;
  onClose: () => void;
  onToggleFavorite: (wordKey: string) => void;
  onSaveCustomMemoryTip: (wordKey: string, tip: string) => void;
}

const LEVEL_LABELS: Record<number, { name: string; color: string }> = {
  0: {
    name: 'Niv. 0 • En réserve',
    color: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  },
  1: {
    name: 'Niv. 1 • Découverte',
    color: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  },
  2: {
    name: 'Niv. 2 • Consolidation',
    color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  },
  3: {
    name: 'Niv. 3 • Rappel semi-actif',
    color: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  },
  4: {
    name: 'Niv. 4 • Ancrage profond',
    color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  5: {
    name: 'Niv. 5 • Maîtrisé (Carte Dorée)',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-400/50',
  },
};

export const WordDetailModal: React.FC<WordDetailModalProps> = ({
  word,
  progress,
  onClose,
  onToggleFavorite,
  onSaveCustomMemoryTip,
}) => {
  const [tipInput, setTipInput] = useState(
    progress?.customMemoryTip ?? word?.memory_tip ?? ''
  );
  const [savedNotice, setSavedNotice] = useState(false);

  React.useEffect(() => {
    if (word) {
      setTipInput(progress?.customMemoryTip ?? word.memory_tip ?? '');
      setSavedNotice(false);
    }
  }, [word, progress]);

  if (!word) return null;

  const level = progress?.level ?? 0;
  const levelInfo = LEVEL_LABELS[level] || LEVEL_LABELS[0];
  const isGold = level === 5;

  const ex1 = highlightTargetInExample(
    word.example_1,
    word.example_cloze_1,
    word.word
  );
  const ex2 = highlightTargetInExample(
    word.example_2,
    word.example_cloze_2,
    word.word
  );

  const successes = progress?.successCount ?? 0;
  const errors = progress?.errorCount ?? 0;
  const totalAttempts = successes + errors;
  const accuracy =
    totalAttempts > 0 ? Math.round((successes / totalAttempts) * 100) : null;

  const handleSaveTip = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCustomMemoryTip(word.word, tipInput.trim());
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-6 pb-10 sm:pb-6 bg-white dark:bg-[#1C1C1E] shadow-2xl border ${
            isGold
              ? 'border-2 border-amber-400 shadow-gold'
              : 'border-slate-200/80 dark:border-white/10'
          } space-y-5`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${levelInfo.color}`}
              >
                {isGold && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                {levelInfo.name}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                {word.nature}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onToggleFavorite(word.word)}
                aria-label="Favori"
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <Star
                  className={`w-5 h-5 ${
                    progress?.favorite
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-400'
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="p-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Word & Short Def */}
          <div className="border-b border-slate-100 dark:border-white/10 pb-4">
            <h2
              className={`font-serif text-3xl sm:text-4xl font-bold ${
                isGold
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {word.word}
            </h2>
            <p className="mt-1.5 text-base sm:text-lg font-semibold text-indigo-600 dark:text-indigo-400">
              {word.definition_courte}
            </p>
          </div>

          {/* Full Definition */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Définition complète</span>
            </div>
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
              {word.definition}
            </p>
          </div>

          {/* Examples */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Exemples littéraires & soutenus
            </div>
            {word.example_1 && (
              <blockquote className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E]/70 border-l-4 border-indigo-500 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                « {ex1.prefix}
                {ex1.highlighted && (
                  <strong className="font-bold text-indigo-600 dark:text-indigo-400">
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
                  <strong className="font-bold text-indigo-600 dark:text-indigo-400">
                    {ex2.highlighted}
                  </strong>
                )}
                {ex2.suffix} »
              </blockquote>
            )}
          </div>

          {/* Personal Statistics */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200/50 dark:border-white/5">
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Réussites</span>
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {successes}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200/50 dark:border-white/5">
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Précision</span>
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {accuracy !== null ? `${accuracy}%` : '—'}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200/50 dark:border-white/5">
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>Proch. révision</span>
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white mt-1.5">
                {progress?.nextReviewDate || 'Non planifiée'}
              </div>
            </div>
          </div>

          {/* Custom Memory Tip Editor */}
          <form
            onSubmit={handleSaveTip}
            className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 space-y-2.5"
          >
            <label className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-300">
              <span className="flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Astuce mnémotechnique personnelle</span>
              </span>
              {savedNotice && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  ✓ Enregistré
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tipInput}
                onChange={(e) => setTipInput(e.target.value)}
                placeholder="Ajoutez un moyen mnémotechnique pour retenir ce mot…"
                className="flex-1 px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-[#1C1C1E] border border-amber-200 dark:border-amber-500/30 text-slate-900 dark:text-white outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center gap-1 shrink-0 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Sauver</span>
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
