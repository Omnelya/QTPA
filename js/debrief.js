/* ═══ DÉBRIEF — écran de fin de match v1.6.0 ═════════════════════════════
   Blocs : 1 Score (match.js) · 2 À revoir et notes · 3 À travailler ·
   3B Points forts · 4 Frise chronologique. Chaque bloc a ses propres filtres
   Arbitre / Période (indépendants). Aucune donnée n'est modifiée ici :
   tout est calculé à partir de S.obs.
════════════════════════════════════════════════════════════════════════════ */
import { S, pl } from './state.js';
import { fmt, escapeHtml } from './utils.js';

const BLOCKS = ['rev', 'work', 'strong', 'frise'];
const _F = {};      /* filtres par bloc : { arb: 'all'|'A1'|'A2', per: 'all'|'MT1'… } */
const _open = {};   /* catégories dépliées : 'work|Zone' → true */
let _bubble = null; /* index (dans S.obs) du repère ouvert sur la frise */

export function resetDebrief() {
  BLOCKS.forEach(b => { _F[b] = { arb: 'all', per: 'all' }; });
  Object.keys(_open).forEach(k => delete _open[k]);
  _bubble = null;
}
resetDebrief();

/* ── Utilitaires ─────────────────────────────────────────────────────── */
const _arbs = o => (Array.isArray(o.arb) ? o.arb : [o.arb]);

/* Périodes proposées : celles du match + celles où il y a des observations */
export function periods() {
  const base = [];
  for (let i = 1; i <= (S.nbMT || 2); i++) base.push('MT' + i);
  S.obs.forEach(o => { if (o.period && !base.includes(o.period)) base.push(o.period); });
  return base;
}
const _pOrder = p => { const i = periods().indexOf(p); return i < 0 ? 99 : i; };
const _chrono = (a, b) => (_pOrder(a.period) - _pOrder(b.period)) || ((a.el || 0) - (b.el || 0));

function _filtered(block) {
  const f = _F[block];
  return S.obs.filter(o =>
    (f.arb === 'all' || _arbs(o).includes(f.arb)) &&
    (f.per === 'all' || o.period === f.per));
}

function _arbChips(o) {
  return _arbs(o).map(a =>
    '<span class="db-arb db-arb-' + (a === 'A2' ? 'a2' : 'a1') + '">' + escapeHtml(a === 'A2' ? S.a2 : S.a1) + '</span>'
  ).join('');
}

function _noteText(o) {
  const parts = [];
  if (o.tags && o.tags.length) parts.push(o.tags.join(', '));
  if (o.cmt) parts.push(o.cmt);
  return parts.join(' · ');
}

const _typeChip = o => '<span class="db-type db-type-' + (o.col === 'red' ? 'n' : 'o') + '">' + (o.col === 'red' ? '✘' : '✔') + '</span>';

/* ── Barre de filtres d'un bloc ──────────────────────────────────────── */
function _seg(block, key, items) {
  const cur = _F[block][key];
  return '<span class="db-seg" role="group">' + items.map(([v, label]) =>
    '<button type="button" class="db-seg-b' + (cur === v ? ' on' : '') + '" onclick="dbFilter(\'' + block + '\',\'' + key + '\',\'' + escapeHtml(v) + '\')">' +
    escapeHtml(label) + '</button>').join('') + '</span>';
}
function _filterBar(block) {
  return '<div class="db-filters">' +
    '<span class="db-flab">Arbitre</span>' + _seg(block, 'arb', [['all', 'Tous'], ['A1', S.a1], ['A2', S.a2]]) +
    '<span class="db-flab">Période</span>' + _seg(block, 'per', [['all', 'Tous'], ...periods().map(p => [p, pl(p)])]) +
    '</div>';
}

export function dbFilter(block, key, value) {
  _F[block][key] = value;
  _bubble = null;
  renderBlock(block);
}

export function dbToggle(block, cat) {
  const k = block + '|' + cat;
  _open[k] = !_open[k];
  renderBlock(block);
}

export function dbBubble(idx) {
  _bubble = (_bubble === idx) ? null : idx;
  renderBlock('frise');
}

/* ── Une ligne d'observation avec sa note ────────────────────────────── */
function _obsLine(o, withCat) {
  const idx = S.obs.indexOf(o);
  const note = _noteText(o);
  return '<div class="db-row' + (o.flag ? ' db-flag' : '') + (withCat ? '' : ' db-nocat') + '" onclick="editObservation(' + idx + ')" title="Modifier cette observation">' +
    '<span class="db-ico">' + (o.flag ? '⚑' : (note ? '💬' : '')) + '</span>' +
    '<span class="db-tm">' + escapeHtml(o.time || '') + ' <i>' + escapeHtml(pl(o.period || '')) + '</i></span>' +
    '<span class="db-who">' + _arbChips(o) + '</span>' +
    (withCat ? '<span class="db-cat">' + escapeHtml(o.cat) + '</span>' : '') +
    _typeChip(o) +
    '<span class="db-note">' + (note ? '« ' + escapeHtml(note) + ' »' : '') + '</span></div>';
}

/* ── Bloc 2 : À revoir et notes ──────────────────────────────────────── */
function _renderRev() {
  const all = _filtered('rev');
  const flagged = all.filter(o => o.flag).sort(_chrono);
  const noted = all.filter(o => !o.flag && _noteText(o)).sort(_chrono);
  const rows = flagged.concat(noted);
  return _filterBar('rev') + (rows.length
    ? rows.map(o => _obsLine(o, true)).join('')
    : '<div class="db-empty">Aucune action à revoir ni note pour ces filtres.</div>');
}

/* ── Statistiques par catégorie ──────────────────────────────────────── */
function _stats(obs) {
  const m = {};
  obs.forEach(o => {
    const cs = Array.isArray(o.cats) && o.cats.length ? o.cats : [o.cat];
    cs.forEach(c => {
      if (!m[c]) m[c] = { cat: c, r: 0, g: 0, obs: [] };
      if (o.col === 'red') m[c].r++; else m[c].g++;
      m[c].obs.push(o);
    });
  });
  return Object.values(m);
}
const _pct = (a, b) => Math.round(100 * a / (a + b));

function _catRow(block, s, kind) {
  const red = kind === 'n';
  const p = red ? _pct(s.r, s.g) : _pct(s.g, s.r);
  const open = !!_open[block + '|' + s.cat];
  const cat = escapeHtml(s.cat).replace(/'/g, '&#39;');
  let h = '<div class="db-crow" role="button" tabindex="0" onclick="dbToggle(\'' + block + '\',\'' + cat + '\')">' +
    '<span class="db-cname">' + escapeHtml(s.cat) + '</span>' +
    '<span class="db-bar db-bar-' + kind + '"><i style="width:' + p + '%"></i></span>' +
    '<span class="db-cnt"><b class="db-n">' + s.r + '✘</b> / <b class="db-o">' + s.g + '✔</b> · ' + p + ' %</span>' +
    '<span class="db-chev">' + (open ? '▾' : '▸') + '</span></div>';
  if (open) {
    h += '<div class="db-sub">' + s.obs.slice().sort(_chrono).map(o => _obsLine(o, false)).join('') + '</div>';
  }
  return h;
}

/* ── Bloc 3 : À travailler ───────────────────────────────────────────── */
function _renderWork() {
  const st = _stats(_filtered('work')).filter(s => s.r >= 1);
  const byPct = (a, b) => (_pct(b.r, b.g) - _pct(a.r, a.g)) || (b.r - a.r) || a.cat.localeCompare(b.cat, 'fr');
  const rec = st.filter(s => s.r >= 2).sort(byPct);
  const one = st.filter(s => s.r === 1).sort(byPct);
  let h = _filterBar('work');
  if (!st.length) return h + '<div class="db-empty">Aucune observation non conforme pour ces filtres.</div>';
  if (rec.length) h += '<div class="db-grp">Récurrent (2 ✘ ou plus) — classé par % de ✘</div>' + rec.map(s => _catRow('work', s, 'n')).join('');
  if (one.length) h += '<div class="db-grp">Un seul ✘</div>' + one.map(s => _catRow('work', s, 'n')).join('');
  return h;
}

/* ── Bloc 3B : Points forts ──────────────────────────────────────────── */
function _renderStrong() {
  const st = _stats(_filtered('strong')).filter(s => s.g >= 1)
    .sort((a, b) => (_pct(b.g, b.r) - _pct(a.g, a.r)) || (b.g - a.g) || a.cat.localeCompare(b.cat, 'fr'));
  return _filterBar('strong') + (st.length
    ? st.map(s => _catRow('strong', s, 'o')).join('')
    : '<div class="db-empty">Aucune observation conforme pour ces filtres.</div>');
}

/* ── Bloc 4 : Frise chronologique ────────────────────────────────────── */
function _periodDuration(p) {
  if (p === 'Prol.1' || p === 'Prol.2') return S.dureeProl || 300;
  const i = parseInt(p.replace('MT', ''), 10) - 1;
  const d = (S.dureesMT || [])[i];
  return d || 30 * 60;
}

function _renderFrise() {
  const f = _F.frise;
  const pers = f.per === 'all' ? periods() : [f.per];
  const obs = _filtered('frise');
  let h = _filterBar('frise');
  pers.forEach(p => {
    const list = obs.filter(o => o.period === p).sort((a, b) => (a.el || 0) - (b.el || 0));
    const dur = Math.max(_periodDuration(p), ...list.map(o => o.el || 0), 1);
    const nR = list.filter(o => o.col === 'red').length;
    /* Répartition sur des couloirs pour que les repères proches ne se chevauchent pas */
    const lanes = [];
    const marks = list.map(o => {
      const pos = (o.el || 0) / dur * 100;
      let lane = lanes.findIndex(last => pos - last >= 3.2);
      if (lane < 0) { lane = lanes.length; lanes.push(pos); } else { lanes[lane] = pos; }
      return { o, pos, lane };
    });
    const nl = Math.max(1, lanes.length);
    h += '<div class="db-tl"><div class="db-tl-lab"><b>' + escapeHtml(pl(p)) + '</b><span>' + nR + ' ✘ / ' + (list.length - nR) + ' ✔</span></div>' +
      '<div class="db-axis" style="height:' + (nl * 30 + 8) + 'px">' +
      marks.map(m => {
        const idx = S.obs.indexOf(m.o);
        const cls = m.o.flag ? 'fl' : (m.o.col === 'red' ? 'n' : 'o');
        return '<button type="button" class="db-mk db-mk-' + cls + (_bubble === idx ? ' sel' : '') + '" style="left:' + m.pos.toFixed(2) + '%;top:' + (m.lane * 30 + 2) + 'px" ' +
          'aria-label="' + escapeHtml(m.o.time + ' ' + m.o.cat) + '" onclick="dbBubble(' + idx + ')">' + (m.o.flag ? '⚑' : (m.o.col === 'red' ? '✘' : '✔')) + '</button>';
      }).join('') +
      '</div></div>' +
      '<div class="db-ticks"><span>0</span><span>' + fmt(Math.round(dur / 2)) + '</span><span>' + fmt(dur) + '</span></div>';
  });
  if (_bubble !== null && S.obs[_bubble]) h += '<div class="db-bubble">' + _obsLine(S.obs[_bubble], true) + '</div>';
  else h += '<div class="db-hint">Touchez un repère pour lire son détail (✘ non conforme, ✔ conforme, ⚑ à revoir).</div>';
  return h;
}

export { _stats as dbStats, _pct as dbPct, _chrono as dbChrono, _obsLine as dbObsLine, _arbChips as dbArbChips };

/* ── Bloc « À dire à la pause » (indicatif, saisi à la mi-temps) ───── */
function _renderPause() {
  const el = document.getElementById('db-pause');
  if (!el) return;
  const n = [(S.pauseNote || '').trim(), (S.pauseNote2 || '').trim()];
  const t = S.nbMT === 3 ? n.map((x, i) => x && pl('MT' + (i + 1)) + ' : ' + x).filter(Boolean).join('\n') : n[0];
  el.style.display = t ? '' : 'none';
  const b = el.querySelector('.db-pause-txt');
  if (b) b.textContent = t;
}

/* ── Rendu ───────────────────────────────────────────────────────────── */
const RENDER = { rev: _renderRev, work: _renderWork, strong: _renderStrong, frise: _renderFrise };
export function renderBlock(block) {
  const el = document.getElementById('db-' + block);
  if (el) el.innerHTML = RENDER[block]();
}
export function renderDebrief() {
  /* un filtre de période devenu invalide revient à « Tous » */
  const per = periods();
  BLOCKS.forEach(b => { if (_F[b].per !== 'all' && !per.includes(_F[b].per)) _F[b].per = 'all'; });
  BLOCKS.forEach(renderBlock);
  _renderPause();
}
