/**
 * Analyse de l'écart de compétences pour un bloc donné.
 * Retourne les formations suggérées issues du catalogue domains.json.
 */

// Mapping des clés T3 qualification → niveau numérique (0/1/2)
const QUALIF_LEVEL_MAP = {
  'Niveau de qualification Bac ou moins':  0,
  'Niveau de qualification Bac+2 à Bac+3': 1,
  'Niveau de qualification Bac+5 et plus': 2,
};

function getUserQualifLevel(constraints) {
  for (const [key, level] of Object.entries(QUALIF_LEVEL_MAP)) {
    if (constraints.has(key)) return level;
  }
  return null; // qualification non renseignée
}

// Détecte la plage de niveaux ciblée par un profils_types (min/max)
function getQualifRange(profilsTypes) {
  const t = (profilsTypes || '').toLowerCase();
  const levels = [];
  if (/peu qualif|\bcap\b|\bbep\b|\bbp\b|bac pro|artisan|étudiant/.test(t)) levels.push(0);
  if (/\bbts\b|btsa|\bdut\b|bac\+2|bac\+3|licence|bpjeps|animateur|éducateur|\btechnicien/.test(t)) levels.push(1);
  if (/bac\+5|bac\+7|master|ingénieur|école ing|\/\+5/.test(t)) levels.push(2);
  if (!levels.length) return null; // profil neutre, pas de contrainte de niveau
  return { min: Math.min(...levels), max: Math.max(...levels) };
}

// Pénalité : 0 si dans la cible, ×2 si sous-qualifié, ×1 si surqualifié
function qualifPenalty(userLevel, profilsTypes) {
  if (userLevel === null) return 0;
  const range = getQualifRange(profilsTypes);
  if (!range) return 0;
  const { min, max } = range;
  if (userLevel >= min) return 0; // dans la cible ou surqualifié : pas de pénalité
  return (min - userLevel) * 2;  // sous-qualifié : pénalité
}

// Tri stable des métiers par adéquation de niveau (meilleur match en premier)
function sortByQualif(metiers, constraints) {
  const userLevel = getUserQualifLevel(constraints ?? new Set());
  if (userLevel === null) return metiers;
  return [...metiers].sort(
    (a, b) => qualifPenalty(userLevel, a.profils_types) - qualifPenalty(userLevel, b.profils_types)
  );
}

export function getFormationsSuggestions(bloc, domains, constraints = null) {
  const metiers = sortByQualif(domains.filter(m => m.bloc === bloc), constraints);
  if (!metiers.length) return [];

  const OYA_LABEL = 'Formation Oya';
  const seen = new Set([OYA_LABEL.toLowerCase()]);
  const others = [];

  metiers.forEach(m => {
    if (m.formations) {
      m.formations
        .split(/[,;\n]+/)
        .map(f => f.trim())
        .filter(f => f.length > 1 && f !== OYA_LABEL)
        .forEach(f => {
          const key = f.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            others.push({ label: f, source: m.nom });
          }
        });
    }
  });

  return [
    ...others.slice(0, 2),
    { label: OYA_LABEL, source: 'Oya' },
  ];
}

/**
 * Retourne les 4-5 métiers les plus représentatifs du bloc,
 * triés par adéquation avec le niveau de qualification de l'utilisateur.
 */
export function getMetiersPourBloc(bloc, domains, limit = 5, constraints = null) {
  return sortByQualif(domains.filter(m => m.bloc === bloc), constraints)
    .slice(0, limit);
}
