/* ═══ OBSERVATIONS — Observations rapides v1.5.1 ═════════════════════════
   • Grille unique de catégories rangées par familles (plus de zone A1/A2)
   • Tap ✘/✔ = ouvre la popup : tags (les plus fréquents d'abord), drapeau
     « à revoir », note libre, puis choix de l'arbitre = enregistrement
   • Annuler (avec confirmation) / Rétablir (sans confirmation)
   • Aucun retour sonore, vibratoire ou lumineux à l'enregistrement
════════════════════════════════════════════════════════════════════════════ */
import { S, pl, applyPeriodLabels, CA, CP, CAU, CAT_TAGS, TAG_GROUPS, TAGS_GENERAUX, FAMILIES, LINKS, linkGroup, oneLinePerAction, actionNote, GROUPS, catLabel } from './state.js';
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

/* ═══ Ordre fixe des tags, rangés par groupes — v1.14.0 ═══════════════
   Remplace le tri par fréquence : chaque tag garde toujours sa place.
   Au-delà de 6 tags visibles, les groupes nommés ont un petit titre.    */
const GROUP_MIN = 6;

/** Groupes [nom, tags] visibles pour cat/col, dans l'ordre de TAG_GROUPS. */
function _tagGroups(cat, col) {
  const def = CAT_TAGS[cat];
  if (!def) return [];
  const ok = [...def[col], ...def.both];
  const groups = (TAG_GROUPS[cat] || []).map(([n, l]) => [n, l.filter(t => ok.includes(t))]).filter(g => g[1].length);
  const rest = ok.filter(t => !groups.some(g => g[1].includes(t))); /* filet : tag non rangé → à la fin */
  if (rest.length) groups.push(['', rest]);
  return groups;
}

/** Ajoute dans wrap les tags de cat/col : à plat (≤ 6) ou par groupes titrés. */
function _addCatTags(wrap, cat, col, isSel) {
  const groups = _tagGroups(cat, col);
  const titled = groups.reduce((a, g) => a + g[1].length, 0) > GROUP_MIN && groups.some(g => g[0]);
  groups.forEach(([name, list]) => {
    let box = wrap;
    if (titled) {
      const row = document.createElement('div');
      row.className = 'qn-tgrp';
      const h = document.createElement('div');
      h.className = 'qn-tgrp-name';
      h.textContent = name;
      box = document.createElement('div');
      box.className = 'qn-tags-wrap';
      row.append(h, box);
      wrap.appendChild(row);
    }
    list.forEach(t => _addTag(box, t, isSel(t)));
  });
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

/* ── Équipes + numéros de joueurs (v1.7.1) ────────────────────────────
   Un bouton par équipe (tag = nom de l'équipe) ; une fois choisie, ses
   numéros apparaissent en petit (tag = « Équipe n°7 »).                   */
const _nums = raw => [...new Set(String(raw || '').split(/[^0-9]+/).filter(Boolean))];
const _numTag = (team, n) => team + ' n°' + n;
function _teamDefs() { return [[S.tA, _nums(S.numA)], [S.tB, _nums(S.numB)]].filter(d => d[0]); }

function _buildTeams(keepTags) {
  const box = document.getElementById('detailTeams');
  box.innerHTML = '';
  _teamDefs().forEach(([team, nums]) => {
    const row = document.createElement('div');
    row.className = 'qn-team';
    const numWrap = document.createElement('div');
    numWrap.className = 'qn-nums';
    const on = keepTags.includes(team) || nums.some(n => keepTags.includes(_numTag(team, n)));
    _addTag(row, team, on);
    const btn = row.firstChild;
    nums.forEach(n => { _addTag(numWrap, _numTag(team, n), keepTags.includes(_numTag(team, n))); numWrap.lastChild.textContent = n; numWrap.lastChild.classList.add('qn-num'); });
    numWrap.style.display = on && nums.length ? '' : 'none';
    const base = btn.onclick;
    btn.onclick = () => {
      base();
      const sel = btn.classList.contains('selected');
      numWrap.style.display = sel && nums.length ? '' : 'none';
      if (!sel) numWrap.querySelectorAll('.qn-tag.selected').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); });
    };
    row.appendChild(numWrap);
    box.appendChild(row);
  });
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

  /* ── Tags spécifiques à la catégorie (filtrés par couleur, ordre fixe — v1.14.0) ── */
  const catDef = CAT_TAGS[cat];
  const hasSpecific = !!(catDef && (catDef.both.length || catDef.red.length || catDef.green.length));
  if (catDef) _addCatTags(tagsWrap, cat, col, t => keepTags.includes(t));

  /* Ancien tag retiré des listes (observation d'un match passé) : affiché et gardé sélectionné
     pour ne pas le perdre en modifiant l'observation. */
  const known = new Set([...(catDef ? [...catDef.red, ...catDef.green, ...catDef.both] : []), ...TAGS_GENERAUX,
    ..._teamDefs().flatMap(([t, ns]) => [t, ...ns.map(n => _numTag(t, n))])]);
  keepTags.filter(t => !known.has(t)).forEach(t => _addTag(tagsWrap, t, true));

  /* ── Catégories liées (v1.11.0) : cartes insérées entre les tags propres et les communs ── */
  const lk = document.createElement('div');
  lk.id = 'detailLinked';
  lk.className = 'qn-linked-wrap';
  tagsWrap.appendChild(lk);
  _renderLinked();

  /* ── Séparateur ── */
  if (hasSpecific) {
    const sep = document.createElement('div');
    sep.style.cssText = 'width:100%;height:0;border-top:1px dashed var(--border-input);margin:4px 0;';
    tagsWrap.appendChild(sep);
  }

  /* ── Tags généraux : équipes d'abord, puis tags communs en ordre fixe ── */
  _buildTeams(keepTags);
  TAGS_GENERAUX.forEach(t => _addTag(tagsWrap, t, keepTags.includes(t)));
}

/* ═══ Catégories liées — v1.11.0 ═══════════════════════════════════════
   « ＋ SPA » ajoute une carte SPA (son ✘/✔, ses tags) dans la même fenêtre.
   Équipe/n°, tags communs, note, ⚑, ✎ et arbitre restent communs.        */
let _editGroup = null; /* observations de l'action modifiée (hors de S : non sauvegardé) */

function _syncTitle() {
  const d = S.detailPending;
  document.getElementById('detailTitle').textContent =
    (_editGroup ? '✎ Modifier — ' : '') + catLabel(d) + ' — ' + (d.col === 'red' ? 'Non conforme' : 'Conforme') +
    d.links.map(l => ' + ' + l.cat).join('');
}

function _renderLinkBtns() {
  const d = S.detailPending;
  const zone = document.getElementById('detailLinkZone');
  const box = document.getElementById('detailLinkBtns');
  if (!zone || !box) return;
  const cand = LINKS[d.cat] || [];
  zone.style.display = cand.length ? '' : 'none';
  box.innerHTML = '';
  cand.forEach(c => {
    const on = d.links.some(l => l.cat === c);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'qn-tag qn-link-btn' + (on ? ' selected' : '');
    b.dataset.link = c;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.textContent = (on ? '✓ ' : '＋ ') + c;
    b.onclick = () => _toggleLink(c);
    box.appendChild(b);
  });
}

/* v1.18.0 : « Autre » → choix du groupe où il compte (A1 par défaut) */
function _renderGrp() {
  const d = S.detailPending;
  const zone = document.getElementById('detailGrpZone');
  const box = document.getElementById('detailGrpBtns');
  if (!zone || !box) return;
  zone.style.display = d.cat === CAU ? '' : 'none';
  box.innerHTML = '';
  if (d.cat !== CAU) return;
  Object.entries(GROUPS).forEach(([k, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'qn-tag' + (d.grp === k ? ' selected' : '');
    b.dataset.grp = k;
    b.setAttribute('aria-pressed', d.grp === k ? 'true' : 'false');
    b.textContent = t;
    b.onclick = () => { d.grp = k; _renderGrp(); _syncTitle(); };
    box.appendChild(b);
  });
}

function _toggleLink(c) {
  const d = S.detailPending;
  const i = d.links.findIndex(l => l.cat === c);
  if (i >= 0) d.links.splice(i, 1);
  else d.links.push({ cat: c, col: d.col, tags: [] }); /* même couleur que la 1re catégorie par défaut */
  _renderLinkBtns();
  _syncTitle();
  _renderLinked();
}

function _renderLinked() {
  const box = document.getElementById('detailLinked');
  const d = S.detailPending;
  if (!box || !d) return;
  box.innerHTML = '';
  d.links.forEach(l => {
    const def = CAT_TAGS[l.cat] || { red: [], green: [], both: [] };
    const card = document.createElement('div');
    card.className = 'qn-linked qn-linked-' + l.col;
    card.dataset.cat = l.cat;
    const head = document.createElement('div');
    head.className = 'qn-linked-head';
    const name = document.createElement('b');
    name.textContent = l.cat;
    head.appendChild(name);
    ['red', 'green'].forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'edit-ctrl-type edit-ctrl-' + c + (l.col === c ? ' edit-ctrl-active' : '');
      b.dataset.col = c;
      b.setAttribute('aria-pressed', l.col === c ? 'true' : 'false');
      b.textContent = c === 'red' ? '✘ Non conforme' : '✔ Conforme';
      b.onclick = () => {
        if (l.col === c) return;
        l.col = c;
        const ok = [...def[c], ...def.both];
        l.tags = l.tags.filter(t => ok.includes(t));
        _renderLinked();
      };
      head.appendChild(b);
    });
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'qn-linked-x';
    x.textContent = '✕';
    x.setAttribute('aria-label', 'Retirer ' + l.cat);
    x.onclick = () => _toggleLink(l.cat);
    head.appendChild(x);
    card.appendChild(head);
    const wrap = document.createElement('div');
    wrap.className = 'qn-tags-wrap';
    _addCatTags(wrap, l.cat, l.col, t => l.tags.includes(t));
    wrap.querySelectorAll('.qn-tag').forEach(btn => {
      const t = btn.dataset.tag, base = btn.onclick;
      btn.onclick = () => {
        base();
        l.tags = btn.classList.contains('selected') ? [...l.tags, t] : l.tags.filter(u => u !== t);
      };
    });
    card.appendChild(wrap);
    box.appendChild(card);
  });
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
  /* prefill : objet { arb, tags, cmt, flag, todo, time, el, period, group, lien, links }
     pour le mode édition, undefined pour une nouvelle observation. */
  const isEdit = prefill !== undefined;
  _editGroup = isEdit ? prefill.group : null;

  S.detailPending = {
    arb:       isEdit ? [...prefill.arb] : [],
    cat, col,
    flag:      isEdit ? !!prefill.flag : false,
    todo:      isEdit ? !!prefill.todo : false,
    time:      isEdit ? prefill.time   : fmt(S.elapsed),
    el:        isEdit ? prefill.el     : S.elapsed,
    period:    isEdit ? prefill.period : S.period,
    lien:      isEdit ? prefill.lien   : undefined,
    links:     isEdit ? (prefill.links || []) : [], /* catégories liées : [{ cat, col, tags }] */
    grp:       cat === CAU ? ((isEdit && prefill.grp) || 'A1') : undefined
  };

  /* ── Titre + liaisons possibles (+ groupe de « Autre ») ── */
  _syncTitle();
  _renderLinkBtns();
  _renderGrp();
  document.getElementById('detailMeta').textContent =
    S.detailPending.time + ' · ' + pl(S.detailPending.period);

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
          _syncTitle();

          /* Conserver uniquement les tags both + généraux sélectionnés */
          const catDef = CAT_TAGS[cat];
          const bothTags  = catDef ? catDef.both : [];
          const genTags   = _teamDefs().flatMap(([t, ns]) => [t, ...ns.map(n => _numTag(t, n))]).concat(TAGS_GENERAUX);
          const keepable  = [...bothTags, ...genTags];
          const keepTags  = _getSelectedTags().filter(t => keepable.includes(t));

          document.querySelectorAll('#detailEditControls .edit-ctrl-type').forEach(b =>
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

/** Lit les tags sélectionnés de la catégorie principale (hors cartes liées, imbriquées plus bas). */
function _getSelectedTags() {
  return [...document.querySelectorAll('#detailTeams .qn-tag.selected, #detailTags .qn-tag.selected')]
    .filter(t => !t.closest('.qn-linked')).map(t => t.dataset.tag);
}

export function closeDetail() {
  document.getElementById('detailOverlay').classList.remove('on');
  S.detailPending = null;
  _editGroup = null;
}

/* Appelé par les 3 boutons de la popup : 'A1' | 'A2' | 'both' */
export function saveDetail(sel) {
  const d = S.detailPending;
  if (!d) return;
  if (sel !== 'A1' && sel !== 'A2' && sel !== 'both') return; /* choix d'arbitre obligatoire */
  S.matchActif = true; /* v0.3.31 (BUG-5) */

  let selectedTags = _getSelectedTags();
  /* « Équipe » + « Équipe n°3 » → seulement « Équipe n°3 » */
  selectedTags = selectedTags.filter(t => !selectedTags.some(u => u.startsWith(t + ' n°')));
  const cmt = document.getElementById('detailNote').value.trim();
  const arb = sel === 'both' ? ['A1', 'A2'] : [sel];
  const arbNames = arb.map(a => a === 'A1' ? S.a1 : S.a2);

  /* v1.11.0 : une observation par catégorie de l'action, reliées par `lien`.
     Équipe/n° et tags communs sont recopiés dans chaque catégorie liée. */
  const teamTags = _teamDefs().flatMap(([t, ns]) => [t, ...ns.map(n => _numTag(t, n))]);
  const common = selectedTags.filter(t => teamTags.includes(t) || TAGS_GENERAUX.includes(t));
  const lien = d.links.length ? (d.lien || 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)) : null;
  const mk = (cat, col, tags) => Object.assign({
    time: d.time, el: d.el, period: d.period,
    arb,
    an: arbNames.join(' + '),
    cat,
    cats: [cat],
    col,
    flag: !!d.flag,
    todo: !!d.todo,
    tags,
    cmt: cmt
  }, lien ? { lien } : {}, cat === CAU ? { grp: d.grp } : {});
  const entries = [mk(d.cat, d.col, selectedTags), ...d.links.map(l => mk(l.cat, l.col, [...common, ...l.tags]))];
  const obsEntry = entries[0];

  const isEdit = !!_editGroup;

  if (isEdit) {
    /* ── Mode édition : l'action entière est remplacée en place ── */
    const at = S.obs.indexOf(_editGroup[0]);
    for (let i = S.obs.length - 1; i >= 0; i--) if (_editGroup.includes(S.obs[i])) S.obs.splice(i, 1);
    S.obs.splice(at < 0 ? S.obs.length : at, 0, ...entries);
    log.info('OBS', 'observation_modifiee', {
      index: at,
      arbitres: arbNames.join(' + '), categorie: entries.map(e => e.cat).join(' + '),
      type: d.col === 'red' ? 'non_conforme' : 'conforme',
      a_revoir: obsEntry.flag,
      tags: selectedTags.join(', '),
      totalObservations: S.obs.length
    });
  } else {
    /* ── Mode création : ajout ── */
    S.obs.push(...entries);
    _undone.length = 0; /* une nouvelle observation invalide le « Rétablir » */
    log.info('OBS', 'observation_enregistree', {
      arbitres: arbNames.join(' + '), categorie: entries.map(e => e.cat).join(' + '),
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
/* v1.11.0 : g = observations d'une action (1 ou 2 catégories liées) */
function _resume(g) {
  const o = g[0];
  return o.time + ' · ' + pl(o.period) + ' · ' + o.an + ' · ' +
    g.map(x => x.cat + ' ' + (x.col === 'red' ? '✘' : '✔')).join(' + ') + (o.flag ? ' ⚑' : '') +
    (o.cmt ? ' — ' + o.cmt : '');
}

/** Dernière action saisie : la dernière observation et ses liées (contiguës en fin de liste). */
function _lastAction() {
  const n = S.obs.length;
  if (!n) return [];
  const last = S.obs[n - 1];
  let i = n - 1;
  while (last.lien && i > 0 && S.obs[i - 1].lien === last.lien) i--;
  return S.obs.slice(i);
}

export function askUndo() {
  if (!S.obs.length) return;
  const el = document.getElementById('undoObsSummary');
  if (el) el.textContent = _resume(_lastAction());
  document.getElementById('undoOverlay').classList.add('on');
}

export function cancelUndo() {
  document.getElementById('undoOverlay').classList.remove('on');
}

export function doUndo() {
  cancelUndo();
  S.matchActif = true;
  const g = _lastAction();
  if (!g.length) return;
  S.obs.splice(S.obs.length - g.length, g.length);
  _undone.push(g);
  log.info('OBS', 'observation_annulee', { categorie: g.map(o => o.cat).join(' + '), totalObservations: S.obs.length });
  _afterObsChange();
}

export function redoObs() {
  const g = _undone.pop();
  if (!g) return;
  S.matchActif = true;
  S.obs.push(...g);
  log.info('OBS', 'observation_retablie', { categorie: g.map(o => o.cat).join(' + '), totalObservations: S.obs.length });
  _afterObsChange();
}

/* ═══ Édition d'une observation existante — v0.4.9 ═════════════════════
   Retrouve l'observation par index dans S.obs et rouvre la popup
   avec toutes les données pré-remplies.
   v1.11.0 : une action liée se rouvre entière (1re catégorie + cartes liées). */
export function editObservation(idx) {
  const o = S.obs[idx];
  if (!o) return;
  const g = linkGroup(o), p = g[0];
  const own = m => { const def = CAT_TAGS[m.cat]; return def ? (m.tags || []).filter(t => def.red.includes(t) || def.green.includes(t) || def.both.includes(t)) : []; };
  _openDetail(p.cat, p.col, {
    arb:       p.arb,
    tags:      p.tags || [],
    cmt:       p.cmt  || '',
    flag:      !!p.flag,
    todo:      !!p.todo,
    time:      p.time,
    el:        p.el,
    period:    p.period,
    group:     g,
    lien:      p.lien,
    grp:       p.grp,
    links:     g.slice(1).map(m => ({ cat: m.cat, col: m.col, tags: own(m) }))
  });
}

/* ═══ Suppression d'une observation — v0.4.9 ═══════════════════════════
   Stocke l'index candidat et ouvre la modale de confirmation.            */
let _pendingDeleteIdx = null;

export function deleteObservation(idx) {
  if (idx < 0 || idx >= S.obs.length) return;
  _pendingDeleteIdx = idx;

  /* Alimenter la modale avec un résumé de l'action (v1.11.0 : catégories liées comprises) */
  const g = linkGroup(S.obs[idx]), o = g[0];
  const note = actionNote(g);
  const resume = o.time + ' · ' + pl(o.period) + ' · ' + o.an + ' · ' + g.map(x => x.cat).join(' + ') +
    (note ? ' · ' + note : '');

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
  const g = S.obs[_pendingDeleteIdx] ? linkGroup(S.obs[_pendingDeleteIdx]) : [];
  /* v1.11.0 : une action liée est supprimée entière */
  for (let i = S.obs.length - 1; i >= 0; i--) if (g.includes(S.obs[i])) S.obs.splice(i, 1);
  log.info('OBS', 'observation_supprimee', {
    index: _pendingDeleteIdx,
    categorie: g.length ? g.map(o => o.cat).join(' + ') : '?',
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
  applyPeriodLabels();
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
  /* v1.11.0 : une action liée (ex. J7M + SPA) tient sur une seule ligne */
  const g = linkGroup(o), multi = g.length > 1;
  const mixed = multi && g.some(x => x.col !== g[0].col);
  const rc = mixed ? 'rm' : (g[0].col === 'red' ? 'rr' : 'rg');
  const tl = x => x.col === 'red' ? 'Non conf./manquante' : 'Conforme';
  const mark = x => '<span class="' + (x.col === 'red' ? 'lk-n' : 'lk-o') + '">' + (x.col === 'red' ? '✘' : '✔') + '</span>';
  const cmtText = actionNote(g);
  o = g[0];

  /* v0.3.24 (FRAG-3) : échappement HTML des champs utilisateur */
  /* v0.4.9 : ajout colonne Actions (crayon + croix) avec data-idx */
  return '<tr class="' + rc + '" data-idx="' + idx + '">' +
    '<td style="white-space:nowrap;font-variant-numeric:tabular-nums;">' + o.time + '</td>' +
    '<td style="white-space:nowrap;">' + pl(o.period) + '</td>' +
    '<td><span class="badge ba">' + escapeHtml(o.an) + '</span></td>' +
    '<td style="font-weight:700;white-space:nowrap;">' + (multi ? g.map(x => escapeHtml(x.cat) + ' ' + mark(x)).join(' + ') : escapeHtml(catLabel(o))) + '</td>' +
    '<td>' + g.map(x => '<span class="lc' + (multi ? (x.col === 'red' ? ' lc-n' : ' lc-o') : '') + '">' + tl(x) + '</span>').join(' + ') + '</td>' +
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
      tb.innerHTML = oneLinePerAction(filtered).map(o => oRow(o, S.obs.indexOf(o))).join('');
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
  applyPeriodLabels();
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
      etb.innerHTML = oneLinePerAction(filtered).map(o => oRow(o, S.obs.indexOf(o))).join('');
    }
  }

  _syncFilterBadge('es');
  renderDebrief(); /* v1.6.0 : les blocs du débrief suivent toute modification */
}
