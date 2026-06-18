import { state }                    from '../state.js';
import { showScreen, setProgress } from '../router.js';
import cardsData                   from '../data/cards.json';

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let cards = [];
let cardEl = null;
let behindEl = null;
let isDragging = false;
let startX = 0, startY = 0, currentX = 0, currentY = 0;
const SWIPE_THRESHOLD = 80;

export function initSwipe(container) {
  cards = shuffle(cardsData);
  state.cardIndex = 0;
  Object.keys(state.swipeScores).forEach(k => { state.swipeScores[k] = 0; });
  state.answers = [];

  document.querySelector('.progress-wrap').style.display = '';
  document.querySelector('.app-header').classList.add('header-hidden');

  container.innerHTML = `
    <div class="disclaimer-title-bar" id="disclaimerTitleBar">
      Bienvenue sur l'outil de matching Oya
    </div>
    <div class="disclaimer-logo-wrap" id="disclaimerLogo">
      <img src="./logo_oya.svg" alt="Oya" class="disclaimer-logo">
    </div>
    <div class="swipe-container">
      <div class="card-stack" id="cardStack"></div>
      <div class="swipe-actions" id="swipeActions" style="visibility:hidden">
        <button class="btn-swipe btn-no"  id="btnNo"   title="Non, pas vraiment">✕</button>
        <div class="swipe-actions-col">
          <button class="btn-swipe btn-superlike" id="btnSuperlike" title="C'est complètement moi">★</button>
          <button class="btn-swipe btn-skip"       id="btnSkip" title="Pas sûr·e">?</button>
        </div>
        <button class="btn-swipe btn-yes" id="btnYes"  title="Oui, c'est moi">✓</button>
      </div>
    </div>
  `;

  document.getElementById('btnNo').addEventListener('click', () => animate('no'));
  document.getElementById('btnSkip').addEventListener('click', () => animate('skip'));
  document.getElementById('btnYes').addEventListener('click', () => animate('yes'));
  document.getElementById('btnSuperlike').addEventListener('click', () => animate('superlike'));

  showDisclaimer(container);
}

function showDisclaimer(container) {
  const stack = document.getElementById('cardStack');
  stack.classList.add('card-stack--disclaimer');
  setProgress(0, 'Bienvenue');

  const el = document.createElement('div');
  el.className = 'swipe-card disclaimer-card';
  el.innerHTML = `
    <div class="disclaimer-body">
      <p>Cet outil propose <strong style="color: #EF8D11;">20 affirmations</strong> liées au domaine de la transition alimentaire et les métiers qui lui sont associés.</p>
      <p>Pour chacune d'elle, <strong style="color: #EF8D11;">indiquez si elle vous correspond ou non</strong> — il n'y a pas de bonne ou de mauvaise réponse.</p>
      <p>À la fin, vous obtiendrez une <strong style="color: #EF8D11;">recommandation personnalisée</strong> pour vous orienter vers les métiers de la transition alimentaire qui vous correspondent le mieux.</p>
    </div>
    <button class="btn-primary btn-disclaimer-start" id="btnStart" style="width:fit-content">Commencer →</button>
    <div class="disclaimer-footer">
      <p class="disclaimer-footer-title">🔒 À propos de vos données</p>
      <p>Vos réponses sont collectées de façon <strong>anonyme</strong> — aucun nom, prénom, e-mail ni adresse ne vous sera demandé. Ces données servent uniquement à améliorer notre offre de formations.</p>
    </div>
  `;
  stack.appendChild(el);

  document.getElementById('btnStart').addEventListener('click', () => {
    document.getElementById('swipeActions').style.visibility = '';
    renderCard(container);
  });
}

function renderCard(container) {
  const stack = document.getElementById('cardStack');
  if (!stack) return;
  stack.classList.remove('card-stack--disclaimer');

  const titleBar = document.getElementById('disclaimerTitleBar');
  if (titleBar) {
    document.querySelector('.app-header').classList.remove('header-hidden');
    titleBar.remove();
    document.getElementById('disclaimerLogo')?.remove();
  }

  stack.innerHTML = '';

  const total = cards.length;
  const idx = state.cardIndex;

  if (idx >= total) {
    goToProfile();
    return;
  }

  // Carte derrière (preview de la suivante)
  if (idx + 1 < total) {
    behindEl = makeCardEl(cards[idx + 1], false);
    behindEl.classList.add('card-behind');
    stack.appendChild(behindEl);
  }

  // Carte active
  cardEl = makeCardEl(cards[idx], true);
  cardEl.classList.add('card-front');
  stack.appendChild(cardEl);

  bindDrag(cardEl);

  const pct = Math.round((idx / total) * 100);
  setProgress(pct, `Affirmation ${idx + 1} / ${total}`);
}

function makeCardEl(card, withIndicators) {
  const el = document.createElement('div');
  el.className = 'swipe-card';
  el.innerHTML = `
    ${withIndicators ? `
      <span class="swipe-indicator ind-yes"       id="indYes">✓ Oui, c'est moi</span>
      <span class="swipe-indicator ind-no"        id="indNo">✕ Pas vraiment</span>
      <span class="swipe-indicator ind-superlike" id="indSuperlike">⭐ C'est complètement moi !</span>
      <span class="swipe-indicator ind-skip"      id="indSkip">○ Pas sûr·e</span>
    ` : ''}
    <p class="card-statement">${card.statement}</p>
    ${card.image ? `<div class="card-image-wrap"><img class="card-image" src="./${card.image}" alt=""></div>` : ''}
    <div class="card-tags">
      ${(card.tags || []).map(t => `<span class="card-tag">#${t}</span>`).join('')}
    </div>
  `;
  return el;
}

function bindDrag(el) {
  // Mouse
  el.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);
  // Touch
  el.addEventListener('touchstart', onStart, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onEnd);
}

function getX(e) { return e.touches ? e.touches[0].clientX : e.clientX; }
function getY(e) { return e.touches ? e.touches[0].clientY : e.clientY; }

function onStart(e) {
  isDragging = true;
  startX = getX(e);
  startY = getY(e);
  currentX = 0;
  currentY = 0;
  if (cardEl) cardEl.classList.add('dragging');
}

function onMove(e) {
  if (!isDragging || !cardEl) return;
  if (e.cancelable) e.preventDefault();

  currentX = getX(e) - startX;
  currentY = getY(e) - startY;

  const absX = Math.abs(currentX);
  const absY = Math.abs(currentY);
  const isVertical = absY > absX;

  const indYes       = document.getElementById('indYes');
  const indNo        = document.getElementById('indNo');
  const indSuperlike = document.getElementById('indSuperlike');
  const indSkip      = document.getElementById('indSkip');

  if (isVertical) {
    cardEl.style.transform = `translate(${currentX * 0.1}px, ${currentY}px)`;
    const ratio = Math.min(1, absY / SWIPE_THRESHOLD);

    if (currentY < -20) {
      // Vers le haut → Superlike
      cardEl.style.background = `rgba(249,178,51,${(ratio * 0.22).toFixed(3)})`;
      if (indSuperlike) indSuperlike.style.opacity = String(ratio);
      if (indSkip)      indSkip.style.opacity      = '0';
    } else if (currentY > 20) {
      // Vers le bas → Skip
      cardEl.style.background = `rgba(155,155,147,${(ratio * 0.15).toFixed(3)})`;
      if (indSkip)      indSkip.style.opacity      = String(ratio);
      if (indSuperlike) indSuperlike.style.opacity  = '0';
    } else {
      cardEl.style.background = '';
      if (indSuperlike) indSuperlike.style.opacity = '0';
      if (indSkip)      indSkip.style.opacity      = '0';
    }
    if (indYes) indYes.style.opacity = '0';
    if (indNo)  indNo.style.opacity  = '0';

  } else {
    // Horizontal (comportement actuel)
    const rotate = currentX * 0.08;
    cardEl.style.transform = `translate(${currentX}px, ${currentY * 0.3}px) rotate(${rotate}deg)`;
    const ratio = Math.min(1, absX / SWIPE_THRESHOLD);

    if (currentX > 20) {
      cardEl.style.background = `rgba(56,170,63,${(ratio * 0.18).toFixed(3)})`;
    } else if (currentX < -20) {
      cardEl.style.background = `rgba(194,54,20,${(ratio * 0.18).toFixed(3)})`;
    } else {
      cardEl.style.background = '';
    }

    if (indYes) indYes.style.opacity = currentX > 0 ? String(ratio) : '0';
    if (indNo)  indNo.style.opacity  = currentX < 0 ? String(ratio) : '0';
    if (indSuperlike) indSuperlike.style.opacity = '0';
    if (indSkip)      indSkip.style.opacity      = '0';
  }
}

function onEnd() {
  if (!isDragging) return;
  isDragging = false;
  if (cardEl) cardEl.classList.remove('dragging');

  const absX = Math.abs(currentX);
  const absY = Math.abs(currentY);

  if (absY > absX && absY > SWIPE_THRESHOLD) {
    if (currentY < 0) animate('superlike');
    else              animate('skip');
  } else if (currentX > SWIPE_THRESHOLD) {
    animate('yes');
  } else if (currentX < -SWIPE_THRESHOLD) {
    animate('no');
  } else {
    // Snap back
    if (cardEl) {
      cardEl.style.transition = 'transform .25s ease, background .2s ease';
      cardEl.style.transform  = '';
      cardEl.style.background = '';
      setTimeout(() => { if (cardEl) cardEl.style.transition = ''; }, 260);
    }
    ['indYes', 'indNo', 'indSuperlike', 'indSkip'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.opacity = '0';
    });
  }
}

function animate(direction) {
  if (!cardEl) return;
  const card = cards[state.cardIndex];

  // superlike = ×2, yes = ×1, no = ×–1, skip = 0
  const pts = direction === 'superlike' ? 2
            : direction === 'yes'       ? 1
            : direction === 'no'        ? -1
            : 0;

  if (card.scores) {
    Object.entries(card.scores).forEach(([bloc, w]) => {
      state.swipeScores[bloc] = (state.swipeScores[bloc] || 0) + pts * w;
    });
  }
  state.answers.push({ badge: card.badge, statement: card.statement, answer: direction });

  const flyClass = direction === 'yes'       ? 'flying-yes'
                 : direction === 'no'        ? 'flying-no'
                 : direction === 'superlike' ? 'flying-superlike'
                 : 'flying-skip';
  cardEl.classList.add(flyClass);

  setTimeout(() => {
    state.cardIndex++;
    const stack = document.getElementById('cardStack');
    if (stack) renderCard(stack.closest('main') || document.body);
  }, 350);
}

function goToProfile() {
  setProgress(0, 'Étape 2 / 3 — Votre profil');
  document.querySelector('.progress-wrap').style.display = 'none';
  showScreen('profile');
}
