import React, { useState } from 'react';
import {
  Download,
  Copy,
  Upload,
  PlusCircle,
  Sun,
  Moon,
  Monitor,
  Check,
  AlertCircle,
  Sliders,
  Database,
} from 'lucide-react';
import {
  AppSaveData,
  DailyQuotaOption,
  ThemeMode,
  UserSettings,
  UserStats,
  WordEntry,
  WordProgress,
} from '../../types/vocab';
import {
  createBackupObject,
  decodeBackupString,
  encodeBackupString,
} from '../../services/storageService';

interface SettingsTabProps {
  settings: UserSettings;
  progressMap: Record<string, WordProgress>;
  stats: UserStats;
  customWords: WordEntry[];
  onUpdateSettings: (next: UserSettings) => void;
  onImportBackup: (data: AppSaveData) => void;
  onAddCustomWord: (newWord: WordEntry) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  progressMap,
  stats,
  customWords,
  onUpdateSettings,
  onImportBackup,
  onAddCustomWord,
}) => {
  const [importText, setImportText] = useState('');
  const [backupFeedback, setBackupFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Add new word form state
  const [word, setWord] = useState('');
  const [nature, setNature] = useState('nom féminin');
  const [defCourte, setDefCourte] = useState('');
  const [definition, setDefinition] = useState('');
  const [example1, setExample1] = useState('');
  const [exampleCloze1, setExampleCloze1] = useState('');
  const [example2, setExample2] = useState('');
  const [exampleCloze2, setExampleCloze2] = useState('');
  const [memoryTip, setMemoryTip] = useState('');
  const [wordFormFeedback, setWordFormFeedback] = useState<string | null>(null);

  const handleExportJson = () => {
    const backup = createBackupObject(
      progressMap,
      settings,
      stats,
      customWords
    );
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atelier-vocab-sauvegarde-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupFeedback({
      type: 'success',
      message: 'Fichier de sauvegarde (.json) téléchargé avec succès.',
    });
  };

  const handleCopyBackupCode = async () => {
    try {
      const backup = createBackupObject(
        progressMap,
        settings,
        stats,
        customWords
      );
      const code = encodeBackupString(backup);
      await navigator.clipboard.writeText(code);
      setBackupFeedback({
        type: 'success',
        message: 'Code de sauvegarde copié dans le presse-papiers !',
      });
    } catch {
      setBackupFeedback({
        type: 'error',
        message: 'Impossible de copier automatiquement sur cet appareil.',
      });
    }
  };

  const handleImportSubmit = () => {
    if (!importText.trim()) return;
    try {
      const decoded = decodeBackupString(importText);
      onImportBackup(decoded);
      setImportText('');
      setBackupFeedback({
        type: 'success',
        message: `Sauvegarde restaurée avec succès (${
          Object.keys(decoded.progress).length
        } mots suivis).`,
      });
    } catch (err) {
      setBackupFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Format de sauvegarde invalide.',
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = String(reader.result || '');
        const decoded = decodeBackupString(content);
        onImportBackup(decoded);
        setBackupFeedback({
          type: 'success',
          message: `Fichier JSON importé avec succès (${
            Object.keys(decoded.progress).length
          } mots suivis).`,
        });
      } catch (err) {
        setBackupFeedback({
          type: 'error',
          message:
            err instanceof Error ? err.message : 'Fichier JSON invalide.',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleAddWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !defCourte.trim() || !definition.trim()) return;

    const ex1 =
      example1.trim() || `Ce texte illustre l'emploi de ${word.trim().toLowerCase()}.`;
    const cl1 =
      exampleCloze1.trim() || `Ce texte illustre l'emploi de […].`;
    const ex2 = example2.trim() || ex1;
    const cl2 = exampleCloze2.trim() || cl1;

    const newEntry: WordEntry = {
      word: word.trim(),
      nature: nature.trim(),
      definition_courte: defCourte.trim(),
      definition: definition.trim(),
      example_1: ex1,
      example_cloze_1: cl1,
      example_2: ex2,
      example_cloze_2: cl2,
      memory_tip: memoryTip.trim() || undefined,
      isCustom: true,
    };

    onAddCustomWord(newEntry);
    setWord('');
    setDefCourte('');
    setDefinition('');
    setExample1('');
    setExampleCloze1('');
    setExample2('');
    setExampleCloze2('');
    setMemoryTip('');
    setWordFormFeedback(`Le mot « ${newEntry.word} » a été ajouté au Grimoire !`);
    setTimeout(() => setWordFormFeedback(null), 3500);
  };

  return (
    <div className="space-y-5 pb-nav-safe">
      {/* Rythme & Apparence */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios border border-slate-200/70 dark:border-white/10 space-y-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Préférences
          </span>
          <h1 className="font-sans text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Réglages & Sauvegarde
          </h1>
        </div>

        {/* Daily Quota Selector (3, 5, or 7) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <Sliders className="w-4 h-4 text-indigo-500" />
            <span>Rythme quotidien (nouveaux mots / jour)</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {([3, 5, 7] as DailyQuotaOption[]).map((q) => {
              const active = settings.dailyNewWordsQuota === q;
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ ...settings, dailyNewWordsQuota: q })
                  }
                  className={`py-3 px-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                    active
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-400 dark:text-indigo-200'
                      : 'border-slate-200/70 dark:border-white/10 bg-slate-50 dark:bg-[#2C2C2E] text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {q} mots / jour
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme Selector (Clair / Sombre / Auto) */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Thème d'affichage
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {(
              [
                { id: 'light', label: 'Clair', icon: Sun },
                { id: 'dark', label: 'Sombre', icon: Moon },
                { id: 'auto', label: 'Auto (iOS)', icon: Monitor },
              ] as { id: ThemeMode; label: string; icon: typeof Sun }[]
            ).map((item) => {
              const Icon = item.icon;
              const active = settings.theme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ ...settings, theme: item.id })
                  }
                  className={`py-3 px-3 rounded-2xl border-2 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
                    active
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-400 dark:text-indigo-200'
                      : 'border-slate-200/70 dark:border-white/10 bg-slate-50 dark:bg-[#2C2C2E] text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Local Backup Module (100% Static, iOS Safari friendly) */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios border border-slate-200/70 dark:border-white/10 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
            Sauvegarde Locale (Safari iOS & JSON)
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Exportez votre progression en fichier <code>.json</code> ou copiez votre code de sauvegarde pour la transférer vers un autre appareil.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleExportJson}
            className="py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Exporter ma sauvegarde (.json)</span>
          </button>

          <button
            type="button"
            onClick={handleCopyBackupCode}
            className="py-3.5 px-4 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-slate-100 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Copy className="w-4 h-4" />
            <span>Copier le code de sauvegarde</span>
          </button>
        </div>

        {/* Paste / Import Backup */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-2.5">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Coller / Importer une sauvegarde (Code ou JSON)
          </label>
          <textarea
            rows={3}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Collez ici votre code de sauvegarde ou le contenu d'un fichier .json…"
            className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
          />
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={!importText.trim()}
              onClick={handleImportSubmit}
              className="flex-1 py-3 px-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 disabled:opacity-40 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Restaurer le code collé</span>
            </button>

            <label className="py-3 px-4 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm cursor-pointer hover:bg-slate-200 dark:hover:bg-white/15 transition-all">
              <span>Choisir un fichier .json</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {backupFeedback && (
          <div
            className={`p-3.5 rounded-2xl flex items-center gap-2 text-xs font-semibold ${
              backupFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200'
            }`}
          >
            {backupFeedback.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{backupFeedback.message}</span>
          </div>
        )}
      </div>

      {/* Add Custom Word Form */}
      <form
        onSubmit={handleAddWordSubmit}
        className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios border border-slate-200/70 dark:border-white/10 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
              Ajouter un nouveau mot
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {customWords.length} ajouté{customWords.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Mot ou locution *
            </label>
            <input
              type="text"
              required
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="Ex : Équanimité"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Nature grammaticale *
            </label>
            <select
              value={nature}
              onChange={(e) => setNature(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            >
              <option value="nom féminin">nom féminin</option>
              <option value="nom masculin">nom masculin</option>
              <option value="adjectif">adjectif</option>
              <option value="verbe">verbe</option>
              <option value="verbe pronominal">verbe pronominal</option>
              <option value="adverbe">adverbe</option>
              <option value="locution nominale">locution nominale</option>
              <option value="locution adverbiale">locution adverbiale</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            Définition courte (pour les QCM) *
          </label>
          <input
            type="text"
            required
            value={defCourte}
            onChange={(e) => setDefCourte(e.target.value)}
            placeholder="Ex : Égalité d'âme, sérénité constante."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            Définition complète & nuance *
          </label>
          <textarea
            rows={2}
            required
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            placeholder="Explication détaillée du sens et du registre…"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Phrase d'exemple 1 (complète)
            </label>
            <input
              type="text"
              value={example1}
              onChange={(e) => setExample1(e.target.value)}
              placeholder="Il accueille la nouvelle avec équanimité."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Phrase à trou 1 (avec […])
            </label>
            <input
              type="text"
              value={exampleCloze1}
              onChange={(e) => setExampleCloze1(e.target.value)}
              placeholder="Il accueille la nouvelle avec […]."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Phrase d'exemple 2 (optionnelle)
            </label>
            <input
              type="text"
              value={example2}
              onChange={(e) => setExample2(e.target.value)}
              placeholder="Deuxième phrase complète…"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Phrase à trou 2 (avec […])
            </label>
            <input
              type="text"
              value={exampleCloze2}
              onChange={(e) => setExampleCloze2(e.target.value)}
              placeholder="Deuxième phrase avec […]…"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            Astuce mémo (optionnelle)
          </label>
          <input
            type="text"
            value={memoryTip}
            onChange={(e) => setMemoryTip(e.target.value)}
            placeholder="Du latin aequus (égal) + animus (âme)…"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
          />
        </div>

        {wordFormFeedback && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{wordFormFeedback}</span>
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Enrichir mon Grimoire</span>
        </button>
      </form>
    </div>
  );
};
