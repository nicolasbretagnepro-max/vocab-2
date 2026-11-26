import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { WordEntry } from '../../types/vocab';

interface PairMatchingGameProps {
  words: WordEntry[];
  onComplete: (mistakesCount: number) => void;
  onMistakeWord?: (word: WordEntry) => void;
  titleLabel?: string;
  resolveOnAttempt?: boolean;
  onResolveWord?: (word: WordEntry, correct: boolean) => void;
}

export const PairMatchingGame: React.FC<PairMatchingGameProps> = ({
  words,
  onComplete,
  onMistakeWord,
  resolveOnAttempt = false,
  onResolveWord,
  titleLabel = 'Consolidation • Reliez les 4 paires',
}) => {
  const pairItems = useMemo(() => words.slice(0, 4), [words]);

  const leftWords = useMemo(() => {
    const arr = [...pairItems];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [pairItems]);

  const rightDefs = useMemo(() => {
    const arr = [...pairItems];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [pairItems]);

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedWords, setMatchedWords] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<{ left: string; right: string } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const resolved = useRef(new Set<string>());
  const [incorrectWords,setIncorrectWords] = useState(new Set<string>());
  const [lastCorrection,setLastCorrection] = useState('');

  const checkMatch = (leftWord: string, rightWord: string) => {
    if(resolveOnAttempt){
      if(resolved.current.has(leftWord))return;
      const entry=pairItems.find(w=>w.word===leftWord);if(!entry)return;
      const correct=leftWord===rightWord;resolved.current.add(leftWord);
      onResolveWord?.(entry,correct);
      setMatchedWords(new Set(resolved.current));setSelectedLeft(null);setSelectedRight(null);
      if(!correct){setMistakes(m=>m+1);setIncorrectWords(prev=>new Set([...prev,leftWord]));setLastCorrection(`« ${entry.word} » signifie : ${entry.definition_courte}`);}
      if(resolved.current.size===pairItems.length)setTimeout(()=>onComplete(mistakes+(correct?0:1)),550);
      return;
    }
    if (leftWord === rightWord) {
      const next = new Set(matchedWords);
      next.add(leftWord);
      setMatchedWords(next);
      setSelectedLeft(null);
      setSelectedRight(null);

      if (next.size === pairItems.length) {
        setTimeout(() => {
          onComplete(mistakes);
        }, 550);
      }
    } else {
      setMistakes((m) => m + 1);
      const missedEntry = pairItems.find((w) => w.word === leftWord);
      if (missedEntry && onMistakeWord) {
        onMistakeWord(missedEntry);
      }
      setWrongPair({ left: leftWord, right: rightWord });
      setTimeout(() => {
        setWrongPair(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 650);
    }
  };

  const handleSelectLeft = (wordKey: string) => {
    if (matchedWords.has(wordKey) || wrongPair) return;
    if (selectedLeft === wordKey) {
      setSelectedLeft(null);
      return;
    }
    setSelectedLeft(wordKey);
    if (selectedRight) {
      checkMatch(wordKey, selectedRight);
    }
  };

  const handleSelectRight = (wordKey: string) => {
    if (matchedWords.has(wordKey) || wrongPair) return;
    if (selectedRight === wordKey) {
      setSelectedRight(null);
      return;
    }
    setSelectedRight(wordKey);
    if (selectedLeft) {
      checkMatch(selectedLeft, wordKey);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-4"
    >
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios border border-slate-200/70 dark:border-white/10">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
            <Sparkles className="w-3.5 h-3.5" />
            {titleLabel}
          </span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {matchedWords.size} / {pairItems.length} reliés
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Touchez un mot à gauche puis sa définition courte à droite.
        </p>
        {resolveOnAttempt&&<p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Une tentative par mot, puis la correction. Les difficultés reviendront dans une prochaine révision.</p>}
        {lastCorrection&&<p role="status" className="mt-3 text-sm font-semibold text-rose-700 dark:text-rose-300">{lastCorrection}</p>}
      </div>

      {/* 2-Column Interactive Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* Left Column: 4 Words */}
        <div className="space-y-2.5">
          {leftWords.map((item) => {
            const isMatched = matchedWords.has(item.word);
            const isSelected = selectedLeft === item.word;
            const isWrong = wrongPair?.left === item.word;

            let cls =
              'bg-white dark:bg-[#1C1C1E] border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white';
            if (isMatched) {
              cls =
                'bg-emerald-50/80 dark:bg-emerald-500/15 border-emerald-400/60 text-emerald-700 dark:text-emerald-300 opacity-65';
            } else if (isWrong) {
              cls =
                'bg-rose-50 dark:bg-rose-500/20 border-rose-500 text-rose-800 dark:text-rose-200';
            } else if (isSelected) {
              cls =
                'bg-indigo-50 dark:bg-indigo-500/25 border-indigo-600 dark:border-indigo-400 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/25';
            }

            if(resolveOnAttempt && incorrectWords.has(item.word)) cls="bg-rose-50 dark:bg-rose-500/20 border-rose-400 text-rose-800 dark:text-rose-200";
            return (
              <motion.button
                key={`left-${item.word}`}
                type="button"
                disabled={isMatched}
                animate={isWrong ? { x: [-5, 5, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => handleSelectLeft(item.word)}
                className={`w-full min-h-[5.5rem] p-3.5 rounded-2xl border-2 shadow-sm flex flex-col justify-center items-start text-left transition-all ${cls}`}
              >
                <div className="flex items-center justify-between w-full gap-1">
                  <span className="font-sans font-bold text-base sm:text-lg leading-snug break-words">
                    {item.word}
                  </span>
                  {isMatched && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {item.nature}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Right Column: 4 Short Definitions */}
        <div className="space-y-2.5">
          {rightDefs.map((item) => {
            const isMatched = matchedWords.has(item.word);
            const isSelected = selectedRight === item.word;
            const isWrong = wrongPair?.right === item.word;

            let cls =
              'bg-white dark:bg-[#1C1C1E] border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-100';
            if (isMatched) {
              cls =
                'bg-emerald-50/80 dark:bg-emerald-500/15 border-emerald-400/60 text-emerald-700 dark:text-emerald-300 opacity-65';
            } else if (isWrong) {
              cls =
                'bg-rose-50 dark:bg-rose-500/20 border-rose-500 text-rose-800 dark:text-rose-200';
            } else if (isSelected) {
              cls =
                'bg-indigo-50 dark:bg-indigo-500/25 border-indigo-600 dark:border-indigo-400 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/25';
            }

            if(resolveOnAttempt && incorrectWords.has(item.word)) cls="bg-rose-50 dark:bg-rose-500/20 border-rose-400 text-rose-800 dark:text-rose-200";
            return (
              <motion.button
                key={`right-${item.word}`}
                type="button"
                disabled={isMatched}
                animate={isWrong ? { x: [-5, 5, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => handleSelectRight(item.word)}
                className={`w-full min-h-[5.5rem] p-3.5 rounded-2xl border-2 shadow-sm flex items-center justify-between text-left transition-all ${cls}`}
              >
                <span className="text-sm font-medium leading-snug">
                  {item.definition_courte}
                </span>
                {isMatched && <Check className="w-4 h-4 text-emerald-500 shrink-0 ml-1" />}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
