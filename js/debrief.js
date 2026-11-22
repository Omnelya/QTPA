/* ═══ DÉBRIEF — écran de fin de match v1.6.0 ═════════════════════════════
   Blocs : 1 Score (match.js) · 2 À revoir et notes · 3 À travailler ·
   3B Points forts · 4 Frise chronologique. Chaque bloc a ses propres filtres
   Arbitre / Période (indépendants). Aucune donnée n'est modifiée ici :
   tout est calculé à partir de S.obs.
════════════════════════════════════════════════════════════════════════════ */
import { S, pl, linkGroup, oneLinePerAction, actionNote, FAMILIES, CAU, blockOf, catLabel } from './state.js';
import { fmt, escapeHtml } from './utils.js';

const BLOCKS = ['rev', 'radar', 'work', 'strong', 'frise'];
const _F = {};      /* filtres par bloc : { arb: 'all'|'A1'|'A2', per: 'all'|'MT1'… } */
const _open = {};   /* catégories dépliées : 'work|Zone' → true */
let _bubble = null; /* index (dans S.obs) du repère ouvert sur la frise */
let _axis = null;   /* v1.15.0 : axe du radar dont le détail est affiché (null = le plus faible) */

export function resetDebrief() {
  BLOCKS.forEach(b => { _F[b] = { arb: 'all', per: 'all' }; });
  Object.keys(_open).forEach(k => delete _open[k]);
  _bubble = null;
  _axis = null;
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
function _obsLine(o, withCat, readOnly) {
  const idx = S.obs.indexOf(o);
  /* v1.11.0 : dans les listes toutes catégories, une action liée = une ligne « J7M ✘ + SPA ✔ » */
  const g = withCat ? linkGroup(o) : [o];
  const note = withCat ? actionNote(g) : _noteText(o);
  return '<div class="db-row' + (o.flag ? ' db-flag' : '') + (withCat ? '' : ' db-nocat') +
    /* v1.17.0 : lecture seule dans Préparation Suivi (les propositions ne se recalculent pas) */
    (readOnly ? ' db-ro">' : '" onclick="editObservation(' + idx + ')" title="Modifier cette observation">') +
    '<span class="db-ico">' + (o.flag ? '⚑' : (note ? '💬' : '')) + '</span>' +
    '<span class="db-tm">' + escapeHtml(o.time || '') + ' <i>' + escapeHtml(pl(o.period || '')) + '</i></span>' +
    '<span class="db-who">' + _arbChips(o) + '</span>' +
    (withCat ? '<span class="db-cat">' + g.map(x => escapeHtml(catLabel(x)) + (g.length > 1 ? ' ' + _typeChip(x) : '')).join(' + ') + '</span>' : '') +
    /* action liée : ✘/✔ déjà dans .db-cat ; case vide pour garder la note dans sa colonne */
    (g.length > 1 ? '<span class="db-type"></span>' : _typeChip(o)) +
    '<span class="db-note">' + (note ? '« ' + escapeHtml(note) + ' »' : '') + '</span></div>';
}

/* ── Bloc 2 : À revoir et notes ──────────────────────────────────────── */
function _renderRev() {
  const all = _filtered('rev');
  const flagged = all.filter(o => o.flag).sort(_chrono);
  const noted = all.filter(o => !o.flag && _noteText(o)).sort(_chrono);
  const rows = oneLinePerAction(flagged.concat(noted));
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
  /* v1.18.4 : chaîne JS dans un attribut HTML → \' puis échappement HTML
     (avant, « Zone d'influence » cassait le onclick : impossible à déplier) */
  const cat = escapeHtml(s.cat.replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
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
    /* v1.18.5 : un repère par action (J7M + SPA = 1 repère) ; les compteurs restent par catégorie */
    const marks = oneLinePerAction(list).map(o => {
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
        const g = linkGroup(m.o), red = g.some(x => x.col === 'red'), mixed = red && g.some(x => x.col !== 'red');
        const cls = m.o.flag ? 'fl' : mixed ? 'm' : (red ? 'n' : 'o');
        return '<button type="button" class="db-mk db-mk-' + cls + (_bubble === idx ? ' sel' : '') + '" style="left:' + m.pos.toFixed(2) + '%;bottom:' + (m.lane * 30 + 3) + 'px" ' +
          'aria-label="' + escapeHtml(m.o.time + ' ' + g.map(x => x.cat).join(' + ')) + '" onclick="dbBubble(' + idx + ')">' + (m.o.flag ? '⚑' : mixed ? '✘✔' : (red ? '✘' : '✔')) + '</button>';
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

/* ── Bloc radar par bloc — v1.15.0 ──────────────────────────────────────
   % conforme par bloc (A1 Duels · A2 Continuité · B Joueurs · C1 Technique ·
   C2 Décisionnel), une courbe par arbitre. Un axe touché affiche le détail
   de ses catégories. Axe grisé = moins de 3 observations (peu fiable). */
const AXIS_SHORT = { A1: 'Duels', A2: 'Continuité', B: 'Joueurs', C1: 'Technique', C2: 'Décisionnel' };
const AXES = FAMILIES.flatMap(f => f.blocks.map(b => {
  const k = b.code.startsWith('B') ? 'B' : b.code;
  /* v1.18.0 : « Autre » peut compter dans n'importe quel bloc (voir blockOf) */
  return { k, t: AXIS_SHORT[k] || b.title, cats: b.cats.includes(CAU) ? b.cats : [...b.cats, CAU] };
}));

/** { n, g, p } : nombre d'observations du bloc, conformes, % conforme (null si 0). */
function _axisStat(obs, cats, k) {
  let r = 0, g = 0;
  obs.forEach(o => (Array.isArray(o.cats) && o.cats.length ? o.cats : [o.cat]).forEach(c => {
    if (cats.includes(c) && blockOf(o, c) === k) { if (o.col === 'red') r++; else g++; }
  }));
  return { n: r + g, g, p: r + g ? _pct(g, r) : null };
}

export function dbRadarAxis(k) {
  _axis = k;
  renderBlock('radar');
}

function _renderRadar() {
  const f = _F.radar;
  const L = _filtered('radar');
  if (!L.length) return _filterBar('radar') + '<div class="db-empty">Aucune observation pour ces filtres.</div>';
  const perOk = o => f.per === 'all' || o.period === f.per;
  const series = (f.arb === 'all' ? ['A1', 'A2'] : [f.arb]).map(a => ({
    a, cls: a === 'A2' ? 'a2' : 'a1',
    vals: AXES.map(ax => _axisStat(S.obs.filter(o => _arbs(o).includes(a) && perOk(o)), ax.cats, ax.k))
  }));
  const tot = AXES.map(ax => _axisStat(L, ax.cats, ax.k));
  if (!_axis || !AXES.some(ax => ax.k === _axis)) {
    const cand = AXES.map((ax, i) => [ax.k, tot[i]]).filter(([, s]) => s.n >= 3).sort((x, y) => x[1].p - y[1].p);
    _axis = cand.length ? cand[0][0] : AXES[0].k;
  }

  /* Radar SVG */
  const cx = 180, cy = 165, R = 118, N = AXES.length;
  const ang = i => -Math.PI / 2 + i * 2 * Math.PI / N;
  const pt = (i, v) => [cx + R * v * Math.cos(ang(i)), cy + R * v * Math.sin(ang(i))].map(x => x.toFixed(1));
  let s = '';
  [0.25, 0.5, 0.75, 1].forEach(v => { s += '<polygon class="rd-grid" points="' + AXES.map((_, i) => pt(i, v).join(',')).join(' ') + '"/>'; });
  AXES.forEach((_, i) => { const [x, y] = pt(i, 1); s += '<line class="rd-grid" x1="' + cx + '" y1="' + cy + '" x2="' + x + '" y2="' + y + '"/>'; });
  s += '<text class="rd-scale" x="' + (cx + 4) + '" y="' + (cy - R * 0.5 + 11) + '">50 %</text>';
  series.forEach(se => {
    s += '<polygon class="rd-area rd-' + se.cls + '" points="' + se.vals.map((v, i) => pt(i, (v.p || 0) / 100).join(',')).join(' ') + '"/>';
    se.vals.forEach((v, i) => {
      if (!v.n) return;
      const [x, y] = pt(i, v.p / 100);
      s += '<circle class="rd-dot ' + (v.n < 3 ? 'rd-few' : 'rd-' + se.cls) + '" cx="' + x + '" cy="' + y + '" r="4"/>';
    });
  });
  AXES.forEach((ax, i) => {
    const [x, y] = pt(i, 1.2).map(Number);
    const few = tot[i].n < 3;
    s += '<g class="rd-lab' + (_axis === ax.k ? ' on' : '') + (few ? ' few' : '') + '" role="button" tabindex="0" aria-label="Détail ' + ax.k + ' ' + escapeHtml(ax.t) + '"' +
      ' onclick="dbRadarAxis(\'' + ax.k + '\')" onkeydown="if(event.key===\'Enter\')dbRadarAxis(\'' + ax.k + '\')">' +
      '<rect x="' + (x - 47) + '" y="' + (y - 17) + '" width="94" height="34" rx="9"/>' +
      '<text class="rd-t" x="' + x + '" y="' + (y - 2) + '">' + ax.k + ' ' + escapeHtml(ax.t) + '</text>' +
      '<text class="rd-n" x="' + x + '" y="' + (y + 11) + '">' + tot[i].n + ' obs.</text></g>';
  });
  const svg = '<svg class="db-radar-svg" viewBox="-14 0 388 330" role="img" aria-label="Radar : pourcentage conforme par bloc">' + s + '</svg>';
  const legend = '<div class="db-radar-leg">' + series.map(se =>
    '<span><i class="rd-leg-' + se.cls + '"></i>' + escapeHtml(se.a === 'A2' ? S.a2 : S.a1) + '</span>').join('') + '</div>';

  /* Détail de l'axe choisi */
  const ax = AXES.find(a => a.k === _axis);
  const byArb = (a, c) => _axisStat(S.obs.filter(o => _arbs(o).includes(a) && perOk(o)), [c], ax.k);
  /* v1.18.3 : un arbitre choisi → seule sa colonne (l'autre arbitre n'apparaît plus) */
  const arbs = f.arb === 'all' ? ['A1', 'A2'] : [f.arb];
  const rows = ax.cats.map(c => ({ c, t: _axisStat(L, [c], ax.k), by: Object.fromEntries(arbs.map(a => [a, byArb(a, c)])) })).filter(r => r.t.n);
  const pc = st => st.n ? st.p + ' %' : '–';
  const tone = p => p >= 70 ? 'ok' : p >= 50 ? 'mid' : 'ko';
  const det = '<div class="db-radar-det"><div class="db-radar-dt">' + ax.k + ' · ' + escapeHtml(ax.t) + '</div>' + (rows.length
    ? '<table class="db-radar-tab"><thead><tr><th>Catégorie</th><th>Obs.</th>' +
      arbs.map(a => '<th class="' + (a === 'A2' ? 'a2' : 'a1') + '">' + escapeHtml(a === 'A2' ? S.a2 : S.a1) + '</th>').join('') + '<th>Total</th></tr></thead><tbody>' +
      rows.map(r => '<tr><td>' + escapeHtml(r.c) + '</td><td>' + r.t.n + '</td>' +
        arbs.map(a => '<td class="' + (a === 'A2' ? 'a2' : 'a1') + '">' + pc(r.by[a]) + '</td>').join('') +
        '<td class="tot ' + tone(r.t.p) + '">' + r.t.p + ' %</td></tr>').join('') + '</tbody></table>'
    : '<div class="db-empty">Aucune observation dans ce bloc pour ces filtres.</div>') + '</div>';

  return _filterBar('radar') + '<div class="db-radar"><div>' + svg + legend +
    '<div class="db-hint">Axe grisé : moins de 3 observations, pourcentage peu fiable.</div></div>' + det + '</div>';
}

/* ── Rendu ───────────────────────────────────────────────────────────── */
const RENDER = { rev: _renderRev, radar: _renderRadar, work: _renderWork, strong: _renderStrong, frise: _renderFrise };
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
