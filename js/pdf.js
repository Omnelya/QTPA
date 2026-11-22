/* ═══ PDF — v1.19.0 : nouvelle mise en page (maquette validée) ═════════════
   En-tête bleu marine + score (toujours), puis les sections cochées dans la
   fenêtre : synthèse par bloc (radar A1 → C2), évaluation + contexte,
   à travailler / points forts, à revoir ⚑ + pause, observations (une ligne
   par action liée), frise, commentaire global, Préparation Suivi (annexe).
   Dessin vectoriel jsPDF + autotable. Les polices standard ne contiennent pas
   ✘ ✔ ⚑ : ces symboles sont dessinés (ico), le texte est filtré (_T).
════════════════════════════════════════════════════════════════════════════ */
import { S, ans, QS, pl, linkGroup, oneLinePerAction, actionNote, blockOf, catLabel } from './state.js';
import { fmt, fmtDate } from './utils.js';
import { log, startTimer, endTimer } from './logger.js';
import { dbStats, dbPct, dbChrono } from './debrief.js';
import { prepSummary } from './prep.js';
import { APP_VERSION } from './version.js';

const JSPDF_URL     = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const AUTOTABLE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';

/* ── Chargement lazy jsPDF ───────────────────────────────────────────────── */
function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(); return; }
    log.info('PDF', 'jspdf_chargement_debut');
    const t = startTimer('jspdf_load');
    const s1 = document.createElement('script');
    s1.src = JSPDF_URL;
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = AUTOTABLE_URL;
      s2.onload  = () => { endTimer('PDF', 'jspdf_chargement_ok', t); resolve(); };
      s2.onerror = () => { log.error('PDF', 'autotable_chargement_erreur', { url: AUTOTABLE_URL }); reject(new Error('Impossible de charger jspdf-autotable')); };
      document.head.appendChild(s2);
    };
    s1.onerror = () => { log.error('PDF', 'jspdf_chargement_erreur', { url: JSPDF_URL }); reject(new Error('Impossible de charger jsPDF')); };
    document.head.appendChild(s1);
  });
}

/* ── Sanitize nom de fichier ─────────────────────────────────────────────── */
function sanitize(str) {
  return (str || '').trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/* ── Sections proposées dans la fenêtre (ordre du PDF) ───────────────────── */
const CARDS_DEF = [
  { id: 'syn',   label: 'Synthèse par bloc (radar A1 → C2)',            checked: true  },
  { id: 'eval',  label: 'Évaluation générale + contexte',               checked: true  },
  { id: 'kp',    label: 'À travailler / Points forts',                  checked: true  },
  { id: 'rev',   label: 'À revoir ⚑ + à dire à la pause',               checked: true  },
  { id: 'obs',   label: 'Tableau des observations',                     checked: true  },
  { id: 'frise', label: 'Frise chronologique',                          checked: false },
  { id: 'gc',    label: 'Commentaire global',                           checked: true  },
  { id: 'prep',  label: 'Préparation Suivi (notes A1 → C2, D, E, F)',   checked: true  },
];

const APP_BLUE = '#1d3a7a';

/* ── Point d'entrée public ───────────────────────────────────────────────── */
/* v1.3.2 : flag _reexportMode — quand true, saveToHistory n'est pas appelé.
   v1.3.3 : _onExportDone — callback optionnel appelé après génération du PDF,
   utilisé par reexportPDFRemote pour restaurer S après la vraie fin du PDF. */
let _reexportMode = false;
let _onExportDone = null;

export function exportPDF(reexport = false, onDone = null) {
  _reexportMode = reexport;
  _onExportDone = onDone;
  _showCardSelectionModal(reexport);
}

/* ── Fenêtre de choix des sections ───────────────────────────────────────── */
function _showCardSelectionModal(resetAll = false) {
  if (document.getElementById('pdfModalOverlay')) return;
  const state = resetAll ? {} : _getModalState();

  const overlay = document.createElement('div');
  overlay.id = 'pdfModalOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;font-family:var(--font,system-ui,sans-serif);';
  overlay.addEventListener('click', e => { if (e.target === overlay) _closeModal(); });

  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card,#fff);border-radius:14px;width:380px;max-width:94vw;max-height:92vh;overflow:auto;box-shadow:0 6px 28px rgba(0,0,0,0.18);border:1px solid var(--border,#ddd);';

  const header = document.createElement('div');
  header.style.cssText = 'background:' + APP_BLUE + ';padding:14px 18px;display:flex;align-items:center;justify-content:space-between;';
  header.innerHTML =
    '<div><div style="color:#fff;font-size:15px;font-weight:700;">Exporter en PDF</div>' +
    '<div style="color:rgba(255,255,255,0.75);font-size:12px;margin-top:2px;">Coche les éléments à mettre dans le PDF</div></div>' +
    '<button id="pdfModalClose" style="background:none;border:none;color:rgba(255,255,255,0.8);font-size:22px;cursor:pointer;padding:2px 6px;line-height:1;min-width:44px;min-height:44px;" title="Fermer" aria-label="Fermer">×</button>';

  const body = document.createElement('div');
  body.style.cssText = 'padding:14px 18px;';
  const always = document.createElement('div');
  always.style.cssText = 'font-size:12px;color:var(--text-hint,#888);margin-bottom:10px;';
  always.textContent = 'Toujours inclus : en-tête du match et score.';
  body.appendChild(always);

  const topRow = document.createElement('div');
  topRow.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:10px;';
  const allBtn = document.createElement('button');
  allBtn.id = 'pdfSelectAll';
  allBtn.className = 'btn-act';
  allBtn.style.cssText = 'font-size:12px;padding:6px 12px;';
  topRow.appendChild(allBtn);
  body.appendChild(topRow);

  const list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
  const noPrep = !S.prep;
  CARDS_DEF.forEach(card => {
    const dis = card.id === 'prep' && noPrep;
    const row = document.createElement('label');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;cursor:' + (dis ? 'default' : 'pointer') + ';padding:9px 10px;min-height:44px;border-radius:9px;border:1px solid var(--border,#e5e5e5);background:var(--bg-input,#f7f7f9);' + (dis ? 'opacity:.55;' : '');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'pdfCard_' + card.id;
    cb.disabled = dis;
    cb.checked = !dis && (state[card.id] !== undefined ? state[card.id] : card.checked);
    cb.style.cssText = 'width:18px;height:18px;cursor:pointer;flex-shrink:0;accent-color:' + APP_BLUE + ';';
    const lbl = document.createElement('span');
    lbl.textContent = card.label + (dis ? ' — pas encore préparée' : '');
    lbl.style.cssText = 'font-size:14px;color:var(--text-main,#1a1a2e);';
    row.appendChild(cb);
    row.appendChild(lbl);
    list.appendChild(row);
  });
  body.appendChild(list);

  const footer = document.createElement('div');
  footer.style.cssText = 'padding:10px 18px 14px;display:flex;gap:8px;justify-content:flex-end;border-top:1px solid var(--border,#e5e5e5);';
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Annuler';
  cancelBtn.className = 'btn-act';
  cancelBtn.addEventListener('click', _closeModal);
  const exportBtn = document.createElement('button');
  exportBtn.id = 'pdfExportBtn';
  exportBtn.textContent = 'Exporter PDF';
  exportBtn.className = 'btn-act prim';
  exportBtn.addEventListener('click', _onExportClick);
  footer.appendChild(cancelBtn);
  footer.appendChild(exportBtn);

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  document.getElementById('pdfModalClose').addEventListener('click', _closeModal);

  const boxes = () => CARDS_DEF.map(c => document.getElementById('pdfCard_' + c.id)).filter(el => el && !el.disabled);
  allBtn.addEventListener('click', () => {
    const all = boxes().every(el => el.checked);
    boxes().forEach(el => { el.checked = !all; });
    _updateAllBtnLabel(allBtn);
  });
  list.addEventListener('change', () => _updateAllBtnLabel(allBtn));
  _updateAllBtnLabel(allBtn);
}

function _updateAllBtnLabel(btn) {
  const all = CARDS_DEF.map(c => document.getElementById('pdfCard_' + c.id)).filter(el => el && !el.disabled).every(el => el.checked);
  btn.textContent = all ? 'Tout décocher' : 'Tout cocher';
}

function _getModalState() {
  const s = {};
  CARDS_DEF.forEach(c => {
    const el = document.getElementById('pdfCard_' + c.id);
    if (el) s[c.id] = el.checked;
  });
  return s;
}

function _closeModal() {
  const overlay = document.getElementById('pdfModalOverlay');
  if (overlay) overlay.remove();
}

async function _onExportClick() {
  const selection = _readSelection();
  const exportBtn = document.getElementById('pdfExportBtn');
  if (exportBtn) { exportBtn.textContent = 'Chargement…'; exportBtn.disabled = true; }

  log.info('PDF', 'export_debut', { equipeA: S.tA, equipeB: S.tB, scoreA: S.sA, scoreB: S.sB, nbObs: S.obs.length, cards: selection });
  const t = startTimer('pdf_export');
  try {
    await loadJsPDF();
    /* v1.3.8 : saveToHistory AVANT la génération (iOS suspend l'onglet à l'ouverture du PDF) */
    if (!_reexportMode) { await window.App.saveToHistory(); }
    await _generatePDF(selection);
    endTimer('PDF', 'export_ok', t, { nbObs: S.obs.length, cards: selection });
    if (_onExportDone) { try { _onExportDone(); } catch (e) { /* silencieux */ } }
    _closeModal();
    if (typeof window._showToastPDF === 'function') window._showToastPDF('PDF exporté avec succès ✅', 'success');
  } catch (err) {
    log.error('PDF', 'export_erreur', { message: err.message });
    if (typeof window._showToastPDF === 'function') window._showToastPDF('Erreur PDF : ' + err.message, 'error');
    else window.App.showAlert('Erreur PDF : ' + err.message + '\n\nUne connexion internet est nécessaire au premier export pour charger la librairie PDF. Les exports suivants fonctionneront hors-ligne.');
  } finally {
    _reexportMode = false;
    _onExportDone = null;
    const btn = document.getElementById('pdfExportBtn');
    if (btn) { btn.textContent = 'Exporter PDF'; btn.disabled = false; }
  }
}

function _readSelection() {
  return CARDS_DEF.filter(c => { const el = document.getElementById('pdfCard_' + c.id); return el && el.checked && !el.disabled; }).map(c => c.id);
}

/* ══════════════════════════════════════════════════════════════════════════
   GÉNÉRATION
══════════════════════════════════════════════════════════════════════════ */
const C = {
  navy: [29, 58, 122], navy2: [62, 90, 152], a1: [29, 58, 122], a2: [155, 28, 28],
  red: [180, 35, 24], redBg: [253, 236, 234], green: [46, 125, 50], greenBg: [232, 245, 233],
  amber: [138, 109, 0], flag: [138, 90, 0], flagBg: [255, 243, 205],
  ink: [30, 30, 30], mute: [107, 107, 107], rule: [217, 217, 217], light: [238, 238, 238], white: [255, 255, 255], grey: [170, 170, 170]
};
const AXES = [['A1', 'Duels'], ['A2', 'Continuité'], ['B', 'Joueurs'], ['C1', 'Technique'], ['C2', 'Décisionnel']];
const _tone = (p, n) => (p === null || n < 3 ? C.grey : p >= 70 ? C.green : p >= 50 ? C.amber : C.red);
const _cats = o => (Array.isArray(o.cats) && o.cats.length ? o.cats : [o.cat]);
const _arbs = o => (Array.isArray(o.arb) ? o.arb : [o.arb]);

/* Texte compatible avec les polices standard du PDF (WinAnsi) : symboles remplacés, le reste retiré */
const CP1252 = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
function _T(s) {
  return String(s == null ? '' : s)
    .replace(/[⇒→]/g, '=>').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[✘✗]/g, 'x').replace(/[✔✓]/g, 'v').replace(/⚑\s*/g, '').replace(/×/g, 'x')
    .replace(/[  ]/g, ' ')
    .split('').filter(ch => ch.charCodeAt(0) <= 0xFF || CP1252.includes(ch)).join('')
    .replace(/ {2,}/g, ' ');
}

/** % conforme par bloc (règle du radar : « Autre » dans son groupe). */
function _blockStats(list) {
  const s = {};
  AXES.forEach(([k]) => { s[k] = { n: 0, g: 0, p: null }; });
  list.forEach(o => _cats(o).forEach(c => { const k = blockOf(o, c); if (s[k]) { s[k].n++; if (o.col !== 'red') s[k].g++; } }));
  Object.values(s).forEach(b => { b.p = b.n ? Math.round(100 * b.g / b.n) : null; });
  return s;
}

async function _generatePDF(selection) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 12, CW = W - 2 * M, TOP = 12, BOTTOM = 284;
  const has = id => selection.includes(id);
  const P = prepSummary();
  let y = TOP;

  /* ── outils de dessin ── */
  const font = (size, bold, col) => { doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(...(col || C.ink)); };
  const text = (s, x, yy, opt) => doc.text(Array.isArray(s) ? s : _T(s), x, yy, opt);
  const wrap = (s, w) => doc.splitTextToSize(_T(s), w);
  const tw = s => doc.getTextWidth(_T(s));
  const newPage = () => { doc.addPage(); y = TOP; };
  const ensure = h => { if (y + h > BOTTOM) newPage(); };
  function h2(title, small, x = M, w = CW) {
    font(8.5, true, C.navy); text(title.toUpperCase(), x, y);
    if (small) { font(6.8, false, C.mute); text(small, x + w, y, { align: 'right' }); }
    doc.setDrawColor(...C.navy); doc.setLineWidth(0.4); doc.line(x, y + 1.4, x + w, y + 1.4);
    y += 5.5;
  }
  /* ✘ ✔ ⚑ dessinés (centrés en x, yy) */
  function ico(kind, x, yy, s = 2.3) {
    doc.setLineCap('round'); doc.setLineJoin('round'); doc.setLineWidth(0.45);
    if (kind === 'n') { doc.setDrawColor(...C.red); doc.line(x - s / 2, yy - s / 2, x + s / 2, yy + s / 2); doc.line(x - s / 2, yy + s / 2, x + s / 2, yy - s / 2); }
    else if (kind === 'o') { doc.setDrawColor(...C.green); doc.lines([[s * 0.35, s * 0.42], [s * 0.65, -s * 0.95]], x - s / 2, yy + s * 0.03, [1, 1], 'S'); }
    else { doc.setDrawColor(...C.flag); doc.setFillColor(...C.flag); doc.line(x - s / 2, yy + s / 2, x - s / 2, yy - s / 2); doc.triangle(x - s / 2, yy - s / 2, x + s / 2, yy - s / 4, x - s / 2, yy, 'F'); }
    doc.setLineCap('butt'); doc.setLineJoin('miter');
  }
  function pill(label, kind, xRight, yy) {
    font(6.8, true, kind === 'o' ? C.green : kind === 'n' ? C.red : C.grey);
    const w = tw(label) + 4;
    if (kind) { doc.setFillColor(...(kind === 'o' ? C.greenBg : C.redBg)); doc.roundedRect(xRight - w, yy - 3, w, 4.2, 1.4, 1.4, 'F'); }
    text(label, xRight - w / 2, yy, { align: 'center' });
  }
  const names = o => (o.an || _arbs(o).map(a => (a === 'A2' ? S.a2 : S.a1)).join(' + '));
  const arbCol = o => { const a = _arbs(o); return a.length === 1 ? (a[0] === 'A2' ? C.a2 : C.a1) : C.ink; };

  /* ══ En-tête (toujours) ══ */
  doc.setFillColor(...C.navy); doc.rect(0, 0, W, 27, 'F');
  font(15, true, C.white); text("Suivi d'arbitrage", M, 10);
  font(10, true, C.white); text(S.tA + ' – ' + S.tB, M, 16.2);
  const when = [S.mDate ? fmtDate(S.mDate) : '', S.mTime ? 'à ' + S.mTime : ''].filter(Boolean).join(' ');
  font(8.5, false, C.white); text([when, S.mComp].filter(Boolean).join(' · '), M, 21.5);
  /* arbitres en pastilles, à droite */
  font(8, true, C.white);
  let xr = W - M;
  [S.a2, S.a1].forEach(nm => { const w = tw(nm) + 5; doc.setFillColor(...C.navy2); doc.roundedRect(xr - w, 6.6, w, 5, 1.6, 1.6, 'F'); text(nm, xr - w / 2, 10.1, { align: 'center' }); xr -= w + 1.5; });
  font(8, false, C.white); text('Arbitres', xr - 1, 10.1, { align: 'right' });
  if (P && P.sup) text('Superviseur : ' + P.sup, W - M, 16.2, { align: 'right' });
  y = 32;

  /* ══ Score (toujours) ══ */
  doc.setDrawColor(...C.rule); doc.setLineWidth(0.3); doc.roundedRect(M, y, CW, 16, 2.5, 2.5, 'S');
  font(6.3, true, C.mute); text('SCORE FINAL', M + 4, y + 4.8);
  font(18, true, C.navy); text(S.sA + ' – ' + S.sB, M + 4, y + 12.5);
  if (S.htA !== null && S.htA !== undefined) {
    font(6.3, true, C.mute); text(S.nbMT === 3 ? 'TIERS-TEMPS' : 'MI-TEMPS', M + 46, y + 4.8);
    let ht = S.htA + ' – ' + S.htB;
    if (S.nbMT === 3 && S.ht2A !== null && S.ht2A !== undefined) ht = pl('MT1') + ' ' + ht + '   ' + pl('MT2') + ' ' + S.ht2A + ' – ' + S.ht2B;
    font(10.5, true, C.ink); text(ht, M + 46, y + 11.8);
  }
  const actions = oneLinePerAction([...S.obs].sort(dbChrono));
  const tags = [P && P.type, P && P.e1 !== '—' ? 'Difficulté : ' + P.e1 : '', actions.length + ' action' + (actions.length > 1 ? 's' : '') + ' observée' + (actions.length > 1 ? 's' : '')].filter(Boolean);
  font(7, false, C.ink);
  let xt = M + CW - 4;
  tags.reverse().forEach(tg => { const w = tw(tg) + 4; doc.setDrawColor(...C.rule); doc.roundedRect(xt - w, y + 5.6, w, 5, 1.4, 1.4, 'S'); text(tg, xt - w / 2, y + 9.1, { align: 'center' }); xt -= w + 2; });
  y += 21;

  /* ══ Synthèse par bloc ══ */
  if (has('syn')) {
    ensure(78);
    h2('Synthèse par bloc', '% conforme · axe grisé : moins de 3 observations');
    const st1 = _blockStats(S.obs.filter(o => _arbs(o).includes('A1')));
    const st2 = _blockStats(S.obs.filter(o => _arbs(o).includes('A2')));
    const tot = _blockStats(S.obs);
    const cx = M + 40, cy = y + 34, R = 23, ang = i => -Math.PI / 2 + i * 2 * Math.PI / 5;
    const pt = (i, v) => [cx + R * v * Math.cos(ang(i)), cy + R * v * Math.sin(ang(i))];
    const poly = (pts, style) => doc.lines(pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]), pts[0][0], pts[0][1], [1, 1], style, true);
    doc.setLineWidth(0.2); doc.setDrawColor(...C.rule);
    [0.25, 0.5, 0.75, 1].forEach(v => poly(AXES.map((_, i) => pt(i, v)), 'S'));
    AXES.forEach((_, i) => { const [x, yy] = pt(i, 1); doc.line(cx, cy, x, yy); });
    font(5.5, false, C.grey); text('50 %', cx + 1, cy - R * 0.5 + 2.5);
    [[st1, C.a1], [st2, C.a2]].forEach(([st, col]) => {
      const pts = AXES.map(([k], i) => pt(i, (st[k].p || 0) / 100));
      if (doc.GState) { doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: 0.13 })); doc.setFillColor(...col); poly(pts, 'F'); doc.restoreGraphicsState(); }
      doc.setDrawColor(...col); doc.setLineWidth(0.6); poly(pts, 'S');
      doc.setFillColor(...col);
      AXES.forEach(([k], i) => { if (st[k].n) { const [x, yy] = pt(i, st[k].p / 100); doc.circle(x, yy, 0.8, 'F'); } });
    });
    AXES.forEach(([k, t], i) => {
      const [x, yy] = pt(i, 1.32), few = tot[k].n < 3;
      font(7.2, true, few ? C.grey : C.ink); text(k + ' ' + t, x, yy, { align: 'center' });
      font(6, false, C.grey); text(tot[k].n + ' obs.', x, yy + 3, { align: 'center' });
    });
    /* légende */
    font(7, true, C.a1); doc.setDrawColor(...C.a1); doc.setLineWidth(0.8); doc.line(cx - 22, cy + R + 11, cx - 18, cy + R + 11); text(S.a1, cx - 16.5, cy + R + 12);
    font(7, true, C.a2); doc.setDrawColor(...C.a2); doc.line(cx + 4, cy + R + 11, cx + 8, cy + R + 11); text(S.a2, cx + 9.5, cy + R + 12);
    /* tableau à droite */
    const pc = b => (b.p === null ? '–' : b.p + ' %');
    doc.autoTable({
      startY: y + 10, margin: { left: M + 86, right: M }, theme: 'plain',
      head: [['Bloc', 'Obs.', _T(S.a1), _T(S.a2), 'Total']],
      body: AXES.map(([k, t]) => [_T(k + ' ' + t), String(tot[k].n), pc(st1[k]), pc(st2[k]), pc(tot[k])]),
      styles: { fontSize: 8, cellPadding: { top: 1.8, bottom: 1.8, left: 1.5, right: 1.5 }, textColor: C.ink, lineColor: C.light, lineWidth: { bottom: 0.2 } },
      headStyles: { fontSize: 6.3, textColor: C.mute, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      didParseCell: d => {
        if (d.column.index === 2) d.cell.styles.textColor = C.a1;
        if (d.column.index === 3) d.cell.styles.textColor = C.a2;
        if (d.section === 'body') {
          const k = AXES[d.row.index][0];
          if (d.column.index === 0) d.cell.styles.fontStyle = 'bold';
          if (d.column.index === 4) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.textColor = _tone(tot[k].p, tot[k].n); }
        }
      }
    });
    y = Math.max(cy + R + 20, doc.lastAutoTable.finalY + 4);
  }

  /* ══ Évaluation générale + contexte ══ */
  if (has('eval')) {
    const colW = (CW - 8) / 2;
    const ctxEl = document.getElementById('ECtxEdit') || document.getElementById('ctxTA');
    const ctx = (ctxEl && ctxEl.value || '').trim();
    font(8, false); const cl = ctx ? wrap(ctx, colW) : [];
    ensure(Math.max(QS.length * 5.6, cl.length * 3.8) + 10);
    const y0 = y;
    h2('Évaluation générale', '', M, colW);
    QS.forEach(q => {
      font(8, false, C.ink); text(q.lbl, M, y + 0.4);
      const v = ans[q.id];
      pill(v === 'oui' ? 'Oui' : v === 'non' ? 'Non' : '—', v === 'oui' ? 'o' : v === 'non' ? 'n' : '', M + colW, y + 0.6);
      doc.setDrawColor(...C.light); doc.setLineWidth(0.2); doc.line(M, y + 2.3, M + colW, y + 2.3);
      y += 5.6;
    });
    const yl = y; y = y0;
    h2('Contexte du match', '', M + colW + 8, colW);
    font(8, false, ctx ? C.ink : C.grey); text(ctx ? cl : ['Non renseigné.'], M + colW + 8, y);
    y = Math.max(yl, y + Math.max(1, cl.length) * 3.8) + 4;
  }

  /* ══ À travailler / Points forts ══ */
  if (has('kp')) {
    const st = dbStats(S.obs);
    const work = st.filter(s => s.r >= 1).sort((a, b) => (dbPct(b.r, b.g) - dbPct(a.r, a.g)) || (b.r - a.r) || a.cat.localeCompare(b.cat, 'fr')).slice(0, 5);
    const strong = st.filter(s => s.g >= 1).sort((a, b) => (dbPct(b.g, b.r) - dbPct(a.g, a.r)) || (b.g - a.g) || a.cat.localeCompare(b.cat, 'fr')).slice(0, 5);
    const colW = (CW - 8) / 2;
    ensure(Math.max(work.length, strong.length, 1) * 4.6 + 10);
    const y0 = y; let yEnd = y;
    [[work, 'À travailler', '% de non conformes', true, M], [strong, 'Points forts', '% de conformes', false, M + colW + 8]].forEach(([list, title, small, red, x]) => {
      y = y0; h2(title, small, x, colW);
      if (!list.length) { font(8, false, C.grey); text('Rien à signaler.', x, y); y += 4.6; }
      list.forEach(s => {
        const p = red ? dbPct(s.r, s.g) : dbPct(s.g, s.r);
        font(8, true, C.ink); text(s.cat, x, y);
        const bx = x + colW - 52;
        doc.setFillColor(...C.light); doc.roundedRect(bx, y - 2.2, 22, 2.2, 1, 1, 'F');
        doc.setFillColor(...(red ? [229, 115, 115] : [129, 199, 132])); if (p) doc.roundedRect(bx, y - 2.2, 22 * p / 100, 2.2, 1, 1, 'F');
        /* « 2 ✘ / 1 ✔ · 67 % » aligné à droite, symboles dessinés */
        font(7, false, C.mute);
        const parts = [String(s.r), 'n', ' / ' + s.g, 'o', '  · ' + p + ' %'];
        let xx = x + colW - parts.reduce((a, q) => a + (q === 'n' || q === 'o' ? 2.8 : tw(q)), 0);
        parts.forEach(q => { if (q === 'n' || q === 'o') { ico(q, xx + 1.4, y - 1, 1.8); xx += 2.8; } else { font(7, false, C.mute); text(q, xx, y); xx += tw(q); } });
        y += 4.6;
      });
      yEnd = Math.max(yEnd, y);
    });
    y = yEnd + 3;
  }

  /* ══ Tableau d'actions (à revoir, observations) ══ */
  function actionsTable(list) {
    const rows = list.map(o => {
      const g = linkGroup(o);
      return { o, g, cells: [o.time || '', pl(o.period), _T(names(o)), _T(g.map(catLabel).join(' + ')), '', _T(actionNote(g))] };
    });
    const kindOf = g => (g.every(x => x.col === 'red') ? 'n' : g.every(x => x.col !== 'red') ? 'o' : 'm');
    doc.autoTable({
      startY: y, margin: { left: M, right: M, top: TOP, bottom: 297 - BOTTOM }, theme: 'plain', showHead: 'everyPage',
      head: [['Heure', 'Pér.', 'Arbitre', 'Catégorie(s)', '', 'Tags · note']],
      body: rows.map(r => r.cells),
      styles: { fontSize: 7.6, cellPadding: { top: 1.6, bottom: 1.6, left: 1.5, right: 1.5 }, textColor: C.ink, lineColor: C.white, lineWidth: { bottom: 0.3 }, valign: 'middle' },
      headStyles: { fontSize: 6.3, textColor: C.mute, fontStyle: 'bold', lineColor: C.rule, lineWidth: { bottom: 0.3 } },
      columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 9 }, 2: { cellWidth: 22 }, 3: { cellWidth: 46, fontStyle: 'bold' }, 4: { cellWidth: 12 }, 5: { cellWidth: 'auto', textColor: [68, 68, 68] } },
      didParseCell: d => {
        if (d.section !== 'body') return;
        const r = rows[d.row.index], k = kindOf(r.g);
        d.cell.styles.fillColor = r.o.flag ? C.flagBg : k === 'n' ? C.redBg : k === 'o' ? C.greenBg : false;
        if (d.column.index === 2) { d.cell.styles.textColor = arbCol(r.o); d.cell.styles.fontStyle = 'bold'; }
        if (d.column.index === 0 && r.o.flag) d.cell.styles.cellPadding = { top: 1.6, bottom: 1.6, left: 4.6, right: 1 };
      },
      /* action liée ✘ + ✔ : dégradé sur toute la ligne (une couleur par catégorie, centrée sur sa part) */
      willDrawCell: d => {
        if (d.section !== 'body') return;
        const r = rows[d.row.index];
        if (r.o.flag || kindOf(r.g) !== 'm') return;
        const n = r.g.length, stops = r.g.map((x, i) => [M + CW * (i + 0.5) / n, x.col === 'red' ? C.redBg : C.greenBg]);
        const colAt = xx => {
          if (xx <= stops[0][0]) return stops[0][1];
          for (let i = 1; i < stops.length; i++) if (xx <= stops[i][0]) { const f = (xx - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]); return stops[i - 1][1].map((v, j) => Math.round(v + (stops[i][1][j] - v) * f)); }
          return stops[stops.length - 1][1];
        };
        for (let xx = d.cell.x; xx < d.cell.x + d.cell.width; xx += 1) { doc.setFillColor(...colAt(xx + 0.5)); doc.rect(xx, d.cell.y, Math.min(1.05, d.cell.x + d.cell.width - xx), d.cell.height, 'F'); }
      },
      didDrawCell: d => {
        if (d.section !== 'body') return;
        const r = rows[d.row.index], my = d.cell.y + d.cell.height / 2;
        if (d.column.index === 0 && r.o.flag) ico('f', d.cell.x + 2.4, my, 2.2);
        if (d.column.index === 4) r.g.forEach((x, i) => ico(x.col === 'red' ? 'n' : 'o', d.cell.x + 2.6 + i * 3.4, my, 2.1));
      }
    });
    y = doc.lastAutoTable.finalY + 5;
  }

  /* ══ À revoir ⚑ + à dire à la pause ══ */
  if (has('rev')) {
    const flagged = actions.filter(o => o.flag);
    ensure(20);
    h2('À revoir avec les arbitres', flagged.length + ' action' + (flagged.length > 1 ? 's' : '') + ' marquée' + (flagged.length > 1 ? 's' : ''));
    if (flagged.length) actionsTable(flagged);
    else { font(8, false, C.grey); text('Aucune action marquée.', M, y); y += 6; }
    const notes = [[S.nbMT === 3 ? 'À dire à la pause (' + pl('MT1') + ')' : 'À dire à la pause', S.pauseNote], ['À dire à la pause (' + pl('MT2') + ')', S.nbMT === 3 ? S.pauseNote2 : '']].filter(n => (n[1] || '').trim());
    notes.forEach(([lab, v]) => {
      font(8, false); const l = wrap(v.trim(), CW);
      ensure(l.length * 3.8 + 7);
      font(6.3, true, C.mute); text(lab.toUpperCase(), M, y); y += 3.8;
      font(8, false, C.ink); text(l, M, y); y += l.length * 3.8 + 2;
    });
    y += 2;
  }

  /* ══ Observations ══ */
  if (has('obs')) {
    ensure(22);
    h2('Observations', actions.length + ' action' + (actions.length > 1 ? 's' : '') + ' · une ligne par action (catégories liées ensemble)');
    if (actions.length) actionsTable(actions);
    else { font(8, false, C.grey); text('Aucune observation.', M, y); y += 6; }
  }

  /* ══ Frise chronologique ══ */
  if (has('frise')) {
    const pers = [];
    for (let i = 1; i <= (S.nbMT || 2); i++) pers.push('MT' + i);
    S.obs.forEach(o => { if (o.period && !pers.includes(o.period)) pers.push(o.period); });
    ensure(12 + pers.length * 16);
    h2('Frise chronologique');
    const x0 = M + 14, w = CW - 16;
    pers.forEach(p => {
      const list = actions.filter(o => o.period === p);
      const idx = parseInt(String(p).replace('MT', ''), 10) - 1;
      const dur = Math.max(String(p).startsWith('Prol') ? (S.dureeProl || 300) : ((S.dureesMT || [])[idx] || 1800), ...list.map(o => o.el || 0), 1);
      const lanes = [], marks = list.map(o => {
        const g = linkGroup(o), mw = 1.6 + 3 * g.length, x = x0 + (o.el || 0) / dur * w;
        let lane = lanes.findIndex(last => x - last >= mw + 0.8);
        if (lane < 0) { lane = lanes.length; lanes.push(x + mw / 2); } else lanes[lane] = x + mw / 2;
        return { o, g, x, mw, lane };
      });
      const nl = Math.max(1, lanes.length), hgt = nl * 4.6 + 2;
      ensure(hgt + 8);
      const base = y + hgt;
      font(8, true, C.ink); text(pl(p), M, base - 1);
      doc.setDrawColor(...C.rule); doc.setLineWidth(0.6); doc.line(x0, base, x0 + w, base);
      marks.forEach(m => {
        const by = base - 1 - (m.lane + 1) * 4.6, bx = Math.min(Math.max(m.x - m.mw / 2, x0), x0 + w - m.mw);
        const k = m.o.flag ? 'f' : m.g.every(x => x.col === 'red') ? 'n' : m.g.every(x => x.col !== 'red') ? 'o' : 'm';
        doc.setFillColor(...(k === 'f' ? C.flagBg : k === 'n' ? C.redBg : k === 'o' ? C.greenBg : [246, 246, 246]));
        doc.setDrawColor(...C.rule); doc.setLineWidth(0.2); doc.roundedRect(bx, by, m.mw, 3.8, 0.9, 0.9, 'FD');
        m.g.forEach((x, i) => ico(m.o.flag ? 'f' : x.col === 'red' ? 'n' : 'o', bx + 2.3 + i * 3, by + 1.9, 1.8));
      });
      font(6, false, C.mute); text('0', x0, base + 3); text(fmt(Math.round(dur / 2)), x0 + w / 2, base + 3, { align: 'center' }); text(fmt(dur), x0 + w, base + 3, { align: 'right' });
      y = base + 7;
    });
    y += 3;
  }

  /* ══ Commentaire global ══ */
  if (has('gc')) {
    const gcEl = document.getElementById('GC');
    const gc = (gcEl && gcEl.value || '').trim();
    font(8.3, false); const l = gc ? wrap(gc, CW) : ['Non renseigné.'];
    ensure(Math.min(l.length * 4 + 9, 60));
    h2('Commentaire global');
    font(8.3, false, gc ? C.ink : C.grey);
    l.forEach(line => { ensure(4); text(line, M, y); y += 4; });
    y += 3;
  }

  /* ══ Préparation Suivi (annexe : nouvelle page) ══ */
  if (has('prep') && P) {
    if (y > TOP + 1) newPage();
    h2('Préparation Suivi', 'feuille fédérale' + (P.type ? ' · ' + P.type : ''));
    const colW = (CW - 6) / 2;
    for (let i = 0; i < P.items.length; i += 2) {
      const pair = P.items.slice(i, i + 2).map(it => { font(7.3, false); return { it, l: it.txt ? wrap(it.txt, colW - 6) : [] }; });
      const h = 9 + Math.max(...pair.map(p => p.l.length)) * 3.3;
      ensure(h + 3);
      pair.forEach((p, j) => {
        const x = M + j * (colW + 6);
        doc.setDrawColor(...C.rule); doc.setLineWidth(0.25); doc.roundedRect(x, y, colW, h, 2, 2, 'S');
        font(8.2, true, C.navy); text(p.it.code, x + 3, y + 5.2);
        const cw2 = tw(p.it.code);
        font(8.2, true, C.ink); text(p.it.t, x + 3 + cw2 + 1.8, y + 5.2);
        font(11, true, C.navy); text((p.it.note === null || p.it.note === undefined ? '–' : p.it.note) + '/10', x + colW - 3, y + 5.6, { align: 'right' });
        font(7.3, false, [51, 51, 51]); text(p.l, x + 3, y + 9.2);
      });
      y += h + 3;
    }
    /* D1 · E1 · note globale */
    const kw = (CW - 8) / 3;
    ensure(16);
    [['D1 · Précision', P.d1 + (P.d1txt ? ' — ' + P.d1txt : '')], ['E1 · Difficulté', P.e1 + (P.e2 ? ' · ' + P.e2 : '')], ['Note globale (indicative)', P.total]].forEach(([lab, v], j) => {
      const x = M + j * (kw + 4);
      doc.setDrawColor(...C.rule); doc.roundedRect(x, y, kw, 12, 2, 2, 'S');
      font(6.3, true, C.mute); text(lab.toUpperCase(), x + 3, y + 4.2);
      if (j === 2) { font(10.5, true, C.navy); text(v, x + 3, y + 9.6); }
      else { font(7.8, false, C.ink); text(wrap(v, kw - 6)[0] || '', x + 3, y + 9.2); }
    });
    y += 17;
    /* F1 à gauche, F0 · F2 · F3 à droite */
    const y0 = y, fw = (CW - 8) / 2;
    h2('F1 · Consignes et protocole', '', M, fw);
    P.f1.forEach(([sub, l]) => {
      font(6.3, true, C.mute); text(sub.toUpperCase(), M, y + 0.5); y += 4;
      l.forEach(([lab, v]) => {
        font(7.8, false, C.ink); text(lab, M, y + 0.4);
        pill(v, v === 'Oui' ? 'o' : v === 'Non' ? 'n' : '', M + fw, y + 0.6);
        doc.setDrawColor(...C.light); doc.setLineWidth(0.2); doc.line(M, y + 2.2, M + fw, y + 2.2);
        y += 5;
      });
      y += 1;
    });
    const yl = y; y = y0;
    const xr2 = M + fw + 8;
    [['F0 · Conclusion', P.f0], ['F2 · Points positifs', P.f2], ['F3 · Points à travailler', P.f3], ['Dialogue avec le correcteur', P.dlg]].forEach(([t, v], j) => {
      if (j === 3 && !v) return;
      h2(t, '', xr2, fw);
      font(7.8, false, v ? C.ink : C.grey); const l = wrap(v || 'Non renseigné.', fw);
      text(l, xr2, y); y += l.length * 3.6 + 3;
    });
    y = Math.max(yl, y) + 2;
  }

  /* ══ Pied de page ══ */
  const nbPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= nbPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.rule); doc.setLineWidth(0.2); doc.line(M, 288, W - M, 288);
    font(6.5, false, C.mute);
    text('© Vincent Guerlach · Suivi Arbitres Handball v' + APP_VERSION + ' · ' + S.tA + ' – ' + S.tB + (S.mDate ? ' · ' + fmtDate(S.mDate) : ''), M, 292);
    text('Page ' + i + ' / ' + nbPages, W - M, 292, { align: 'right' });
  }

  /* ── Sauvegarde ── */
  const datePart = sanitize(S.mDate || new Date().toLocaleDateString('fr-FR'));
  const filename = 'Suivi_' + sanitize(S.a1) + '_' + sanitize(S.a2) + '_' + sanitize(S.tA) + '_' + sanitize(S.tB) + '_' + datePart + '.pdf';
  /* v1.3.8 : lien <a> + blob URL (doc.save() interrompt le JS sur iOS) */
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(blobUrl); }, 200);

  log.info('PDF', 'fichier_genere', { filename, pages: nbPages, nbObs: S.obs.length, cards: selection });
}
