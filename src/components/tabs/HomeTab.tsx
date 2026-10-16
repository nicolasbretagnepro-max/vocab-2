import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Sparkles,
  Play,
  PlusCircle,
  RefreshCw,
  Crown,
  Layers,
  ChevronRight,
  CheckCircle2,
  ShieldAlert,
  Star,
} from 'lucide-react';
import {
  DailyQuotaOption,
  LeitnerLevel,
  UserStats,
  WordEntry,
  WordProgress,
} from '../../types/vocab';
import {
  calculateDailyNewWordsAllowance,
  getDueWords,
  getIsoDateString,
  getWipCount,
  WIP_LIMIT_LEVEL_1_2,
} from '../../services/srsEngine';

interface HomeTabProps {
  allWords: WordEntry[];
  progressMap: Record<string, WordProgress>;
  stats: UserStats;
  dailyQuota: DailyQuotaOption;
  dailyXpGoal: number;
  onStartDailyRoutine: () => void;
  onStartBonusNewWords: () => void;
  onStartFreeReview: () => void;
  onSelectWord: (word: WordEntry) => void;
}

const LEITNER_BOXES: {
  level: LeitnerLevel;
  title: string;
  subtitle: string;
  intervalBadge: string;
  accentClass: string;
  badgeClass: string;
}[] = [
  {
    level: 1,
    title: 'Boîte 1 • Découverte',
    subtitle: 'Validation en 3 passes dans la séance',
    intervalBadge: 'Séance du jour',
    accentClass: 'border-sky-400/50 bg-sky-50/50 dark:bg-sky-500/10',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300',
  },
  {
    level: 2,
    title: 'Boîte 2 • Consolidation',
    subtitle: 'QCM Inversé + Paires (J+1) & Contexte 2 (J+2)',
    intervalBadge: 'J+1 ➔ J+2',
    accentClass: 'border-indigo-400/50 bg-indigo-50/50 dark:bg-indigo-500/10',
    badgeClass:
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300',
  },
  {
    level: 3,
    title: 'Boîte 3 • Rappel semi-actif',
    subtitle: 'Syllabes (J+4) & Saisie avec indices (J+5)',
    intervalBadge: 'J+4 ➔ J+5',
    accentClass: 'border-violet-400/50 bg-violet-50/50 dark:bg-violet-500/10',
    badgeClass:
      'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300',
  },
  {
    level: 4,
    title: 'Boîte 4 • Ancrage profond',
    subtitle: 'Saisie stricte au clavier sans indice',
    intervalBadge: 'J+10',
    accentClass: 'border-emerald-400/50 bg-emerald-50/50 dark:bg-emerald-500/10',
    badgeClass:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  {
    level: 5,
    title: 'Boîte 5 • Cartes Dorées',
    subtitle: 'Vocabulaire maîtrisé durablement',
    intervalBadge: 'J+30 ➔ J+90',
    accentClass: 'border-amber-400/80 bg-amber-50/70 dark:bg-amber-500/15',
    badgeClass:
      'bg-amber-200/80 text-amber-900 dark:bg-amber-500/30 dark:text-amber-200',
  },
];

export const HomeTab: React.FC<HomeTabProps> = ({
  allWords,
  progressMap,
  stats,
  dailyQuota,
  dailyXpGoal,
  onStartDailyRoutine,
  onStartBonusNewWords,
  onStartFreeReview,
  onSelectWord,
}) => {
  const [selectedBoxLevel, setSelectedBoxLevel] =
    useState<LeitnerLevel | null>(null);

  const today = getIsoDateString(0);
  const dueWords = useMemo(
    () => getDueWords(allWords, progressMap, today),
    [allWords, progressMap, today]
  );

  const wipCount = useMemo(() => getWipCount(progressMap), [progressMap]);
  const newWordsTodayAllowance = useMemo(
    () =>
      calculateDailyNewWordsAllowance(
        dueWords.length,
        wipCount,
        dailyQuota
      ),
    [dueWords.length, wipCount, dailyQuota]
  );

  const routineAlreadyDoneToday =
    stats.routineCompletedDate === today &&
    dueWords.length === 0;

  const boxWordsMap = useMemo(() => {
    const map: Record<LeitnerLevel, WordEntry[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };
    for (const w of allWords) {
      const level = progressMap[w.word]?.level ?? 0;
      map[level].push(w);
    }
    return map;
  }, [allWords, progressMap]);

  const seenWordsCount = allWords.length - boxWordsMap[0].length;
  const masteredCount = boxWordsMap[5].length;
  const xpPercent = Math.min(
    100,
    Math.round((stats.dailyXp / Math.max(1, dailyXpGoal)) * 100)
  );

  return (
    <div className="space-y-5 pb-nav-safe">
      {/* Top Header: Streak, XP Gauge, Global Progress */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios border border-slate-200/70 dark:border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              L'Atelier du Mot
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Aujourd'hui
            </h1>
          </div>

          {/* Streak Pill */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-orange-50 dark:bg-orange-500/15 border border-orange-200/70 dark:border-orange-500/30">
            <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
            <div>
              <div className="text-sm font-bold text-orange-900 dark:text-orange-200 leading-none">
                {stats.streak} {stats.streak > 1 ? 'jours' : 'jour'}
              </div>
              <div className="text-[10px] font-medium text-orange-600 dark:text-orange-400">
                Série active
              </div>
            </div>
          </div>
        </div>

        {/* Daily XP Gauge */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600 dark:text-slate-300">
              Objectif XP quotidien
            </span>
            <span className="text-indigo-600 dark:text-indigo-400">
              {stats.dailyXp} / {dailyXpGoal} XP ({xpPercent}%)
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-amber-500"
              initial={{ width: 0 }}
              animate={{ width: `${xpPercent}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Global Mastery Summary Bar */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200/50 dark:border-white/5">
            <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Mots étudiés
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {seenWordsCount}{' '}
              <span className="text-xs font-normal text-slate-400">
                / {allWords.length}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200/50 dark:border-white/5">
            <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Charge N1+N2
            </div>
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
              {wipCount}{' '}
              <span className="text-xs font-normal text-slate-400">
                / {WIP_LIMIT_LEVEL_1_2} max
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20">
            <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Crown className="w-3 h-3" />
              <span>Cartes d'Or</span>
            </div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-300 mt-0.5">
              {masteredCount}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Card: Routine du Jour */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-3xl p-6 text-white shadow-ios-lg space-y-4 relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Spaced Repetition & Active Recall
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold pt-1">
              Routine du Jour (3-4 min)
            </h2>
          </div>
        </div>

        <p className="text-sm text-indigo-100 leading-relaxed">
          {routineAlreadyDoneToday ? (
            <>
              Votre routine quotidienne est bouclée ! Vous pouvez lancer une session bonus ou réviser librement.
            </>
          ) : (
            <>
              Séance calibrée :{' '}
              <strong className="text-white font-semibold">
                {dueWords.length} révision{dueWords.length > 1 ? 's' : ''} due
                {dueWords.length > 1 ? 's' : ''}
              </strong>{' '}
              et{' '}
              <strong className="text-white font-semibold">
                {newWordsTodayAllowance} nouveau
                {newWordsTodayAllowance > 1 ? 'x' : ''} mot
                {newWordsTodayAllowance > 1 ? 's' : ''}
              </strong>{' '}
              (en 3 passes).
            </>
          )}
        </p>

        {/* Anti-Avalanche notice if high review load */}
        {dueWords.length >= 8 && (
          <div className="p-3 rounded-2xl bg-black/20 border border-white/15 flex items-center gap-2.5 text-xs text-indigo-100">
            <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              {dueWords.length >= 15
                ? 'Bouclier Anti-Avalanche actif : 100 % focus sur vos révisions aujourd’hui (0 nouveau mot).'
                : 'Régulation Anti-Avalanche : quota ajusté à 3 nouveaux mots pour consolider vos acquis.'}
            </span>
          </div>
        )}

        {!routineAlreadyDoneToday ? (
          <button
            type="button"
            onClick={onStartDailyRoutine}
            className="w-full py-4 px-6 rounded-2xl bg-white text-indigo-900 hover:bg-indigo-50 active:scale-[0.99] font-bold text-base shadow-lg flex items-center justify-center gap-2.5 transition-all"
          >
            <Play className="w-5 h-5 fill-indigo-900" />
            <span>Lancer la Routine du Jour (3-4 min)</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300 bg-white/10 px-4 py-3 rounded-2xl">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Routine du jour complétée avec succès !</span>
          </div>
        )}

        {/* Secondary Buttons: Bonus +3 new words & Free review (10 questions) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onStartBonusNewWords}
            className="py-3 px-4 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 backdrop-blur-sm transition-all"
          >
            <PlusCircle className="w-4 h-4 text-amber-300" />
            <span>Session Bonus : +3 nouveaux mots</span>
          </button>

          <button
            type="button"
            onClick={onStartFreeReview}
            className="py-3 px-4 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 backdrop-blur-sm transition-all"
          >
            <RefreshCw className="w-4 h-4 text-sky-300" />
            <span>Révision libre (10 questions)</span>
          </button>
        </div>
      </div>

      {/* Interactive 5 Leitner Boxes */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios border border-slate-200/70 dark:border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
              Les 5 Boîtes de Leitner
            </h3>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Touchez une boîte pour inspecter
          </span>
        </div>

        <div className="space-y-2.5">
          {LEITNER_BOXES.map((box) => {
            const wordsInBox = boxWordsMap[box.level];
            const isExpanded = selectedBoxLevel === box.level;

            return (
              <div key={box.level} className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedBoxLevel(isExpanded ? null : box.level)
                  }
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${box.accentClass}`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        {box.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${box.badgeClass}`}
                      >
                        {box.intervalBadge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {box.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {wordsInBox.length}
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E]/70 border border-slate-200/60 dark:border-white/10 max-h-60 overflow-y-auto space-y-1.5">
                        {wordsInBox.length === 0 ? (
                          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">
                            Aucun mot dans cette boîte pour le moment.
                          </p>
                        ) : (
                          wordsInBox.map((w) => {
                            const p = progressMap[w.word];
                            return (
                              <button
                                key={w.word}
                                type="button"
                                onClick={() => onSelectWord(w)}
                                className="w-full p-2.5 rounded-xl bg-white dark:bg-[#1C1C1E] hover:bg-indigo-50/50 dark:hover:bg-white/10 flex items-center justify-between text-left transition-colors"
                              >
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-serif font-bold text-sm text-slate-900 dark:text-white">
                                      {w.word}
                                    </span>
                                    {p?.favorite && (
                                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                    {w.definition_courte}
                                  </div>
                                </div>
                                <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 shrink-0 ml-2">
                                  Étape {(p?.step ?? 0) + 1}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
