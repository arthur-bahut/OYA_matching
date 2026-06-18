import { state }                    from '../state.js';
import { showScreen, setProgress } from '../router.js';

// ── Sections de contraintes T3 ─────────────────────────────────────
// Qualification : radio (une seule valeur)
const QUALIF_KEYS = [
  { key: 'Niveau de qualification Bac ou moins',   label: '≤ Bac' },
  { key: 'Niveau de qualification Bac+2 à Bac+3',  label: 'Bac +2/+3' },
  { key: 'Niveau de qualification Bac+5 et plus',  label: 'Bac +5 et +' },
];

// Disponibilité : radio par groupe (fréquence / durée / budget)
const DISPO_KEYS = [
  { key: 'Disponibilité fréquence/semaine - temps plein',   label: 'Plein temps',        group: 'freq' },
  { key: 'Disponibilité fréquence/semaine - temps partiel', label: 'Temps partiel',      group: 'freq' },
  { key: 'Disponibilité fréquence/semaine - qq heures',     label: 'Quelques h/semaine', group: 'freq' },
  { key: 'Disponibilité durée totale - peu',                label: 'Moins de 3 mois',    group: 'duree' },
  { key: 'Disponibilité durée totale - moyenne',            label: 'De 3 à 6 mois',      group: 'duree' },
  { key: 'Disponibilité durée totale - plus',               label: 'Plus de 6 mois',     group: 'duree' },
  { key: 'Budget formation limité (< 2 000€)',              label: 'Moins de 2000 €',    group: 'budget' },
  { key: 'Budget formation moyen (2 000€ à 5 000€)',        label: 'De 2000 à 5000 €',   group: 'budget' },
  { key: 'Budget formation élevé (> 5 000€)',               label: 'Plus de 5000 €',     group: 'budget' },
];

// Soft skills & intérêts : multi-select (qui on est, pas ce qu'on peut faire)
const SOFTSKILLS_KEYS = [
  { key: 'Mobilité géographique (prêt à déménager)',     label: 'Mobilité géographique',     icon: '🗺️' },
  { key: 'Travail en extérieur (conditions climatiques)',label: 'Travail en extérieur',      icon: '☀️' },
  { key: 'Travail physique / port de charges',           label: 'Travail physique',          icon: '💪' },
  { key: 'Travail en horaires décalés / week-end',       label: 'Horaires décalés',          icon: '🌙' },
  { key: 'Appétence numérique / outils digitaux',        label: 'Appétence numérique',       icon: '💻' },
  { key: 'Sensibilité écologique forte',                 label: 'Engagement écologique',     icon: '🌿' },
  { key: 'Goût du contact client / public',              label: 'Contact avec le public',    icon: '🤝' },
  { key: 'Autonomie / goût d\'entreprendre',             label: 'Entrepreneuriat',           icon: '🚀' },
  { key: 'Sens de la pédagogie / goût transmission',     label: 'Pédagogie & transmission',  icon: '🎓' },
  { key: 'Goût du travail en équipe / esprit collectif', label: 'Esprit d\'équipe',          icon: '👥' },
];

let fuseInstance  = null;
let romeLiteData  = null;
let autocompleteVisible = false;
let highlightIdx  = -1;
let suggestions   = [];

export function initProfile(container) {
  container.innerHTML = `
    <div class="profile-container">
      <div>
        <h1 class="screen-title">Votre profil</h1>
        <p class="screen-subtitle">Quelques informations pour personnaliser vos résultats.</p>
      </div>

      <!-- Expérience professionnelle -->
      <div class="form-section">
        <span class="section-label">Votre expérience professionnelle</span>
        <div class="field">
          <label class="dispo-subtitle" for="metierInput">Quel est (ou était) votre métier ?</label>
          <div class="autocomplete-wrap">
            <input
              id="metierInput"
              type="text"
              placeholder="Ex. : comptable, infirmier·ère, cuisinier…"
              autocomplete="off"
            />
            <div class="autocomplete-list hidden" id="autocompleteList"></div>
          </div>
        </div>
        <div class="field-row">
          <div class="field field-half">
            <label class="dispo-subtitle" for="xpInput">Expérience</label>
            <select id="xpInput">
              <option value="">Choisir…</option>
              <option value="Moins d'1 an">Moins d'1 an</option>
              <option value="1 à 3 ans">1 à 3 ans</option>
              <option value="3 à 5 ans">3 à 5 ans</option>
              <option value="5 à 10 ans">5 à 10 ans</option>
              <option value="Plus de 10 ans">Plus de 10 ans</option>
            </select>
          </div>
          <div class="field field-half">
            <label class="dispo-subtitle" for="regionInput">Région</label>
            <select id="regionInput">
              <option value="">Choisir…</option>
              <option>Île-de-France</option>
              <option>Auvergne-Rhône-Alpes</option>
              <option>Nouvelle-Aquitaine</option>
              <option>Occitanie</option>
              <option>Grand Est</option>
              <option>Hauts-de-France</option>
              <option>Normandie</option>
              <option>Bretagne</option>
              <option>Pays de la Loire</option>
              <option>Provence-Alpes-Côte d'Azur</option>
              <option>Centre-Val de Loire</option>
              <option>Bourgogne-Franche-Comté</option>
              <option>DOM-TOM / Autre</option>
            </select>
          </div>
        </div>
        <p class="dispo-subtitle">Niveau d'études</p>
        <div class="radio-group" id="qualifGroup">
          ${QUALIF_KEYS.map(q => `
            <button class="radio-chip" data-key="${q.key}">${q.label}</button>
          `).join('')}
        </div>
      </div>

      <!-- Disponibilité & contexte -->
      <div class="form-section">
        <span class="section-label">Disponibilités et contraintes de formation</span>
        <div class="dispo-grid" id="dispoGroup">
          ${[
            { group: 'freq',   subtitle: 'À quelle fréquence ?' },
            { group: 'duree',  subtitle: 'Pendant combien de temps ?' },
            { group: 'budget', subtitle: 'Avec quel budget ?' },
          ].map(({ group, subtitle }) => `
            <p class="dispo-subtitle">${subtitle}</p>
            <div class="dispo-row">
              ${DISPO_KEYS.filter(d => d.group === group).map(d => `
                <button class="chip" data-key="${d.key}" data-group="${group}">${d.label}</button>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Soft skills & intérêts -->
      <div class="form-section">
        <span class="section-label">Vos atouts & intérêts personnels</span>
        <p class="section-hint">Cochez ce qui vous ressemble et/ou vous attire.</p>
        <div class="chips-wrap chips-wrap--wide" id="softGroup">
          ${SOFTSKILLS_KEYS.map(s => `
            <button class="chip" data-key="${s.key}">
              <span class="chip-icon">${s.icon}</span>${s.label}
            </button>
          `).join('')}
        </div>
      </div>

      <button class="btn-primary" id="btnCompute" disabled>
        Voir mes résultats →
      </button>
    </div>
  `;

  bindQualifRadio();
  bindDispoChips();
  bindChips('softGroup');
  bindAutocomplete();
  bindValidation();
}

// ── Qualification : radio (une seule sélection) ───────────────────
function bindQualifRadio() {
  const group = document.getElementById('qualifGroup');
  group.querySelectorAll('.radio-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const prevKey = btn.dataset.key;
      // Désactiver les autres clés qualification dans l'état
      QUALIF_KEYS.forEach(q => state.constraints.delete(q.key));
      group.querySelectorAll('.radio-chip').forEach(b => b.classList.remove('selected'));
      if (!btn.classList.contains('selected')) {
        btn.classList.add('selected');
        state.constraints.add(prevKey);
      }
    });
  });
}

// ── Dispo : radio par groupe (fréquence / durée / budget) ────────
function bindDispoChips() {
  const grid = document.getElementById('dispoGroup');
  grid.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const key   = btn.dataset.key;
      const group = btn.dataset.group;
      const wasSelected = btn.classList.contains('selected');
      grid.querySelectorAll(`.chip[data-group="${group}"]`).forEach(b => {
        b.classList.remove('selected');
        state.constraints.delete(b.dataset.key);
      });
      if (!wasSelected) {
        btn.classList.add('selected');
        state.constraints.add(key);
      }
    });
  });
}

// ── Chips : multi-select ──────────────────────────────────────────
function bindChips(groupId) {
  const group = document.getElementById(groupId);
  group.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      if (state.constraints.has(key)) {
        state.constraints.delete(key);
        btn.classList.remove('selected');
      } else {
        state.constraints.add(key);
        btn.classList.add('selected');
      }
    });
  });
}

// ── Autocomplete ROME ─────────────────────────────────────────────
async function loadRome() {
  if (romeLiteData) return;
  const resp = await fetch('./rome.json');
  const data = await resp.json();
  romeLiteData = data;
  const Fuse = (await import('fuse.js')).default;
  fuseInstance = new Fuse(data.appellations, {
    keys: ['l'],
    threshold: 0.35,
    includeScore: true,
    minMatchCharLength: 2,
  });
}

function bindAutocomplete() {
  const input = document.getElementById('metierInput');
  const list  = document.getElementById('autocompleteList');

  input.addEventListener('input', async () => {
    const q = input.value.trim();
    await loadRome();
    if (q.length < 2) { hideList(); return; }
    const results = fuseInstance.search(q, { limit: 8 });
    suggestions  = results.map(r => r.item);
    highlightIdx = -1;
    renderList(list, suggestions);
  });

  input.addEventListener('keydown', e => {
    if (!autocompleteVisible) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); moveTo(highlightIdx + 1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); moveTo(highlightIdx - 1); }
    if (e.key === 'Enter')     { e.preventDefault(); selectIdx(highlightIdx >= 0 ? highlightIdx : 0); }
    if (e.key === 'Escape')    { hideList(); }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.autocomplete-wrap')) hideList();
  });
}

function renderList(list, items) {
  if (!items.length) { hideList(); return; }
  list.innerHTML = '';
  items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'autocomplete-item';
    el.innerHTML = `
      <span>${item.l}</span>
      <span class="autocomplete-family">${romeLiteData.familles[item.f] ?? item.f}</span>
    `;
    el.addEventListener('mousedown', e => { e.preventDefault(); selectIdx(i); });
    list.appendChild(el);
  });
  list.classList.remove('hidden');
  autocompleteVisible = true;
}

function moveTo(idx) {
  const items = document.querySelectorAll('.autocomplete-item');
  if (!items.length) return;
  highlightIdx = Math.max(0, Math.min(idx, items.length - 1));
  items.forEach((el, i) => el.classList.toggle('active', i === highlightIdx));
}

function selectIdx(idx) {
  const item = suggestions[idx];
  if (!item) return;
  const input = document.getElementById('metierInput');
  input.value        = item.l;
  state.romeLibelle  = item.l;
  state.romeFamily   = item.f;
  state.romeFamilyLabel = romeLiteData.familles[item.f] ?? item.f;
  hideList();
  checkValid();
}

function hideList() {
  const list = document.getElementById('autocompleteList');
  if (list) list.classList.add('hidden');
  autocompleteVisible = false;
  highlightIdx = -1;
  suggestions  = [];
}

// ── Validation & navigation ───────────────────────────────────────
function bindValidation() {
  const btn       = document.getElementById('btnCompute');
  const xpSel     = document.getElementById('xpInput');
  const regSel    = document.getElementById('regionInput');
  const metierInp = document.getElementById('metierInput');

  metierInp.addEventListener('blur', () => {
    if (metierInp.value.trim() && !state.romeFamily) {
      state.romeLibelle = metierInp.value.trim();
    }
    checkValid();
  });
  xpSel.addEventListener('change', () => {
    state.yearsXp = xpSel.value || null;
    checkValid();
  });
  regSel.addEventListener('change', () => {
    state.region = regSel.value;
    checkValid();
  });

  btn.addEventListener('click', () => {
    setProgress(0, 'Étape 3 / 3 — Vos résultats');
    showScreen('results');
    document.dispatchEvent(new CustomEvent('oya:compute'));
  });
}

function checkValid() {
  const metierInput = document.getElementById('metierInput');
  const btn = document.getElementById('btnCompute');
  if (!btn) return;
  btn.disabled = !metierInput?.value.trim();
}
