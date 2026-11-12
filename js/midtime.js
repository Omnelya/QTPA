/* ═══ MI-TEMPS — écran de point à la pause v1.7.0 ════════════════════════
   Lecture seule sur S.obs (période choisie : MT1, ou MT1/MT2 pour 3 tiers-temps). Seule donnée écrite : S.pauseNote
   (texte « à dire à la pause », repris sur l'écran de fin de match).      */
import { S, pl } from './state.js';
import { escapeHtml } from './utils.js';
import { dbStats, dbPct, dbChrono, dbObsLine } from './debrief.js';

let _arb = 'all'; /* 'all' | 'A1' | 'A2' */
let _per = 'MT1'; /* période récapitulée */
/* Périodes avec une pause derrière : MT1 (2 MT) ou MT1, MT2 (3 TT) */
const _cands = () => Array.from({ length: Math.max(1, (S.nbMT || 2) - 1) }, (_, i) => 'MT' + (i + 1));
function _defPer() {
  const c = _cands(), i = c.indexOf(S.period);
  if (i >= 0) return S.elapsed > 0 ? c[i] : (i > 0 ? c[i - 1] : c[0]);
  const j = parseInt(String(S.period).replace('MT', ''), 10) - 2; /* MT2 de 2 MT / MT3 : pause qui précède */
  return c[Math.min(Math.max(j, 0), c.length - 1)] || c[0];
}
const _noteKey = () => (_per === 'MT2' ? 'pauseNote2' : 'pauseNote');
const _isOpen = () => document.getElementById('mtOverlay')?.classList.contains('on');

function _mine(o) {
  return _arb === 'all' || (Array.isArray(o.arb) ? o.arb : [o.arb]).includes(_arb);
}

function _score() {
  const [ha, hb] = _per === 'MT2' ? [S.ht2A, S.ht2B] : [S.htA, S.htB];
  const live = ha === null || ha === undefined;
  const a = live ? S.sA : ha, b = live ? S.sB : hb;
  const what = S.nbMT === 3 ? 'à la fin du ' + pl(_per) : 'à la mi-temps';
  return '<span class="mt-sc-lab">' + (live ? 'Score actuel' : 'Score ' + what) + '</span> ' +
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
  const mt1 = S.obs.filter(o => o.period === _per && _mine(o));
  const st = dbStats(mt1);
  const flags = mt1.filter(o => o.flag).sort(dbChrono);
  const todo = S.obs.filter(o => o.todo && _mine(o)).sort(dbChrono);
  const chips = [['all', 'Tous'], ['A1', S.a1], ['A2', S.a2]].map(([v, l]) =>
    '<button type="button" class="db-seg-b' + (_arb === v ? ' on' : '') + '" onclick="mtArb(\'' + v + '\')">' + escapeHtml(l) + '</button>').join('');
  document.getElementById('mtScore').innerHTML = _score();
  document.getElementById('mtBody').innerHTML =
    '<div class="db-filters"><span class="db-flab">Arbitre</span><span class="db-seg">' + chips + '</span>' + (_cands().length > 1 ? '<span class="db-flab">Période</span><span class="db-seg">' + _cands().map(p => '<button type="button" class="db-seg-b' + (_per === p ? ' on' : '') + '" onclick="mtPer(\'' + p + '\')">' + pl(p) + '</button>').join('') + '</span>' : '<span class="db-flab">' + pl(_per) + '</span>') + '</div>' +
    '<div class="db-grp">⚑ À revoir (' + flags.length + ')</div>' +
    (flags.length ? flags.map(o => dbObsLine(o, true)).join('') : '<div class="db-empty">Aucune observation marquée.</div>') +
    '<div class="mt-cols"><div><div class="db-grp">3 moins réussis</div>' + _rank(st, 'n') +
    '</div><div><div class="db-grp">3 mieux réussis</div>' + _rank(st, 'o') + '</div></div>' +
    '<div class="db-grp">✎ À compléter plus tard (' + todo.length + ')</div>' +
    (todo.length ? todo.map(o => dbObsLine(o, true)).join('') : '<div class="db-empty">Rien à compléter.</div>');
}

function _head() {
  document.getElementById('mtTitle').textContent = S.nbMT === 3 ? 'Point à la fin du ' + pl(_per) : 'Point à la mi-temps';
  document.getElementById('mtPauseNote').value = S[_noteKey()] || '';
}
export function mtPer(p) { _per = p; _head(); mtRender(); }
export function mtOpen() {
  _arb = 'all'; _per = _defPer();
  _head();
  document.getElementById('mtOverlay').classList.add('on');
  mtRender();
}
export function mtClose() { document.getElementById('mtOverlay').classList.remove('on'); }
export function mtArb(v) { _arb = v; mtRender(); }
export function mtNote(v) { S[_noteKey()] = v; if (window.App?.autosaveDebounced) window.App.autosaveDebounced(); }
