# Routine courte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Exécution continue autorisée par l'utilisateur, avec un test en échec avant chaque changement de comportement.

**Goal:** Stabiliser la charge de la routine tout en couvrant les mots dus, puis publier.

**Architecture:** Les utilitaires purs de budget/rotation vivent dans `routineBudget.ts`. Le moteur existant construit une file bornée et conserve ses règles Leitner. SessionRunner applique les limites et note les jeux composites ; App/Home montrent le même plan et traitent fin/bonus.

**Tech Stack:** React/TypeScript/Vite/Vitest existants, stockage local existant.

**Spec:** `docs/superpowers/specs/2026-11-26-routine-courte-design.md`.

## Global Constraints

- 12 unités planifiées + 2 de reprise = 14 maximum ; reprise une par mot, deux au total.
- Nouveautés 2/1/0 selon charge pondérée <=6 / 7–9 / >=10 ; réglage 1 ou 2, migration historique sûre.
- Conserver les types d'exercices et le SRS ; jamais noter un mot non travaillé ou futur.
- Rotation avec places garanties aux anciens mots dus ; jeux composites intégrés au budget et notés individuellement.
- Fin après cinq minutes proposée, pas imposée au milieu d'une question. Modes libres inchangés.

## Review Focus

- Un mot en échec permanent ne doit pas empêcher un autre mot dû d'être sélectionné : simulation multi-jours avec 780 mots et arrivées.
- Un jeu composite ne doit pas donner une fausse autonomie ni déplacer l'échéance de son support : tests des notes individuelles.
- Une fermeture/relance ne doit pas contourner le quota de nouveautés ou compléter des réponses fictives : métadonnées d'introduction et tests App.
- Un objectif quotidien peut être accompli alors que la file globale reste due : tests Home/bonus et zéro XP pour vide.
- Les corrections, clics groupés, timer masqué et dernière reprise ne doivent pas rallonger/dupliquer la file : tests SessionRunner.

## Lot 1 — Planification et rotation

Files : créer `src/services/routineBudget.ts`, modifier `srsEngine.ts`, `types/vocab.ts`, `storageService.ts`, `SettingsTab.tsx` ; tests `routineBudget.test.ts`, `shortRoutinePlan.test.ts`, `settings.test.ts`.

Interfaces : `exerciseCost(item)`, `sortDueWords(words,progress)`, `buildDailyRoutineQueue(words,progress,quota,today?,options?)` retourne queue, comptes sélectionnés/différés, unités et réserve. `SessionQueueItem.reviewTargets` relie les jeux aux révisions remplacées ; champs additionnels seulement.

- [ ] RED : 100 mots dus ne dépassent pas 12 unités ; futur exclu ; quotas 2/1/0 ; cycles complets et réglages anciens ; GREEN sélection bornée.
- [ ] RED : 780 mots avec échecs permanents sont tous sélectionnés au fil des jours ; GREEN voies de rotation et dates réelles conservées.
- [ ] Vérifier jeux remplaçant des révisions adaptées, coût 4/2 et support connu ; suite complète ; commit.

## Lot 2 — Exécution bornée

Files : `SessionRunner.tsx`, `CorrectionSheet.tsx`, tests SessionRunner.

Interfaces : prop facultative `shortRoutine` contenant budget/réserve ; résultat de fin = XP et nombre de mots réellement évalués ; callback facultatif de révisions supplémentaires. Les autres sessions restent compatibles.

- [ ] RED : deux reprises maximum, aucune répétition de reprise, compteur de budget fixe ; GREEN réserve commune.
- [ ] RED : paires notées mot par mot, support de duel non noté et absence de fausse promotion ; GREEN notation via descripteurs remplacés.
- [ ] RED : pause après 300000 ms actifs, pas de question inventée, bilan et récompense uniques ; GREEN fin volontaire et visibilité.
- [ ] Suite complète et compilation ; commit.

## Lot 3 — Intégration, simulations et publication

Files : `App.tsx`, `HomeTab.tsx`, package version, tests App et simulations, documentation livraison.

- [ ] RED : l'accueil annonce la file bornée, ne remplit pas avec des mots futurs ; journée accomplie malgré mots différés ; bonus sans nouveautés, nouvelle instance et XP uniques ; GREEN intégration.
- [ ] Simuler semaines d'usage/retard, vérifier dates et couverture sans effacement ; lancer tests et build.
- [ ] Contrôler navigateur à 393px et 320px, faire une revue indépendante puis corriger chaque défaut important RED/GREEN.
- [ ] Fusionner et pousser selon l'autorisation explicite ; vérifier workflow Pages, fichiers publics et numéro de version ; livrer avec limites honnêtes.
