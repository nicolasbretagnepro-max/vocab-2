import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Zap,
  Target,
  Puzzle,
  PenTool,
  Trophy,
  Timer,
  Flame,
  ArrowLeft,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Star,
  ChevronRight,
  Swords,
  Sparkles,
} from 'lucide-react';
import {
  ArcadeHighScores,
  WordEntry,
  WordProgress,
} from '../../types/vocab';
import { MultipleChoiceGame } from '../exercises/MultipleChoiceGame';
import { PairMatchingGame } from '../exercises/PairMatchingGame';
import { TypingScribeGame } from '../exercises/TypingScribeGame';
import { ParonymDuelGame } from '../exercises/ParonymDuelGame';
import { generateDuelPairs, ParonymDuelPair } from '../../utils/paronymEngine';

interface ArcadeTabProps {
  allWords: WordEntry[];
  progressMap: Record<string, WordProgress>;
  highScores: ArcadeHighScores;
  onUpdateHighScore: (game: keyof ArcadeHighScores, score: number) => void;
  onAwardXp: (xp: number) => void;
  onSelectWord: (word: WordEntry) => void;
  onToggleFavorite: (wordKey: string) => void;
  onStartFlashcardRecall: () => void;
}

type ArcadeGameType =
  | null
  | 'chrono2min'
  | 'motJuste'
  | 'tapisExpress'
  | 'scribe'
  | 'duelParonymes';

export const ArcadeTab: React.FC<ArcadeTabProps> = ({
  allWords,
  progressMap,
  highScores,
  onUpdateHighScore,
  onAwardXp,
  onSelectWord,
  onToggleFavorite,
  onStartFlashcardRecall,
}) => {
  const [onlySeenWords, setOnlySeenWords] = useState(false);
  const [activeGame, setActiveGame] = useState<ArcadeGameType>(null);

  const seenWords = useMemo(
    () => allWords.filter((w) => (progressMap[w.word]?.level ?? 0) >= 1),
    [allWords, progressMap]
  );

  const activePool = useMemo(() => {
    if (onlySeenWords && seenWords.length >= 4) {
      return seenWords;
    }
    return allWords;
  }, [onlySeenWords, seenWords, allWords]);

  // Game States
  const [gameQueue, setGameQueue] = useState<WordEntry[]>([]);
  const [duelPairs, setDuelPairs] = useState<ParonymDuelPair[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [bonusToast, setBonusToast] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [sessionMistakes, setSessionMistakes] = useState<WordEntry[]>([]);

  const recordMistake = (wordEntry: WordEntry) => {
    setSessionMistakes((prev) => {
      if (prev.some((w) => w.word === wordEntry.word)) return prev;
      return [...prev, wordEntry];
    });
  };

  // Timer for 2 Minutes Chrono & Tapis Express (pauses when reading an error!)
  useEffect(() => {
    if (
      (activeGame !== 'chrono2min' && activeGame !== 'tapisExpress') ||
      gameOver ||
      isTimerPaused
    ) {
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeGame, gameOver, isTimerPaused]);

  // Handle Game Over High Score & XP
  useEffect(() => {
    if (gameOver && activeGame) {
      let finalScore = score;
      if (activeGame === 'tapisExpress' && timeLeft > 0) {
        finalScore = score + timeLeft * 5;
        setScore(finalScore);
      }
      onUpdateHighScore(activeGame, finalScore);
      onAwardXp(Math.max(10, Math.round(finalScore / 10)));
      try {
        confetti({ particleCount: 60, spread: 65, origin: { y: 0.6 } });
      } catch {
        // Ignore
      }
    }
  }, [gameOver]);

  const startGame = (game: ArcadeGameType) => {
    if (!game) return;
    const shuffled = [...activePool].sort(() => Math.random() - 0.5);
    setGameQueue(shuffled);
    if (game === 'duelParonymes') {
      const pairs = generateDuelPairs(activePool, allWords, 6);
      setDuelPairs(pairs);
    }
    setCurrentIndex(0);
    setScore(0);
    setCombo(0);
    setGameOver(false);
    setIsTimerPaused(false);
    setBonusToast(null);
    setSessionMistakes([]);
    if (game === 'chrono2min') setTimeLeft(120);
    if (game === 'tapisExpress') setTimeLeft(90);
    setActiveGame(game);
  };

  const currentWord =
    gameQueue.length > 0 ? gameQueue[currentIndex % gameQueue.length] : null;

  // 1. 2 Minutes Chrono Handler
  const handleChronoAnswer = (isCorrect: boolean) => {
    setIsTimerPaused(false);
    if (isCorrect) {
      const nextCombo = combo + 1;
      const multiplier = Math.min(4, 1 + Math.floor(nextCombo / 3));
      const points = 10 * multiplier;
      setCombo(nextCombo);
      setScore((s) => s + points);

      if (nextCombo % 5 === 0) {
        setTimeLeft((t) => t + 2);
        setBonusToast(`Combo x${nextCombo} ! +2 secondes ⚡`);
        setTimeout(() => setBonusToast(null), 1500);
      }
    } else {
      setCombo(0);
      if (currentWord) recordMistake(currentWord);
    }
    setCurrentIndex((i) => i + 1);
  };

  // 2. Le Mot Juste (10 Cloze sentences)
  const handleMotJusteAnswer = (isCorrect: boolean) => {
    if (isCorrect) {
      setScore((s) => s + 20);
    } else if (currentWord) {
      recordMistake(currentWord);
    }
    if (currentIndex + 1 >= 10) {
      setGameOver(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  // 3. Tapis Express (3 rounds of 4 pairs against the clock)
  const handleTapisRoundComplete = (mistakes: number) => {
    const roundPoints = Math.max(20, 60 - mistakes * 10);
    setScore((s) => s + roundPoints);
    if (currentIndex + 1 >= 3) {
      setGameOver(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  // 4. L'Épreuve du Scribe (5 words keyboard spelling)
  const handleScribeAnswer = (isCorrect: boolean, hintsUsed: number) => {
    if (isCorrect) {
      const pts = Math.max(10, 40 - hintsUsed * 10);
      setScore((s) => s + pts);
    } else if (currentWord) {
      recordMistake(currentWord);
    }
    if (currentIndex + 1 >= 5) {
      setGameOver(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  // 5. Le Duel des Nuances & Paronymes (6 rounds)
  const handleDuelResult = (isCorrect: boolean) => {
    const pair = duelPairs[currentIndex];
    if (isCorrect) {
      setScore((s) => s + 30);
    } else if (pair) {
      recordMistake(pair.wordA);
      recordMistake(pair.wordB);
    }
    if (currentIndex + 1 >= duelPairs.length) {
      setGameOver(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  // Active Game Screen
  if (activeGame && currentWord) {
    if (gameOver) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-4 space-y-5 pb-nav-safe"
        >
          {/* Score Summary Card */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-ios-lg border border-slate-200/80 dark:border-white/10 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-500">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Arcade Terminée
              </span>
              <h2 className="font-sans text-3xl font-bold text-slate-900 dark:text-white mt-1">
                Score : {score} pts
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Record personnel :{' '}
                {Math.max(score, highScores[activeGame] || 0)} pts
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setActiveGame(null)}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 font-semibold text-sm flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Menu Arcade</span>
              </button>
              <button
                type="button"
                onClick={() => startGame(activeGame)}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-indigo-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Rejouer</span>
              </button>
            </div>
          </div>

          {/* End-of-Game Mistakes Recap */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios border border-slate-200/80 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {sessionMistakes.length === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                )}
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                  {sessionMistakes.length === 0
                    ? 'Sans faute ! Aucune erreur'
                    : `Récapitulatif des erreurs (${sessionMistakes.length})`}
                </h3>
              </div>
              {sessionMistakes.length > 0 && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Touchez un mot pour sa fiche
                </span>
              )}
            </div>

            {sessionMistakes.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Vous avez répondu correctement à toutes les questions de cette partie.
              </p>
            ) : (
              <div className="space-y-3">
                {sessionMistakes.map((missed) => {
                  const isFav = progressMap[missed.word]?.favorite;
                  return (
                    <div
                      key={missed.word}
                      onClick={() => onSelectWord(missed)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ')
                          onSelectWord(missed);
                      }}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E]/80 border border-slate-200/70 dark:border-white/10 hover:border-indigo-400 transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-serif text-xl font-bold text-slate-900 dark:text-white">
                            {missed.word}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                            {missed.nature}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(missed.word);
                            }}
                            aria-label="Favori"
                            className="p-1.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-white/10"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                isFav
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-400'
                              }`}
                            />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>

                      <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                        {missed.definition_courte}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {missed.definition}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      );
    }

    return (
      <div className="space-y-4 pb-nav-safe">
        {/* Game Top Bar */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-3.5 shadow-ios border border-slate-200/70 dark:border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveGame(null)}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quitter</span>
          </button>

          <div className="flex items-center gap-2.5">
            {(activeGame === 'chrono2min' || activeGame === 'tapisExpress') && (
              <div
                className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold ${
                  isTimerPaused
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                    : timeLeft <= 15
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 animate-pulse'
                    : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>{isTimerPaused ? `${timeLeft}s (Pause)` : `${timeLeft}s`}</span>
              </div>
            )}

            {activeGame === 'chrono2min' && combo > 1 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>x{combo}</span>
              </div>
            )}

            <div className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
              {score} pts
            </div>
          </div>
        </div>

        {bonusToast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2.5 rounded-2xl bg-amber-500 text-white text-xs font-bold text-center shadow-md"
          >
            {bonusToast}
          </motion.div>
        )}

        {/* Active Mini-Game Body */}
        {activeGame === 'chrono2min' && (
          <MultipleChoiceGame
            key={`chrono-${currentIndex}`}
            word={currentWord}
            allWords={allWords}
            mode={currentIndex % 2 === 0 ? 'word-to-def' : 'def-to-word'}
            badgeLabel={`2 Minutes Chrono • Question #${currentIndex + 1}`}
            pauseOnError={true}
            onErrorDetected={() => {
              setIsTimerPaused(true);
              recordMistake(currentWord);
            }}
            onAnswer={handleChronoAnswer}
          />
        )}

        {activeGame === 'motJuste' && (
          <MultipleChoiceGame
            key={`motjuste-${currentIndex}`}
            word={currentWord}
            allWords={allWords}
            mode={currentIndex % 2 === 0 ? 'cloze-1' : 'cloze-2'}
            badgeLabel={`Le Mot Juste • ${currentIndex + 1} / 10`}
            pauseOnError={true}
            onErrorDetected={() => recordMistake(currentWord)}
            onAnswer={handleMotJusteAnswer}
          />
        )}

        {activeGame === 'tapisExpress' && (
          <PairMatchingGame
            key={`tapis-${currentIndex}`}
            words={gameQueue.slice(currentIndex * 4, currentIndex * 4 + 4)}
            titleLabel={`Tapis Express • Manche ${currentIndex + 1} / 3`}
            onMistakeWord={(w) => recordMistake(w)}
            onComplete={handleTapisRoundComplete}
          />
        )}

        {activeGame === 'scribe' && (
          <TypingScribeGame
            key={`scribe-${currentIndex}`}
            word={currentWord}
            allowHints={true}
            useSecondExample={currentIndex % 2 === 1}
            pauseOnError={true}
            badgeLabel={`L'Épreuve du Scribe • ${currentIndex + 1} / 5`}
            onAnswer={handleScribeAnswer}
          />
        )}

        {activeGame === 'duelParonymes' && duelPairs[currentIndex] && (
          <ParonymDuelGame
            key={`duel-${currentIndex}`}
            wordA={duelPairs[currentIndex].wordA}
            wordB={duelPairs[currentIndex].wordB}
            groupLabel={`Duel ${currentIndex + 1} / ${duelPairs.length} • ${
              duelPairs[currentIndex].relationType === 'paronyme'
                ? 'Paronymes proches'
                : 'Nuance éditoriale'
            }`}
            onResult={handleDuelResult}
          />
        )}
      </div>
    );
  }

  // Arcade Hub Screen
  return (
    <div className="space-y-5 pb-nav-safe">
      {/* Header & Source Switch */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios border border-slate-200/70 dark:border-white/10 space-y-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Entraînement intensif
          </span>
          <h1 className="font-sans text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Arcade
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
            Mini-jeux rapides pour stimuler votre vitesse de rappel et affiner vos nuances.
          </p>
        </div>

        {/* Segmented Switch: Uniquement mes mots vus vs Tout le dictionnaire */}
        <div className="p-1 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setOnlySeenWords(true)}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              onlySeenWords
                ? 'bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Mes mots vus ({seenWords.length})
          </button>
          <button
            type="button"
            onClick={() => setOnlySeenWords(false)}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              !onlySeenWords
                ? 'bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Tout le dictionnaire ({allWords.length})
          </button>
        </div>

        {onlySeenWords && seenWords.length < 4 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
            Vous avez moins de 4 mots vus : le dictionnaire complet est utilisé en complément.
          </p>
        )}
      </div>

      {/* Mini-Game Cards */}
      <div className="grid grid-cols-1 gap-3.5">
        {/* Lot 4: Le Duel des Paronymes & Nuances Proches */}
        <button
          type="button"
          onClick={() => startGame('duelParonymes')}
          className="w-full text-left bg-white dark:bg-[#1C1C1E] hover:border-purple-400 rounded-3xl p-5 shadow-ios border border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-4 transition-all active:scale-[0.99]"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Swords className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                  ⚔️ Le Duel des Nuances
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-500/25 text-purple-700 dark:text-purple-300">
                  109 Groupes & Paronymes
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug">
                Départagez 2 mots proches ou paronymes dans 2 phrases à trous en opposition directe.
              </p>
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 pt-1">
                <Trophy className="w-3.5 h-3.5" />
                <span>High Score : {highScores.duelParonymes || 0} pts</span>
              </div>
            </div>
          </div>
        </button>

        {/* Lot 2: Rappel Éclair (Flashcards Active Recall) */}
        <button
          type="button"
          onClick={onStartFlashcardRecall}
          className="w-full text-left bg-white dark:bg-[#1C1C1E] hover:border-sky-400 rounded-3xl p-5 shadow-ios border border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-4 transition-all active:scale-[0.99]"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                  ⚡ Rappel Éclair (Flashcards)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-500/25 text-sky-700 dark:text-sky-300">
                  Impact SRS
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug">
                10 cartes recto/verso sans QCM : formulez le sens mentalement puis auto-évaluez votre maîtrise.
              </p>
            </div>
          </div>
        </button>

        {/* 1. 2 Minutes Chrono */}
        <button
          type="button"
          onClick={() => startGame('chrono2min')}
          className="w-full text-left bg-white dark:bg-[#1C1C1E] hover:border-amber-400 rounded-3xl p-5 shadow-ios border border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-4 transition-all active:scale-[0.99]"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                ⚡ 2 Minutes Chrono
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug">
                Sprint QCM de 120s avec multiplicateur de combo, pause lecture en cas d'erreur et récap final.
              </p>
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 pt-1">
                <Trophy className="w-3.5 h-3.5" />
                <span>High Score : {highScores.chrono2min} pts</span>
              </div>
            </div>
          </div>
        </button>

        {/* 2. Le Mot Juste */}
        <button
          type="button"
          onClick={() => startGame('motJuste')}
          className="w-full text-left bg-white dark:bg-[#1C1C1E] hover:border-indigo-400 rounded-3xl p-5 shadow-ios border border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-4 transition-all active:scale-[0.99]"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                🎯 Le Mot Juste
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug">
                Série de 10 phrases à trous littéraires et journalistiques à compléter.
              </p>
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 pt-1">
                <Trophy className="w-3.5 h-3.5" />
                <span>High Score : {highScores.motJuste} pts</span>
              </div>
            </div>
          </div>
        </button>

        {/* 3. Tapis Express */}
        <button
          type="button"
          onClick={() => startGame('tapisExpress')}
          className="w-full text-left bg-white dark:bg-[#1C1C1E] hover:border-emerald-400 rounded-3xl p-5 shadow-ios border border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-4 transition-all active:scale-[0.99]"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Puzzle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                🧩 Tapis Express
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug">
                3 manches d'associations de paires contre la montre.
              </p>
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
                <Trophy className="w-3.5 h-3.5" />
                <span>High Score : {highScores.tapisExpress} pts</span>
              </div>
            </div>
          </div>
        </button>

        {/* 4. L'Épreuve du Scribe */}
        <button
          type="button"
          onClick={() => startGame('scribe')}
          className="w-full text-left bg-white dark:bg-[#1C1C1E] hover:border-violet-400 rounded-3xl p-5 shadow-ios border border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-4 transition-all active:scale-[0.99]"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <PenTool className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                ✍️ L'Épreuve du Scribe
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug">
                5 mots à orthographier au clavier avec le système d'indices progressifs.
              </p>
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 pt-1">
                <Trophy className="w-3.5 h-3.5" />
                <span>High Score : {highScores.scribe} pts</span>
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
