/**
 * Fonctions de navigation UI — module sans dépendance circulaire.
 * DOM résolu à l'appel (lazy), pas à l'import.
 */

export function showScreen(name) {
  const map = {
    swipe:   document.getElementById('screenSwipe'),
    profile: document.getElementById('screenProfile'),
    results: document.getElementById('screenResults'),
  };
  Object.values(map).forEach(s => {
    if (!s) return;
    s.classList.remove('screen-active');
    s.style.display = 'none';
  });
  const target = map[name];
  if (!target) return;
  target.style.display = 'flex';
  target.classList.add('screen-active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function setProgress(pct, label) {
  const bar = document.getElementById('progressBar');
  const lbl = document.getElementById('progressLabel');
  if (bar) bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  if (lbl) lbl.textContent = label ?? '';
}
