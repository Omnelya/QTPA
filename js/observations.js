/* ═══ OBSERVATIONS — Observations rapides v1.5.1 ═════════════════════════
   • Grille unique de catégories rangées par familles (plus de zone A1/A2)
   • Tap ✘/✔ = ouvre la popup : tags (les plus fréquents d'abord), drapeau
     « à revoir », note libre, puis choix de l'arbitre = enregistrement
   • Annuler (avec confirmation) / Rétablir (sans confirmation)
   • Aucun retour sonore, vibratoire ou lumineux à l'enregistrement
════════════════════════════════════════════════════════════════════════════ */
import { S, CA, CP, CAU, CAT_TAGS, TAGS_GENERAUX, FAMILIES, KEY_HISTORY } from './state.js';
import { fmt, escapeHtml } from './utils.js';
import { log } from './logger.js';
import { renderDebrief } from './debrief.js';

/* Observations annulées, rétablissables (vidé au démarrage/reprise d'un match
   et à chaque nouvelle observation). Volontairement hors de S : non sauvegardé. */
const _undone = [];

/* ═══ Construction de la grille (familles) ═════════════════════════════ */
export function buildQuickNotes() {
  const wrap = document.getElementById('quickNotesWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  _undone.length = 0;

  const grid = document.createElement('div');
  grid.className = 'qn-families';
  FAMILIES.forEach(g => {
    const group = document.createElement('div');
    group.className = 'qn-group qn-g-' + g.code;
    const span = g.blocks.reduce((n, b) => n + b.cols, 0);
    const head = document.createElement('div');
    head.className = 'qn-group-head';
    head.innerHTML = '<span class="qn-gchip">' + g.code + '</span> ' +
      '<span class="qn-gfull">' + escapeHtml(g.title) + '</span>' +
      (g.short ? '<span class="qn-gshort">' + escapeHtml(g.short) + '</span>' : '');
    group.appendChild(head);
    const blocks = document.createElement('div');
    blocks.className = 'qn-blocks';
    blocks.style.setProperty('--span', span);
    g.blocks.forEach(b => {
      const blk = document.createElement('div');
      blk.className = 'qn-block';
      blk.style.setProperty('--cols', b.cols);
      blk.style.gridColumn = 'span ' + b.cols;
      const bt = document.createElement('div');
      bt.className = 'qn-block-title';
      bt.textContent = b.code + ' · ' + b.title;
      blk.appendChild(bt);
      const cells = document.createElement('div');
      cells.className = 'qn-cells';
      b.cats.forEach(cat => {
        const cell = document.createElement('div');
        cell.className = 'qn-cell' + (cat === CAU ? ' qn-cell-autre' : '');
        const name = document.createElement('div');
        name.className = 'qn-rname';
        name.textContent = cat;
        const btns = document.createElement('div');
        btns.className = 'qn-btns';
        btns.appendChild(_makeTapBtn(cat, 'red'));
        btns.appendChild(_makeTapBtn(cat, 'green'));
        cell.appendChild(name);
        cell.appendChild(btns);
        cells.appendChild(cell);
      });
      blk.appendChild(cells);
      blocks.appendChild(blk);
    });
    group.appendChild(blocks);
    grid.appendChild(group);
  });
  wrap.appendChild(grid);
  refreshCounters();
}

/* ═══ Bouton tap — ouvre TOUJOURS la popup ═════════════════════════════
   Uniquement « click » : touch-action:manipulation (CSS) supprime le délai
   iOS, et on ne bloque plus le défilement de la page (iPhone). */
const _SVG_CROSS = '<svg class="qn-ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/></svg>';
const _SVG_CHECK = '<svg class="qn-ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 10.5l4 4 7-8.5"/></svg>';
function _makeTapBtn(cat, col) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'qn-tap ' + col;
  btn.setAttribute('aria-label', cat + (col === 'red' ? ' non conforme' : ' conforme'));
  /* v1.6.1 : icônes SVG (hauteur identique pour ✘ et ✔, quelle que soit la police de l'appareil) */
  btn.innerHTML = (col === 'red' ? _SVG_CROSS : _SVG_CHECK) +
    '<span class="qn-count" id="' + _cntId(cat, col) + '"></span>';
  btn.addEventListener('click', e => {
    e.preventDefault();
    _openDetail(cat, col);
  });
  return btn;
}

function _cntId(cat, col) {
  return 'qnCnt_' + cat.replace(/[^a-zA-Z0-9]/g, '') + '_' + col;
}

/* ═══ Fréquence des tags (historique local + match en cours) ═══════════ */
function _tagFreq() {
  const freq = {};
  const add = o => (o.tags || []).forEach(t => { freq[t] = (freq[t] || 0) + 1; });
  try {
    const h = JSON.parse(localStorage.getItem(KEY_HISTORY) || '[]');
    if (Array.isArray(h)) h.forEach(m => ((m && m.S && m.S.obs) || []).forEach(add));
  } catch (e) { /* historique illisible : on ignore, ordre par défaut */ }
  S.obs.forEach(add);
  return freq;
}

/** Tri stable : plus fréquent d'abord, ex æquo = ordre d'origine. */
function _byFreq(list, freq) {
  return list
    .map((t, i) => [t, i])
    .sort((a, b) => (freq[b[0]] || 0) - (freq[a[0]] || 0) || a[1] - b[1])
    .map(x => x[0]);
}

/* ═══ Popup détail ═════════════════════════════════════════════════════ */

function _addTag(wrap, t, selected) {
  const tag = document.createElement('button');
  tag.type = 'button';
  tag.className = 'qn-tag' + (selected ? ' selected' : '');
  tag.textContent = t;
  tag.dataset.tag = t;
  tag.setAttribute('aria-pressed', selected ? 'true' : 'false');
  tag.onclick = () => {
    tag.classList.toggle('selected');
    tag.setAttribute('aria-pressed', tag.classList.contains('selected') ? 'true' : 'false');
  };
  wrap.appendChild(tag);
}

/**
 * Reconstruit la zone de tags dans la popup.
 * @param {string}   cat       catégorie de l'observation
 * @param {string}   col       'red' | 'green' — type courant
 * @param {string[]} keepTags  tags à pré-sélectionner (vide = aucun)
 */
function _rebuildTags(cat, col, keepTags) {
  const tagsWrap = document.getElementById('detailTags');
  tagsWrap.innerHTML = '';
  const freq = _tagFreq();

  /* ── Tags spécifiques à la catégorie (filtrés par couleur) ── */
  const catDef = CAT_TAGS[cat];
  const hasSpecific = !!(catDef && (catDef.both.length || catDef.red.length || catDef.green.length));
  if (catDef) {
    _byFreq([...(col === 'red' ? catDef.red : catDef.green), ...catDef.both], freq)
      .forEach(t => _addTag(tagsWrap, t, keepTags.includes(t)));
  }

  /* ── Séparateur ── */
  if (hasSpecific) {
    const sep = document.createElement('div');
    sep.style.cssText = 'width:100%;height:0;border-top:1px dashed var(--border-input);margin:4px 0;';
    tagsWrap.appendChild(sep);
  }

  /* ── Tags généraux : équipes d'abord, puis généraux par fréquence ── */
  [S.tA, S.tB].filter(Boolean).concat(_byFreq(TAGS_GENERAUX, freq))
    .forEach(t => _addTag(tagsWrap, t, keepTags.includes(t)));
}

function _syncFlagBtn() {
  const btn = document.getElementById('detailFlag');
  if (!btn || !S.detailPending) return;
  const on = !!S.detailPending.flag;
  btn.classList.toggle('on', on);
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  const lbl = btn.querySelector('.qn-flag-label');
  if (lbl) lbl.textContent = on ? 'À revoir avec l’arbitre : activé' : 'Marquer à revoir avec l’arbitre';
}

function _syncTodoBtn() {
  const btn = document.getElementById('detailTodo');
  if (!btn || !S.detailPending) return;
  const on = !!S.detailPending.todo;
  btn.classList.toggle('on', on);
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  const lbl = btn.querySelector('.qn-flag-label');
  if (lbl) lbl.textContent = on ? 'À compléter plus tard : activé' : 'À compléter plus tard';
}

export function toggleDetailTodo() {
  if (!S.detailPending) return;
  S.detailPending.todo = !S.detailPending.todo;
  _syncTodoBtn();
}

export function toggleDetailFlag() {
  if (!S.detailPending) return;
  S.detailPending.flag = !S.detailPending.flag;
  _syncFlagBtn();
}

function _openDetail(cat, col, prefill) {
  /* prefill : objet { arb, tags, cmt, flag, editIndex, time, el, period }
     pour le mode édition, undefined pour une nouvelle observation. */
  const isEdit = prefill !== undefined;

  S.detailPending = {
    arb:       isEdit ? [...prefill.arb] : [],
    cat, col,
    flag:      isEdit ? !!prefill.flag : false,
    todo:      isEdit ? !!prefill.todo : false,
    time:      isEdit ? prefill.time   : fmt(S.elapsed),
    el:        isEdit ? prefill.el     : S.elapsed,
    period:    isEdit ? prefill.period : S.period,
    editIndex: isEdit ? prefill.editIndex : undefined
  };

  /* ── Titre ── */
  const colLabel = col === 'red' ? 'Non conforme' : 'Conforme';
  document.getElementById('detailTitle').textContent =
    (isEdit ? '✎ Modifier — ' : '') + cat + ' — ' + colLabel;
  document.getElementById('detailMeta').textContent =
    S.detailPending.time + ' · ' + S.detailPending.period;

  /* ── Boutons d'enregistrement = choix de l'arbitre ── */
  const cur = S.detailPending.arb;
  [['A1', S.a1 || 'A1'], ['A2', S.a2 || 'A2']].forEach(([a, label]) => {
    const b = document.getElementById('detailSave_' + a);
    if (!b) return;
    b.textContent = label;
    b.classList.toggle('is-current', isEdit && cur.length === 1 && cur[0] === a);
  });
  const bBoth = document.getElementById('detailSave_both');
  if (bBoth) bBoth.classList.toggle('is-current', isEdit && cur.length === 2);
  const saveLbl = document.getElementById('detailSaveLabel');
  if (saveLbl) saveLbl.textContent = isEdit ? 'Mettre à jour pour' : 'Enregistrer pour';

  /* ══ Contrôle Type (mode édition uniquement) ══ */
  const editControls = document.getElementById('detailEditControls');
  if (editControls) {
    if (isEdit) {
      editControls.style.display = 'flex';
      ['red', 'green'].forEach(c => {
        const btn = document.getElementById('detailCol_' + c);
        if (!btn) return;
        btn.classList.toggle('edit-ctrl-active', c === col);
        btn.onclick = () => {
          if (S.detailPending.col === c) return; /* pas de changement */
          S.detailPending.col = c;
          document.getElementById('detailTitle').textContent =
            '✎ Modifier — ' + cat + ' — ' + (c === 'red' ? 'Non conforme' : 'Conforme');

          /* Conserver uniquement les tags both + généraux sélectionnés */
          const catDef = CAT_TAGS[cat];
          const bothTags  = catDef ? catDef.both : [];
          const genTags   = [S.tA, S.tB].filter(Boolean).concat(TAGS_GENERAUX);
          const keepable  = [...bothTags, ...genTags];
          const keepTags  = _getSelectedTags().filter(t => keepable.includes(t));

          document.querySelectorAll('.edit-ctrl-type').forEach(b =>
            b.classList.toggle('edit-ctrl-active', b.dataset.col === c));
          _rebuildTags(cat, c, keepTags);
        };
      });
    } else {
      editControls.style.display = 'none';
    }
  }

  /* ── Tags, drapeau, note ── */
  _rebuildTags(cat, col, isEdit ? (prefill.tags || []) : []);
  _syncFlagBtn();
  _syncTodoBtn();
  document.getElementById('detailNote').value = isEdit ? (prefill.cmt || '') : '';
  const ov = document.getElementById('detailOverlay');
  ov.classList.add('on');
  const sheet = ov.querySelector('.qn-sheet');
  if (sheet) sheet.scrollTop = 0;
}

/** Lit les tags actuellement sélectionnés dans la popup. */
function _getSelectedTags() {
  return [...document.querySelectorAll('#detailTags .qn-tag.selected')].map(t => t.dataset.tag);
}

export function closeDetail() {
  document.getElementById('detailOverlay').classList.remove('on');
  S.detailPending = null;
}

/* Appelé par les 3 boutons de la popup : 'A1' | 'A2' | 'both' */
export function saveDetail(sel) {
  const d = S.detailPending;
  if (!d) return;
  if (sel !== 'A1' && sel !== 'A2' && sel !== 'both') return; /* choix d'arbitre obligatoire */
  S.matchActif = true; /* v0.3.31 (BUG-5) */

  const selectedTags = _getSelectedTags();
  const cmt = document.getElementById('detailNote').value.trim();
  const arb = sel === 'both' ? ['A1', 'A2'] : [sel];
  const arbNames = arb.map(a => a === 'A1' ? S.a1 : S.a2);

  const obsEntry = {
    time: d.time, el: d.el, period: d.period,
    arb,
    an: arbNames.join(' + '),
    cat: d.cat,
    cats: [d.cat],
    col: d.col,
    flag: !!d.flag,
    todo: !!d.todo,
    tags: selectedTags,
    cmt: cmt
  };

  const isEdit = d.editIndex !== undefined;

  if (isEdit) {
    /* ── Mode édition : remplacement en place ── */
    S.obs.splice(d.editIndex, 1, obsEntry);
    log.info('OBS', 'observation_modifiee', {
      index: d.editIndex,
      arbitres: arbNames.join(' + '), categorie: d.cat,
      type: d.col === 'red' ? 'non_conforme' : 'conforme',
      a_revoir: obsEntry.flag,
      tags: selectedTags.join(', '),
      totalObservations: S.obs.length
    });
  } else {
    /* ── Mode création : ajout ── */
    S.obs.push(obsEntry);
    _undone.length = 0; /* une nouvelle observation invalide le « Rétablir » */
    log.info('OBS', 'observation_enregistree', {
      arbitres: arbNames.join(' + '), categorie: d.cat,
      type: d.col === 'red' ? 'non_conforme' : 'conforme',
      a_revoir: obsEntry.flag,
      tags: selectedTags.join(', '),
      temps: d.time, periode: d.period,
      totalObservations: S.obs.length
    });
  }

  closeDetail();
  _afterObsChange();
}

function _afterObsChange() {
  refreshCounters();
  if (window.mtRefresh) window.mtRefresh();
  renderTable();
  renderEndTable();
  _refreshSynthesisIfVisible(); /* v0.4.10 */
  window.App.autosave();
}

/* ═══ Annuler (avec confirmation) / Rétablir (sans confirmation) ═══════ */
function _resume(o) {
  return o.time + ' · ' + o.period + ' · ' + o.an + ' · ' + o.cat +
    ' ' + (o.col === 'red' ? '✘' : '✔') + (o.flag ? ' ⚑' : '') +
    (o.cmt ? ' — ' + o.cmt : '');
}

export function askUndo() {
  if (!S.obs.length) return;
  const el = document.getElementById('undoObsSummary');
  if (el) el.textContent = _resume(S.obs[S.obs.length - 1]);
  document.getElementById('undoOverlay').classList.add('on');
}

export function cancelUndo() {
  document.getElementById('undoOverlay').classList.remove('on');
}

export function doUndo() {
  cancelUndo();
  S.matchActif = true;
  const o = S.obs.pop();
  if (!o) return;
  _undone.push(o);
  log.info('OBS', 'observation_annulee', { categorie: o.cat, totalObservations: S.obs.length });
  _afterObsChange();
}

export function redoObs() {
  const o = _undone.pop();
  if (!o) return;
  S.matchActif = true;
  S.obs.push(o);
  log.info('OBS', 'observation_retablie', { categorie: o.cat, totalObservations: S.obs.length });
  _afterObsChange();
}

/* ═══ Édition d'une observation existante — v0.4.9 ═════════════════════
   Retrouve l'observation par index dans S.obs et rouvre la popup
   avec toutes les données pré-remplies.                                  */
export function editObservation(idx) {
  const o = S.obs[idx];
  if (!o) return;
  _openDetail(o.cat, o.col, {
    arb:       o.arb,
    tags:      o.tags || [],
    cmt:       o.cmt  || '',
    flag:      !!o.flag,
    todo:      !!o.todo,
    time:      o.time,
    el:        o.el,
    period:    o.period,
    editIndex: idx
  });
}

/* ═══ Suppression d'une observation — v0.4.9 ═══════════════════════════
   Stocke l'index candidat et ouvre la modale de confirmation.            */
let _pendingDeleteIdx = null;

export function deleteObservation(idx) {
  if (idx < 0 || idx >= S.obs.length) return;
  _pendingDeleteIdx = idx;

  /* Alimenter la modale avec un résumé de l'observation */
  const o = S.obs[idx];
  const cmtParts = [];
  if (o.tags && o.tags.length) cmtParts.push(o.tags.join(', '));
  if (o.cmt) cmtParts.push(o.cmt);
  const resume = o.time + ' · ' + o.period + ' · ' + o.an + ' · ' + o.cat +
    (cmtParts.length ? ' · ' + cmtParts.join(' / ') : '');

  const summaryEl = document.getElementById('confirmObsSummary');
  if (summaryEl) summaryEl.textContent = resume;

  document.getElementById('confirmOverlay').classList.add('on');
}

/* ── Rafraîchit la synthèse si l'écran ES est visible — v0.4.10 ──────
   Appelé après toute modification ou suppression d'observation pour que
   la card "Synthèse par catégorie" reste synchronisée en temps réel.    */
function _refreshSynthesisIfVisible() {
  const es = document.getElementById('ES');
  if (es && es.style.display !== 'none') {
    if (window.App && typeof window.App.buildSynTable === 'function') {
      window.App.buildSynTable();
    }
  }
}

export function confirmDelete() {
  if (_pendingDeleteIdx === null) return;
  const o = S.obs[_pendingDeleteIdx];
  S.obs.splice(_pendingDeleteIdx, 1);
  log.info('OBS', 'observation_supprimee', {
    index: _pendingDeleteIdx,
    categorie: o ? o.cat : '?',
    totalObservations: S.obs.length
  });
  _pendingDeleteIdx = null;
  closeConfirm();
  refreshCounters();
  renderTable();
  renderEndTable();
  _refreshSynthesisIfVisible(); /* v0.4.10 */
  if (window.mtRefresh) window.mtRefresh();
  window.App.autosave();
}

export function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('on');
  _pendingDeleteIdx = null;
}

/* ═══ Compteurs ════════════════════════════════════════════════════════ */
export function refreshCounters() {
  /* Compteur par bouton : toutes observations de la catégorie, tous arbitres confondus */
  [...CA, ...CP, CAU].forEach(cat => {
    ['red', 'green'].forEach(col => {
      const el = document.getElementById(_cntId(cat, col));
      if (!el) return;
      const n = S.obs.filter(o => o.cat === cat && o.col === col).length;
      el.textContent = n || '';
    });
  });

  /* Pastilles par arbitre (noms réels) + total à revoir */
  ['A1', 'A2'].forEach(arb => {
    const r = S.obs.filter(o => o.arb.includes(arb) && o.col === 'red').length;
    const g = S.obs.filter(o => o.arb.includes(arb) && o.col === 'green').length;
    const el = document.getElementById('qnStats_' + arb);
    if (el) el.textContent = (arb === 'A1' ? S.a1 : S.a2) + ' ' + r + '✘ ' + g + '✔';
  });
  const fl = document.getElementById('qnFlags');
  if (fl) fl.textContent = '⚑ ' + S.obs.filter(o => o.flag).length;

  const bu = document.getElementById('btnUndo');
  const br = document.getElementById('btnRedo');
  if (bu) bu.disabled = S.obs.length === 0;
  if (br) br.disabled = _undone.length === 0;

  const oc = document.getElementById('OC');
  if (oc) oc.textContent = S.obs.length + ' obs.';
}

/* ═══ Tableau des observations ═════════════════════════════════════════ */
/* v1.4.21 : MT3 ajouté entre MT2 et Prol.1 */
const PERIOD_WEIGHT = { 'MT1': 0, 'MT2': 1, 'MT3': 2, 'Prol.1': 3, 'Prol.2': 4 };

function chronoKey(obs) {
  const pw = (PERIOD_WEIGHT[obs.period] ?? 0) * 10000;
  return pw + (obs.el || 0);
}

export function sorted(by) {
  const o = [...S.obs];
  if      (by === 'cat')      o.sort((a, b) => a.cat.localeCompare(b.cat));
  else if (by === 'arb')      o.sort((a, b) => a.an.localeCompare(b.an));
  else if (by === 'col')      o.sort((a, b) => a.col.localeCompare(b.col));
  else if (by === 'time_asc') o.sort((a, b) => chronoKey(a) - chronoKey(b));
  else                        o.sort((a, b) => chronoKey(b) - chronoKey(a));
  return o;
}

/* ═══ Filtres par colonne — v0.3.32 ════════════════════════════════════
   Deux états indépendants : F pour l'écran MS, FE pour l'écran ES.
   Structure : { cat, col, period, arb } — valeur 'all' = pas de filtrage.
   Les filtres sont cumulables et appliqués sur les données sources.      */

/** @type {{ cat: string, col: string, period: string, arb: string }} */
const F  = { cat: 'all', col: 'all', period: 'all', arb: 'all' }; /* écran MS */
/** @type {{ cat: string, col: string, period: string, arb: string }} */
const FE = { cat: 'all', col: 'all', period: 'all', arb: 'all' }; /* écran ES */

/**
 * Fonction de filtrage pure — aucun effet de bord.
 * @param {Array} obs   tableau source (S.obs ou sous-ensemble)
 * @param {{ cat:string, col:string, period:string, arb:string }} f  état des filtres
 * @returns {Array} sous-tableau filtré
 */
function applyFilters(obs, f) {
  return obs.filter(o => {
    /* Filtre catégorie : correspondance exacte */
    if (f.cat !== 'all' && o.cat !== f.cat) return false;
    /* Filtre type : 'red' = Non conforme, 'green' = Conforme */
    if (f.col === 'flag') { if (!o.flag) return false; }
    else if (f.col !== 'all' && o.col !== f.col) return false;
    /* Filtre période (MT) : correspondance exacte */
    if (f.period !== 'all' && o.period !== f.period) return false;
    /* Filtre arbitre : l'observation doit inclure l'arbitre sélectionné.
       o.arb est un tableau (['A1'] ou ['A1','A2']).
       On compare via le code arbitre (A1/A2), pas le nom, pour robustesse. */
    if (f.arb !== 'all' && !o.arb.includes(f.arb)) return false;
    return true;
  });
}

/**
 * Compte les filtres actifs (valeur ≠ 'all') dans un état de filtre.
 * @param {{ cat:string, col:string, period:string, arb:string }} f
 * @returns {number}
 */
function countActiveFilters(f) {
  return Object.values(f).filter(v => v !== 'all').length;
}

/**
 * Recalcule les options dynamiques (Catégorie, Arbitre) en fonction de S.obs,
 * puis met à jour les selects du tableau ciblé (MS ou ES).
 * Les options fixes (Type, MT) ne sont jamais recalculées.
 * @param {'ms'|'es'} screen
 */
function _syncFilterOptions(screen) {
  const suffix = screen === 'es' ? 'E' : '';

  /* Options Catégorie : toutes les catégories présentes dans S.obs */
  const cats = [...new Set(S.obs.map(o => o.cat))].sort((a, b) => a.localeCompare(b));
  const selCat = document.getElementById('fltCat' + suffix);
  if (selCat) {
    const prev = selCat.value;
    selCat.innerHTML = '<option value="all">Toutes</option>' +
      cats.map(c => '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>').join('');
    /* Réappliquer la valeur précédente si elle existe encore */
    if (cats.includes(prev)) selCat.value = prev;
  }

  /* Options Arbitre : A1 / A2 avec leurs noms réels */
  const selArb = document.getElementById('fltArb' + suffix);
  if (selArb) {
    const prev = selArb.value;
    selArb.innerHTML =
      '<option value="all">Tous</option>' +
      '<option value="A1">' + escapeHtml(S.a1 || 'Arbitre 1') + '</option>' +
      '<option value="A2">' + escapeHtml(S.a2 || 'Arbitre 2') + '</option>';
    if (prev === 'A1' || prev === 'A2') selArb.value = prev;
  }
}

/**
 * Met à jour le badge "N filtre(s) actif(s)" et l'état du bouton reset.
 * Met aussi en évidence les selects dont la valeur est active (≠ 'all').
 * @param {'ms'|'es'} screen
 */
function _syncFilterBadge(screen) {
  const f      = screen === 'es' ? FE : F;
  const suffix = screen === 'es' ? 'E' : '';
  const n      = countActiveFilters(f);

  const badge = document.getElementById('fltBadge' + suffix);
  const btnR  = document.getElementById('fltReset' + suffix);

  if (badge) {
    badge.textContent = n > 0 ? n + ' filtre' + (n > 1 ? 's' : '') + ' actif' + (n > 1 ? 's' : '') : '';
    badge.style.display = n > 0 ? 'inline-block' : 'none';
  }
  if (btnR) {
    btnR.disabled = n === 0;
    btnR.classList.toggle('flt-reset-active', n > 0);
  }

  /* Mise en évidence visuelle des selects actifs */
  [
    ['fltCat'    + suffix, f.cat],
    ['fltCol'    + suffix, f.col],
    ['fltMT'     + (screen === 'es' ? 'E' : ''), f.period],
    ['fltArb'    + suffix, f.arb],
  ].forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('flt-on', val !== 'all');
  });
}

/** Appelé par les onchange des selects de filtre — écran MS */
export function onFilterChange() {
  const g = (id) => { const el = document.getElementById(id); return el ? el.value : 'all'; };
  F.cat    = g('fltCat');
  F.col    = g('fltCol');
  F.period = g('fltMT');
  F.arb    = g('fltArb');
  log.info('FILTERS', 'filtre_ms_change', { ...F });
  renderTable();
}

/** Appelé par les onchange des selects de filtre — écran ES */
export function onFilterChangeE() {
  const g = (id) => { const el = document.getElementById(id); return el ? el.value : 'all'; };
  FE.cat    = g('fltCatE');
  FE.col    = g('fltColE');
  FE.period = g('fltMTE');
  FE.arb    = g('fltArbE');
  log.info('FILTERS', 'filtre_es_change', { ...FE });
  renderEndTable();
}

/** Reset complet des filtres — écran MS */
export function resetFilters() {
  F.cat = F.col = F.period = F.arb = 'all';
  ['fltCat','fltCol','fltMT','fltArb'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = 'all';
  });
  log.info('FILTERS', 'filtre_ms_reset');
  renderTable();
}

/** Reset complet des filtres — écran ES */
export function resetFiltersE() {
  FE.cat = FE.col = FE.period = FE.arb = 'all';
  ['fltCatE','fltColE','fltMTE','fltArbE'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = 'all';
  });
  log.info('FILTERS', 'filtre_es_reset');
  renderEndTable();
}

export function oRow(o, idx) {
  const rc = o.col === 'red' ? 'rr' : 'rg';
  const tl = o.col === 'red' ? 'Non conf./manquante' : 'Conforme';
  const cmtParts = [];
  if (o.tags && o.tags.length) cmtParts.push(o.tags.join(', '));
  if (o.cmt) cmtParts.push(o.cmt);
  const cmtText = cmtParts.join(' · ') || '';

  /* v0.3.24 (FRAG-3) : échappement HTML des champs utilisateur */
  /* v0.4.9 : ajout colonne Actions (crayon + croix) avec data-idx */
  return '<tr class="' + rc + '" data-idx="' + idx + '">' +
    '<td style="white-space:nowrap;font-variant-numeric:tabular-nums;">' + o.time + '</td>' +
    '<td style="white-space:nowrap;">' + o.period + '</td>' +
    '<td><span class="badge ba">' + escapeHtml(o.an) + '</span></td>' +
    '<td style="font-weight:700;white-space:nowrap;">' + escapeHtml(o.cat) + '</td>' +
    '<td><span class="lc">' + tl + '</span></td>' +
    '<td class="obs-flag">' + (o.flag ? '<span role="img" aria-label="À revoir">⚑</span>' : '') + (o.todo ? '<span role="img" aria-label="À compléter" title="À compléter">✎</span>' : '') + '</td>' +
    '<td>' + escapeHtml(cmtText) + '</td>' +
    '<td class="obs-actions"><div class="obs-actions-inner">' +
      '<button class="obs-btn-edit" onclick="editObservation(' + idx + ')" title="Modifier">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>' +
        '</svg>' +
      '</button>' +
      '<button class="obs-btn-del" onclick="deleteObservation(' + idx + ')" title="Supprimer">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
          '<line x1="18" y1="6" x2="6" y2="18"/>' +
          '<line x1="6" y1="6" x2="18" y2="18"/>' +
        '</svg>' +
      '</button>' +
    '</div></td></tr>';
}

export function renderTable() {
  _syncFilterOptions('ms');

  const sel = document.getElementById('sortSel');
  const all = sorted(sel ? sel.value : 'time_desc');
  const filtered = applyFilters(all, F);

  const tb = document.getElementById('OTB');
  if (tb) {
    if (S.obs.length === 0) {
      tb.innerHTML = '<tr><td colspan="8" class="empty">Aucune observation</td></tr>';
    } else if (filtered.length === 0) {
      tb.innerHTML = '<tr><td colspan="8" class="empty">Aucun résultat pour ces filtres</td></tr>';
    } else {
      /* Passer l'index réel dans S.obs (pas l'index dans filtered) */
      tb.innerHTML = filtered.map(o => oRow(o, S.obs.indexOf(o))).join('');
    }
  }

  const oc = document.getElementById('OC');
  if (oc) {
    oc.textContent = countActiveFilters(F) > 0
      ? filtered.length + '/' + S.obs.length + ' obs.'
      : S.obs.length + ' obs.';
  }

  _syncFilterBadge('ms');
  refreshCounters();
}

export function renderEndTable() {
  _syncFilterOptions('es');

  const sel = document.getElementById('sortSelE');
  const all = sorted(sel ? sel.value : 'time_desc');
  const filtered = applyFilters(all, FE);

  const etb = document.getElementById('EETB');
  if (etb) {
    if (S.obs.length === 0) {
      etb.innerHTML = '<tr><td colspan="8" class="empty">Aucune observation</td></tr>';
    } else if (filtered.length === 0) {
      etb.innerHTML = '<tr><td colspan="8" class="empty">Aucun résultat pour ces filtres</td></tr>';
    } else {
      etb.innerHTML = filtered.map(o => oRow(o, S.obs.indexOf(o))).join('');
    }
  }

  _syncFilterBadge('es');
  renderDebrief(); /* v1.6.0 : les blocs du débrief suivent toute modification */
}
