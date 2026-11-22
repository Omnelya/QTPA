/* v1.16.0 : écran « Préparation Suivi » — prérempli, modifiable, copié, enregistré avec le match. */
const { chromium } = require('playwright');
const { SUPA_STUB: BASE_STUB, OUT } = require('./helpers');
/* Faux Supabase qui garde une trace des enregistrements (pour vérifier etat.prep) */
/* … et dont les lectures renvoient window.__rows (pour rouvrir un match « en ligne ») */
const SUPA_STUB = BASE_STUB.replace('insert:()=>ch', 'insert:(d)=>((window.__ins=window.__ins||[]).push(d),ch)')
  .split('r({data:[],error:null})').join('r({data:window.__rows||[],error:null})');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  ok(SUPA_STUB !== BASE_STUB, 'faux Supabase instrumenté');
  const b = await chromium.launch();
  for (const [n, vp, theme] of [['ipad', { width: 1180, height: 820 }, 'light'], ['iph', { width: 430, height: 932 }, 'dark']]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: n === 'iph' ? 2 : 1, locale: 'fr-FR', colorScheme: theme });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:8123' });
    await ctx.route('**/*supabase*', r => r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }));
    await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/, r => r.request().url().includes('supabase') ? r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }) : r.abort());
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', x => errs.push(x.message));
    await p.goto('http://localhost:8123/index.html'); await p.waitForTimeout(800);
    /* comme « + Nouveau match » : l'accueil est masqué avant de lancer le match */
    await p.evaluate(() => { HomeS.style.display = 'none'; tA.value = 'Toulouse'; tB.value = 'Nîmes'; a1.value = 'Durand'; a2.value = 'Lopez'; window.startMatch(); });
    await p.waitForTimeout(300); await p.locator('#_paramsOk').click(); await p.waitForTimeout(300);
    await p.evaluate(async () => {
      const { S, ans } = await import('/js/state.js');
      const add = (cat, col, arb, tags = [], flag = false, cmt = '', time = '10:00') => S.obs.push({ time, el: 600, period: 'MT1', arb: [arb], an: arb === 'A1' ? 'Durand' : 'Lopez', cat, cats: [cat], col, flag, todo: false, tags, cmt });
      /* A1 : 3/5 = 60 % → 6 ; A2 : 3/4 = 75 % → 8 ; B1 : 2/3 → 7 ; B2 : 1 obs ; C1 : 3/3 → 10 ; C2 : 2 obs */
      add('J7M', 'red', 'A1', ['Contact hors zone => JF'], true, 'contact hors zone, il fallait JF', '38:12');
      add('J7M', 'red', 'A1', ['Contact hors zone => JF']);
      add('Marcher', 'green', 'A1'); add('Marcher', 'green', 'A2'); add('Zone', 'green', 'A2');
      add('Exécution du Jet', 'red', 'A1', ['Engagement']); add('Exécution du Jet', 'green', 'A2', ['Engagement']);
      add('Continuité', 'green', 'A1'); add('Continuité', 'green', 'A2');
      add('SPP', 'green', 'A1', ['Bon CJ']); add('SPA', 'red', 'A2', ['Maillot']); add('SPA', 'green', 'A1'); add('SPP', 'red', 'A2', ['Râle']);
      add('Placement', 'green', 'A1'); add('Placement', 'green', 'A2'); add('Placement', 'green', 'A1');
      add('Protocole', 'red', 'A1', ['Protocole TME']); add('Communication', 'green', 'A2');
      S.sA = 25; S.sB = 23; ans.esprit = 'non'; ans.engage = 'oui'; ans.niveau = 'oui';
      document.getElementById('AO')?.classList.remove('on'); window.endMatch();
      document.getElementById('GC').value = 'Bon match global.';
    });
    await p.waitForTimeout(400);

    /* Bouton dans la fin de match */
    const btn = p.locator('#ES .btn-prep');
    ok(await btn.isVisible() && (await btn.textContent()) === 'Préparation Suivi', n + ' bouton « Préparation Suivi » en fin de match');
    if (n === 'iph') {
      const [bb, home, acts] = [await btn.boundingBox(), await p.locator('#ES .btn-home-save').boundingBox(), await p.locator('#ES .end-acts').boundingBox()];
      ok(bb.y > home.y && Math.abs(bb.width - acts.width) < 2, n + ' bouton sur toute la largeur, sous « Enregistrer et retour »');
    }
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), n + ' fin de match : pas de débordement');
    await p.locator('#ES .end-header').screenshot({ path: OUT + 'prep_entete_fin_' + n + '.png' });
    await btn.click(); await p.waitForTimeout(300);
    ok(await p.evaluate(() => getComputedStyle(PS).display === 'flex' && getComputedStyle(ES).display === 'none'), n + ' écran Préparation Suivi ouvert');

    /* Propositions */
    const notes = await p.$$eval('.ps-notes', g => g.map(x => x.querySelector('.db-seg-b.on')?.textContent || '-'));
    ok(notes.join(',') === '6,8,7,-,10,-', n + ' notes proposées A1→C2 : ' + notes.join(','));
    ok(await p.locator('.ps-notes .db-seg-b.sugg').count() === 4, n + ' note proposée repérée (cadre) sur 4 rubriques');
    const ta = k => p.inputValue('[data-txt="' + k + '"]');
    ok((await ta('A1')).includes('À travailler : J7M (Contact hors zone => JF ×2)') && (await ta('A1')).includes('Situation : 38:12 contact hors zone, il fallait JF (Durand)'), n + ' commentaire A1 prérempli');
    ok((await ta('B2')) === 'À travailler : SPP (Râle).', n + ' B2 = SPP/SPA avec tag Râle');
    ok((await ta('F0')) === 'Bon match global.', n + ' F0 = commentaire global');
    ok((await ta('F2')) === 'Placement (100 %).' && (await ta('F3')).startsWith('⚑ 38:12'), n + ' F2 / F3 préremplis');
    ok((await p.locator('[data-e1].on').textContent()) === 'Difficile', n + ' E1 = Difficile (1 « Non »)');
    const e2 = await p.locator('[data-e2].selected').allTextContents();
    ok(e2.join(',') === 'Relationnel,Score serré', n + ' E2 proposés : ' + e2.join(','));
    const f1 = await p.$$eval('#PS .q-row', r => r.map(x => x.querySelector('.q-lbl').firstChild.textContent + '=' + (x.querySelector('.ysel,.nsel,.nvsel')?.textContent || '?')));
    ok(f1.length === 10 && f1.includes('TME=Non') && f1.includes('Engagement=Oui') && f1.includes('Utilisation du carton jaune=Oui') && f1.includes('Commotion=Non vu'), n + ' F1 : ' + f1.join(' | '));
    ok((await p.textContent('#psTot')) === '4/6 notes', n + ' note globale incomplète');

    /* Modifications → S.prep */
    await p.locator('[data-note="A2"][data-v="7"]').click();
    await p.locator('[data-note="B2"][data-v="5"]').click(); await p.locator('[data-note="C2"][data-v="9"]').click();
    await p.locator('[data-type="Vidéo"]').click();
    await p.locator('[data-f1]', { hasText: 'Non vu' }).nth(0).click();
    await p.fill('[data-txt="F2"]', 'x'.repeat(410));
    await p.fill('[data-fld="sup"]', 'Vincent');
    const st = await p.evaluate(async () => { const { S } = await import('/js/state.js'); return S.prep; });
    ok(st.notes.A2 === 7 && st.type.includes('Vidéo') && st.f1['Placement sur jet de 7m'] === 'nv' && st.txt.F2.length === 410 && st.sup === 'Vincent', n + ' modifications rangées dans S.prep');
    ok((await p.textContent('#psTot')) === '44 / 60 · 7,3 / 10', n + ' note globale ' + await p.textContent('#psTot'));
    ok((await p.textContent('[data-cnt="F2"]')) === '410 / 400 caractères' && await p.locator('[data-cnt="F2"].over').count() === 1, n + ' compteur 400 en rouge');

    /* Copier */
    await p.locator('[data-copy="A1"]').click(); await p.waitForTimeout(150);
    ok((await p.locator('[data-copy="A1"]').textContent()) === 'Copié ✔' && (await p.evaluate(() => navigator.clipboard.readText())).startsWith('Bien : Marcher'), n + ' « Copier » d\'un texte');
    await p.locator('#PS .end-acts [data-act="all"]').click(); await p.waitForTimeout(150);
    const full = await p.evaluate(() => navigator.clipboard.readText());
    ok(full.includes('A2 - Continuité du jeu : 7/10') && full.includes('Juge superviseur : Vincent') && full.includes('Type de suivi : Vidéo') && full.includes('TME : Non'), n + ' « Copier la feuille » (texte complet)');
    await p.locator('[data-act="show"]').click();
    ok(await p.locator('#psExp.on').isVisible(), n + ' « Voir le texte complet »');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), n + ' Préparation : pas de débordement');
    await p.screenshot({ path: OUT + 'prep_' + n + '.png', fullPage: true });

    /* Fermer / rouvrir : rien n'est perdu */
    await p.locator('#PS .end-acts .btn-act', { hasText: 'Fin de match' }).click();
    ok(await p.evaluate(() => getComputedStyle(ES).display === 'flex' && getComputedStyle(PS).display === 'none'), n + ' retour à la fin de match');
    await btn.click(); await p.waitForTimeout(200);
    ok((await p.locator('[data-note="A2"].on').textContent()) === '7' && (await p.inputValue('[data-fld="sup"]')) === 'Vincent', n + ' réouverture : modifications conservées');

    /* Recalculer en 2 appuis */
    const rs = p.locator('[data-act="reset"]');
    await rs.click();
    ok((await rs.textContent()).startsWith('Confirmer') && (await p.locator('[data-note="A2"].on').textContent()) === '7', n + ' 1er appui : demande de confirmation, rien d\'écrasé');
    await rs.click(); await p.waitForTimeout(150);
    ok((await p.locator('[data-note="A2"].on').textContent()) === '8' && (await p.locator('[data-type="Vidéo"].selected').count()) === 1 && (await p.inputValue('[data-fld="sup"]')) === 'Vincent', n + ' 2e appui : propositions recalculées, type et noms gardés');

    /* Enregistrement avec le match, puis réouverture depuis l'accueil */
    await p.locator('#PS .end-acts .btn-act', { hasText: 'Fin de match' }).click();
    await p.locator('#ES .btn-home-save').click(); await p.waitForTimeout(900);
    const saved = await p.evaluate(async () => {
      const h = JSON.parse(localStorage.getItem('arbitres_hb_history') || '[]')[0];
      const { S } = await import('/js/state.js');
      const ins = (window.__ins || []).map(d => Array.isArray(d) ? d[0] : d).filter(d => d && d.etat);
      return { local: h?.S?.prep?.notes?.A2, remote: ins.length ? ins[ins.length - 1].etat.prep?.sup : null, reset: S.prep, cur: localStorage.getItem('arbitres_hb_current') };
    });
    ok(saved.cur === null, n + ' pas de « suivi interrompu » fantôme après le retour accueil (sauvegarde différée annulée)');
    ok(saved.local === 8, n + ' préparation enregistrée en local');
    ok(saved.remote === 'Vincent', n + ' préparation envoyée en ligne (etat.prep)');
    ok(saved.reset === null, n + ' retour accueil : préparation remise à zéro pour le match suivant');
    const reopened = async how => {
      await btn.click(); await p.waitForTimeout(200);
      ok((await p.locator('[data-note="A2"].on').textContent()) === '8' && (await p.locator('[data-type="Vidéo"].selected').count()) === 1 &&
        (await p.inputValue('[data-fld="sup"]')) === 'Vincent', n + ' match rouvert (' + how + ') : préparation retrouvée');
    };
    /* Réouverture depuis l'historique local */
    await p.evaluate(() => window.App.openMatchFromHome(JSON.parse(localStorage.getItem('arbitres_hb_history'))[0].id, true)); await p.waitForTimeout(500);
    await reopened('local');
    await p.locator('#PS .end-acts .btn-act', { hasText: 'Fin de match' }).click();
    await p.locator('#ES .btn-home-save').click(); await p.waitForTimeout(900);
    /* Réouverture depuis la ligne enregistrée en ligne (colonnes + etat) */
    await p.evaluate(async () => {
      localStorage.removeItem('arbitres_hb_current');
      const d = (window.__ins || []).map(x => Array.isArray(x) ? x[0] : x).filter(x => x && x.etat).pop();
      window.__rows = [Object.assign({ id: 'r9' }, JSON.parse(JSON.stringify(d)))];
      await window.App.openMatchFromHome('r9', false);
    }); await p.waitForTimeout(500);
    await reopened('en ligne');
    ok(!errs.length, n + ' aucune erreur JS ' + errs.join(' | '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? fails + ' ÉCHEC(S)' : 'TOUS LES TESTS PASSENT');
  process.exit(fails ? 1 : 0);
})();
