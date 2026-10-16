import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Check, Puzzle } from 'lucide-react';
import { WordEntry } from '../../types/vocab';
import {
  buildSyllableChunks,
  normalizeText,
  parseCloze,
} from '../../utils/clozeParser';

interface SyllableBuilderGameProps {
  word: WordEntry;
  onAnswer: (isCorrect: boolean) => void;
}

export const SyllableBuilderGame: React.FC<SyllableBuilderGameProps> = ({
  word,
  onAnswer,
}) => {
  const parsed = useMemo(
    () => parseCloze(word.example_1, word.example_cloze_1, word.word),
    [word]
  );

  const targetString = useMemo(() => {
    return parsed.exactHole || word.word;
  }, [parsed, word.word]);

  const { allChunks, targetChunks } = useMemo(
    () => buildSyllableChunks(targetString),
    [targetString]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrectState, setIsCorrectState] = useState<boolean | null>(null);

  const selectedObjects = selectedIds
    .map((id) => allChunks.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const assembledText = selectedObjects.map((c) => c.text).join('');

  const handleToggleChunk = (id: string) => {
    if (submitted) return;
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleReset = () => {
    if (submitted) return;
    setSelectedIds([]);
  };

  const handleValidate = () => {
    if (submitted || selectedIds.length === 0) return;
    setSubmitted(true);
    const correct =
      normalizeText(assembledText) === normalizeText(targetString) ||
      normalizeText(assembledText) === normalizeText(word.word);
    setIsCorrectState(correct);

    setTimeout(() => {
      onAnswer(correct);
    }, correct ? 650 : 750);
  };

  const clozeParts = (word.example_cloze_1 || '').split(/\[(?:…|\.{3}|\.)\]/);

  return (
    <motion.div
      key={word.word}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-4"
    >
      {/* Prompt Card */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 sm:p-6 shadow-ios border border-slate-200/70 dark:border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
            <Puzzle className="w-3.5 h-3.5" />
            Constructeur de Syllabes • Niv. 3.1
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
            {word.nature}
          </span>
        </div>

        <div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
            « {word.definition_courte} »
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E]/80 border border-slate-200/60 dark:border-white/10 text-base text-slate-800 dark:text-slate-100 leading-relaxed">
          «{' '}
          {clozeParts.map((part, idx) => (
            <React.Fragment key={idx}>
              {part}
              {idx < clozeParts.length - 1 && (
                <span className="inline-block mx-1 px-2.5 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 font-bold">
                  {assembledText || '[…]'}
                </span>
              )}
            </React.Fragment>
          ))}{' '}
          »
        </div>

        {/* Construction Dock */}
        <div
          className={`min-h-[4.25rem] p-3.5 rounded-2xl border-2 border-dashed flex items-center justify-between gap-2 transition-colors ${
            submitted
              ? isCorrectState
                ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-500/15'
                : 'border-rose-500 bg-rose-50/70 dark:bg-rose-500/15'
              : 'border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/30 dark:bg-indigo-950/20'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            {selectedObjects.length === 0 ? (
              <span className="text-sm text-slate-500 dark:text-slate-400 pl-1">
                Touchez {targetChunks.length} blocs ci-dessous pour former le mot…
              </span>
            ) : (
              selectedObjects.map((chunk) => (
                <motion.button
                  layout
                  key={`dock-${chunk.id}`}
                  type="button"
                  onClick={() => handleToggleChunk(chunk.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-sans font-bold text-base shadow-sm"
                >
                  {chunk.text}
                </motion.button>
              ))
            )}
          </div>

          {selectedObjects.length > 0 && !submitted && (
            <button
              type="button"
              onClick={handleReset}
              aria-label="Réinitialiser"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/10"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Syllable Touch Buttons */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios border border-slate-200/70 dark:border-white/10 space-y-4">
        <div className="flex flex-wrap justify-center gap-2.5">
          {allChunks.map((chunk) => {
            const isUsed = selectedIds.includes(chunk.id);
            return (
              <motion.button
                key={chunk.id}
                type="button"
                disabled={isUsed || submitted}
                whileTap={!isUsed && !submitted ? { scale: 0.94 } : undefined}
                onClick={() => handleToggleChunk(chunk.id)}
                className={`px-4 py-3 rounded-2xl font-sans font-bold text-lg border-2 transition-all min-w-[3.75rem] ${
                  isUsed
                    ? 'bg-slate-100 dark:bg-white/5 border-slate-200/50 dark:border-white/5 text-slate-300 dark:text-slate-600 scale-95'
                    : 'bg-slate-50 dark:bg-[#2C2C2E] border-slate-200 dark:border-white/15 text-slate-900 dark:text-white hover:border-indigo-500 shadow-sm'
                }`}
              >
                {chunk.text}
              </motion.button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={selectedIds.length === 0 || submitted}
          onClick={handleValidate}
          className="w-full py-4 rounded-2xl bg-indigo-600 disabled:bg-slate-200 dark:disabled:bg-white/10 disabled:text-slate-400 text-white font-semibold text-base shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all"
        >
          <Check className="w-5 h-5" />
          <span>Valider « {assembledText || '...'} »</span>
        </button>
      </div>
    </motion.div>
  );
};
