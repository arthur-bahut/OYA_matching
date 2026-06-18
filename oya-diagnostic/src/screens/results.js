import { state }                    from '../state.js';
import { setProgress }             from '../router.js';
import { computeScores, COMP_SHORT } from '../engine/scoring.js';
import { getMetiersPourBloc, getFormationsSuggestions } from '../engine/gap.js';
import { exportPDF }         from '../engine/pdf.js';
import { loadBmo, getBlocStats, getBadgeInfo } from '../engine/bmo.js';
import { pushToAirtable }    from '../engine/airtable.js';
import domainsData           from '../data/domains.json';
import cardsData             from '../data/cards.json';
import matrix                from '../data/matrix.json';

const BLOC_PICTOS = {
  'Production agricole':                            'picto_16_champs.svg',
  'Transformation agroalimentaire & industries':    'picto_18_saladier.svg',
  'Logistique, distribution & circuits courts':     'picto_19_caisse_legumes.svg',
  'Restauration & métiers de bouche':               'picto_17_assiette_fourchette.svg',
  'Nutrition, santé & consommation':                'picto_11_pomme.svg',
  'Économie circulaire & environnement':            'picto_09_feuille_chene.svg',
  'Gouvernance, politiques publiques & transition': 'picto_03_batiment.svg',
  'Transversale':                                   'elem_icone_arc_couleurs.svg',
};

const BLOC_COLORS = {
  'Production agricole':                           '#38AA3F',
  'Transformation agroalimentaire & industries':   '#EF8D11',
  'Logistique, distribution & circuits courts':    '#2B3A47',
  'Restauration & métiers de bouche':              '#C23614',
  'Nutrition, santé & consommation':               '#3F886C',
  'Économie circulaire & environnement':           '#ABCC40',
  'Gouvernance, politiques publiques & transition':'#F9B233',
  'Transversale':                                  '#F2786E',
};


// Stockage des données accessibles aux handlers du popup
let bmoStatsMap   = {};
let scoreStatsMap = {}; // { bloc: { result, pct, color } }

export function initResults(container) {
  document.addEventListener('oya:compute', () => render(container).catch(console.error));
}

async function render(container) {
  setProgress(100, 'Diagnostic terminé ✓');
  const allScores = computeScores(state, matrix);
  const maxScore  = Math.max(...allScores.map(s => s.finalScore), 1);
  const eligible  = allScores.filter(r => Math.round((r.finalScore / maxScore) * 100) >= 50);
  const top3      = eligible.slice(0, 3);

  pushToAirtable(state, allScores, maxScore, top3);

  const domainMetiers = {};
  matrix._meta.axes.blocs_oya.forEach(bloc => {
    domainMetiers[bloc] = getMetiersPourBloc(bloc, domainsData, 5, state.constraints);
  });

  const bmoData = await loadBmo().catch(() => null);
  const bmoStats = {};
  bmoStatsMap   = {};
  scoreStatsMap = {};
  if (bmoData) {
    top3.forEach(r => {
      const s = getBlocStats(r.bloc, bmoData, state.region || null);
      bmoStats[r.bloc] = s;
      if (s) bmoStatsMap[r.bloc] = s;
    });
  }
  top3.forEach(r => {
    scoreStatsMap[r.bloc] = {
      result: r,
      pct:   Math.round((r.finalScore / maxScore) * 100),
      color: BLOC_COLORS[r.bloc] ?? '#888',
    };
  });

  const synthesis = buildProfileSynthesis(eligible, eligible[0]);

  container.innerHTML = `
    <div class="results-container">

      <!-- Intro -->
      <div class="result-intro" style="background:${BLOC_COLORS[top3[0].bloc] ?? 'var(--oya-navy)'}">
        <img class="result-intro-picto" src="./${BLOC_PICTOS[top3[0].bloc] ?? 'picto_16_champs.svg'}" alt="">
        <h2>Votre profil dominant : ${esc(top3[0].bloc)}</h2>
        <p>${state.romeLibelle
          ? `Basé sur vos affinités et votre parcours de ${esc(state.romeLibelle)}.`
          : 'Basé sur vos affinités déclarées.'
        }</p>
      </div>

      <!-- Actions rapides -->
      <button class="btn-pdf" id="btnPDF">⬇ Télécharger mon profil PDF</button>
      <button class="btn-restart" id="btnRestart">↺ Recommencer le diagnostic</button>

      <!-- Synthèse globale rédigée -->
      <div class="synthesis-card">
        <details class="profile-synthesis-accordion">
          <summary class="profile-synthesis-toggle">
            Synthèse de votre profil
            <span class="accordion-chevron">▾</span>
          </summary>
          <div class="profile-synthesis">${synthesis}</div>
        </details>
      </div>

      <!-- Top 3 cards -->
      <p class="results-section-heading">Les domaines qui matchent avec vous</p>
      ${top3.map((r, i) => renderResultCard(r, i, maxScore, domainMetiers[r.bloc] ?? [], bmoStats[r.bloc] ?? null)).join('')}

      <!-- CTA Oya -->
      <div class="result-cta-block">
        <p class="result-cta-title">Prêt·e à franchir le pas ?</p>
        <p class="result-cta-text">Oya propose des formations courtes et certifiantes pour accompagner votre reconversion vers la transition alimentaire.</p>
        <button class="btn-primary" onclick="alert('A brancher avant déploiement')">
          Voir les formations proposées par Oya
        </button>
        <a href="https://candidat.francetravail.fr/metierscope/metiers-avenir/transition-ecologique"
           target="_blank" rel="noopener" class="result-cta-secondary-link">
          En savoir plus sur la transition écologique et ses métiers ↗
        </a>
      </div>

      <p class="result-note">Ce diagnostic est indicatif. Il s'appuie sur vos réponses et les données France Travail, mais ne peut remplacer une exploration approfondie des métiers. Pour aller plus loin, consultez les fiches métiers sur
        <a href="https://candidat.francetravail.fr/metierscope/" target="_blank" rel="noopener" class="rome-link">MétierScope</a>.
      </p>
    </div>

    <!-- Popup générique (bottom-sheet mobile) -->
    <div id="oyaInfoPopup" class="bmo-popup" role="dialog" aria-modal="true">
      <div class="bmo-popup-overlay"></div>
      <div class="bmo-popup-sheet">
        <div class="bmo-popup-header">
          <div id="oyaInfoPopupTitle"></div>
          <button id="oyaInfoPopupClose" class="bmo-popup-close" aria-label="Fermer">✕</button>
        </div>
        <div id="oyaInfoPopupBody" class="bmo-popup-body"></div>
        <p id="oyaInfoPopupSource" class="bmo-popup-source"></p>
      </div>
    </div>
  `;

  // Animer les barres de score après rendu
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.querySelectorAll('.result-score-bar-fill[data-target]').forEach(b => {
        b.style.width = b.dataset.target + '%';
      });
    }, 80);
  });

  document.getElementById('btnPDF').addEventListener('click', () => {
    exportPDF(state, eligible, domainMetiers, bmoData);
  });
  document.getElementById('btnRestart').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('oya:restart'));
  });

  // ── Popup générique ─────────────────────────────────────────────
  const popup       = document.getElementById('oyaInfoPopup');
  const popupTitle  = document.getElementById('oyaInfoPopupTitle');
  const popupBody   = document.getElementById('oyaInfoPopupBody');
  const popupSource = document.getElementById('oyaInfoPopupSource');

  function openPopup(titleHTML, bodyHTML, sourceText = '') {
    popupTitle.innerHTML  = titleHTML;
    popupBody.innerHTML   = bodyHTML;
    popupSource.textContent = sourceText;
    popup.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closePopup() {
    popup.classList.remove('open');
    document.body.style.overflow = '';
  }

  container.addEventListener('click', e => {
    const bmoBtn   = e.target.closest('.bmo-info-btn');
    const scoreBtn = e.target.closest('.score-info-btn');
    if (bmoBtn) {
      const stats = bmoStatsMap[bmoBtn.dataset.bloc];
      if (!stats) return;
      const bmo = getBadgeInfo(stats.taux_tension);
      openPopup(
        `<span class="bmo-badge ${bmo.cssClass}">${bmo.label}</span>`,
        buildBmoPopupContent(bmoBtn.dataset.bloc, stats, bmo),
        'Source : Enquête BMO 2026 — France Travail'
      );
    }
    if (scoreBtn) {
      const data = scoreStatsMap[scoreBtn.dataset.bloc];
      if (!data) return;
      openPopup(
        `<span class="result-bloc-badge" style="background:${data.color}">${data.pct}%</span>
         <span class="score-popup-title-label">de compatibilité</span>`,
        buildScorePopupContent(data),
        ''
      );
    }
  });
  document.getElementById('oyaInfoPopupClose').addEventListener('click', closePopup);
  popup.querySelector('.bmo-popup-overlay').addEventListener('click', closePopup);
}

// ── Synthèse globale ──────────────────────────────────────────────
function buildProfileSynthesis(results, topResult) {
  const seenBadges = new Set();
  const yesBadges = state.answers
    .filter(a => a.answer === 'yes' || a.answer === 'superlike')
    .map(a => cardsData.find(c => c.statement === a.statement))
    .filter(Boolean)
    .map(c => c.badge.replace(/^\S+\s*/, ''))
    .filter(name => seenBadges.has(name) ? false : seenBadges.add(name))
    .slice(0, 3)
    .map(name => `<strong>${name}</strong>`);

  const top3 = [...new Set(results.map(r => r.bloc))]
    .slice(0, 3)
    .map(b => `<strong>${b}</strong>`);
  const parts = [];

  if (yesBadges.length > 0) {
    parts.push(`Vos réponses révèlent un attrait marqué pour ${yesBadges.join(', ')}.`);
  }

  if (state.romeLibelle && topResult) {
    const t2 = topResult.scoreT2 ?? 0;
    const atouts = topResult.atouts ?? [];
    if (t2 >= 1.5 && atouts.length > 0) {
      const comps = atouts.slice(0, 2).map(a => `<em>${esc(COMP_SHORT[a.comp] ?? a.comp)}</em>`);
      parts.push(`Votre expérience comme <strong>${esc(state.romeLibelle)}</strong> est un vrai atout : vos compétences en ${comps.join(' et en ')} sont directement valorisables dans de nombreux métiers de la transition alimentaire.`);
    } else if (t2 >= 0.5) {
      parts.push(`Votre parcours comme <strong>${esc(state.romeLibelle)}</strong> offre des compétences partiellement transférables vers la transition alimentaire.`);
    }
  }

  parts.push(`Les domaines qui semblent les plus cohérents avec votre profil sont ${top3.join(', ')}.`);

  return `<ul class="synthesis-list">${parts.map(p => `<li><span>${p}</span></li>`).join('')}</ul>`;
}

// ── Insight par domaine ───────────────────────────────────────────
function buildDomainInsight(result, pct) {
  const { bloc, scoreT2, atouts } = result;
  const T3m = matrix.T3_contraintes_x_blocs.scores;
  const parts = [];

  const matchingBadges = state.answers
    .filter(a => a.answer === 'yes' || a.answer === 'superlike')
    .map(a => cardsData.find(c => c.statement === a.statement))
    .filter(c => c && (c.scores?.[bloc] || 0) > 0)
    .map(c => c.badge.replace(/^\S+\s*/, ''));

  if (pct > 90) {
    if (matchingBadges.length === 1) {
      parts.push(`Votre intérêt pour <em>${esc(matchingBadges[0])}</em> vous orienterait vers ce domaine.`);
    } else if (matchingBadges.length >= 2) {
      parts.push(`Vos affinités pour <em>${esc(matchingBadges[0])}</em> et <em>${esc(matchingBadges[1])}</em> vous orienteraient naturellement vers ce domaine.`);
    }
  }

  if (state.romeLibelle && scoreT2 > 1.5 && atouts.length) {
    const compLabel = COMP_SHORT[atouts[0].comp] || atouts[0].comp;
    parts.push(`Votre expérience en tant que ${esc(state.romeLibelle)} est un atout en <em>${compLabel}</em>.`);
  } else if (state.romeFamily && scoreT2 > 1) {
    parts.push(`Votre parcours en ${esc(state.romeFamilyLabel || 'famille ' + state.romeFamily)} est valorisable ici.`);
  }

  const strongConstraints = [...state.constraints].filter(c => {
    const row = T3m[c];
    return row && (row[bloc] || 0) >= 3;
  });
  if (strongConstraints.length > 0) {
    const label = strongConstraints[0].replace(/\s*\(.*\)/, '').trim();
    parts.push(`Votre profil (${label}) renforce la cohérence de ce choix.`);
  }

  return parts.join(' ') || 'Ce domaine s\'inscrit dans la continuité de votre profil global.';
}

// ── Rendu d'une result card ───────────────────────────────────────
function renderResultCard(result, rank, maxScore, metiers, bmoStats) {
  const color      = BLOC_COLORS[result.bloc] ?? '#888';
  const pct        = Math.round((result.finalScore / maxScore) * 100);
  const insight    = buildDomainInsight(result, pct);
  const formations = getFormationsSuggestions(result.bloc, domainsData, state.constraints);
  const rankEmoji  = ['🥇', '🥈', '🥉'][rank];
  const bmo        = bmoStats ? getBadgeInfo(bmoStats.taux_tension) : null;

  return `
    <div class="result-card fade-in">
      <div class="result-card-header">
        <div class="result-rank">${rankEmoji}</div>
        <div class="result-bloc-name">${esc(result.bloc)}</div>
        <div class="result-card-header-right">
          ${bmo ? `
            <div class="bmo-badge-wrap">
              <span class="bmo-badge ${bmo.cssClass}">${bmo.label}</span>
              <button class="bmo-info-btn ${bmo.cssClass}" data-bloc="${esc(result.bloc)}" aria-label="En savoir plus sur le marché de l'emploi">?</button>
            </div>
          ` : ''}
          <div class="score-badge-wrap">
            <span class="result-bloc-badge" style="background:${color}">${pct}%</span>
            <button class="score-info-btn" data-bloc="${esc(result.bloc)}" style="background:${color}" aria-label="Comprendre ce score">?</button>
          </div>
        </div>
      </div>

      <div class="result-score-bar-wrap">
        <div class="result-score-bar-bg">
          <div class="result-score-bar-fill" style="width:0%;background:${color}" data-target="${pct}"></div>
        </div>
      </div>

      <details class="result-card-accordion">
        <summary class="result-card-accordion-toggle">
          Voir le détail
          <span class="accordion-chevron">▾</span>
        </summary>
        <div class="result-card-body">

          <!-- Insight personnalisé -->
          <p class="result-insight">${insight}</p>

          <!-- Métiers -->
          <div>
            <p class="result-section-title">Exemples de métiers associés</p>
            <div class="metiers-list">
              ${metiers.slice(0, 3).map(m => `
                <div class="metier-item">
                  <div class="metier-dot" style="background:${color}"></div>
                  <span>${esc(m.nom)}</span>
                  ${m.statut ? `<span class="metier-statut ${statutClass(m.statut)}">${statutLabel(m.statut)}</span>` : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Écart compétences -->
          ${(result.atouts?.length || result.aDevelopper?.length) ? `
          <div>
            <p class="result-section-title">Analyse de compétences</p>
            <div class="gap-grid">
              ${result.atouts.map(a => `
                <div class="gap-chip gap-atout">✓ ${esc(COMP_SHORT[a.comp] ?? a.comp)}</div>
              `).join('')}
              ${result.aDevelopper.map(a => `
                <div class="gap-chip gap-manque">✕ ${esc(COMP_SHORT[a.comp] ?? a.comp)}</div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <!-- Formations -->
          ${formations.length ? `
          <div>
            <p class="result-section-title">Formations suggérées</p>
            <div class="formations-list">
              ${formations.map(f => `
                <div class="formation-item">
                  <span class="formation-icon">🎓</span>
                  <span>${esc(f.label)}</span>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

        </div>
      </details>
    </div>
  `;
}

// ── Max T2 atteignable par bloc (toutes familles ROME confondues) ─
const _maxT2Cache = {};
function computeMaxT2(bloc) {
  if (_maxT2Cache[bloc] !== undefined) return _maxT2Cache[bloc];
  const T1m  = matrix.T1_bloc_x_competences.scores;
  const T2m  = matrix.T2_rome_x_competences.scores;
  const comps = matrix._meta.axes.familles_competences_oya;
  const t1vec = T1m[bloc];
  let maxScore = 0;
  Object.values(T2m).forEach(t2vec => {
    let dot = 0;
    comps.forEach(c => { dot += (t2vec[c] || 0) * (t1vec[c] || 0); });
    maxScore = Math.max(maxScore, dot / 25);
  });
  _maxT2Cache[bloc] = maxScore || 1;
  return _maxT2Cache[bloc];
}

// ── Contenu du popup Score ───────────────────────────────────────
function buildScorePopupContent({ result, pct, color }) {
  const W3 = matrix._meta.ponderation.T3_contraintes;
  const c3 = result.scoreT3 * W3;

  // T1 : affinités swipes — scoreT1 ∈ [–5, 5] → affiché en [0, 100%]
  // Peut être négatif si l'utilisateur a majoritairement écarté les cartes de ce bloc
  const t1Val     = Math.max(0, Math.min(100, Math.round((result.scoreT1 / 5) * 100)));
  const t1Neg     = result.scoreT1 < 0;

  // T2 : compatibilité ROME — normalisée par rapport au max possible pour CE bloc
  const maxT2     = computeMaxT2(result.bloc);
  const t2Val     = Math.max(0, Math.min(100, Math.round((result.scoreT2 / maxT2) * 100)));

  const bar = (icon, label, val) => `
    <div class="score-popup-bar-row">
      <div class="score-popup-bar-meta">
        <span class="score-popup-bar-icon">${icon}</span>
        <span class="score-popup-bar-label">${label}</span>
        <span class="score-popup-bar-pct">${val}%</span>
      </div>
      <div class="score-popup-bar-bg">
        <div class="score-popup-bar-fill" style="width:${val}%;background:${color}"></div>
      </div>
    </div>`;

  const t1Note = t1Neg
    ? '<p class="score-popup-t3 score-popup-t3--negative">🃏 Vous avez plutôt écarté les affirmations de ce domaine lors du swipe.</p>'
    : '';
  const t3Note = c3 > 0.3
    ? '<p class="score-popup-t3 score-popup-t3--positive">⚙️ Vos préférences pratiques ont renforcé ce résultat.</p>'
    : c3 < -0.3
    ? '<p class="score-popup-t3 score-popup-t3--negative">⚙️ Certaines de vos contraintes pratiques ont légèrement réduit ce score.</p>'
    : '';

  // Top 3 cartes "oui" les plus contributives pour ce bloc
  const topCards = state.answers
    .filter(a => a.answer === 'yes' || a.answer === 'superlike')
    .map(a => {
      const card = cardsData.find(c => c.statement === a.statement);
      return card ? { ...card, blocScore: card.scores?.[result.bloc] ?? 0 } : null;
    })
    .filter(c => c && c.blocScore > 0)
    .sort((a, b) => b.blocScore - a.blocScore)
    .slice(0, 3);

  const cardsHtml = topCards.length ? `
    <p class="score-popup-cards-title">Ce qui a le plus joué dans vos réponses</p>
    <div class="score-popup-cards">
      ${topCards.map(c => `
        <div class="score-popup-card-item">
          <span class="score-popup-card-badge">${c.badge.split(' ')[0]}</span>
          <span class="score-popup-card-text">${esc(c.statement)}</span>
        </div>
      `).join('')}
    </div>
  ` : '';

  const hasRome = !!state.romeFamily;

  return `
    <p class="bmo-popup-def">
      ${pct === 100
        ? 'C\'est votre domaine le plus compatible — pas nécessairement parfait, mais le plus cohérent avec l\'ensemble de vos réponses.'
        : `Ce domaine est à ${pct}% de votre meilleur résultat.`}
      Chaque indicateur est indépendant : l'un mesure vos affinités déclarées${hasRome ? ', l\'autre la compatibilité de votre parcours professionnel' : ''}.
    </p>
    <div class="score-popup-bars">
      ${bar('🃏', 'Affinités (vos swipes)', t1Val)}
      ${hasRome ? bar('💼', 'Compatibilité parcours pro', t2Val) : ''}
    </div>
    ${t1Note}
    ${t3Note}
    ${cardsHtml}
  `;
}

// ── Contenu du popup BMO ─────────────────────────────────────────
function buildBmoPopupContent(bloc, stats, bmo) {
  const fmtPct = r => Math.round(r * 100) + ' %';
  const fmtN   = n => n.toLocaleString('fr-FR');

  const defs = {
    'bmo-tension':   'Plus de 40 % des recrutements dans ce domaine sont jugés difficiles par les employeurs. Les profils qualifiés sont rares : c\'est un marché favorable aux candidats en reconversion.',
    'bmo-dynamique': 'Entre 25 et 40 % des recrutements sont jugés difficiles. Le marché recrute activement, avec une concurrence modérée pour les postes.',
    'bmo-stable':    'Moins de 25 % des recrutements sont jugés difficiles. L\'offre et la demande sont relativement équilibrées dans ce domaine.',
  };

  const isRegional = stats.scope === 'regional' && stats.taux_reg != null;

  const statsGrid = isRegional ? `
    <div class="bmo-popup-stats-grid">
      <div class="bmo-popup-stat">
        <div class="bmo-popup-stat-label">Votre région</div>
        <div class="bmo-popup-stat-value">${fmtPct(stats.taux_reg)}</div>
        <div class="bmo-popup-stat-sub">${fmtN(stats.met_reg)} recrutements prévus</div>
      </div>
      <div class="bmo-popup-stat">
        <div class="bmo-popup-stat-label">France entière</div>
        <div class="bmo-popup-stat-value">${fmtPct(stats.taux_nat)}</div>
        <div class="bmo-popup-stat-sub">${fmtN(stats.met_nat)} recrutements prévus</div>
      </div>
    </div>
  ` : `
    <div class="bmo-popup-stats-grid">
      <div class="bmo-popup-stat">
        <div class="bmo-popup-stat-label">Taux de tension national</div>
        <div class="bmo-popup-stat-value">${fmtPct(stats.taux_nat)}</div>
      </div>
      <div class="bmo-popup-stat">
        <div class="bmo-popup-stat-label">Recrutements prévus</div>
        <div class="bmo-popup-stat-value">${fmtN(stats.met_nat)}</div>
      </div>
    </div>
  `;

  const nuances = [];
  if (bmo.cssClass !== 'bmo-tension' && stats.metiers_tension_count > 0) {
    nuances.push(
      `${stats.metiers_tension_count} métier${stats.metiers_tension_count > 1 ? 's' : ''} sur ${stats.metiers_count} dans ce domaine dépassent individuellement 40 % de recrutements difficiles, même si la moyenne agrégée reste en dessous du seuil.`
    );
  }
  if (stats.metiers_count === 1) {
    nuances.push('Ces données reposent sur une seule catégorie statistique BMO, ce qui limite leur précision pour l\'ensemble du domaine.');
  }

  return `
    <p class="bmo-popup-def">${defs[bmo.cssClass] ?? ''}</p>
    ${statsGrid}
    ${nuances.map(n => `<div class="bmo-popup-nuance">${n}</div>`).join('')}
  `;
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function statutClass(s) {
  if (/émergent/i.test(s)) return 'statut-emergent';
  if (/tension/i.test(s))  return 'statut-tension';
  return '';
}
function statutLabel(s) {
  if (/émergent/i.test(s)) return '🟠 Émergent';
  if (/tension/i.test(s))  return '🔴 En tension';
  return s;
}
