import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  X,
  Trophy,
  Sparkles,
  CheckCircle2,
  Flame,
  ArrowRight,
} from 'lucide-react';
import {
  FlashcardConfidence,
  SessionQueueItem,
  WordEntry,
  WordProgress,
} from '../../types/vocab';
import {
  updateWordProgressOnAnswer,
  updateWordProgressOnFlashcard,
} from '../../services/srsEngine';
import { DiscoveryCard } from '../exercises/DiscoveryCard';
import { MultipleChoiceGame } from '../exercises/MultipleChoiceGame';
import { PairMatchingGame } from '../exercises/PairMatchingGame';
import { SyllableBuilderGame } from '../exercises/SyllableBuilderGame';
import { TypingScribeGame } from '../exercises/TypingScribeGame';
import { FlashcardRecallGame } from '../exercises/FlashcardRecallGame';
import { ParonymDuelGame } from '../exercises/ParonymDuelGame';
import { CorrectionSheet } from '../exercises/CorrectionSheet';

interface SessionRunnerProps {
  title: string;
  initialQueue: SessionQueueItem[];
  allWords: WordEntry[];
  progressMap: Record<string, WordProgress>;
  onUpdateWordProgress: (word: string, updated: WordProgress) => void;
  onToggleFavorite: (word: string) => void;
  onFinishSession: (xpEarned: number, reviewsCount: number) => void;
  onCancel: () => void;
}

export const SessionRunner: React.FC<SessionRunnerProps> = ({
  title,
  initialQueue,
  allWords,
  progressMap,
  onUpdateWordProgress,
  onToggleFavorite,
  onFinishSession,
  onCancel,
}) => {
  const [queue, setQueue] = useState<SessionQueueItem[]>(initialQueue);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showingCorrectionFor, setShowingCorrectionFor] =
    useState<WordEntry | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(initialQueue.length === 0);
  const answeredIds = useRef(new Set<string>());
  const advancedIds = useRef(new Set<string>());
  const mounted = useRef(true);

  const currentItem = queue[currentIndex];
  const activeId = useRef(currentItem?.id);
  activeId.current = currentItem?.id;
  const progressPercent =
    queue.length > 0
      ? Math.min(100, Math.round((currentIndex / queue.length) * 100))
      : 100;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (isCompleted) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignore if canvas-confetti fails in headless environment
      }
    }
  }, [isCompleted]);

  // Events from an outgoing card (or a delayed timer) must never grade the next one.
  const acceptAnswer = () => {
    if (!mounted.current || !currentItem || activeId.current !== currentItem.id || answeredIds.current.has(currentItem.id)) return false;
    answeredIds.current.add(currentItem.id);
    return true;
  };

  const advanceToNext = (hasAppendedRetry = false) => {
    if (!mounted.current || !currentItem || activeId.current !== currentItem.id || advancedIds.current.has(currentItem.id)) return;
    advancedIds.current.add(currentItem.id);
    if (!hasAppendedRetry && currentIndex + 1 >= queue.length) {
      setIsCompleted(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleFlashcardRate = (confidence: FlashcardConfidence) => {
    if (!acceptAnswer()) return;
    const currentProgress = progressMap[currentItem.wordEntry.word];
    const updated = updateWordProgressOnFlashcard(
      currentProgress,
      currentItem.wordEntry.word,
      confidence
    );
    onUpdateWordProgress(currentItem.wordEntry.word, updated);

    if (confidence === 'forgot') {
      setMistakeCount((m) => m + 1);
      // Re-queue at end of flashcard session to verify recall before finishing
      setQueue((prev) => [
        ...prev,
        {
          ...currentItem,
          id: `${currentItem.id}-retry-${prev.length}`,
          isRetry: true,
        },
      ]);
    } else {
      const gained = confidence === 'easy' ? 12 : 8;
      setXpEarned((x) => x + gained);
      setCorrectCount((c) => c + 1);
    }
    advanceToNext(confidence === 'forgot');
  };

  const handleExerciseResult = (isCorrect: boolean, hintsUsed = 0) => {
    if (!acceptAnswer()) return;

    const currentProgress = progressMap[currentItem.wordEntry.word];
    const updated = updateWordProgressOnAnswer(
      currentProgress,
      currentItem.wordEntry.word,
      isCorrect,
      currentItem,
      hintsUsed
    );
    onUpdateWordProgress(currentItem.wordEntry.word, updated);

    if (isCorrect) {
      const gained =
        currentItem.exerciseType === 'discovery'
          ? 5
          : Math.max(5, 15 - hintsUsed * 3);
      setXpEarned((x) => x + gained);
      setCorrectCount((c) => c + 1);
      advanceToNext();
    } else {
      setMistakeCount((m) => m + 1);
      // For paronym-duel, the component already shows a side-by-side comparison and a "Continuer" button
      if (currentItem.exerciseType === 'paronym-duel') {
        advanceToNext();
        return;
      }

      // Re-queue the failed item at the end of the session so it is re-validated before finishing
      const retryExercise =
        currentItem.exerciseType === 'discovery'
          ? 'qcm-word-to-def'
          : currentItem.exerciseType;

      setQueue((prev) => [
        ...prev,
        {
          ...currentItem,
          id: `${currentItem.id}-retry-${prev.length}`,
          exerciseType: retryExercise,
          isRetry: true,
        },
      ]);
      setShowingCorrectionFor(currentItem.wordEntry);
    }
  };

  if (isCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-[80dvh] flex flex-col justify-center items-center px-4 py-8"
      >
        <div className="w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-3xl p-7 shadow-ios-lg border border-slate-200/80 dark:border-white/10 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
            <Trophy className="w-10 h-10" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Sparkles className="w-3.5 h-3.5" />
              Séance terminée
            </span>
            <h2 className="font-serif text-3xl font-bold text-slate-900 dark:text-white">
              Bravo !
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {queue.length === 0 ? 'Aucun exercice à réaliser dans cette séance.' : 'Vous avez parcouru les exercices de cette séance.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200/50 dark:border-white/5">
              <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                XP gagnés
              </div>
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center justify-center gap-1">
                <Flame className="w-4 h-4 fill-indigo-500" />+{xpEarned}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200/50 dark:border-white/5">
              <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Validations
              </div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                {correctCount}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200/50 dark:border-white/5">
              <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Précision
              </div>
              <div className="text-xl font-bold text-amber-500 mt-0.5">
                {correctCount + mistakeCount > 0
                  ? Math.round(
                      (correctCount / (correctCount + mistakeCount)) * 100
                    )
                  : 100}
                %
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onFinishSession(xpEarned, correctCount)}
            className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all"
          >
            <span>Retour à l'accueil</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    );
  }

  if (!currentItem) {
    return null;
  }

  const wordProgress = progressMap[currentItem.wordEntry.word];
  const supportedTypes: SessionQueueItem['exerciseType'][] = [
    'discovery', 'qcm-word-to-def', 'qcm-def-to-word', 'qcm-cloze-1', 'qcm-cloze-2',
    'syllable-builder', 'typing-hinted', 'typing-strict', 'pair-matching', 'paronym-duel', 'flashcard-recall',
  ];
  const canRenderExercise = supportedTypes.includes(currentItem.exerciseType) &&
    (currentItem.exerciseType !== 'pair-matching' || !!currentItem.pairWords?.length) &&
    (currentItem.exerciseType !== 'paronym-duel' || !!currentItem.duelOpponent);

  const renderBadgeLabel = () => {
    if (currentItem.isRetry) {
      return 'Rattrapage • Validation requise';
    }
    if (currentItem.passIndex === 1) return 'Découverte • Passe 1/3';
    if (currentItem.passIndex === 2) return 'Ancrage • Passe 2/3 (Définition)';
    if (currentItem.passIndex === 3) return 'Validation • Passe 3/3 (Contexte)';
    if (currentItem.targetLevel === 2) {
      return currentItem.targetStep === 0
        ? 'Consolidation • Niv. 2.1 (J+1)'
        : 'Consolidation • Niv. 2.2 (J+2)';
    }
    if (currentItem.targetLevel === 3) {
      return currentItem.targetStep === 0
        ? 'Rappel semi-actif • Niv. 3.1 (J+4)'
        : 'Rappel semi-actif • Niv. 3.2 (J+5)';
    }
    if (currentItem.targetLevel === 4) {
      return 'Ancrage profond • Niv. 4 (J+10)';
    }
    if (currentItem.targetLevel === 5) {
      return 'Maîtrise Or • Niv. 5';
    }
    return undefined;
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-safe pb-10 space-y-4">
      {/* Session Header & Progress Bar */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Quitter la session"
          className="p-2 rounded-full bg-white dark:bg-[#1C1C1E] border border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            <span>{title}</span>
            <span>
              {currentIndex + 1} / {queue.length}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Main Exercise Area or Correction Sheet */}
      {/* Mount the current view immediately. Learning must never wait for an exit-animation callback. */}
      <section aria-label="Exercice en cours" key={`${currentItem.id}-${showingCorrectionFor ? 'correction' : 'question'}`}>
        {showingCorrectionFor ? (
          <CorrectionSheet
            key={`corr-${currentItem.id}`}
            word={showingCorrectionFor}
            customMemoryTip={
              progressMap[showingCorrectionFor.word]?.customMemoryTip
            }
            onContinue={() => {
              setShowingCorrectionFor(null);
              advanceToNext();
            }}
          />
        ) : (
          !canRenderExercise ? (
            <div role="status" className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 space-y-4 shadow-ios">
              <h2 className="text-xl font-bold">Cette question est indisponible</h2>
              <p>L’exercice ne peut pas être affiché. Vous pouvez continuer sans erreur ni modification de votre progression.</p>
              <button type="button" className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-semibold" onClick={() => advanceToNext()}>
                Passer sans notation
              </button>
            </div>
          ) : <div key={currentItem.id}>
            {currentItem.exerciseType === 'discovery' && (
              <DiscoveryCard
                word={currentItem.wordEntry}
                customMemoryTip={wordProgress?.customMemoryTip}
                isFavorite={wordProgress?.favorite}
                onToggleFavorite={() =>
                  onToggleFavorite(currentItem.wordEntry.word)
                }
                passLabel={renderBadgeLabel()}
                onComplete={() => handleExerciseResult(true, 0)}
              />
            )}

            {currentItem.exerciseType === 'qcm-word-to-def' && (
              <MultipleChoiceGame
                word={currentItem.wordEntry}
                allWords={allWords}
                mode="word-to-def"
                badgeLabel={renderBadgeLabel()}
                onAnswer={(ok) => handleExerciseResult(ok, 0)}
              />
            )}

            {currentItem.exerciseType === 'qcm-def-to-word' && (
              <MultipleChoiceGame
                word={currentItem.wordEntry}
                allWords={allWords}
                mode="def-to-word"
                badgeLabel={renderBadgeLabel()}
                onAnswer={(ok) => handleExerciseResult(ok, 0)}
              />
            )}

            {currentItem.exerciseType === 'qcm-cloze-1' && (
              <MultipleChoiceGame
                word={currentItem.wordEntry}
                allWords={allWords}
                mode="cloze-1"
                badgeLabel={renderBadgeLabel()}
                onAnswer={(ok) => handleExerciseResult(ok, 0)}
              />
            )}

            {currentItem.exerciseType === 'qcm-cloze-2' && (
              <MultipleChoiceGame
                word={currentItem.wordEntry}
                allWords={allWords}
                mode="cloze-2"
                badgeLabel={renderBadgeLabel()}
                onAnswer={(ok) => handleExerciseResult(ok, 0)}
              />
            )}

            {currentItem.exerciseType === 'syllable-builder' && (
              <SyllableBuilderGame
                word={currentItem.wordEntry}
                onAnswer={(ok) => handleExerciseResult(ok, 0)}
              />
            )}

            {currentItem.exerciseType === 'typing-hinted' && (
              <TypingScribeGame
                word={currentItem.wordEntry}
                allowHints={true}
                useSecondExample={true}
                customMemoryTip={wordProgress?.customMemoryTip}
                badgeLabel={renderBadgeLabel()}
                onAnswer={(ok, hints) => handleExerciseResult(ok, hints)}
              />
            )}

            {currentItem.exerciseType === 'typing-strict' && (
              <TypingScribeGame
                word={currentItem.wordEntry}
                allowHints={false}
                useSecondExample={false}
                customMemoryTip={wordProgress?.customMemoryTip}
                badgeLabel={renderBadgeLabel()}
                onAnswer={(ok) => handleExerciseResult(ok, 0)}
              />
            )}

            {currentItem.exerciseType === 'pair-matching' &&
              currentItem.pairWords && (
                <PairMatchingGame
                  words={currentItem.pairWords}
                  onComplete={() => handleExerciseResult(true, 0)}
                />
              )}

            {currentItem.exerciseType === 'paronym-duel' &&
              currentItem.duelOpponent && (
                <ParonymDuelGame
                  wordA={currentItem.wordEntry}
                  wordB={currentItem.duelOpponent}
                  groupLabel="Défi de fin de séance"
                  onResult={(ok) => handleExerciseResult(ok, 0)}
                />
              )}

            {currentItem.exerciseType === 'flashcard-recall' && (
              <FlashcardRecallGame
                wordEntry={currentItem.wordEntry}
                onRate={handleFlashcardRate}
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
};
