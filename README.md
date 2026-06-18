# OYA — Outil de matching métiers de la transition alimentaire

> Diagnostic d'orientation vers les métiers de la transition alimentaire, basé sur un système de swipe de 20 affirmations.

**Demo :** <!-- TODO: URL de démo -->

---

## Présentation

OYA Matching est une application web mobile-first, inspiré des applications de rencontre, qui aide les personnes en reconversion à identifier les domaines et métiers de la transition alimentaire qui leur correspondent le mieux.

**Fonctionnement en 3 étapes :**

1. **Swipe** — 20 affirmations à évaluer (oui / non / c'est tout à fait moi / pas sûr·e)
2. **Profil** — Informations complémentaires : métier actuel, expérience, disponibilités, atouts personnels
3. **Résultats** — Top 3 des domaines qui matchent, liste de métiers associés, synthèse personnalisée et export PDF

---

## Stack technique

| Élément | Choix |
|---|---|
| Build | [Vite](https://vitejs.dev/) |
| JS | Vanilla ES modules (pas de framework) |
| Autocomplete métiers | [Fuse.js](https://www.fusejs.io/) + référentiel ROME |
| PDF | [jsPDF](https://github.com/parallax/jsPDF) |
| Collecte des réponses | Airtable (anonyme) |

---

## Installation

```bash
cd oya-diagnostic
npm install
npm run dev
```

Accessible sur `http://localhost:5173`.

Pour tester sur mobile (même réseau local) :

```bash
npm run dev -- --host
```

---

## Structure du projet

```
oya-diagnostic/
├── public/
│   ├── bmo.json          # Données métiers (BMO France Travail)
│   ├── rome.json         # Référentiel ROME (appellations métiers)
│   └── images_swipe/     # Images des 20 cards
├── src/
│   ├── data/
│   │   └── cards.json    # Les 20 affirmations + scores par domaine
│   ├── engine/
│   │   ├── scoring.js    # Calcul du matching
│   │   └── pdf.js        # Génération du PDF de résultats
│   ├── screens/
│   │   ├── swipe.js      # Écran swipe
│   │   ├── profile.js    # Écran profil
│   │   └── results.js    # Écran résultats
│   ├── state.js          # État global de la session
│   └── router.js         # Navigation entre écrans
├── style.css
└── index.html
```

---

## Variables d'environnement

Créer un fichier `.env` à la racine de `oya-diagnostic/` :

```env
VITE_AIRTABLE_TOKEN=your_token_here
VITE_AIRTABLE_BASE_ID=your_base_id_here
VITE_AIRTABLE_TABLE_NAME=your_table_name_here
```

Sans ces variables, l'app fonctionne normalement — la collecte Airtable est simplement désactivée.

---

## Domaines couverts

L'outil couvre 7 domaines de la transition alimentaire :

- Production agricole
- Transformation agroalimentaire & industries
- Restauration & métiers de bouche
- Logistique, distribution & circuits courts
- Nutrition, santé & consommation
- Économie circulaire & environnement
- Gouvernance, politiques publiques & transition
- Transversale

---

## Licence

Projet privé — © OYA
