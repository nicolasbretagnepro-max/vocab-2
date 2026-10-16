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
} from 'lucide-react';
import {
  ArcadeHighScores,
  WordEntry,
  WordProgress,
} from '../../types/vocab';
import { MultipleChoiceGame } from '../exercises/MultipleChoiceGame';
import { PairMatchingGame } from '../exercises/PairMatchingGame';
import { TypingScribeGame } from '../exercises/TypingScribeGame';

interface ArcadeTabProps {
  allWords: WordEntry[];
  progressMap: Record<string, WordProgress>;
  highScores: ArcadeHighScores;
  onUpdateHighScore: (game: keyof ArcadeHighScores, score: number) => void;
  onAwardXp: (xp: number) => void;
}

type ArcadeGameType =
  | null
  | 'chrono2min'
  | 'motJuste'
  | 'tapisExpress'
  | 'scribe';

export const ArcadeTab: React.FC<ArcadeTabProps> = ({
  allWords,
  progressMap,
  highScores,
  onUpdateHighScore,
  onAwardXp,
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [bonusToast, setBonusToast] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);

  // Timer for 2 Minutes Chrono & Tapis Express
  useEffect(() => {
    if (
      (activeGame !== 'chrono2min' && activeGame !== 'tapisExpress') ||
      gameOver
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
  }, [activeGame, gameOver]);

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
    setCurrentIndex(0);
    setScore(0);
    setCombo(0);
    setGameOver(false);
    setBonusToast(null);
    if (game === 'chrono2min') setTimeLeft(120);
    if (game === 'tapisExpress') setTimeLeft(90);
    setActiveGame(game);
  };

  const currentWord =
    gameQueue.length > 0 ? gameQueue[currentIndex % gameQueue.length] : null;

  // 1. 2 Minutes Chrono Handler
  const handleChronoAnswer = (isCorrect: boolean) => {
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
    }
    setCurrentIndex((i) => i + 1);
  };

  // 2. Le Mot Juste (10 Cloze sentences)
  const handleMotJusteAnswer = (isCorrect: boolean) => {
    if (isCorrect) {
      setScore((s) => s + 20);
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
    }
    if (currentIndex + 1 >= 5) {
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
          className="py-8 space-y-5 pb-nav-safe"
        >
          <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-7 shadow-ios-lg border border-slate-200/80 dark:border-white/10 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-500">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Arcade Terminée
              </span>
              <h2 className="font-serif text-3xl font-bold text-slate-900 dark:text-white mt-1">
                Score : {score} pts
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Record personnel :{' '}
                {Math.max(score, highScores[activeGame] || 0)} pts
              </p>
            </div>

            <div className="flex gap-3 pt-2">
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
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quitter</span>
          </button>

          <div className="flex items-center gap-3">
            {(activeGame === 'chrono2min' || activeGame === 'tapisExpress') && (
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                  timeLeft <= 15
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 animate-pulse'
                    : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>{timeLeft}s</span>
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
            onAnswer={handleMotJusteAnswer}
          />
        )}

        {activeGame === 'tapisExpress' && (
          <PairMatchingGame
            key={`tapis-${currentIndex}`}
            words={gameQueue.slice(currentIndex * 4, currentIndex * 4 + 4)}
            titleLabel={`Tapis Express • Manche ${currentIndex + 1} / 3`}
            onComplete={handleTapisRoundComplete}
          />
        )}

        {activeGame === 'scribe' && (
          <TypingScribeGame
            key={`scribe-${currentIndex}`}
            word={currentWord}
            allowHints={true}
            useSecondExample={currentIndex % 2 === 1}
            badgeLabel={`L'Épreuve du Scribe • ${currentIndex + 1} / 5`}
            onAnswer={handleScribeAnswer}
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
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Arcade
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Mini-jeux rapides pour stimuler votre vitesse de rappel.
          </p>
        </div>

        {/* Segmented Switch: Uniquement mes mots vus vs Tout le dictionnaire */}
        <div className="p-1 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setOnlySeenWords(true)}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
              onlySeenWords
                ? 'bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Uniquement mes mots vus ({seenWords.length})
          </button>
          <button
            type="button"
            onClick={() => setOnlySeenWords(false)}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
              !onlySeenWords
                ? 'bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Tout le dictionnaire ({allWords.length} mots)
          </button>
        </div>

        {onlySeenWords && seenWords.length < 4 && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center">
            Vous avez moins de 4 mots vus : le dictionnaire complet est utilisé en complément.
          </p>
        )}
      </div>

      {/* 4 Mini-Game Cards */}
      <div className="grid grid-cols-1 gap-3.5">
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
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-snug">
                Sprint QCM de 120s avec multiplicateur de combo et +2s tous les 5 combos.
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
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-snug">
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
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-snug">
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
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-snug">
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
