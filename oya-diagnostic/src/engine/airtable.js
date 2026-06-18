import cardsData from '../data/cards.json';

const TOKEN   = import.meta.env.VITE_AIRTABLE_TOKEN;
const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const TABLE   = import.meta.env.VITE_AIRTABLE_TABLE ?? 'Diagnostics';

const QUALIF_KEYS = [
  'Niveau de qualification Bac ou moins',
  'Niveau de qualification Bac+2 à Bac+3',
  'Niveau de qualification Bac+5 et plus',
];
const QUALIF_LABELS = {
  'Niveau de qualification Bac ou moins':  '≤ Bac',
  'Niveau de qualification Bac+2 à Bac+3': 'Bac +2/+3',
  'Niveau de qualification Bac+5 et plus': 'Bac +5 et +',
};
const DISPO_KEYS = [
  'Disponibilité fréquence/semaine - temps plein',
  'Disponibilité fréquence/semaine - temps partiel',
  'Disponibilité fréquence/semaine - qq heures',
  'Disponibilité durée totale - peu',
  'Disponibilité durée totale - moyenne',
  'Disponibilité durée totale - plus',
  'Budget formation limité (< 2 000€)',
  'Budget formation moyen (2 000€ à 5 000€)',
  'Budget formation élevé (> 5 000€)',
];
const SOFTSKILLS_KEYS = [
  'Mobilité géographique (prêt à déménager)',
  'Travail en extérieur (conditions climatiques)',
  'Travail physique / port de charges',
  'Travail en horaires décalés / week-end',
  'Appétence numérique / outils digitaux',
  'Sensibilité écologique forte',
  'Goût du contact client / public',
  "Autonomie / goût d'entreprendre",
  'Sens de la pédagogie / goût transmission',
  "Goût du travail en équipe / esprit collectif",
];

// Noms courts pour les colonnes Airtable (les noms complets dépassent parfois la limite)
const BLOC_COL = {
  'Production agricole':                            'Production agricole',
  'Transformation agroalimentaire & industries':    'Transformation agro & industries',
  'Logistique, distribution & circuits courts':     'Logistique & circuits courts',
  'Restauration & métiers de bouche':               'Restauration & métiers de bouche',
  'Nutrition, santé & consommation':                'Nutrition, santé & conso',
  'Économie circulaire & environnement':            'Économie circulaire',
  'Gouvernance, politiques publiques & transition': 'Gouvernance & transition',
  'Transversale':                                   'Transversale',
};

/**
 * Envoie les données d'un diagnostic terminé vers Airtable.
 * Fire-and-forget : les erreurs sont loguées sans bloquer l'UI.
 *
 * @param {object}   state      - État global (state.js)
 * @param {Array}    allScores  - Tous les scores blocs (computeScores complet)
 * @param {number}   maxScore   - Score maximum pour le calcul des %
 * @param {Array}    top3       - Les 1-3 meilleurs résultats éligibles
 */
export async function pushToAirtable(state, allScores, maxScore, top3) {
  if (!TOKEN || !BASE_ID) return;

  const fields = buildFields(state, allScores, maxScore, top3);

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields, typecast: true }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[Airtable]', err?.error?.message ?? `HTTP ${res.status}`);
    }
  } catch (e) {
    console.warn('[Airtable] Erreur réseau :', e.message);
  }
}

function buildFields(state, allScores, maxScore, top3) {
  // Décomposition des contraintes
  const qualifKey = QUALIF_KEYS.find(k => state.constraints.has(k));
  const dispos    = DISPO_KEYS.filter(k => state.constraints.has(k));
  const softs     = SOFTSKILLS_KEYS.filter(k => state.constraints.has(k));

  // Réponses swipe : badge (sans emoji) → 'oui' | 'non' | 'skip'
  const swipeMap = {};
  state.answers.forEach(a => {
    const card = cardsData.find(c => c.statement === a.statement);
    if (!card) return;
    const label = card.badge.replace(/^\S+\s*/, '').trim();
    swipeMap[label] = a.answer === 'yes' ? 'oui' : a.answer === 'no' ? 'non' : 'skip';
  });

  const fields = {
    'Date':              new Date().toISOString().split('T')[0],
    'Métier d\'origine': state.romeLibelle || '',
    'Famille ROME':      state.romeFamilyLabel || (state.romeFamily ? `Famille ${state.romeFamily}` : ''),
    'Région':            state.region || '',
    'Qualification':     qualifKey ? QUALIF_LABELS[qualifKey] : '',
    'Disponibilités':    dispos.join(', '),
    'Soft skills':       softs.join(', '),
  };

  if (state.yearsXp != null) {
    fields['Années d\'expérience'] = state.yearsXp;
  }

  // Une colonne par carte swipe
  cardsData.forEach(card => {
    const label = card.badge.replace(/^\S+\s*/, '').trim();
    fields[`Swipe - ${label}`] = swipeMap[label] ?? '';
  });

  // Scores des 8 blocs
  allScores.forEach(r => {
    const col = BLOC_COL[r.bloc];
    if (col) fields[`Score - ${col}`] = parseFloat(r.finalScore.toFixed(2));
  });

  // Top résultats (jusqu'à 3)
  top3.forEach((r, i) => {
    const pct = Math.round((r.finalScore / maxScore) * 100);
    fields[`Résultat #${i + 1}`]  = r.bloc;
    fields[`Score #${i + 1} (%)`] = pct;
  });

  return fields;
}
