/* ═══ RÉGLAGES DU MATCH (⚙) — modifiables à tout moment — v1.9.0 ═════════
   Équipes, n° de joueurs, arbitres, date/heure/compétition, durées des
   périodes et nombre de mi-temps (ce dernier seulement avant le début de MT2).
   Renommer une équipe ou un arbitre met aussi à jour les observations déjà saisies. */
import { S, applyPeriodLabels } from './state.js';
import { escapeHtml, fmtDate } from './utils.js';

const $ = id => document.getElementById(id);
const _clamp = (v, a, b) => Math.max(a, Math.min(b, parseInt(v, 10) || a));

function _durRow() {
  const box = $('sgDurs');
  box.innerHTML = '';
  for (let i = 0; i < S.nbMT; i++) {
    const d = document.createElement('div'); d.className = 'sf';
    d.innerHTML = '<label>' + (S.nbMT === 3 ? 'TT ' : 'MT ') + (i + 1) + ' (min)</label>' +
      '<input type="number" inputmode="numeric" min="1" max="59" id="sgD' + i + '" value="' + Math.round((S.dureesMT[i] || 1800) / 60) + '">';
    box.appendChild(d);
  }
}

function _nbButtons() {
  const locked = S.period !== 'MT1';
  [2, 3].forEach(n => {
    const b = $('sgNb' + n);
    b.classList.toggle('on', S.nbMT === n);
    b.disabled = locked && S.nbMT !== n;
    b.title = locked ? 'Modifiable seulement avant le début de la 2e période' : '';
  });
  $('sgNbNote').style.display = S.period !== 'MT1' ? '' : 'none';
}

export function sgOpen() {
  $('sgTA').value = S.tA; $('sgTB').value = S.tB;
  $('sgNA').value = S.numA || ''; $('sgNB').value = S.numB || '';
  $('sgA1').value = S.a1; $('sgA2').value = S.a2;
  $('sgDate').value = S.mDate || ''; $('sgTime').value = S.mTime || ''; $('sgComp').value = S.mComp || '';
  $('sgProl').value = Math.round((S.dureeProl || 300) / 60);
  _nbButtons(); _durRow();
  $('sgOverlay').classList.add('on');
}
export function sgClose() { $('sgOverlay').classList.remove('on'); }

export function sgNb(n) {
  if (S.period !== 'MT1' || n === S.nbMT) return;
  S.nbMT = n;
  S.dureesMT = n === 3 ? [900, 900, 900] : [1800, 1800];
  _nbButtons(); _durRow();
}

export function sgSave() {
  const old = { tA: S.tA, tB: S.tB, a1: S.a1, a2: S.a2 };
  S.tA = $('sgTA').value.trim() || S.tA; S.tB = $('sgTB').value.trim() || S.tB;
  S.a1 = $('sgA1').value.trim() || S.a1; S.a2 = $('sgA2').value.trim() || S.a2;
  S.numA = $('sgNA').value; S.numB = $('sgNB').value;
  S.mDate = $('sgDate').value; S.mTime = $('sgTime').value; S.mComp = $('sgComp').value.trim();
  for (let i = 0; i < S.nbMT; i++) S.dureesMT[i] = _clamp($('sgD' + i).value, 1, 59) * 60;
  S.dureeProl = _clamp($('sgProl').value, 1, 30) * 60;

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
