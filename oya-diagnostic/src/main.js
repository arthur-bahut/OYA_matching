import { state, resetState } from './state.js';
import { showScreen, setProgress } from './router.js';
import { initSwipe }   from './screens/swipe.js';
import { initProfile } from './screens/profile.js';
import { initResults } from './screens/results.js';
import matrix          from './data/matrix.json';

// Initialiser les scores à 0 pour chaque bloc
matrix._meta.axes.blocs_oya.forEach(b => { state.swipeScores[b] = 0; });

// Monter les 3 screens
initSwipe(document.getElementById('screenSwipe'));
initProfile(document.getElementById('screenProfile'));
initResults(document.getElementById('screenResults'));

// Afficher le premier écran
showScreen('swipe');
setProgress(0, 'Étape 1 / 3 — Vos affinités');

// Restart (déclenché par event pour éviter la dépendance circulaire)
document.addEventListener('oya:restart', () => {
  resetState();
  matrix._meta.axes.blocs_oya.forEach(b => { state.swipeScores[b] = 0; });
  initSwipe(document.getElementById('screenSwipe'));
  showScreen('swipe');
  setProgress(0, 'Étape 1 / 3 — Vos affinités');
});
