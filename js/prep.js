/* ═══ PRÉPARATION SUIVI — v1.16.0 ══════════════════════════════════════════
   Feuille de suivi fédérale préremplie à partir du match (notes A1→C2, D, E, F),
   modifiable, enregistrée avec le match (S.prep), textes prêts à copier.
   Les propositions ne sont calculées qu'à la 1re ouverture (ou « Recalculer »). */
import { S, ans, FAMILIES, oneLinePerAction, CAU, blockOf } from './state.js';
import { escapeHtml as esc, fmtDate } from './utils.js';
import { log } from './logger.js';
import { dbObsLine, dbChrono } from './debrief.js';

/* v1.18.0 : « Autre » peut compter dans chaque bloc (le groupe choisi, voir blockOf) */
const BLK = Object.fromEntries(FAMILIES.flatMap(f => f.blocks).map(b => [b.code, b.cats.includes(CAU) ? b.cats : [...b.cats, CAU]]));
const B2_TAGS = ['Râle', 'Théâtralité'];
const isB2 = o => (o.tags || []).some(t => B2_TAGS.includes(t));
const ITEMS = [
  { f: 'A · Protection du jeu', code: 'A1', blk: 'A1', t: 'Gestion des duels', cats: BLK.A1 },
  { code: 'A2', blk: 'A2', t: 'Continuité du jeu', cats: BLK.A2 },
  { f: 'B · Protection du joueur', code: 'B1', blk: 'B', t: 'Irrégularités avec SPP - SPA', cats: BLK['B1 / B2'], keep: o => !isB2(o) },
  { code: 'B2', blk: 'B', t: 'Comportements antisportifs SPP - SPA', cats: BLK['B1 / B2'], keep: isB2, hint: 'tags « Râle » et « Théâtralité »' },
  { f: 'C · Savoir être', code: 'C1', blk: 'C1', t: "Technique d'arbitrage", cats: BLK.C1 },
  { code: 'C2', blk: 'C2', t: 'Pouvoir décisionnel', cats: BLK.C2 }
];
const TYPES = ['Diagnostique JAN', 'Suivi formatif JAN', 'Vidéo', 'Présentiel'];
const E1L = { td: 'Très difficile', d: 'Difficile', n: 'Normal', f: 'Facile' };
const D1L = { neg: 'Négative', q: '?', pos: 'Positive' };
const E2L = ['Relationnel', 'Score serré', 'Intensité', 'Duels'];
const YN = { oui: 'Oui', non: 'Non', nv: 'Non vu' };

const catsOf = o => (Array.isArray(o.cats) && o.cats.length ? o.cats : [o.cat]);
const has = (o, c) => catsOf(o).includes(c);
const tagIn = (o, l) => (o.tags || []).some(t => l.includes(t));
/* F1 : consigne → observations qui la concernent (≥ 50 % conformes → Oui, aucune → Non vu) */
const F1 = [
  ['Respect des consignes', [
    ['Placement sur jet de 7m', o => has(o, 'J7M')],
    ['Engagement', o => has(o, 'Exécution du Jet') && tagIn(o, ['Engagement'])],
    ['Utilisation du carton jaune', o => has(o, 'SPP') && tagIn(o, ['Bon CJ', 'Manque CJ', 'Pas CJ après but'])],
    ['Placement externe', o => has(o, 'Placement')],
    ['Déplacement arbitre de but', o => has(o, 'Déplacement')],
    ['Protection joueur', o => has(o, 'SPP') || has(o, 'SPA')],
    ['Exécution des jets francs', o => has(o, 'Jet Franc') || (has(o, 'Exécution du Jet') && tagIn(o, ['Jet Franc']))]]],
  ['Protocole', [
    ['TME', o => has(o, 'Protocole') && tagIn(o, ['Protocole TME'])],
    ['Sanction disciplinaire', o => has(o, 'Protocole') && tagIn(o, ['Protocole Sanction'])],
    ['Commotion', o => has(o, 'Protocole') && tagIn(o, ['Protocole Soin', 'Entrée Soins'])]]]
];
const F1_ALL = F1.flatMap(([, l]) => l);

/** { n, p } : occurrences dans les catégories `cats` (comme le radar), % conforme. */
function _st(list, cats) {
  let n = 0, g = 0;
  list.forEach(o => catsOf(o).forEach(c => { if (!cats || cats.includes(c)) { n++; if (o.col !== 'red') g++; } }));
  return { n, p: n ? Math.round(100 * g / n) : null };
}
const _itemObs = it => S.obs.filter(o => catsOf(o).some(c => it.cats.includes(c) && blockOf(o, c) === it.blk) && (!it.keep || it.keep(o)));
const _sugg = it => { const s = _st(_itemObs(it), it.cats); return { ...s, v: s.n >= 3 ? Math.round(s.p / 10) : null }; };
function _topTags(list, k) {
  const m = {};
  list.forEach(o => (o.tags || []).forEach(t => { if (t !== S.tA && t !== S.tB) m[t] = (m[t] || 0) + 1; }));
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, k);
}
const _sit = o => [o.time, o.cmt || [o.cat, ...(o.tags || [])].join(' – ')].filter(Boolean).join(' ') + (o.an ? ' (' + o.an + ')' : '');

function _comment(it) {
  const L = _itemObs(it);
  if (!L.length) return '';
  const rows = it.cats.map(c => { const l = L.filter(o => has(o, c)); return { c, ..._st(l, [c]), red: l.filter(o => o.col === 'red') }; }).filter(x => x.n);
  const good = rows.filter(x => x.n >= 2 && x.p >= 70).map(x => x.c);
  const bad = rows.filter(x => x.red.length).sort((a, b) => b.red.length - a.red.length).slice(0, 3);
  const parts = [];
  if (good.length) parts.push('Bien : ' + good.join(', ') + '.');
  if (bad.length) parts.push('À travailler : ' + bad.map(x => {
    const t = _topTags(x.red, 2).map(([t, k]) => t + (k > 1 ? ' ×' + k : ''));
    return x.c + (t.length ? ' (' + t.join(', ') + ')' : '');
  }).join(' ; ') + '.');
  const fl = oneLinePerAction(L.filter(o => o.flag));
  if (fl.length) parts.push('Situation : ' + fl.map(_sit).join(' ; ') + '.');
  return parts.join(' ');
}

/** Propositions calculées depuis le match. `old` : on garde ce qui ne se calcule pas. */
function _propose(old) {
  const p = { notes: {}, txt: {}, type: [], d1: null, e1: null, e2: [], f1: {}, sup: '', sec: '', chr: '' };
  ITEMS.forEach(it => { p.notes[it.code] = _sugg(it).v; p.txt[it.code] = _comment(it); });
  p.txt.F0 = (document.getElementById('GC')?.value || '').trim();
  const cs = [...new Set(S.obs.flatMap(catsOf))].map(c => ({ c, ..._st(S.obs, [c]) })).filter(x => x.n >= 3);
  const good = cs.filter(x => x.p >= 70).sort((a, b) => b.p - a.p).slice(0, 3);
  const bad = cs.filter(x => x.p < 70).sort((a, b) => a.p - b.p).slice(0, 3);
  const ofCat = (c, col) => S.obs.filter(o => has(o, c) && (o.col === 'red') === (col === 'red'));
  p.txt.F2 = good.map(x => { const t = _topTags(ofCat(x.c, 'green'), 1); return x.c + ' (' + x.p + ' %' + (t.length ? ', ' + t[0][0] : '') + ')'; }).join(' ; ') + (good.length ? '.' : '');
  p.txt.F3 = [bad.map(x => { const t = _topTags(ofCat(x.c, 'red'), 2).map(([t]) => t); return x.c + ' (' + x.p + ' %' + (t.length ? ' : ' + t.join(', ') : '') + ')'; }).join(' ; ') + (bad.length ? '.' : ''),
    oneLinePerAction(S.obs.filter(o => o.flag)).map(o => '⚑ ' + _sit(o)).join(' ; ')].filter(Boolean).join(' ');
  /* E : d'après l'Évaluation générale et le score */
  const vals = Object.values(ans).filter(Boolean), non = vals.filter(v => v === 'non').length;
  p.e1 = vals.length ? (non >= 2 ? 'td' : non === 1 ? 'd' : 'n') : null;
  if (ans.esprit === 'non') p.e2.push('Relationnel');
  if (Math.abs(S.sA - S.sB) <= 3) p.e2.push('Score serré');
  if (ans.engage === 'non') p.e2.push('Intensité');
  const du = _sugg(ITEMS[0]);
  if (du.n >= 5 && du.p < 60) p.e2.push('Duels');
  F1_ALL.forEach(([lab, fn]) => { const l = S.obs.filter(fn), g = l.filter(o => o.col !== 'red').length; p.f1[lab] = l.length ? (2 * g >= l.length ? 'oui' : 'non') : 'nv'; });
  p.txt.D1 = old?.txt?.D1 || ''; p.txt.dlg = old?.txt?.dlg || '';
  if (old) Object.assign(p, { type: old.type || [], d1: old.d1 ?? null, sup: old.sup || '', sec: old.sec || '', chr: old.chr || '' });
  return p;
}

/* ═══ Rendu ═══ */
const _auto = '<span class="ps-auto">auto</span>';
function _ta(k, ph, max) {
  return '<textarea class="gc-ta ps-ta" data-txt="' + k + '" placeholder="' + esc(ph) + '">' + esc(S.prep.txt[k] || '') + '</textarea>' +
    '<div class="ps-tbar"><span class="ps-cnt" data-cnt="' + k + '"' + (max ? ' data-max="' + max + '"' : '') + '></span><button class="btn-act ps-copy" data-copy="' + k + '">Copier</button></div>';
}
const _head = (code, t, right) => '<div class="ps-ih"><b><span class="ps-code">' + code + '</span>' + esc(t) + '</b>' + (right || '') + '</div>';
const _seg = (attr, labels, cur, extra) => '<div class="db-seg ps-seg">' + Object.entries(labels).map(([v, t]) =>
  '<button class="db-seg-b' + (extra?.[v] ? ' ' + extra[v] : '') + (cur === v ? ' on' : '') + '" data-' + attr + '="' + v + '">' + t + '</button>').join('') + '</div>';
const _total = () => {
  const v = ITEMS.map(it => S.prep.notes[it.code]).filter(x => x !== null && x !== undefined), s = v.reduce((a, b) => a + b, 0);
  return v.length === ITEMS.length ? s + ' / 60 · ' + (s / v.length).toFixed(1).replace('.', ',') + ' / 10' : v.length + '/6 notes';
};

/* v1.17.0 : actions de la rubrique dans un menu réduit par défaut ; reste ouvert
   pendant la consultation de l'écran (le rendu est refait à chaque appui). */
const _open = new Set();
function _acts(it) {
  const l = oneLinePerAction(_itemObs(it).sort(dbChrono));
  if (!l.length) return '';
  return '<details class="ps-det" data-det="' + it.code + '"' + (_open.has(it.code) ? ' open' : '') + '><summary>' +
    l.length + ' action' + (l.length > 1 ? 's' : '') + '</summary>' + l.map(o => dbObsLine(o, true, true)).join('') + '</details>';
}

function _render() {
  const P = S.prep;
  const when = [S.mDate ? fmtDate(S.mDate) : '', S.mTime].filter(Boolean).join(' à ');
  document.getElementById('PSM').textContent = [S.tA + ' / ' + S.tB, when].filter(Boolean).join(' · ');
  const fld = (lab, val) => '<div class="sf"><label>' + lab + '</label><div class="ps-val">' + (esc(val) || '–') + '</div></div>';
  const inp = (k, lab, ph) => '<div class="sf"><label>' + lab + '</label><input data-fld="' + k + '" value="' + esc(P[k]) + '" placeholder="' + ph + '"></div>';
  let h = '<div class="card"><div class="card-title">Rencontre</div><div class="ps-info">' +
    fld('Compétition', S.mComp) + fld('Rencontre', S.tA + ' / ' + S.tB) + fld('Horaire', when) + fld('Score', S.sA + ' - ' + S.sB) +
    fld('Juges arbitres', S.a1 + ' · ' + S.a2) + inp('sup', 'Juge superviseur', 'Ton nom') + inp('sec', 'Secrétaire', 'Nom') + inp('chr', 'Chronométreur', 'Nom') +
    '</div></div>';
  h += '<div class="card"><div class="card-title">Type de suivi</div><div class="ps-tags">' +
    TYPES.map(t => '<button class="qn-tag' + (P.type.includes(t) ? ' selected' : '') + '" data-type="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div></div>';
  ITEMS.forEach((it, i) => {
    const s = _sugg(it), cur = P.notes[it.code];
    if (it.f) h += (i ? '</div>' : '') + '<div class="card"><div class="card-title">' + esc(it.f) + ' ' + _auto + '</div>';
    const info = s.v === null ? (s.n ? s.n + ' obs. · trop peu pour proposer une note' : 'aucune observation') : 'Proposition <b>' + s.v + '/10</b> · ' + s.p + ' % conforme · ' + s.n + ' obs.';
    h += '<div class="ps-item">' + _head(it.code, it.t, '<span class="ps-sugg">' + info + (it.hint ? ' · ' + it.hint : '') + '</span>') +
      '<div class="db-seg ps-notes">' + [...Array(11).keys()].map(v => '<button class="db-seg-b' + (cur === v ? ' on' : '') + (s.v === v ? ' sugg' : '') +
        '" data-note="' + it.code + '" data-v="' + v + '" aria-label="Note ' + v + '">' + v + '</button>').join('') + '</div>' +
      _acts(it) + _ta(it.code, 'Commentaire ' + it.code + '…') + '</div>';
  });
  h += '</div>';
  h += '<div class="card"><div class="card-title">D · Influence de l\'arbitrage</div><div class="ps-item">' +
    _head('D1', 'Précision', '<span class="ps-sugg">à ton appréciation</span>') + _seg('d1', D1L, P.d1, { neg: 'neg', pos: 'pos' }) + _ta('D1', 'Commentaire D1…') + '</div></div>';
  const vals = Object.values(ans).filter(Boolean), non = vals.filter(v => v === 'non').length;
  const why = [];
  if (ans.esprit === 'non') why.push('état d\'esprit « Non »');
  if (Math.abs(S.sA - S.sB) <= 3) why.push('écart ≤ 3 buts');
  if (ans.engage === 'non') why.push('engagement physique « Non »');
  const du = _sugg(ITEMS[0]); if (du.n >= 5 && du.p < 60) why.push('duels à ' + du.p + ' %');
  h += '<div class="card"><div class="card-title">E · Difficulté du match ' + _auto + '</div>' +
    '<div class="ps-item">' + _head('E1', 'Niveau de difficulté') + _seg('e1', E1L, P.e1) +
    '<div class="ps-why">' + (vals.length ? 'Proposé d\'après l\'Évaluation générale : ' + non + ' réponse' + (non > 1 ? 's' : '') + ' « Non » sur ' + vals.length + '.' : 'Évaluation générale non remplie : à choisir.') + '</div></div>' +
    '<div class="ps-item">' + _head('E2', 'Difficultés relevées') + '<div class="ps-tags">' +
    E2L.map(t => '<button class="qn-tag' + (P.e2.includes(t) ? ' selected' : '') + '" data-e2="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>' +
    '<div class="ps-why">' + (why.length ? 'Proposé car : ' + why.join(', ') + '.' : 'Aucune difficulté détectée automatiquement.') + '</div></div></div>';
  h += '<div class="card"><div class="ps-total"><div><div class="card-title">Note globale</div><div class="ps-why">Calcul indicatif : somme des 6 notes A1 à C2 (sur 60) et moyenne sur 10.</div></div><div class="ps-big" id="psTot">' + _total() + '</div></div></div>';
  h += '<div class="card"><div class="card-title">F · Conclusion</div>' +
    '<div class="ps-item">' + _head('F0', 'Conclusion · commentaires · lien vidéo', _auto) + _ta('F0', 'Repris du commentaire global…', 400) + '</div>' +
    '<div class="ps-item">' + _head('F1', 'Respect des consignes · Protocole', _auto) + F1.map(([sub, l]) => '<div class="ps-sub">' + sub + '</div>' + l.map(([lab, fn]) => {
      const L = S.obs.filter(fn), g = L.filter(o => o.col !== 'red').length;
      return '<div class="q-row"><div class="q-left"><span class="q-lbl">' + esc(lab) + '<small>' + (L.length ? L.length + ' obs. · ' + Math.round(100 * g / L.length) + ' % conforme' : 'non observé pendant le match') + '</small></span></div><div class="yn-btns ps-yn">' +
        [['oui', 'ysel'], ['non', 'nsel'], ['nv', 'nvsel']].map(([v, c]) => '<button class="btn-yn' + (P.f1[lab] === v ? ' ' + c : '') + '" data-f1="' + F1_ALL.findIndex(x => x[0] === lab) + '" data-v="' + v + '">' + YN[v] + '</button>').join('') + '</div></div>';
    }).join('')).join('') + '</div>' +
    '<div class="ps-item">' + _head('F2', 'Points positifs du binôme', _auto) + _ta('F2', 'Points positifs…', 400) + '</div>' +
    '<div class="ps-item">' + _head('F3', 'Points à travailler du binôme', _auto) + _ta('F3', 'Points à travailler…', 400) + '</div></div>';
  h += '<div class="card"><div class="card-title">Dialogue avec le correcteur <span class="db-sub-title">facultatif</span></div>' +
    '<textarea class="gc-ta ps-ta" data-txt="dlg" placeholder="Message éventuel…">' + esc(P.txt.dlg || '') + '</textarea></div>';
  h += '<div class="card"><div class="ps-acts"><button class="btn-act prim" data-act="all">Copier toute la feuille</button><button class="btn-act" data-act="show">Voir le texte complet</button><button class="btn-act" data-act="reset">Recalculer les propositions</button></div>' +
    '<div class="ps-why" id="psMsg"></div><div class="ps-export" id="psExp"></div></div>';
  document.getElementById('psBody').innerHTML = h;
  _counts();
}
function _counts() {
  document.querySelectorAll('#PS [data-cnt]').forEach(c => {
    const n = (S.prep.txt[c.dataset.cnt] || '').length, max = +c.dataset.max || 0;
    c.textContent = max ? n + ' / ' + max + ' caractères' : n + ' caractères';
    c.classList.toggle('over', !!max && n > max);
  });
}

function _fullText() {
  const P = S.prep, L = [];
  const when = [S.mDate ? fmtDate(S.mDate) : '', S.mTime].filter(Boolean).join(' à ');
  L.push('PRÉPARATION SUIVI — ' + [S.tA + ' / ' + S.tB, when, 'Score ' + S.sA + ' - ' + S.sB].filter(Boolean).join(' · '));
  if (S.mComp) L.push('Compétition : ' + S.mComp);
  L.push('Juges arbitres : ' + S.a1 + ' · ' + S.a2);
  [['sup', 'Juge superviseur'], ['sec', 'Secrétaire'], ['chr', 'Chronométreur']].forEach(([k, t]) => { if (P[k]) L.push(t + ' : ' + P[k]); });
  L.push('Type de suivi : ' + (P.type.join(', ') || '—'), '');
  ITEMS.forEach(it => { L.push(it.code + ' - ' + it.t + ' : ' + (P.notes[it.code] ?? '—') + '/10'); if ((P.txt[it.code] || '').trim()) L.push('   ' + P.txt[it.code].trim()); });
  L.push('', 'D1 - Précision : ' + (D1L[P.d1] || '—'));
  if ((P.txt.D1 || '').trim()) L.push('   ' + P.txt.D1.trim());
  L.push('E1 - Difficulté : ' + (E1L[P.e1] || '—'), 'E2 - Difficultés relevées : ' + (P.e2.join(', ') || '—'), 'Note globale (indicative) : ' + _total(), '');
  L.push('F0 - Conclusion : ' + (P.txt.F0 || '').trim(), 'F1 - Respect des consignes / Protocole :');
  F1_ALL.forEach(([lab]) => L.push('   ' + lab + ' : ' + YN[P.f1[lab]] ));
  L.push('F2 - Points positifs : ' + (P.txt.F2 || '').trim(), 'F3 - Points à travailler : ' + (P.txt.F3 || '').trim());
  if ((P.txt.dlg || '').trim()) L.push('', 'Dialogue avec le correcteur : ' + P.txt.dlg.trim());
  return L.join('\n');
}

async function _copy(text, btn) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
    /* Repli : ancienne méthode (certains navigateurs refusent l'API presse-papier) */
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
    ta.remove();
  }
  if (!btn.dataset.lbl) btn.dataset.lbl = btn.textContent;
  btn.textContent = ok ? 'Copié ✔' : 'Copie impossible';
  setTimeout(() => { btn.textContent = btn.dataset.lbl; }, 1500);
  log.info('PREP', ok ? 'copie_ok' : 'copie_echec', { len: text.length });
}

let _resetArmed = null;
function _onClick(e) {
  const b = e.target.closest('button');
  if (!b || !S.prep) return;
  const P = S.prep, d = b.dataset;
  const tog = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); };
  if (d.note) P.notes[d.note] = P.notes[d.note] === +d.v ? null : +d.v;
  else if (d.type) tog(P.type, d.type);
  else if (d.d1) P.d1 = P.d1 === d.d1 ? null : d.d1;
  else if (d.e1) P.e1 = P.e1 === d.e1 ? null : d.e1;
  else if (d.e2) tog(P.e2, d.e2);
  else if (d.f1 !== undefined) P.f1[F1_ALL[+d.f1][0]] = d.v;
  else if (d.copy) return _copy(P.txt[d.copy] || '', b);
  else if (d.act === 'all') return _copy(_fullText(), b);
  else if (d.act === 'show') { const x = document.getElementById('psExp'); x.textContent = _fullText(); x.classList.toggle('on'); return; }
  else if (d.act === 'reset') {
    /* 2 appuis : le recalcul écrase les notes et textes modifiés */
    if (_resetArmed !== b) {
      _resetArmed = b; b.textContent = 'Confirmer : écraser mes modifications ?'; b.classList.add('ps-warn');
      setTimeout(() => { if (_resetArmed === b) { _resetArmed = null; b.textContent = 'Recalculer les propositions'; b.classList.remove('ps-warn'); } }, 4000);
      return;
    }
    _resetArmed = null;
    S.prep = _propose(P);
    log.info('PREP', 'recalcul');
    _render();
    document.getElementById('psMsg').textContent = 'Propositions recalculées.';
    window.App.autosaveDebounced();
    return;
  } else return;
  _render();
  window.App.autosaveDebounced();
}
function _onInput(e) {
  const t = e.target;
  if (!S.prep) return;
  if (t.dataset.txt) { S.prep.txt[t.dataset.txt] = t.value; _counts(); }
  else if (t.dataset.fld) S.prep[t.dataset.fld] = t.value;
  else return;
  window.App.autosaveDebounced();
}

let _bound = false;
export function openPrep() {
  if (!S.prep) S.prep = _propose(null);
  _open.clear();
  if (!_bound) {
    const ps = document.getElementById('PS');
    ps.addEventListener('click', _onClick);
    ps.addEventListener('input', _onInput);
    /* « toggle » ne remonte pas : écoute en capture */
    ps.addEventListener('toggle', e => { const k = e.target.dataset?.det; if (k) e.target.open ? _open.add(k) : _open.delete(k); }, true);
    _bound = true;
  }
  _render();
  document.getElementById('ES').style.display = 'none';
  document.getElementById('PS').style.display = 'flex';
  window.scrollTo(0, 0);
  window.App.autosaveDebounced();
  log.info('PREP', 'ouverture', { nbObs: S.obs.length });
}
export function closePrep() {
  document.getElementById('PS').style.display = 'none';
  document.getElementById('ES').style.display = 'flex';
  window.scrollTo(0, 0);
  window.App.autosaveDebounced();
}
