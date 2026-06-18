import { readFileSync, writeFileSync } from 'fs';

const path = new URL('../src/data/domains.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const domains = JSON.parse(readFileSync(path, 'utf8'));

function fixStatut({ statut, nom }) {
  if (!statut) return statut;
  if (statut.includes('émergent niche') || statut.includes('différenciant')) return 'Émergent';
  if (statut.includes('structurant') || statut === 'Croissance') return 'Tension';
  if (statut === 'Autre') {
    // Community manager et atelier transformation artisanal → Émergent
    if (nom.includes('Community') || nom.includes('atelier transformation')) return 'Émergent';
    return 'Tension';
  }
  return statut;
}

const fixed = domains.map(({ niveau, codes_rome, ...rest }) => ({
  ...rest,
  statut: fixStatut(rest),
}));

writeFileSync(path, JSON.stringify(fixed, null, 2), 'utf8');
console.log(`domains.json mis à jour — ${fixed.length} métiers.`);

// Vérifier les statuts restants
const statuts = [...new Set(fixed.map(m => m.statut))].sort();
console.log('Statuts restants :', statuts);
