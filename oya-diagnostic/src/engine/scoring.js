import cardsData from '../data/cards.json';

// Max T1 atteignable par bloc (tous les swipes "oui") — calculé une seule fois au chargement
const MAX_T1 = {};
cardsData.forEach(card => {
  Object.entries(card.scores).forEach(([bloc, score]) => {
    MAX_T1[bloc] = (MAX_T1[bloc] || 0) + score;
  });
});

/**
 * Moteur de scoring OYA
 * Score(bloc) = (T1_norm × W1) + (T2_norm × W2) + (T3 × W3)
 *
 * T1 : affinités swipe, normalisées à [0-5] par le max théorique du bloc
 * T2 : produit scalaire ROME × compétences bloc, normalisé à [0-5] (/25)
 * T3 : contraintes pratiques (somme des modificateurs)
 * Poids lus depuis matrix._meta.ponderation (W1=2.0, W2=1.0, W3=0.75)
 */
export function computeScores(state, matrix) {
  const blocs = matrix._meta.axes.blocs_oya;
  const comps = matrix._meta.axes.familles_competences_oya;
  const T1m   = matrix.T1_bloc_x_competences.scores;
  const T2m   = matrix.T2_rome_x_competences.scores;
  const T3m   = matrix.T3_contraintes_x_blocs.scores;

  const W1 = matrix._meta.ponderation.T1_affinites;   // 1.5
  const W2 = matrix._meta.ponderation.T2_rome;        // 1.0
  const W3 = matrix._meta.ponderation.T3_contraintes; // 0.5

  return blocs.map(bloc => {
    // T1 — affinités déclarées, normalisées à [0-5] pour corriger le déséquilibre des cartes
    const rawT1   = state.swipeScores[bloc] || 0;
    const scoreT1 = MAX_T1[bloc] ? (rawT1 / MAX_T1[bloc]) * 5 : 0;

    // T2 — produit scalaire T2_rome × T1_bloc, normalisé 0-5
    let scoreT2 = 0;
    if (state.romeFamily && T2m[state.romeFamily]) {
      const t2vec = T2m[state.romeFamily];
      const t1vec = T1m[bloc];
      let dot = 0;
      comps.forEach(c => { dot += (t2vec[c] || 0) * (t1vec[c] || 0); });
      // Max pratique : ~112 → diviseur 25 ramène à [0-5] sur l'échelle réelle
      scoreT2 = dot / 25;
    }

    // T3 — somme des modificateurs contraintes
    let scoreT3 = 0;
    state.constraints.forEach(constraint => {
      const row = T3m[constraint];
      if (row) scoreT3 += (row[bloc] || 0);
    });

    const finalScore = (scoreT1 * W1) + (scoreT2 * W2) + (scoreT3 * W3);

    // Identifier atouts et compétences à développer
    const atouts = [];
    const aDevelopper = [];
    if (state.romeFamily && T2m[state.romeFamily]) {
      const t2vec = T2m[state.romeFamily];
      const t1vec = T1m[bloc];
      comps.forEach(c => {
        const t2 = t2vec[c] || 0;
        const t1 = t1vec[c] || 0;
        if (t2 >= 3 && t1 >= 3) {
          atouts.push({ comp: c, score: t1 + t2 });
        } else if (t1 >= 4 && t2 <= 2) {
          aDevelopper.push({ comp: c, score: t1 });
        }
      });
    }
    atouts.sort((a, b) => b.score - a.score);
    aDevelopper.sort((a, b) => b.score - a.score);

    return {
      bloc,
      finalScore,
      scoreT1,
      scoreT2,
      scoreT3,
      atouts: atouts.slice(0, 3),
      aDevelopper: aDevelopper.slice(0, 3),
    };
  }).sort((a, b) => b.finalScore - a.finalScore);
}

// Noms courts pour affichage dans les chips
export const COMP_SHORT = {
  'Diagnostic systémique du système alimentaire':       'Diagnostic systémique',
  'Conception de stratégies de transition alimentaire': 'Conception de stratégies',
  'Pilotage de projets de transition alimentaire':      'Pilotage de projets',
  'Mise en œuvre de solutions opérationnelles':         'Mise en œuvre opérationnelle',
  'Analyse de la performance et amélioration continue': 'Analyse & amélioration',
  'Animation, formation et accompagnement des acteurs': 'Animation & formation',
  'Coordination territoriale et concertation':          'Coordination territoriale',
  'Veille, innovation et prospective':                  'Veille & innovation',
};
