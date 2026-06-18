let bmoCache = null;

export async function loadBmo() {
  if (bmoCache) return bmoCache;
  const resp = await fetch('./bmo.json');
  bmoCache = await resp.json();
  return bmoCache;
}

/**
 * Agrège les stats BMO d'un bloc OYA.
 * Retourne toujours les stats nationales + les stats régionales si disponibles.
 * taux_tension = régional si dispo, sinon national (utilisé pour le badge).
 */
export function getBlocStats(bloc, bmoData, regionName) {
  const metiers = Object.values(bmoData.metiers).filter(m => m.bloc_oya === bloc);
  if (!metiers.length) return null;

  // Agrégat national
  let met = 0, xmet = 0;
  metiers.forEach(m => {
    met  += m.national.met  || 0;
    xmet += m.national.xmet || 0;
  });
  const tauxNat = met > 0 ? xmet / met : 0;

  // Nombre de métiers individuellement en tension (>= 40 %)
  const metiersTensionCount = metiers.filter(m => m.national.taux_tension >= 0.40).length;

  // Agrégat régional
  let metReg = 0, xmetReg = 0;
  if (regionName && regionName !== 'DOM-TOM / Autre') {
    metiers.forEach(m => {
      Object.values(m.departements || {}).forEach(d => {
        if (d.nom_reg === regionName) {
          metReg  += d.met  || 0;
          xmetReg += d.xmet || 0;
        }
      });
    });
  }
  const hasRegional = metReg > 0;
  const tauxReg = hasRegional ? xmetReg / metReg : null;

  return {
    // Compat PDF (xmet = régional si dispo, sinon national)
    met:  hasRegional ? metReg  : met,
    xmet: hasRegional ? xmetReg : xmet,
    // Badge driver
    taux_tension: hasRegional ? tauxReg : tauxNat,
    scope: hasRegional ? 'regional' : 'national',
    // Stats nationales (toujours présentes, pour le popup)
    met_nat:  met,
    xmet_nat: xmet,
    taux_nat: tauxNat,
    // Stats régionales (null si absentes, pour le popup)
    met_reg:  hasRegional ? metReg  : null,
    xmet_reg: hasRegional ? xmetReg : null,
    taux_reg: tauxReg,
    // Données de nuance (pour le popup)
    metiers_count:         metiers.length,
    metiers_tension_count: metiersTensionCount,
  };
}

export function getBadgeInfo(taux_tension) {
  if (taux_tension >= 0.40) return { label: 'En tension',  cssClass: 'bmo-tension'   };
  if (taux_tension >= 0.25) return { label: 'Dynamique',   cssClass: 'bmo-dynamique' };
  return                           { label: 'Stable',      cssClass: 'bmo-stable'    };
}
