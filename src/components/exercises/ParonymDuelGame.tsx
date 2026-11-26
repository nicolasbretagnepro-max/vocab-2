import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WordEntry } from '../../types/vocab';
import { Swords, ArrowLeftRight, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { parseCloze } from '../../utils/clozeParser';

interface ParonymDuelGameProps {
  wordA: WordEntry;
  wordB: WordEntry;
  groupLabel?: string;
  onResult: (success: boolean) => void;
  onEvaluated?: (success: boolean) => void;
}

export const ParonymDuelGame: React.FC<ParonymDuelGameProps> = ({
  wordA,
  wordB,
  groupLabel,
  onResult,
  onEvaluated,
}) => {
  // Randomize whether Sentence 1 belongs to wordA or wordB
  const [sentencesOrder] = useState<'AB' | 'BA'>(() => (Math.random() > 0.5 ? 'AB' : 'BA'));
  // User's assignment: does wordA go to slot 1 ('AB') or slot 2 ('BA')?
  const [userAssignment, setUserAssignment] = useState<'AB' | 'BA' | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const submittedRef = useRef(false);

  const parsedA = useMemo(
    () => parseCloze(wordA.example_1, wordA.example_cloze_1, wordA.word),
    [wordA]
  );
  const parsedB = useMemo(
    () => parseCloze(wordB.example_1, wordB.example_cloze_1, wordB.word),
    [wordB]
  );

  const slot1Target =
    sentencesOrder === 'AB'
      ? { entry: wordA, parsed: parsedA }
      : { entry: wordB, parsed: parsedB };
  const slot2Target =
    sentencesOrder === 'AB'
      ? { entry: wordB, parsed: parsedB }
      : { entry: wordA, parsed: parsedA };

  const assignedSlot1Word =
    userAssignment === null ? null : userAssignment === 'AB' ? wordA : wordB;
  const assignedSlot2Word =
    userAssignment === null ? null : userAssignment === 'AB' ? wordB : wordA;

  const isCorrect = userAssignment === sentencesOrder;

  const handleAssignWordA = (toSlot: 1 | 2) => {
    if (submitted) return;
    setUserAssignment(toSlot === 1 ? 'AB' : 'BA');
  };

  const handleSwap = () => {
    if (submitted) return;
    if (userAssignment === null) {
      setUserAssignment('AB');
    } else {
      setUserAssignment(userAssignment === 'AB' ? 'BA' : 'AB');
    }
  };

  const handleValidate = () => {
    if (!userAssignment || submittedRef.current) return;
    submittedRef.current=true;
    setSubmitted(true);
    onEvaluated?.(isCorrect);
    if (isCorrect) {
      setTimeout(() => {
        onResult(true);
      }, 950);
    }
  };

  return (
    <div className="flex flex-col h-full justify-between pb-4">
      <div className="space-y-4">
        {/* Header Badge */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 text-xs font-semibold">
            <Swords className="w-3.5 h-3.5" />
            <span>Duel des Nuances & Paronymes</span>
          </div>
          {groupLabel && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
              {groupLabel}
            </span>
          )}
        </div>

        {/* Two Contenders Banner */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-4 shadow-ios border border-slate-200/80 dark:border-white/10">
          <p className="text-xs font-semibold text-center text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Attribuez chaque mot à la phrase qui lui correspond
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500 block mb-0.5">
                Mot 1
              </span>
              <span className="font-serif text-lg font-bold text-slate-900 dark:text-white">
                {wordA.word}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/50 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-500 block mb-0.5">
                Mot 2
              </span>
              <span className="font-serif text-lg font-bold text-slate-900 dark:text-white">
                {wordB.word}
              </span>
            </div>
          </div>
        </div>

        {/* Sentence Slot 1 */}
        <div
          onClick={() => handleAssignWordA(1)}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            submitted
              ? isCorrect
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-400'
                : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-400'
              : assignedSlot1Word
              ? 'bg-white dark:bg-[#1C1C1E] border-indigo-400 dark:border-indigo-500 shadow-sm'
              : 'bg-white dark:bg-[#1C1C1E] border-slate-200/80 dark:border-white/10'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Phrase A
            </span>
            {!submitted && (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssignWordA(1);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    assignedSlot1Word?.word === wordA.word
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {wordA.word}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssignWordA(2);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    assignedSlot1Word?.word === wordB.word
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {wordB.word}
                </button>
              </div>
            )}
          </div>
          <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed">
            {slot1Target.parsed.beforeCloze}
            <span
              className={`inline-block px-2.5 py-0.5 mx-1 rounded-lg font-bold border ${
                submitted
                  ? isCorrect
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                    : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border-rose-300'
                  : assignedSlot1Word
                  ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-indigo-300'
                  : 'bg-slate-100 dark:bg-white/10 text-slate-400 border-dashed border-slate-300 dark:border-white/20'
              }`}
            >
              {assignedSlot1Word ? assignedSlot1Word.word : 'Choisir…'}
            </span>
            {slot1Target.parsed.afterCloze}
          </p>
        </div>

        {/* Swap Button */}
        {!submitted && userAssignment !== null && (
          <div className="flex justify-center -my-1">
            <button
              type="button"
              onClick={handleSwap}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold active:scale-95 transition-transform"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Inverser les deux mots</span>
            </button>
          </div>
        )}

        {/* Sentence Slot 2 */}
        <div
          onClick={() => handleAssignWordA(2)}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            submitted
              ? isCorrect
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-400'
                : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-400'
              : assignedSlot2Word
              ? 'bg-white dark:bg-[#1C1C1E] border-purple-400 dark:border-purple-500 shadow-sm'
              : 'bg-white dark:bg-[#1C1C1E] border-slate-200/80 dark:border-white/10'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Phrase B
            </span>
            {!submitted && (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssignWordA(2);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    assignedSlot2Word?.word === wordA.word
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {wordA.word}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssignWordA(1);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    assignedSlot2Word?.word === wordB.word
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {wordB.word}
                </button>
              </div>
            )}
          </div>
          <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed">
            {slot2Target.parsed.beforeCloze}
            <span
              className={`inline-block px-2.5 py-0.5 mx-1 rounded-lg font-bold border ${
                submitted
                  ? isCorrect
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                    : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border-rose-300'
                  : assignedSlot2Word
                  ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border-purple-300'
                  : 'bg-slate-100 dark:bg-white/10 text-slate-400 border-dashed border-slate-300 dark:border-white/20'
              }`}
            >
              {assignedSlot2Word ? assignedSlot2Word.word : 'Choisir…'}
            </span>
            {slot2Target.parsed.afterCloze}
          </p>
        </div>

        {/* Comparison Card on Submit */}
        <AnimatePresence>
          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-3xl border space-y-3 ${
                isCorrect
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {isCorrect
                    ? 'Nuance parfaitement maîtrisée !'
                    : 'Attention à la nuance entre ces deux mots :'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-white/90 dark:bg-[#1C1C1E] border border-slate-200/60 dark:border-white/10">
                  <p className="font-serif font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                    {wordA.word}
                  </p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {wordA.definition_courte}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-white/90 dark:bg-[#1C1C1E] border border-slate-200/60 dark:border-white/10">
                  <p className="font-serif font-bold text-purple-600 dark:text-purple-400 text-sm">
                    {wordB.word}
                  </p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {wordB.definition_courte}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Action Button */}
      <div className="pt-4">
        {!submitted ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            disabled={!userAssignment}
            onClick={handleValidate}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-base shadow-lg shadow-indigo-600/20 transition-all"
          >
            Valider le duel
          </motion.button>
        ) : (
          !isCorrect && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onResult(false)}
              className="w-full py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-base flex items-center justify-center gap-2 shadow-md"
            >
              <span>Continuer</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          )
        )}
      </div>
    </div>
  );
};
