/* ═══ SCORE — Score et gestion des temps morts ═══════════════════════════ */
import { S } from './state.js';
import { fmt } from './utils.js';
import { log } from './logger.js';

/* ── TME par période avec quota global — v1.4.23, revu v1.18.7 ───────────
   Structure S.tme : { A: { MT1:[v0,v1(,v2)], MT2:[…], MT3:[…] }, B:{...} } (« mm:ss »)
   Règles :
   - Max par équipe et par période : réglage ⚙ (S.tmeMax), sinon 2 par
     mi-temps, 1 par tiers-temps
   - Max 3 TME par équipe par match (quota global)
   - Dernière période, à partir de 5' de la fin (25e minute en 30') : 1 seul TME
──────────────────────────────────────────────────────────────────────────── */

const TME_MAX_MATCH = 3; /* quota global par équipe */
const TME_ROWS = 3;      /* lignes du tableau ; seules les utiles sont affichées */
/** TME max par équipe et par période. */
export const tmePerMax = () => S.tmeMax || (S.nbMT === 3 ? 1 : 2);
const _filled = v => !!v && v !== 'X';
const _sec = v => { const [m, s] = String(v).split(':').map(Number); return (m || 0) * 60 + (s || 0); };
const _seuil = () => Math.max(0, (S.dureesMT[S.nbMT - 1] || 1800) - 5 * 60);
const _inLast5 = () => S.period === 'MT' + S.nbMT && S.elapsed >= _seuil();

/* Retourne le tableau de slots [v0, v1] pour l'équipe et la période courante */
function _curSlots(team) {
  const per = S.period;
  if (!S.tme[team][per]) return [null, null];
  return S.tme[team][per];
}

/* Compte le total de TME pris par une équipe sur toutes les MT */
function _totalTme(team) {
  return ['MT1','MT2','MT3'].reduce((acc, per) => {
    const slots = S.tme[team][per] || [];
    return acc + slots.filter(_filled).length;
  }, 0);
}

export function tmeVal(team, idx) {
  const slots = _curSlots(team);
  const v = slots[idx];
  return (v && v !== 'X') ? v : '-';
}

/* État d'un slot : 'filled' | 'free' | 'red' | 'gray' */
export function tmeState(team, idx) {
  const slots = _curSlots(team);
  const v = slots[idx];
  if (v && v !== 'X') return 'filled';

  /* Pendant les prolongations : TME désactivés */
  if (S.period === 'Prol.1' || S.period === 'Prol.2') return 'gray';

  /* Quota global épuisé, ou maximum de la période atteint */
  if (_totalTme(team) >= TME_MAX_MATCH) return 'gray';
  const per = tmePerMax();
  if (slots.filter(_filled).length >= per) return 'gray';

  /* 5 dernières minutes de la dernière période : un seul TME. Déjà pris → bloqué ;
     sinon seule la 1re case libre est proposée. (v1.18.7 : d'après l'heure des TME) */
  if (_inLast5()) {
    if (slots.some(v => _filled(v) && _sec(v) >= _seuil())) return 'red';
    let first = 0;
    while (first < per && _filled(slots[first])) first++;
    if (idx !== first) return 'red';
  }
  return 'free';
}

export function refreshTme() {
  const per = tmePerMax();
  /* une ligne au-delà du maximum par période est retirée, sauf si elle contient un TME (pour pouvoir le supprimer) */
  for (let i = 0; i < TME_ROWS; i++) {
    const tr = document.getElementById('cA' + i)?.closest('tr');
    if (tr) tr.style.display = (i < per || ['A', 'B'].some(t => _filled(_curSlots(t)[i]))) ? '' : 'none';
  }

  ['A', 'B'].forEach(team => {
    const slots    = _curSlots(team);
    const quotaRest = TME_MAX_MATCH - _totalTme(team);
    /* v1.18.7 : cases utilisables = déjà prises + ce que permettent la période ET le quota du match
       (avant : la 2e ligne disparaissait dès qu'il ne restait qu'1 TME au match, même si la période en permettait 2) */
    const filled = slots.filter(_filled).length;
    const usable = filled + Math.max(0, Math.min(per - filled, quotaRest));

    for (let i = 0; i < TME_ROWS; i++) {
      const cell = document.getElementById('c' + team + i);
      if (!cell) return;
      const td = cell.parentElement;
      const v  = slots[i];

      if (i > 0 && i >= usable && !_filled(v)) {
        td.style.visibility = 'hidden';
        continue;
      }
      td.style.visibility = '';

      if (v && v !== 'X') {
        cell.className = 'tme-cell tme-ok';
        cell.removeAttribute('onclick');
        cell.innerHTML =
          '<span style="font-size:12px;font-weight:700;">' + v + '</span>' +
          '<button class="tme-del-btn" onclick="event.stopPropagation();window.App.deleteTme(\'' +
          team + '\',' + i + ')" title="Supprimer ce TME">&#10005;</button>';
      } else {
        const st = tmeState(team, i);
        if (st === 'free') {
          cell.textContent = '+';
          cell.className   = 'tme-cell';
          cell.onclick     = () => window.App.addTme(team, i);
        } else if (st === 'red') {
          cell.textContent = 'Bloqué';
          cell.className   = 'tme-cell tme-red';
        } else {
          cell.textContent = '-';
          cell.className   = 'tme-cell tme-gray';
        }
      }
    }
  });
}

export function buildTme() {
  const tb = document.getElementById('tmeBody');
  tb.innerHTML = '';
  /* v1.18.7 : jusqu'à 3 lignes ; refreshTme n'affiche que celles permises */
  for (let i = 0; i < TME_ROWS; i++) {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td style="font-size:12px;color:#888;text-align:center;">' + (i + 1) + '</td>' +
      '<td><div class="tme-cell" id="cA' + i + '" onclick="window.App.addTme(\'A\',' + i + ')">+</div></td>' +
      '<td><div class="tme-cell" id="cB' + i + '" onclick="window.App.addTme(\'B\',' + i + ')">+</div></td>';
    tb.appendChild(tr);
  }
  refreshTme();
}

export function addTme(team, idx) {
  S.matchActif = true; /* v0.3.31 (BUG-5) */
  const st = tmeState(team, idx);
  if (st === 'filled') return;
  if (st === 'red') {
    log.warn('TME', 'tme_bloque', { equipe: team, index: idx, temps: fmt(S.elapsed), periode: S.period });
    window.App.showAlert('Impossible : 1 seul TME autorisé dans les 5 dernières minutes de la dernière période.');
    return;
  }
  if (st === 'gray') {
    if (_totalTme(team) >= TME_MAX_MATCH) {
      window.App.showAlert('Quota de ' + TME_MAX_MATCH + ' TME par match atteint pour cette équipe.');
    }
    return;
  }

  if (S.run) {
    clearInterval(S.timer);
    S.run      = false;
    S.pauseTme = true;
    document.getElementById('BSS').textContent = 'Reprendre';
    document.getElementById('BSS').className   = 'bc go';
    document.getElementById('tmeP').classList.add('on');
  }

  S.tme[team][S.period][idx] = fmt(S.elapsed);
  log.info('TME', 'tme_ajoute', {
    equipe: team === 'A' ? S.tA : S.tB, index: idx + 1,
    temps: fmt(S.elapsed), periode: S.period
  });
  refreshTme();
  window.App.autosave();
}

export function deleteTme(team, idx) {
  const slots = _curSlots(team);
  const v = slots[idx];
  if (!v || v === 'X') return;
  const teamName = team === 'A' ? S.tA : S.tB;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = '<div style="background:var(--bg-card,#fff);border-radius:14px;padding:24px 28px;max-width:320px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.2);text-align:center;">' +
    '<div style="font-size:16px;font-weight:600;margin-bottom:8px;color:var(--text-main);">Supprimer ce temps mort ?</div>' +
    '<div style="font-size:13px;color:var(--text-hint);margin-bottom:20px;">' + teamName + ' — ' + v + '</div>' +
    '<div style="display:flex;gap:10px;justify-content:center;">' +
    '<button id="_tmCancel" style="flex:1;padding:10px;border:1px solid var(--border-input);border-radius:10px;background:var(--bg-input);color:var(--text-main);font-size:14px;cursor:pointer;">Annuler</button>' +
    '<button id="_tmConfirm" style="flex:1;padding:10px;border:none;border-radius:10px;background:#C82D2D;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">Supprimer</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#_tmCancel').onclick  = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#_tmConfirm').onclick = () => {
    overlay.remove();
    log.warn('TME', 'tme_supprime', { equipe: teamName, index: idx + 1, valeur: v, periode: S.period });
    S.tme[team][S.period][idx] = null;
    refreshTme();
    window.App.autosave();
  };
}

export function chgScore(t, d) {
  S.matchActif = true; /* v0.3.31 (BUG-5) */
  const avant = t === 'A' ? S.sA : S.sB;
  if (t === 'A') S.sA = Math.max(0, S.sA + d);
  else           S.sB = Math.max(0, S.sB + d);
  const apres = t === 'A' ? S.sA : S.sB;
  log.info('SCORE', 'score_change', {
    equipe: t === 'A' ? S.tA : S.tB,
    avant, apres, delta: d,
    temps: fmt(S.elapsed), periode: S.period
  });
  document.getElementById('sA').textContent = S.sA;
  document.getElementById('sB').textContent = S.sB;
  window.App.autosave();
}
