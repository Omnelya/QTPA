/* ═══ MI-TEMPS — écran de point à la pause v1.7.0 ════════════════════════
   Lecture seule sur S.obs (MT1 uniquement). Seule donnée écrite : S.pauseNote
   (texte « à dire à la pause », repris sur l'écran de fin de match).      */
import { S } from './state.js';
import { escapeHtml } from './utils.js';
import { dbStats, dbPct, dbChrono, dbObsLine } from './debrief.js';

let _arb = 'all'; /* 'all' | 'A1' | 'A2' */
const _isOpen = () => document.getElementById('mtOverlay')?.classList.contains('on');

function _mine(o) {
  return _arb === 'all' || (Array.isArray(o.arb) ? o.arb : [o.arb]).includes(_arb);
}

function _score() {
  const live = S.htA === null || S.htA === undefined;
  const a = live ? S.sA : S.htA, b = live ? S.sB : S.htB;
  return '<span class="mt-sc-lab">' + (live ? 'Score actuel' : 'Score à la mi-temps') + '</span> ' +
    escapeHtml(S.tA) + ' <b>' + a + ' : ' + b + '</b> ' + escapeHtml(S.tB);
}

function _rank(st, kind) {
  const red = kind === 'n';
  const list = st.filter(s => (red ? s.r : s.g) >= 1)
    .sort((x, y) => (red ? dbPct(y.r, y.g) - dbPct(x.r, x.g) || y.r - x.r : dbPct(y.g, y.r) - dbPct(x.g, x.r) || y.g - x.g) || x.cat.localeCompare(y.cat, 'fr'))
    .slice(0, 3);
  return list.length ? list.map(s => {
    const p = red ? dbPct(s.r, s.g) : dbPct(s.g, s.r);
    return '<div class="mt-rk"><span class="db-cname">' + escapeHtml(s.cat) + '</span>' +
      '<span class="db-bar db-bar-' + kind + '"><i style="width:' + p + '%"></i></span>' +
      '<span class="db-cnt"><b class="db-n">' + s.r + '✘</b> / <b class="db-o">' + s.g + '✔</b> · ' + p + ' %</span></div>';
  }).join('') : '<div class="db-empty">Rien pour l\'instant.</div>';
}

export function mtRender() {
  if (!_isOpen()) return;
  const mt1 = S.obs.filter(o => o.period === 'MT1' && _mine(o));
  const st = dbStats(mt1);
  const flags = mt1.filter(o => o.flag).sort(dbChrono);
  const todo = S.obs.filter(o => o.todo && _mine(o)).sort(dbChrono);
  const chips = [['all', 'Tous'], ['A1', S.a1], ['A2', S.a2]].map(([v, l]) =>
    '<button type="button" class="db-seg-b' + (_arb === v ? ' on' : '') + '" onclick="mtArb(\'' + v + '\')">' + escapeHtml(l) + '</button>').join('');
  document.getElementById('mtScore').innerHTML = _score();
  document.getElementById('mtBody').innerHTML =
    '<div class="db-filters"><span class="db-flab">Arbitre</span><span class="db-seg">' + chips + '</span><span class="db-flab">MT1</span></div>' +
    '<div class="db-grp">⚑ À revoir (' + flags.length + ')</div>' +
    (flags.length ? flags.map(o => dbObsLine(o, true)).join('') : '<div class="db-empty">Aucune observation marquée.</div>') +
    '<div class="mt-cols"><div><div class="db-grp">3 moins réussis</div>' + _rank(st, 'n') +
    '</div><div><div class="db-grp">3 mieux réussis</div>' + _rank(st, 'o') + '</div></div>' +
    '<div class="db-grp">✎ À compléter plus tard (' + todo.length + ')</div>' +
    (todo.length ? todo.map(o => dbObsLine(o, true)).join('') : '<div class="db-empty">Rien à compléter.</div>');
}

export function mtOpen() {
  _arb = 'all';
  document.getElementById('mtPauseNote').value = S.pauseNote || '';
  document.getElementById('mtOverlay').classList.add('on');
  mtRender();
}
export function mtClose() { document.getElementById('mtOverlay').classList.remove('on'); }
export function mtArb(v) { _arb = v; mtRender(); }
export function mtNote(v) { S.pauseNote = v; if (window.App?.autosaveDebounced) window.App.autosaveDebounced(); }
