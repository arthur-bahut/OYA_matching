import { getBlocStats } from './bmo.js';
import { COMP_SHORT } from './scoring.js';

const BLOC_COLORS = {
  'Production agricole':                           [56, 170, 63],
  'Transformation agroalimentaire & industries':   [239, 141, 17],
  'Logistique, distribution & circuits courts':    [43, 58, 71],
  'Restauration & métiers de bouche':              [194, 54, 20],
  'Nutrition, santé & consommation':               [63, 136, 108],
  'Économie circulaire & environnement':           [171, 204, 64],
  'Gouvernance, politiques publiques & transition':[249, 178, 51],
  'Transversale':                                  [242, 120, 110],
};

const DOMAIN_DESCRIPTIONS = {
  'Production agricole': {
    what: "Ce domaine regroupe les métiers de la production végétale et animale dans une logique durable : maraîchage bio, agriculture urbaine, agroforesterie, élevage en plein air…",
    reality: "La réalité est physique et saisonnière, mais aussi entrepreneuriale. Un maraîcher agroécologique gère 2 à 5 hectares, planifie ses rotations de cultures, commercialise en AMAP ou sur les marchés et jongle avec la météo, la logistique et la relation client.",
  },
  'Transformation agroalimentaire & industries': {
    what: "Ce domaine couvre la transformation des matières premières en produits alimentaires durables : fromagerie fermière, boulangerie au levain, conserverie, brasserie artisanale, contrôle qualité en IAA éco-responsable…",
    reality: "Entre artisanat et process industriel, les métiers combinent technicité et créativité. Un fromager à la ferme collecte le lait, enchaîne fabrication et affinage, gère les normes HACCP et commercialise en direct.",
  },
  'Logistique, distribution & circuits courts': {
    what: "Ce domaine organise la mise en relation entre producteurs locaux et consommateurs : AMAP, drives fermiers, plateformes alimentaires locales, épiceries solidaires, coopératives de distribution…",
    reality: "Un gestionnaire de plateforme alimentaire locale coordonne des dizaines de producteurs, gère les commandes hebdomadaires, organise les tournées de livraison et anime la communauté d'adhérents.",
  },
  'Restauration & métiers de bouche': {
    what: "Ce domaine englobe les métiers de la cuisine et du service dans une perspective durable : cuisine engagée, restauration collective bio, traiteur éco-responsable, épicerie fine locale…",
    reality: "Un chef de cuisine collective engagée peut servir 500 repas par jour tout en atteignant 50 % de produits bio et locaux, en réduisant le gaspillage alimentaire et en formant son équipe.",
  },
  'Nutrition, santé & consommation': {
    what: "Ce domaine réunit les métiers du conseil, de l'éducation et de l'accompagnement autour d'une alimentation favorable à la santé : diététiciens spécialisés, éducateurs alimentaires, conseillers en nutrition durable…",
    reality: "Un diététicien spécialisé en alimentation durable peut intervenir en entreprise, en collectivité ou en libéral. Son rôle dépasse le calcul des apports nutritionnels : il est un passeur entre science, culture alimentaire et comportements du quotidien.",
  },
  'Économie circulaire & environnement': {
    what: "Ce domaine s'attaque aux pertes et aux déchets du système alimentaire : lutte contre le gaspillage, valorisation des biodéchets, compostage, emballages biosourcés, économie des ressources en IAA…",
    reality: "Un chargé de projet anti-gaspillage en grande distribution audite les stocks, met en place des partenariats avec des associations de redistribution, forme les équipes et mesure les tonnes économisées.",
  },
  'Gouvernance, politiques publiques & transition': {
    what: "Ce domaine regroupe les métiers qui agissent sur les systèmes alimentaires à l'échelle des territoires et des politiques publiques : chargés de mission PAT, consultants en stratégie alimentaire, animateurs de concertation…",
    reality: "Un chargé de mission PAT coordonne les acteurs d'un bassin de vie - élus, agriculteurs, restaurateurs, associations - autour d'un plan d'action à 5 ans, mobilise des financements régionaux et européens et construit les indicateurs de suivi.",
  },
  'Transversale': {
    what: "Ce domaine regroupe les profils qui interviennent en soutien de l'ensemble des acteurs de la transition alimentaire : formateurs, coachs en reconversion, chargés de développement de réseau, ingénieurs pédagogiques…",
    reality: "Un formateur en agroécologie peut dispenser 200 heures par an à destination d'agriculteurs en reconversion, de futurs maraîchers ou de salariés de l'IAA. La diversité des publics et des sujets traités est sa principale richesse.",
  },
};

// Mapping clés contraintes → libellés courts pour le profil
const QUALIF_LABELS = {
  'Niveau de qualification Bac ou moins':  'Bac ou moins',
  'Niveau de qualification Bac+2 à Bac+3': 'Bac +2 / +3',
  'Niveau de qualification Bac+5 et plus': 'Bac +5 et +',
};
const FREQ_LABELS = {
  'Disponibilité fréquence/semaine - temps plein':   'Plein temps',
  'Disponibilité fréquence/semaine - temps partiel': 'Temps partiel',
  'Disponibilité fréquence/semaine - qq heures':     'Quelques heures/semaine',
};
const DUREE_LABELS = {
  'Disponibilité durée totale - peu':     'Moins de 3 mois',
  'Disponibilité durée totale - moyenne': '3 à 6 mois',
  'Disponibilité durée totale - plus':    'Plus de 6 mois',
};
const BUDGET_LABELS = {
  'Budget formation limité (< 2 000€)':        'Moins de 2 000 EUR',
  'Budget formation moyen (2 000€ à 5 000€)':  '2 000 - 5 000 EUR',
  'Budget formation élevé (> 5 000€)':          'Plus de 5 000 EUR',
};
const SOFT_LABELS = {
  'Mobilité géographique (prêt à déménager)':     'Mobilité géographique',
  'Travail en extérieur (conditions climatiques)': 'Travail en extérieur',
  'Travail physique / port de charges':            'Travail physique',
  'Travail en horaires décalés / week-end':        'Horaires décalés',
  'Appétence numérique / outils digitaux':         'Appétence numérique',
  'Sensibilité écologique forte':                  'Engagement écologique',
  'Goût du contact client / public':               'Contact public',
  "Autonomie / goût d'entreprendre":               "Goût d'entreprendre",
  'Sens de la pédagogie / goût transmission':      'Goût de transmettre',
  'Goût du travail en équipe / esprit collectif':  'Esprit d\'équipe',
};

// Tous les préfixes non-softskill (pour les filtrer par exclusion)
const ALL_NON_SOFT = new Set([
  ...Object.keys(QUALIF_LABELS),
  ...Object.keys(FREQ_LABELS),
  ...Object.keys(DUREE_LABELS),
  ...Object.keys(BUDGET_LABELS),
]);

const W        = 210;
const PAD      = 16;
const CW       = W - PAD * 2;
const FOOTER_Y = 275;

function fmtN(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function checkPage(doc, y, needed = 12) {
  if (y + needed > FOOTER_Y) {
    doc.addPage();
    return 22;
  }
  return y;
}

// Bloc label + texte wrappé
function section(doc, label, text, y) {
  if (!text) return y;
  y = checkPage(doc, y, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(26, 26, 24);
  doc.text(label, PAD, y);
  y += 4.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const lines = doc.splitTextToSize(text, CW);
  doc.text(lines, PAD, y);
  return y + lines.length * 4.0 + 2;
}

// Titre de section avec trait horizontal
function sectionTitle(doc, title, y) {
  y = checkPage(doc, y, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(26, 26, 24);
  doc.text(title, PAD, y);
  y += 3;
  doc.setDrawColor(200, 200, 195);
  doc.line(PAD, y, W - PAD, y);
  return y + 6;
}

// Agrège un champ sur les top métiers du bloc (déduplication)
function aggregate(metiers, field) {
  const vals = metiers.slice(0, 6)
    .map(m => m[field] || '')
    .join(', ')
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(Boolean);
  return [...new Set(vals)].join(', ') || null;
}

// Retire les emojis d'une chaîne (pour le PDF avec polices standard)
function stripEmoji(str) {
  return str.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{FE00}-\u{FEFF}]/gu, '').trim();
}

async function loadLogoPng() {
  try {
    const resp = await fetch('./logo_oya_blanc.svg');
    const svgText = await resp.text();
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 500;
        canvas.height = 314;
        canvas.getContext('2d').drawImage(img, 0, 0, 300, 188);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(); };
      img.src = url;
    });
  } catch {
    return null;
  }
}

export async function exportPDF(state, scores, domainMetiers, bmoData) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logoPng = await loadLogoPng();

  let y = 0;

  // ── En-tête ──────────────────────────────────────────────────────
  doc.setFillColor(43, 58, 71);
  doc.rect(0, 0, W, 36, 'F');
  doc.setTextColor(255, 255, 255);

  if (logoPng) {
    doc.addImage(logoPng, 'PNG', PAD, 2, 41, 26);
  } else {
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('OYA', PAD, 17);
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const textX = logoPng ? PAD + 44 : PAD;
  doc.text("Diagnostic d'orientation & besoins de formation", textX, 25);

  y = 46;

    // ── Votre profil ─────────────────────────────────────────────────
  y = checkPage(doc, y, 20);
  y += 6;
  y = sectionTitle(doc, 'Votre profil', y);

  const constraints = state.constraints ?? new Set();

  // Métier & expérience
  if (state.romeLibelle) {
    const xp  = state.yearsXp ? ` — ${state.yearsXp} d'expérience` : '';
    const fam = state.romeFamilyLabel ? ` (${state.romeFamilyLabel})` : '';
    y = section(doc, 'Métier d\'origine :', state.romeLibelle + fam + xp, y);
  }

  // Région
  if (state.region) {
    y = section(doc, 'Région :', state.region, y);
  }

  // Niveau de qualification
  const qualifKey = [...constraints].find(k => QUALIF_LABELS[k]);
  if (qualifKey) {
    y = section(doc, 'Niveau de qualification :', QUALIF_LABELS[qualifKey], y);
  }

  // Disponibilité
  const freqKey   = [...constraints].find(k => FREQ_LABELS[k]);
  const dureeKey  = [...constraints].find(k => DUREE_LABELS[k]);
  const budgetKey = [...constraints].find(k => BUDGET_LABELS[k]);
  const dispoText = [
    freqKey  ? FREQ_LABELS[freqKey]   : null,
    dureeKey ? DUREE_LABELS[dureeKey] : null,
  ].filter(Boolean).join(', ');
  if (dispoText) y = section(doc, 'Disponibilité pour une formation :', dispoText, y);
  if (budgetKey) y = section(doc, 'Budget pour une formation :', BUDGET_LABELS[budgetKey], y);

  // Soft skills
  const softSkills = [...constraints]
    .filter(k => !ALL_NON_SOFT.has(k) && SOFT_LABELS[k])
    .map(k => SOFT_LABELS[k]);
  if (softSkills.length) {
    y = section(doc, 'Atouts & intérêts personnels :', softSkills.join(', '), y);
  }

  // ── Résultats ────────────────────────────────────────────────────
  y = sectionTitle(doc, "Les secteurs avec lesquels vous avez le plus d'affinite", y);

  const top3     = scores.slice(0, 3);
  const maxScore = Math.max(...top3.map(s => s.finalScore), 1);

  for (let i = 0; i < top3.length; i++) {
    const result  = top3[i];
    const color   = BLOC_COLORS[result.bloc] ?? [100, 100, 100];
    const metiers = (domainMetiers[result.bloc] ?? []).slice(0, 6);
    const pct     = Math.round((result.finalScore / maxScore) * 100);

    y = checkPage(doc, y, 45);

    // Bandeau couleur + pourcentage
    doc.setFillColor(...color);
    doc.roundedRect(PAD, y, CW, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    const blocLabel = `${i + 1}. ${result.bloc}`;
    const pctLabel  = `${pct}%`;
    const maxBlocW  = CW - doc.getTextWidth(pctLabel) - 8;
    let truncated   = blocLabel;
    while (doc.getTextWidth(truncated) > maxBlocW && truncated.length > 5) {
      truncated = truncated.slice(0, -4) + '...';
    }
    doc.text(truncated, PAD + 3, y + 7);
    doc.text(pctLabel, W - PAD - 3, y + 7, { align: 'right' });

    y += 17;
    doc.setTextColor(26, 26, 24);

    // BMO
    if (bmoData) {
      const stats = getBlocStats(result.bloc, bmoData, state.region || null);
      if (stats) {
        const scope   = stats.scope === 'regional' && state.region ? state.region : 'France';
        const bmoLine = `${fmtN(stats.xmet)} projets de recrutement dans ${scope} (BMO 2026)`;
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(80, 80, 80);
        const bmoLines = doc.splitTextToSize(bmoLine, CW);
        doc.text(bmoLines, PAD, y);
        y += bmoLines.length * 4.5 + 2;
        doc.setTextColor(26, 26, 24);
      }
    }

    // Description du domaine
    const desc = DOMAIN_DESCRIPTIONS[result.bloc];
    if (desc) {
      y = section(doc, `A propos de ${result.bloc} :`, desc.what, y);
      y = section(doc, 'La réalité terrain :', desc.reality, y);
    }

    // Métiers avec statut
    if (metiers.length) {
      y = checkPage(doc, y, 10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(26, 26, 24);
      doc.text(`Exemples de métiers associés au domaine ${result.bloc} :`, PAD, y);
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      metiers.forEach(m => {
        y = checkPage(doc, y, 6);
        doc.setFillColor(...color.map(c => Math.min(255, c + 150)));
        doc.circle(PAD + 2.5, y - 1.2, 1.2, 'F');
        const statutLabel = /émergent/i.test(m.statut) ? ' [Emergent]'
                          : /tension/i.test(m.statut)  ? ' [En tension]'
                          : '';
        const nomLines = doc.splitTextToSize(m.nom + statutLabel, CW - 9);
        doc.text(nomLines, PAD + 7, y);
        y += nomLines.length * 4.0;
      });
      y += 2;
    }

    // Compétences clés
    y = section(doc, 'Compétences clés :', aggregate(metiers, 'competences_cles'), y);

    // Contraintes
    y = section(doc, 'Contraintes à anticiper :', aggregate(metiers, 'contraintes'), y);

    // Secteurs
    y = section(doc, 'Structures :', aggregate(metiers, 'secteurs'), y);

    // Compétences transférables
    if (result.atouts?.length) {
      y = checkPage(doc, y, 12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(26, 26, 24);
      doc.text('Vos compétences transférables :', PAD, y);
      y += 4.2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const atoutText  = result.atouts.map(a => `${COMP_SHORT[a.comp] ?? a.comp}`).join('   ');
      const atoutLines = doc.splitTextToSize(atoutText, CW);
      doc.text(atoutLines, PAD + 2, y);
      y += atoutLines.length * 4.0 + 2;
    }

    // Compétences à développer
    if (result.aDevelopper?.length) {
      y = checkPage(doc, y, 12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(26, 26, 24);
      doc.text('Compétences à développer :', PAD, y);
      y += 4.2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const gapText  = result.aDevelopper.map(a => `${COMP_SHORT[a.comp] ?? a.comp}`).join('   ');
      const gapLines = doc.splitTextToSize(gapText, CW);
      doc.text(gapLines, PAD + 2, y);
      y += gapLines.length * 4.0 + 2;
    }

    y += 5;

    if (i < top3.length - 1) {
      y = checkPage(doc, y, 8);
      doc.setDrawColor(210, 210, 205);
      doc.line(PAD, y, W - PAD, y);
      y += 7;
    }
  }

  // ── Récapitulatif des réponses Swipe ─────────────────────────────
  if (state.answers?.length) {
    y = checkPage(doc, y, 20);
    y += 6;
    y = sectionTitle(doc, 'Récapitulatif de vos réponses aux affirmations', y);

    const groups = [
      { label: 'Superlike',         answers: ['superlike'],        prefix: '*' },
      { label: 'Oui',               answers: ['yes'],              prefix: '+' },
      { label: 'Non',               answers: ['no'],               prefix: '-' },
      { label: 'Pas sur(e)',        answers: ['skip'],             prefix: '?' },
    ];

    for (const group of groups) {
      const items = state.answers.filter(a => group.answers.includes(a.answer));
      if (!items.length) continue;

      y = checkPage(doc, y, 10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(26, 26, 24);
      doc.text(`${group.label} (${items.length})`, PAD, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);

      for (const item of items) {
        y = checkPage(doc, y, 6);
        const badge = stripEmoji(item.badge);
        const line  = doc.splitTextToSize(`${group.prefix} [${badge}] ${item.statement}`, CW - 4);
        doc.text(line, PAD + 2, y);
        y += line.length * 3.8;
      }
      y += 3;
    }
  }


  // ── Pied de page ─────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setTextColor(160, 160, 155);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Oya — lescolsverts.fr | Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      PAD, 291
    );
    if (pageCount > 1) {
      doc.text(`${p} / ${pageCount}`, W - PAD, 291, { align: 'right' });
    }
  }

  doc.save('Votre-diag-Oya.pdf');
}
