# OYA — Outil de matching métiers de la transition alimentaire

> Diagnostic d'orientation vers les métiers de la transition alimentaire, basé sur un système de swipe de 20 affirmations.

**URL de démo :** https://oyamatching.netlify.app/
L'appli est pensée mobile-first. Bien qu'utilisable en suivant le lien de démo, l'idéal est de télécharger le projet en local et suivre les instructions du README.

---

## Présentation

OYA Matching est une application web mobile-first, inspirée des applications de rencontre, qui aide les personnes en reconversion à identifier les domaines et métiers de la transition alimentaire qui leur correspondent le mieux.

**Fonctionnement en 3 étapes :**

1. **Swipe** — 20 affirmations à évaluer (oui / non / c'est tout à fait moi / pas sûr·e) — fonction swipe + boutons cliquables
2. **Profil** — Informations complémentaires : métier actuel, expérience, disponibilités, atouts personnels
3. **Résultats** — Top 3 des domaines qui matchent, liste de métiers associés, synthèse personnalisée et export PDF

Aucune IAG présente dans l'application.

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

Ouvrir un terminal de commande (cmd, Powershell ou autre) et taper :

```bash
git clone https://github.com/arthur-bahut/OYA_matching.git
cd OYA_matching/oya-diagnostic
npm install
npm run dev
```

Ensuite, l'appli sera accessible sur `http://localhost:5173` (ou tout autre port affiché dans le terminal si 5173 est occupé).

Pour tester sur mobile (**C'EST L'IDEAL ;)** ) :

```bash
npm run dev -- --host
```

Ensuite, ouvrir le navigateur de son téléphone et renseigner l'une des URL proposées dans le terminal (ex : http://192.168.1.31:5173).
Attention : il faut que votre PC et votre téléphone soient sur le même réseau WiFi.

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

L'outil couvre 8 domaines de la transition alimentaire :

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
