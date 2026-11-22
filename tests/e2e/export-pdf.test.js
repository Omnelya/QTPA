/* v1.19.0 : export PDF — fenêtre de choix (sans préréglages), génération jsPDF réelle
   (bibliothèques servies depuis node_modules), contenu vérifié avec pdftotext si présent. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { SUPA_STUB, OUT } = require('./helpers');
const NM = path.join(__dirname, '..', '..', 'node_modules');
const LIBS = { 'jspdf.umd.min.js': path.join(NM, 'jspdf/dist/jspdf.umd.min.js'), 'jspdf.plugin.autotable.min.js': path.join(NM, 'jspdf-autotable/dist/jspdf.plugin.autotable.min.js') };
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  if (!Object.values(LIBS).every(f => fs.existsSync(f))) { console.log('FAIL jsPDF absent : lancer « npm install »'); process.exit(1); }
  const b = await chromium.launch();
  for (const [n, vp] of [['ipad', { width: 1180, height: 820 }], ['iph', { width: 430, height: 932 }]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: 1, locale: 'fr-FR', acceptDownloads: true });
    await ctx.route('**/*supabase*', r => r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }));
    await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/, r => r.request().url().includes('supabase') ? r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }) : r.abort());
    /* enregistrées après : prioritaires sur le blocage du CDN */
    for (const [f, file] of Object.entries(LIBS)) await ctx.route('**/' + f, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(file) }));
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', x => errs.push(x.message));
    await p.goto('http://localhost:8123/index.html'); await p.waitForTimeout(800);
    await p.evaluate(() => { HomeS.style.display = 'none'; tA.value = 'Toulouse HB'; tB.value = 'Nîmes HB'; a1.value = 'Durand'; a2.value = 'Lopez'; window.startMatch(); });
    await p.waitForTimeout(300); await p.locator('#_paramsOk').click(); await p.waitForTimeout(300);
    await p.evaluate(async () => {
      const { S, ans } = await import('/js/state.js');
      const O = (time, el, period, arb, cat, col, extra) => Object.assign({ time, el, period, arb: [arb], an: arb === 'A1' ? 'Durand' : 'Lopez', cat, cats: [cat], col, flag: false, todo: false, tags: [], cmt: '' }, extra || {});
      S.obs.push(
        O('02:15', 135, 'MT1', 'A1', 'Marcher', 'green'),
        O('06:05', 365, 'MT1', 'A1', 'J7M', 'red', { flag: true, lien: 'L1', tags: ['Contact hors zone => JF'], cmt: 'à revoir 😀 ⇒ vidéo' }),
        O('06:05', 365, 'MT1', 'A1', 'SPA', 'red', { flag: true, lien: 'L1', tags: ['SPA 2'], cmt: 'à revoir 😀 ⇒ vidéo' }),
        O('11:45', 705, 'MT1', 'A2', 'Passage en Force', 'green', { tags: ['Raffut'] }),
        O('15:02', 902, 'MT1', 'A2', "Zone d'influence", 'red', { tags: ['Pas ta zone'] }),
        O('04:12', 252, 'MT2', 'A2', 'SPA', 'red', { lien: 'L2' }), O('04:12', 252, 'MT2', 'A2', 'Exécution du Jet', 'green', { lien: 'L2' }), O('04:12', 252, 'MT2', 'A2', 'Gestion du sifflet', 'green', { lien: 'L2' }),
        O('15:55', 955, 'MT2', 'A1', 'Autre', 'red', { grp: 'C2', cmt: 'Retard de reprise' }),
        O('25:30', 1530, 'MT2', 'A1', 'Protocole', 'green', { tags: ['Protocole TME'] }));
      S.sA = 30; S.sB = 35; S.htA = 14; S.htB = 16; S.pauseNote = 'Tenir la zone sur les 7 m.'; S.mDate = '2026-11-21';
      ans.esprit = 'non'; ans.engage = 'oui'; ans.niveau = 'oui';
      document.getElementById('AO')?.classList.remove('on'); window.endMatch();
      document.getElementById('GC').value = 'Match engagé, bonne gestion globale.';
      const c = document.getElementById('ECtxEdit'); if (c) c.value = 'Match à enjeu, public nombreux.';
    });
    await p.waitForTimeout(400);

    /* Fenêtre de choix : 8 cases, pas de préréglage ; Préparation grisée tant qu'elle n'est pas faite */
    await p.click('#BExp'); await p.waitForTimeout(200);
    ok(await p.locator('#pdfModalOverlay input[type=checkbox]').count() === 8, n + ' fenêtre : 8 éléments à cocher');
    ok(!(await p.locator('#pdfModalOverlay').innerText()).match(/Débrief arbitres|Dossier commission/), n + ' pas de choix « Débrief arbitres / Dossier commission »');
    ok(await p.isDisabled('#pdfCard_prep') && !(await p.isChecked('#pdfCard_prep')), n + ' Préparation Suivi grisée (pas encore préparée)');
    ok(!(await p.isChecked('#pdfCard_frise')) && await p.isChecked('#pdfCard_obs'), n + ' frise décochée, observations cochées par défaut');
    await p.click('#pdfModalClose');
    /* préparation faite → disponible */
    await p.evaluate(async () => { window.openPrep(); const { S } = await import('/js/state.js'); S.prep.sup = 'J. Martin'; S.prep.type = ['Diagnostique JAN']; window.closePrep(); });
    await p.click('#BExp'); await p.waitForTimeout(200);
    ok(!(await p.isDisabled('#pdfCard_prep')) && await p.isChecked('#pdfCard_prep'), n + ' Préparation Suivi cochable une fois préparée');
    ok((await p.textContent('#pdfSelectAll')) === 'Tout cocher', n + ' bouton « Tout cocher » (la frise est décochée)');
    await p.click('#pdfSelectAll'); await p.waitForTimeout(50);
    ok(await p.locator('#pdfModalOverlay input:checked').count() === 8 && (await p.textContent('#pdfSelectAll')) === 'Tout décocher', n + ' « Tout cocher » (frise comprise)');
    await p.click('#pdfSelectAll');
    ok(await p.locator('#pdfModalOverlay input:checked').count() === 0, n + ' « Tout décocher »');
    await p.click('#pdfSelectAll');
    await p.locator('#pdfModalOverlay > div').screenshot({ path: OUT + 'pdf_fenetre_' + n + '.png' });

    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.click('#pdfExportBtn')]);
    const file = OUT + 'suivi_' + n + '.pdf';
    await dl.saveAs(file);
    const buf = fs.readFileSync(file);
    const pages = (buf.toString('latin1').match(/\/Type \/Page[^s]/g) || []).length;
    ok(buf.slice(0, 5).toString() === '%PDF-' && pages >= 2 && pages <= 4, n + ' PDF généré : ' + pages + ' page(s), ' + Math.round(buf.length / 1024) + ' Ko');
    ok(dl.suggestedFilename() === 'Suivi_Durand_Lopez_Toulouse_HB_Nimes_HB_2026_11_21.pdf', n + ' nom du fichier : ' + dl.suggestedFilename());
    let txt = '';
    try { txt = execFileSync('pdftotext', ['-layout', file, '-']).toString(); } catch (e) { console.log('INFO pdftotext absent : contenu non vérifié'); }
    if (txt) {
      const must = ["Suivi d'arbitrage", 'Toulouse HB – Nîmes HB', 'SYNTHÈSE PAR BLOC', 'ÉVALUATION GÉNÉRALE', 'CONTEXTE DU MATCH', 'Match à enjeu', 'À TRAVAILLER', 'POINTS FORTS',
        'À REVOIR AVEC LES ARBITRES', 'Tenir la zone sur les 7 m.', 'OBSERVATIONS', 'J7M + SPA', 'Gestion du sifflet', 'Autre (C2)', "Zone d'influence",
        'FRISE CHRONOLOGIQUE', 'COMMENTAIRE GLOBAL', 'Match engagé', 'PRÉPARATION SUIVI', 'Gestion des duels', 'F1 · CONSIGNES ET PROTOCOLE', 'Superviseur : J. Martin', 'Page 1 /'];
      const miss = must.filter(s => !txt.includes(s));
      ok(!miss.length, n + ' contenu du PDF (' + (must.length - miss.length) + '/' + must.length + ')' + (miss.length ? ' manque : ' + miss.join(' | ') : ''));
      ok(txt.includes('à revoir => vidéo') && !/[😀⇒✘✔⚑]/u.test(txt), n + ' texte nettoyé (emoji retiré, ⇒ devenu =>)');
    }
    ok(await p.locator('#pdfModalOverlay').count() === 0, n + ' fenêtre fermée après l\'export');
    ok(!errs.length, n + ' aucune erreur JS ' + errs.join(' | '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? fails + ' ÉCHEC(S)' : 'TOUS LES TESTS PASSENT');
  process.exit(fails ? 1 : 0);
})();
