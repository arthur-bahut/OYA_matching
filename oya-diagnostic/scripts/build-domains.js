/**
 * build-domains.js
 * Convertit Liste-métiers-et-compétences-Oya.csv → src/data/domains.json
 *
 * Usage: node scripts/build-domains.js
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = resolve(__dir, '..');

// Trouver le CSV en listant le répertoire parent (évite les problèmes d'encodage Unicode)
const parentDir = resolve(root, '..');
const csvName   = readdirSync(parentDir).find(f => f.includes('tiers') && f.endsWith('.csv'));
if (!csvName) throw new Error('CSV métiers introuvable dans ' + parentDir);
const CSV_PATH  = resolve(parentDir, csvName);
const OUT_PATH  = resolve(root, 'src', 'data', 'domains.json');

// ── Lecture & parsing CSV ─────────────────────────────────────────────
const raw = readFileSync(CSV_PATH, 'utf-8');

function parseCSVLine(line) {
  const fields = [];
  let inQuote = false;
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      fields.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

const lines = raw.split(/\r?\n/).filter(l => l.trim());
// Ligne 0 = en-têtes
const headers = parseCSVLine(lines[0]);

// Colonnes clés (basées sur l'analyse du CSV)
// idx: 0=row, 1=Bloc, 2=Métier, 3=Statut, 4=RéfMétiers, 5=RéfCompétences,
//      6=Niveau, 7=InfoClé, 8=Formations, 9=Métier(dup), 10=CompétencesCles,
//      11=CompétencesTransition, 12=ProfilsTypes, 13=ContraintesFréquentes,
//      14=FreinsIdentifiés, 15=CompétencesRS, 16=CodesROME, 17=Secteurs
const COL = {
  bloc:       1,
  nom:        2,
  statut:     3,
  niveau:     6,
  formations: 8,
  competences_cles: 10,
  competences_transition: 11,
  profils_types: 12,
  contraintes: 13,
  codes_rome:  16,
  secteurs:    17,
};

const domains = [];

for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);
  const bloc = row[COL.bloc]?.trim();
  const nom  = row[COL.nom]?.trim();

  // Ignorer les lignes sans bloc ou nom valides
  if (!bloc || !nom || nom.length < 3) continue;
  // Ignorer les lignes d'en-tête secondaires ou séparateurs
  if (bloc === 'Bloc' || bloc === 'Bloc Oya' || !/[a-zA-ZÀ-ÿ]/.test(bloc)) continue;

  domains.push({
    bloc:                    bloc,
    nom:                     nom,
    statut:                  row[COL.statut]?.replace(/🟠|🔴|🟢/g, '').trim() ?? '',
    niveau:                  row[COL.niveau]?.trim() ?? '',
    competences_cles:        row[COL.competences_cles]?.trim() ?? '',
    competences_transition:  row[COL.competences_transition]?.trim() ?? '',
    profils_types:           row[COL.profils_types]?.trim() ?? '',
    formations:              row[COL.formations]?.trim() ?? '',
    codes_rome:              row[COL.codes_rome]?.trim() ?? '',
    contraintes:             row[COL.contraintes]?.trim() ?? '',
    secteurs:                row[COL.secteurs]?.trim() ?? '',
  });
}

// ── Résumé par bloc ───────────────────────────────────────────────────
const byBloc = {};
domains.forEach(m => {
  byBloc[m.bloc] = (byBloc[m.bloc] ?? 0) + 1;
});

console.log(`\n✅ ${domains.length} métiers extraits sur ${lines.length - 1} lignes CSV`);
console.log('\nRépartition par bloc :');
Object.entries(byBloc).forEach(([b, n]) => console.log(`  ${b}: ${n}`));

writeFileSync(OUT_PATH, JSON.stringify(domains, null, 2), 'utf-8');
console.log(`\n📁 Écrit → ${OUT_PATH}\n`);
