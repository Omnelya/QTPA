/* ═══ RÉGLAGES DU MATCH (⚙) — modifiables à tout moment — v1.9.0 ═════════
   Équipes, n° de joueurs, arbitres, date/heure/compétition, durées des
   périodes et nombre de mi-temps (ce dernier seulement avant le début de MT2).
   Renommer une équipe ou un arbitre met aussi à jour les observations déjà saisies. */
import { S, applyPeriodLabels } from './state.js';
import { escapeHtml, fmtDate } from './utils.js';
import { makeWheel, readWheel } from './match.js';

const $ = id => document.getElementById(id);
const _clamp = (v, a, b) => Math.max(a, Math.min(b, parseInt(v, 10) || a));

/* v1.12.0 : choix en attente, appliqués seulement par « Enregistrer » (Annuler = rien ne change) */
let _nb = 2, _durs = [1800, 1800];

/* v1.12.0 : durées choisies avec les mêmes roues que la fenêtre de démarrage */
function _durRow() {
  const box = $('sgDurs');
  box.innerHTML = '';
  for (let i = 0; i < _nb; i++) {
    const col = document.createElement('div');
    col.className = 'sg-wcol';
    col.innerHTML = '<div class="sg-wlab">' + (_nb === 3 ? 'TT ' : 'MT ') + (i + 1) + '</div>';
    col.appendChild(makeWheel('sgW' + i, 1, 59, Math.round((_durs[i] || 1800) / 60)));
    col.insertAdjacentHTML('beforeend', '<div class="sg-wunit">min</div>');
    box.appendChild(col);
  }
}

function _nbButtons() {
  const locked = S.period !== 'MT1';
  [2, 3].forEach(n => {
    const b = $('sgNb' + n);
    b.classList.toggle('on', _nb === n);
    b.disabled = locked && _nb !== n;
    b.title = locked ? 'Modifiable seulement avant le début de la 2e période' : '';
  });
  $('sgNbNote').style.display = S.period !== 'MT1' ? '' : 'none';
}

export function sgOpen() {
  $('sgTA').value = S.tA; $('sgTB').value = S.tB;
  $('sgNA').value = S.numA || ''; $('sgNB').value = S.numB || '';
  $('sgA1').value = S.a1; $('sgA2').value = S.a2;
  $('sgDate').value = S.mDate || ''; $('sgTime').value = S.mTime || ''; $('sgComp').value = S.mComp || '';
  $('sgOverlay').classList.add('on'); /* visible avant de créer les roues (positionnement) */
  const pr = $('sgProlW');
  pr.innerHTML = '';
  pr.appendChild(makeWheel('sgWProl', 1, 30, Math.round((S.dureeProl || 300) / 60)));
  pr.insertAdjacentHTML('beforeend', '<div class="sg-wunit">min par prolongation</div>');
  _nb = S.nbMT; _durs = [...S.dureesMT];
  _nbButtons(); _durRow();
  const card = $('sgOverlay').querySelector('.sg-card');
  if (card) card.scrollTop = 0;
}
export function sgClose() { $('sgOverlay').classList.remove('on'); }

export function sgNb(n) {
  if (S.period !== 'MT1' || n === _nb) return;
  _nb = n;
  _durs = n === 3 ? [900, 900, 900] : [1800, 1800];
  _nbButtons(); _durRow();
}

export function sgSave() {
  const old = { tA: S.tA, tB: S.tB, a1: S.a1, a2: S.a2 };
  S.tA = $('sgTA').value.trim() || S.tA; S.tB = $('sgTB').value.trim() || S.tB;
  S.a1 = $('sgA1').value.trim() || S.a1; S.a2 = $('sgA2').value.trim() || S.a2;
  S.numA = $('sgNA').value; S.numB = $('sgNB').value;
  S.mDate = $('sgDate').value; S.mTime = $('sgTime').value; S.mComp = $('sgComp').value.trim();
  if (S.period === 'MT1') S.nbMT = _nb;
  S.dureesMT = Array.from({ length: S.nbMT }, (_, i) => _clamp(readWheel('sgW' + i, 1), 1, 59) * 60);
  S.dureeProl = _clamp(readWheel('sgWProl', 1), 1, 30) * 60;

  /* cohérence des observations déjà saisies */
  S.obs.forEach(o => {
    if (old.a1 !== S.a1 && o.an === old.a1) o.an = S.a1;
    if (old.a2 !== S.a2 && o.an === old.a2) o.an = S.a2;
    if (Array.isArray(o.tags)) o.tags = o.tags.map(t => {
      for (const [from, to] of [[old.tA, S.tA], [old.tB, S.tB]]) {
        if (from !== to && (t === from || t.startsWith(from + ' n°'))) return to + t.slice(from.length);
      }
      return t;
    });
  });

  $('sTA').textContent = S.tA; $('sTB').textContent = S.tB;
  $('thA').textContent = S.tA; $('thB').textContent = S.tB;
  $('topInfo').innerHTML = '<strong>' + escapeHtml(S.tA) + '</strong> vs <strong>' + escapeHtml(S.tB) + '</strong> | ' + escapeHtml(S.a1) + ' & ' + escapeHtml(S.a2);
  const mp = [];
  if (S.mDate) mp.push(fmtDate(S.mDate)); if (S.mTime) mp.push(S.mTime); if (S.mComp) mp.push(S.mComp);
  $('topMeta').textContent = mp.join(' · ');
  applyPeriodLabels();
  window.App.buildQuickNotes();
  window.App.renderTable();
  window.App.refreshCounters();
  window.App.refreshTme();
  window.App.updateCD && window.App.updateCD();
  window.App.setMatchActif(); window.App.autosave();
  sgClose();
}
