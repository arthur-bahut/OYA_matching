import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const path = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'domains.json');
const domains = JSON.parse(readFileSync(path, 'utf8'));

const FIELDS = ['competences_cles', 'competences_transition', 'profils_types', 'formations', 'contraintes', 'secteurs'];

function capitalizeItems(str) {
  if (!str) return str;
  return str
    .split(/,\s*/)
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => item.charAt(0).toUpperCase() + item.slice(1))
    .join(', ');
}

const updated = domains.map(entry => {
  const out = { ...entry };
  FIELDS.forEach(f => { if (f in out) out[f] = capitalizeItems(out[f]); });
  return out;
});

writeFileSync(path, JSON.stringify(updated, null, 2), 'utf8');
console.log(`domains.json mis à jour — ${updated.length} entrées.`);
