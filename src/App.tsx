import React, { useEffect, useMemo, useState, useRef } from 'react';
import rawDictionary from './data/words.json';
import {
  AppSaveData,
  ArcadeHighScores,
  SessionQueueItem,
  ShortRoutinePlan,
  UserSettings,
  UserStats,
  WordEntry,
  WordProgress,
} from './types/vocab';
import {
  buildBonusNewWordsQueue,
  buildDailyRoutineQueue,
  buildFlashcardRecallQueue,
  buildFreeReviewQueue,
  buildLeechTrainingQueue,
  createInitialProgress,
  getIsoDateString,
} from './services/srsEngine';
import {
  loadCustomWords,
  loadProgressMap,
  loadSettings,
  loadStats,
  recordActivityAndXp,
  saveCustomWords,
  saveProgressMap,
  saveSettings,
  saveStats,
} from './services/storageService';
import { AppTab, BottomNav } from './components/layout/BottomNav';
import { HomeTab } from './components/tabs/HomeTab';
import { ArcadeTab } from './components/tabs/ArcadeTab';
import { GrimoireTab } from './components/tabs/GrimoireTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { SessionRunner } from './components/session/SessionRunner';
import { WordDetailModal } from './components/modals/WordDetailModal';

const baseWords = rawDictionary as WordEntry[];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [progressMap, setProgressMap] = useState<Record<string, WordProgress>>(
    () => loadProgressMap()
  );
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [stats, setStats] = useState<UserStats>(() => loadStats());
  const [customWords, setCustomWords] = useState<WordEntry[]>(() =>
    loadCustomWords()
  );

  // Active Learning Session State
  const [activeSession, setActiveSession] = useState<{
    id: number;
    title: string;
    queue: SessionQueueItem[];
    isDailyRoutine: boolean;
    shortRoutine?: ShortRoutinePlan;
  } | null>(null);
  const sessionSerial=useRef(0);
  const observedDay=useRef(getIsoDateString());
  const launchSession=(session:Omit<NonNullable<typeof activeSession>,'id'>)=>{
    const next={...session,id:++sessionSerial.current};setActiveSession(next);
  };
  useEffect(()=>{
    const refresh=()=>{if(document.hidden)return;const day=getIsoDateString();if(day!==observedDay.current){observedDay.current=day;setStats(loadStats());}};
    const timer=setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
  },[]);

  // Word Detail Modal State
  const [selectedModalWord, setSelectedModalWord] = useState<WordEntry | null>(
    null
  );

  // Merge custom words with the 780 base dictionary words
  const allWords = useMemo(() => {
    const existingKeys = new Set(baseWords.map((w) => w.word.toLowerCase()));
    const uniqueCustom = customWords.filter(
      (cw) => !existingKeys.has(cw.word.toLowerCase())
    );
    return [...uniqueCustom, ...baseWords];
  }, [customWords]);

  // Apply light/dark/auto theme to <html> root element
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark =
        settings.theme === 'dark' ||
        (settings.theme === 'auto' && mediaQuery.matches);
      root.classList.toggle('dark', isDark);
      root.classList.toggle('light', !isDark);
    };

    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [settings.theme]);

  const handleUpdateWordProgress = (wordKey: string, updated: WordProgress) => {
    setProgressMap((prev) => {
      const next = { ...prev, [wordKey]: updated };
      saveProgressMap(next);
      return next;
    });
  };

  const handleToggleFavorite = (wordKey: string) => {
    setProgressMap((prev) => {
      const current = prev[wordKey] || createInitialProgress(wordKey);
      const next = {
        ...prev,
        [wordKey]: {
          ...current,
          favorite: !current.favorite,
        },
      };
      saveProgressMap(next);
      return next;
    });
  };

  const handleSaveCustomMemoryTip = (wordKey: string, tip: string) => {
    setProgressMap((prev) => {
      const current = prev[wordKey] || createInitialProgress(wordKey);
      const next = {
        ...prev,
        [wordKey]: {
          ...current,
          customMemoryTip: tip || undefined,
        },
      };
      saveProgressMap(next);
      return next;
    });
  };

  const handleStartDailyRoutine = () => {
    const plan = buildDailyRoutineQueue(
      allWords,
      progressMap,
      settings.dailyNewWordsQuota
    );
    launchSession({
      title: 'Routine courte',
      queue:plan.queue,
      isDailyRoutine: true,
      shortRoutine:plan,
    });
  };

  const handleStartRoutineExtra=()=>{
    const plan=buildDailyRoutineQueue(allWords,progressMap,settings.dailyNewWordsQuota,undefined,{allowNew:false});
    if(!plan.queue.length)return;
    launchSession({title:'Révisions facultatives',queue:plan.queue,isDailyRoutine:false,shortRoutine:plan});
  };

  const handleStartBonusNewWords = () => {
    const queue = buildBonusNewWordsQueue(allWords, progressMap, 3);
    if (queue.length === 0) return;
    launchSession({
      title: 'Session Bonus (+3 mots)',
      queue,
      isDailyRoutine: false,
    });
  };

  const handleStartFreeReview = () => {
    const queue = buildFreeReviewQueue(allWords, progressMap, 10);
    launchSession({
      title: 'Révision libre (10 questions)',
      queue,
      isDailyRoutine: false,
    });
  };

  const handleStartFlashcardRecall = () => {
    const queue = buildFlashcardRecallQueue(allWords, progressMap, 10);
    if (queue.length === 0) return;
    launchSession({
      title: 'Rappel Éclair (10 cartes)',
      queue,
      isDailyRoutine: false,
    });
  };

  const handleStartLeechTraining = () => {
    const queue = buildLeechTrainingQueue(allWords, progressMap);
    if (queue.length === 0) return;
    launchSession({
      title: 'Entraînement • Mots Rebelles',
      queue,
      isDailyRoutine: false,
    });
  };

  const handleFinishSession = (xpEarned: number, reviewsCount = 0, completed = true) => {
    const isRoutine = activeSession?.isDailyRoutine ?? false;
    if(!activeSession?.shortRoutine||reviewsCount>0)setStats((prev) =>
      recordActivityAndXp(prev, xpEarned, isRoutine&&completed&&reviewsCount>0, Math.max(1, reviewsCount)));
    setActiveSession(null);
  };

  const handleUpdateHighScore = (
    game: keyof ArcadeHighScores,
    score: number
  ) => {
    setStats((prev) => {
      const currentBest = prev.highScores[game] || 0;
      if (score <= currentBest) return prev;
      const updated: UserStats = {
        ...prev,
        highScores: {
          ...prev.highScores,
          [game]: score,
        },
      };
      saveStats(updated);
      return updated;
    });
  };

  const handleAwardXp = (xp: number) => {
    setStats((prev) => recordActivityAndXp(prev, xp, false, 1));
  };

  const handleUpdateSettings = (next: UserSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const handleImportBackup = (data: AppSaveData) => {
    setProgressMap(data.progress);
    saveProgressMap(data.progress);
    setSettings(data.settings);
    saveSettings(data.settings);
    setStats(data.stats);
    saveStats(data.stats);
    setCustomWords(data.customWords);
    saveCustomWords(data.customWords);
  };

  const handleAddCustomWord = (newWord: WordEntry) => {
    setCustomWords((prev) => {
      const next = [newWord, ...prev];
      saveCustomWords(next);
      return next;
    });
  };

  return (
    <div className="min-h-[100dvh] bg-[#F2F2F7] dark:bg-[#000000] text-slate-900 dark:text-slate-100">
      {activeSession ? (
        <SessionRunner
          key={activeSession.id}
          title={activeSession.title}
          initialQueue={activeSession.queue}
          allWords={allWords}
          progressMap={progressMap}
          onUpdateWordProgress={handleUpdateWordProgress}
          onToggleFavorite={handleToggleFavorite}
          onFinishSession={handleFinishSession}
          onCancel={() => setActiveSession(null)}
          shortRoutine={activeSession.shortRoutine}
          onContinueSession={activeSession.shortRoutine&&buildDailyRoutineQueue(allWords,progressMap,settings.dailyNewWordsQuota,undefined,{allowNew:false}).queue.length?((xp,count)=>{handleFinishSession(xp,count,true);handleStartRoutineExtra();}):undefined}
        />
      ) : (
        <>
          <main className="max-w-lg mx-auto px-4 pt-safe">
            {activeTab === 'today' && (
              <HomeTab
                allWords={allWords}
                progressMap={progressMap}
                stats={stats}
                dailyQuota={settings.dailyNewWordsQuota}
                dailyXpGoal={settings.dailyXpGoal}
                onStartDailyRoutine={handleStartDailyRoutine}
                onStartRoutineExtra={handleStartRoutineExtra}
                onStartBonusNewWords={handleStartBonusNewWords}
                onStartFreeReview={handleStartFreeReview}
                onStartFlashcardRecall={handleStartFlashcardRecall}
                onStartLeechTraining={handleStartLeechTraining}
                onSelectWord={(w) => setSelectedModalWord(w)}
              />
            )}

            {activeTab === 'arcade' && (
              <ArcadeTab
                allWords={allWords}
                progressMap={progressMap}
                highScores={stats.highScores}
                onUpdateHighScore={handleUpdateHighScore}
                onAwardXp={handleAwardXp}
                onSelectWord={(w) => setSelectedModalWord(w)}
                onToggleFavorite={handleToggleFavorite}
                onStartFlashcardRecall={handleStartFlashcardRecall}
              />
            )}

            {activeTab === 'grimoire' && (
              <GrimoireTab
                allWords={allWords}
                progressMap={progressMap}
                onSelectWord={(w) => setSelectedModalWord(w)}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
                settings={settings}
                progressMap={progressMap}
                stats={stats}
                customWords={customWords}
                onUpdateSettings={handleUpdateSettings}
                onImportBackup={handleImportBackup}
                onAddCustomWord={handleAddCustomWord}
              />
            )}
          </main>

          <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
        </>
      )}

      <WordDetailModal
        word={selectedModalWord}
        progress={
          selectedModalWord ? progressMap[selectedModalWord.word] : undefined
        }
        onClose={() => setSelectedModalWord(null)}
        onToggleFavorite={handleToggleFavorite}
        onSaveCustomMemoryTip={handleSaveCustomMemoryTip}
      />
    </div>
  );
};

export default App;
