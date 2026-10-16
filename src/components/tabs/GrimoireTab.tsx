import React, { useMemo, useState } from 'react';
import {
  Search,
  Star,
  Crown,
  Filter,
  X,
  ChevronRight,
  HeartPulse,
} from 'lucide-react';
import {
  LeitnerLevel,
  WordEntry,
  WordProgress,
} from '../../types/vocab';
import { stripAccents } from '../../utils/clozeParser';
import { isWordLeech } from '../../services/srsEngine';

interface GrimoireTabProps {
  allWords: WordEntry[];
  progressMap: Record<string, WordProgress>;
  onSelectWord: (word: WordEntry) => void;
  onToggleFavorite: (wordKey: string) => void;
}

export const GrimoireTab: React.FC<GrimoireTabProps> = ({
  allWords,
  progressMap,
  onSelectWord,
  onToggleFavorite,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | LeitnerLevel>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyLeeches, setOnlyLeeches] = useState(false);
  const [natureFilter, setNatureFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(60);

  const availableNatures = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of allWords) {
      const n = w.nature.trim();
      counts[n] = (counts[n] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([nature]) => nature);
  }, [allWords]);

  const leechesCount = useMemo(
    () => allWords.filter((w) => isWordLeech(progressMap[w.word])).length,
    [allWords, progressMap]
  );

  const filteredWords = useMemo(() => {
    const q = stripAccents(searchQuery);
    return allWords.filter((w) => {
      const p = progressMap[w.word];
      const level = p?.level ?? 0;

      if (levelFilter !== 'all' && level !== levelFilter) return false;
      if (onlyFavorites && !p?.favorite) return false;
      if (onlyLeeches && !isWordLeech(p)) return false;
      if (natureFilter !== 'all' && w.nature.trim() !== natureFilter)
        return false;

      if (q) {
        const matchWord = stripAccents(w.word).includes(q);
        const matchShort = stripAccents(w.definition_courte).includes(q);
        const matchFull = stripAccents(w.definition).includes(q);
        return matchWord || matchShort || matchFull;
      }

      return true;
    });
  }, [
    allWords,
    progressMap,
    searchQuery,
    levelFilter,
    onlyFavorites,
    onlyLeeches,
    natureFilter,
  ]);

  const displayedWords = filteredWords.slice(0, visibleCount);

  return (
    <div className="space-y-4 pb-nav-safe">
      {/* Header & Search */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios border border-slate-200/70 dark:border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Collection & Dictionnaire
            </span>
            <h1 className="font-sans text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Grimoire
            </h1>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              {filteredWords.length} / {allWords.length} mots
            </span>
          </div>
        </div>

        {/* Instant Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(60);
            }}
            placeholder="Rechercher un mot, une nuance, une définition…"
            className="w-full pl-10 pr-9 py-3 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Level Filter Pills + Favorites + Mots Rebelles */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setOnlyFavorites(!onlyFavorites);
              setVisibleCount(60);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 border transition-all ${
              onlyFavorites
                ? 'bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200'
                : 'bg-slate-50 dark:bg-[#2C2C2E] border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                onlyFavorites ? 'fill-amber-500 text-amber-500' : ''
              }`}
            />
            <span>Favoris</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOnlyLeeches(!onlyLeeches);
              setVisibleCount(60);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 border transition-all ${
              onlyLeeches
                ? 'bg-rose-100 border-rose-400 text-rose-900 dark:bg-rose-500/25 dark:text-rose-200'
                : 'bg-slate-50 dark:bg-[#2C2C2E] border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300'
            }`}
          >
            <HeartPulse
              className={`w-3.5 h-3.5 ${
                onlyLeeches ? 'text-rose-600 dark:text-rose-400' : ''
              }`}
            />
            <span>Mots Rebelles ({leechesCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLevelFilter('all');
              setVisibleCount(60);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 border transition-all ${
              levelFilter === 'all'
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-slate-50 dark:bg-[#2C2C2E] border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300'
            }`}
          >
            Tous
          </button>

          {([0, 1, 2, 3, 4, 5] as LeitnerLevel[]).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                setLevelFilter(lvl);
                setVisibleCount(60);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 border flex items-center gap-1 transition-all ${
                levelFilter === lvl
                  ? lvl === 5
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-slate-50 dark:bg-[#2C2C2E] border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300'
              }`}
            >
              {lvl === 5 && <Crown className="w-3 h-3" />}
              <span>Niv. {lvl}</span>
            </button>
          ))}
        </div>

        {/* Grammatical Nature Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={natureFilter}
            onChange={(e) => {
              setNatureFilter(e.target.value);
              setVisibleCount(60);
            }}
            className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200/70 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="all">Toutes les natures grammaticales</option>
            {availableNatures.map((nat) => (
              <option key={nat} value={nat}>
                {nat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Words List */}
      <div className="space-y-2.5">
        {displayedWords.length === 0 ? (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 text-center text-sm text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-white/10">
            Aucun mot ne correspond à vos filtres actuels.
          </div>
        ) : (
          displayedWords.map((w) => {
            const p = progressMap[w.word];
            const level = p?.level ?? 0;
            const isGold = level === 5;
            const isLeech = isWordLeech(p);

            return (
              <div
                key={w.word}
                onClick={() => onSelectWord(w)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelectWord(w);
                }}
                className={`w-full rounded-3xl p-4 sm:p-5 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isGold
                    ? 'bg-gradient-to-r from-amber-50/90 via-white to-amber-50/80 dark:from-amber-950/30 dark:via-[#1C1C1E] dark:to-amber-900/20 border-2 border-amber-400 shadow-gold'
                    : isLeech
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-800/60 shadow-ios'
                    : 'bg-white dark:bg-[#1C1C1E] border border-slate-200/70 dark:border-white/10 shadow-ios hover:border-indigo-300 dark:hover:border-indigo-500/40'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className={`font-serif text-lg sm:text-xl font-bold truncate ${
                        isGold
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {w.word}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400">
                      {w.nature}
                    </span>
                    {isLeech && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-500/25 text-rose-700 dark:text-rose-300">
                        <HeartPulse className="w-3 h-3" />
                        Mot Rebelle
                      </span>
                    )}
                    {isGold ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/25 text-amber-800 dark:text-amber-300 border border-amber-400/50">
                        <Crown className="w-3 h-3 text-amber-500" />
                        Carte Dorée
                      </span>
                    ) : (
                      level > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                          Niv. {level}
                        </span>
                      )
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-1">
                    {w.definition_courte}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(w.word);
                    }}
                    aria-label="Favori"
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        p?.favorite
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            );
          })
        )}

        {visibleCount < filteredWords.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((v) => v + 80)}
            className="w-full py-3.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-indigo-600 dark:text-indigo-400 shadow-sm"
          >
            Afficher plus de mots ({filteredWords.length - visibleCount}{' '}
            restants)
          </button>
        )}
      </div>
    </div>
  );
};
