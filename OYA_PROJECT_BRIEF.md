# OYA — Brief technique pour le développement du POC
> Document de référence à fournir au LLM en contexte de développement.
> Synthèse de l'ensemble des décisions prises, validées et hors scope.
> Version 1.0 — Avril 2026

---

## 1. Contexte client

**Client :** Boris Marcel, directeur & co-fondateur des Cols Verts / projet Oya
**Structure :** Les Cols Verts — réseau associatif pionnier de l'agriculture urbaine en France (depuis 2016). Oya est la branche EdTech en cours de création.
**Mission d'Oya :** plateforme de formation et d'accompagnement dédiée à la transition des systèmes alimentaires — de la production agricole à la restauration durable.

**Ce que Boris a dit mot pour mot (verbatim entretien du 9 avril 2026) :**
- *"Un produit d'appel — en 5 minutes, découvrez quel métier de la transition alimentaire vous convient le plus"*
- *"Quelque chose d'intuitif où la personne a juste à cocher plutôt qu'écrire"*
- *"Graphique, esthétique, qui donne envie — pas un quiz rébarbatif"*
- *"L'intervention humaine vient qu'à la fin"* — le résultat doit être entièrement automatique
- *"Notre valeur ajoutée, c'est être agrégateur d'outils existants"*
- *"Innovants en lien avec de la data"* — argument pour aller chercher des subventions IA/Deep Tech

---

## 2. Projet retenu

**Projet n°1 — Outil de diagnostic d'orientation métiers**

Un adulte en reconversion arrive sur l'outil, répond à quelques questions en moins de 5 minutes, et reçoit automatiquement une recommandation de 3 métiers de la transition alimentaire correspondant à son profil — avec une explication du matching et une indication des compétences à développer.

**Cible utilisateur prioritaire :** adultes en reconversion professionnelle vers les métiers de la transition alimentaire (production agricole durable, agroalimentaire, restauration durable).

**Ce que Boris valorise particulièrement :** les meilleurs profils de la transition viennent souvent d'autres secteurs avec des compétences transférables. L'outil doit valoriser le parcours existant de l'utilisateur, pas le faire repartir de zéro.

---

## 3. Contraintes absolues à respecter

| Contrainte | Détail |
|---|---|
| **Pas de WordPress** | Contrainte absolue, non négociable |
| **Souveraineté numérique** | Privilégier les outils européens / français. Éviter les stacks 100% américaines (Typeform, Airtable, Zapier, Softr…) |
| **Pas de Figma seul** | Boris veut du fonctionnel démontrable, pas des maquettes statiques |
| **RGPD** | Aucune donnée personnelle stockée sans consentement explicite. Anonymisation des résultats si agrégation. |
| **Appropriable sans prestataire** | Boris doit pouvoir faire évoluer la solution sans dépendre d'une équipe technique externe |
| **Esthétique soignée** | L'interface doit donner envie. Boris est très sensible au soin visuel. |
| **Mobile-friendly** | L'outil sera partagé sur des articles de presse et réseaux sociaux |

---

## 4. Architecture du parcours utilisateur (3 étapes)

```
ÉTAPE 1 — Affinités métiers
  └─ Module de sélection visuelle par grandes orientations
     (produire / transformer / distribuer / cuisiner / accompagner)
     → Résultat : vecteur d'affinité par bloc métier Oya

ÉTAPE 2 — Profil et contraintes pratiques
  └─ 2a. Saisie du métier d'origine avec autocomplétion ROME
         (saisie libre par mots-clé → filtrage des intitulés ROME → sélection)
  └─ 2b. Questions de contraintes pratiques
         (mobilité, disponibilité, niveau de qualification, conditions physiques,
          sensibilité écologique, goût d'entreprendre, appétence numérique…)
     → Résultat : code ROME sélectionné + vecteur de contraintes

ÉTAPE 3 — Page de résultats
  └─ Top 3 blocs métiers recommandés avec score et explication
  └─ Pour chaque bloc : 2-3 métiers concrets issus du catalogue Oya
  └─ Gap de compétences (ce que l'utilisateur a déjà vs ce qu'il lui faut)
  └─ Lien vers liste d'attente formations Oya
```

---

## 5. Logique de scoring — Matrice de matching (fichier : matrice_matching_oya_v1.0.xlsx)

Le score final est calculé en combinant **trois tables** :

### Table 1 — Bloc Oya × Famille de compétences [scores 0–5]
Mesure l'importance de chaque famille de compétences pour chaque bloc métier Oya.
- 8 blocs métiers Oya × 8 familles de compétences = 64 cellules
- Score 0 = non pertinent, 5 = compétence cœur de métier

**Les 8 blocs métiers Oya :**
1. Production agricole
2. Transformation agroalimentaire & industries
3. Logistique, distribution & circuits courts
4. Restauration & métiers de bouche
5. Nutrition, santé & consommation
6. Économie circulaire & environnement
7. Gouvernance, politiques publiques & transition
8. Transversale

**Les 8 familles de compétences Oya :**
1. Diagnostic systémique du système alimentaire
2. Conception de stratégies de transition alimentaire
3. Pilotage de projets de transition alimentaire
4. Mise en œuvre de solutions opérationnelles
5. Analyse de la performance et amélioration continue
6. Animation, formation et accompagnement des acteurs
7. Coordination territoriale et concertation
8. Veille, innovation et prospective

### Table 2 — Grande famille ROME × Famille de compétences Oya [scores 0–5]
Mesure le potentiel de transfert des compétences d'un métier ROME vers les compétences Oya.
- 20 grandes familles ROME (A à V) × 8 familles de compétences Oya = 160 cellules
- Utilisée pour valoriser les compétences transférables de l'utilisateur

**Principe :** l'utilisateur saisit son métier d'origine en texte libre → autocomplétion sur les intitulés du référentiel ROME (fichier `unix_referentiel_savoir_v460.json`) → sélection d'un intitulé → récupération du code de grande famille ROME (lettre) → lookup dans Table 2.

### Table 3 — Contraintes pratiques × Bloc Oya [scores -5 à +5]
Pondère positivement ou négativement chaque bloc selon les contraintes déclarées.
- **Les contraintes ne sont pas éliminatoires** — elles pondèrent. Une personne non mobile peut quand même recevoir une recommandation sur un métier en tension dans une autre région si le reste du matching est fort.
- Score -5 = forte pénalité, 0 = neutre, +5 = fort bonus

### Formule de calcul du score final par bloc

```
Score(bloc) = (Score_T1 × 1.5) + (Score_T2 × 1.0) + (Score_T3 × 0.5)
```

**Pondérations :**
- T1 (affinités déclarées) : ×1.5 — signal le plus fort, c'est ce que la personne veut
- T2 (compétences transférables ROME) : ×1.0 — socle objectif
- T3 (contraintes pratiques) : ×0.5 — modulateur, pas filtre

Le top 3 des blocs par score final constitue la recommandation.

---

## 6. Données disponibles

| Fichier | Contenu | Usage |
|---|---|---|
| `Liste_metiers_et_competences_Oya.xlsx` | 80 métiers en 8 blocs, avec codes ROME, niveaux de qualification, profils types, compétences clés, freins | Source principale pour la page résultats |
| `TableurdescompetencespourlatransitionVFpublie.xlsx` | Référentiel Shift Project : savoirs, savoir-faire, savoir-être pour la transition agroécologique | Enrichissement du gap de compétences |
| `unix_referentiel_savoir_v460.json` | Référentiel ROME complet — savoirs indexés par code_ogr, catégorie, sous-catégorie, avec flags transition_eco et transition_num | Source pour l'autocomplétion du métier d'origine |
| `matrice_matching_oya_v1.0.xlsx` | Les 3 tables de scoring décrites ci-dessus | Moteur de calcul du matching |

**Point d'attention sur le ROME :** le référentiel disponible est un référentiel de *savoirs* (unix_referentiel_savoir), pas le référentiel des fiches métiers complet. Pour l'autocomplétion, utiliser les `libelle` des entrées filtrées par `libelle_sous_categorie` pertinente. Les entrées avec `transition_eco = "O"` sont particulièrement utiles pour les métiers cibles Oya.

---

## 7. Ce qui est hors scope du POC

| Élément | Statut | Note |
|---|---|---|
| Back-office analytics pour Boris | Hors scope V1 — V2 | Boris le veut mais c'est une évolution post-lancement |
| Intégration LMS | Hors scope V1 | Remplacé par un lien vers liste d'attente formations |
| Catalogue de formations complet | Non disponible | Boris ne l'a pas encore finalisé |
| Authentification / compte utilisateur | Hors scope V1 | Pas de login, expérience anonyme |
| Sauvegarde des résultats | Hors scope V1 | L'utilisateur peut télécharger/copier sa page résultats |
| Géolocalisation / tensions régionales | Hors scope V1 | Mentionné par Boris mais non prioritaire pour le POC |
| Recommandation LMS | Hors scope POC | À traiter dans le rendu écrit uniquement |

---

## 8. Exigences UX non négociables

- **Expérience guidée, linéaire** — l'utilisateur ne doit jamais se demander quoi faire ensuite
- **Pas de formulaire long** — maximum 10 interactions au total sur les 3 étapes
- **Résultat immédiat et automatique** — zéro intervention humaine dans le parcours
- **Explication du résultat** — le matching doit être explicité ("votre expérience en X est un atout pour Y")
- **Valorisation du parcours passé** — ne jamais donner l'impression que l'utilisateur repart de zéro
- **Ton bienveillant et encourageant** — public en reconversion, potentiellement en situation de vulnérabilité professionnelle

---

## 9. Ce que le POC doit démontrer en soutenance

La soutenance dure 10 minutes de démo + 10 minutes de questions. Le jury évalue : compréhension du besoin, conception technique adaptée, pilotage, déploiement et adoption.

Le scénario de démo recommandé : **Julie, 38 ans, ancienne comptable, attirée par la restauration durable, basée en Île-de-France, disponible à temps plein.** Le jury doit voir le parcours complet en moins de 3 minutes, et le résultat doit être lisible immédiatement.

Points à démontrer impérativement :
1. L'autocomplétion ROME fonctionne (saisie "comptable" → suggestions pertinentes)
2. Le scoring produit un résultat cohérent et explicité
3. Le gap de compétences est visible et compréhensible
4. L'interface est soignée visuellement

---

## 10. Stack technique recommandée

Aucune stack n'est imposée, mais les choix doivent respecter les contraintes de souveraineté numérique et d'appropriabilité. Quelques orientations :

- **Front :** HTML/CSS/JS vanilla ou React — simple, maintenable, pas de dépendance à un framework propriétaire
- **Logique de scoring :** JavaScript côté client de préférence — pas de backend nécessaire pour le POC, les tables de scoring sont embarquées en JSON
- **Autocomplétion ROME :** recherche fuzzy côté client sur le JSON du référentiel (fuse.js ou équivalent léger)
- **Hébergement :** Netlify, Vercel ou équivalent européen (Scaleway, OVH) — lien stable et accessible pour la soutenance
- **LLM pour les explications** (optionnel mais valorisant) : si une API LLM est utilisée pour générer les textes d'explication du matching, documenter le prompt système utilisé

---

*Ce document est la source de vérité pour le développement du POC. Toute décision d'implémentation qui s'écarte de ce brief doit être documentée et justifiée.*
