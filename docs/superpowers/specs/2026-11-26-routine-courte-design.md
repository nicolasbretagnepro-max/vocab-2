# Routine courte — fonctionnement validé et précisions

L'utilisateur valide le budget court, y compris des jours sans nouveautés, demande le développement par lots et la publication GitHub. Il demande de conserver les exercices et la progression, et de garantir une rotation de tout le vocabulaire arrivé à échéance. Le dépôt concerné est `vocab-2`, pas `atelier-vocab`.

## Approche et périmètre

Le budget de travail annoncé, visant environ cinq minutes, a été retenu plutôt qu'un chronomètre éliminatoire. La durée de lecture reste individuelle. Les formats existants (découverte, QCM, contexte, syllabes, saisie, paires, duel) et les règles Leitner restent disponibles. Les modes libres et bonus restent facultatifs. Aucune nouvelle dépendance de production.

Maximum 14 unités de travail : 12 planifiées et 2 réservées aux reprises. Une fiche, un QCM ou une flashcard coûte 1 ; syllabes, saisie et duel coûtent 2 ; quatre paires coûtent 4. Une correction est l'explication de la réponse, pas une nouvelle évaluation. Le compteur affiche un maximum fixe, sans promesse de cinq minutes exactes.

## Sélection et couverture

- Une nouveauté prend trois passages ; un mot de niveau 1 reprend seulement les passages encore non validés, selon son étape sauvegardée. Aucun demi-cycle introduit pour remplir la séance.
- Charge due pondérée jusqu'à 6 : au plus 2 nouveautés ; de 7 à 9 : au plus 1 ; à partir de 10 : aucune. Respecter les 18 places N1/N2 existantes et les nouveautés déjà introduites aujourd'hui. Réglage de routine 1 ou 2, migration des anciens quotas 3/5/7 vers 2 ; les bonus explicites restent séparés.
- Ne jamais sélectionner un mot futur pour compléter le budget. Ni statut ni échéance modifiés pour un mot non travaillé.
- Au plus un tiers du budget de révision donne priorité aux mots difficiles, avec rotation entre eux. Le reste revient aux mots dus les moins récemment travaillés, puis aux échéances les plus anciennes, puis à l'identité du mot. Des voies de rotation distinctes évitent qu'un groupe difficile occupe toutes les places.
- La couverture signifie que tout mot qui reste dû finit par être sélectionné si l'utilisateur continue ses routines. Elle ne promet pas de revoir 780 mots chaque semaine, ni de respecter toutes les dates théoriques en cas de retard massif. L'attente reste visible dans un bilan discret et les nouveautés sont arrêtées quand la charge est forte.
- Un jour manqué ne multiplie pas le budget du lendemain. Une date importée invalide est récupérable sans faire passer tous les mots futurs pour dus.

## Variété sans augmentation cachée

Paires et duel alternent selon le jour lorsqu'ils sont adaptés aux révisions disponibles. Ils remplacent des exercices et consomment leur coût dans les 12 unités. Un jeu de paires remplace quatre QCM de niveau 2 étape 0 ; chaque mot est évalué sur sa première association, corrigé et enregistré immédiatement, sans boucle interne illimitée. Les cibles non tentées restent inchangées. Un duel remplace une révision accompagnée adaptée, pas un rappel autonome : un support déjà rencontré ne reçoit pas une fausse réussite de révision. Sinon, conserver le format individuel d'origine.

## Séance et fin

- Au plus deux reprises, une seule par mot, et au plus deux unités supplémentaires au total. Une reprise ratée n'en génère pas une nouvelle. La correction reste affichée avant de continuer ; la difficulté reste programmée par le SRS existant.
- Après cinq minutes actives visibles, proposer de terminer après la question/correction en cours, sans noter les questions non faites. Le temps masqué ne compte pas. L'utilisateur peut continuer jusqu'au budget s'il le souhaite.
- Le bilan distingue le parcours entièrement réalisé de l'arrêt choisi ; seuls les résultats réels produisent XP et activité. Une routine courte effectivement travaillée peut remplir l'objectif du jour même s'il reste des mots dus. Aucun gain pour une séance vide.
- Une fois l'objectif quotidien réalisé, un bouton de révisions supplémentaires propose un nouveau lot court, facultatif et sans nouveautés. Les autres modes restent accessibles. Le nouveau lot doit monter une nouvelle instance de session et ne pas réattribuer les XP du précédent.
- Les réponses sont sauvegardées comme aujourd'hui. Fermer une séance ne valide pas ses questions restantes ; la reprise repart de la progression réelle. Un champ d'introduction facultatif empêche de multiplier les nouveautés en relançant une routine partielle. Pas de refonte de sauvegarde de session complète dans ce lot.

## Vérification et limites

Tests du budget sur grandes files et tous niveaux, erreurs répétées, absence prolongée, nouveautés déjà introduites, import ancien, dates futures et invalides, jeux composites et notes individuelles, double clics, fin anticipée, nouvelle séance bonus et absence de récompense fictive. Simulations multi-jours : 780 mots dus et échecs récurrents pour vérifier la couverture, puis arrivées de nouvelles échéances sur plusieurs semaines. Contrôles navigateur mobile, build, revue indépendante et vérification du commit réellement publié.

Décisions techniques de l'implémenteur : poids des formats, seuils de charge 6/9, rotation des jeux et priorité limitée au tiers du budget. Ce sont des réglages de départ, pas des seuils universels issus d'une étude. La régularité et une capacité quotidienne suffisante restent nécessaires pour résorber un retard. Aucun système à durée bornée ne peut garantir toutes les échéances d'une charge illimitée.
