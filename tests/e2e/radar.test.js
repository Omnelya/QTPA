/* v1.15.0 : radar par bloc en fin de match (A1 · A2 · B · C1 · C2, une courbe par arbitre). */
const { chromium } = require('playwright');
const { SUPA_STUB, OUT } = require('./helpers');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  for (const [n, vp, theme] of [['ipad', { width: 1180, height: 820 }, 'light'], ['iph', { width: 430, height: 932 }, 'dark']]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: n === 'iph' ? 2 : 1, locale: 'fr-FR', colorScheme: theme });
    await ctx.route('**/*supabase*', r => r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }));
    await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/, r => r.request().url().includes('supabase') ? r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }) : r.abort());
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', x => errs.push(x.message));
    await p.goto('http://localhost:8123/index.html'); await p.waitForTimeout(800);
    await p.evaluate(() => { tA.value = 'Toulouse'; tB.value = 'Nîmes'; a1.value = 'Durand'; a2.value = 'Lopez'; window.startMatch(); });
    await p.waitForTimeout(300); await p.locator('#_paramsOk').click(); await p.waitForTimeout(300);
    /* Observations fictives : Duels faibles (Durand), Joueurs moyens, Technique bonne ; Décisionnel 1 seule obs. */
    await p.evaluate(async () => {
      const { S } = await import('/js/state.js');
      const add = (cat, col, arb, period) => S.obs.push({ time: '10:00', el: 600, period, arb: [arb], an: arb === 'A1' ? 'Durand' : 'Lopez', cat, cats: [cat], col, flag: false, todo: false, tags: [], cmt: '' });
      [['J7M', 'red', 'A1', 'MT1'], ['J7M', 'red', 'A1', 'MT2'], ['Marcher', 'green', 'A1', 'MT1'], ['Zone', 'red', 'A1', 'MT2'],
       ['J7M', 'green', 'A2', 'MT1'], ['Marcher', 'green', 'A2', 'MT2'], ['Zone', 'green', 'A2', 'MT1'],
       ['SPA', 'red', 'A1', 'MT1'], ['SPA', 'green', 'A1', 'MT2'], ['SPP', 'green', 'A2', 'MT1'], ['SPA', 'red', 'A2', 'MT2'],
       ['Placement', 'green', 'A1', 'MT1'], ['Déplacement', 'green', 'A1', 'MT2'], ['Placement', 'green', 'A2', 'MT1'], ['Gestuelle', 'red', 'A2', 'MT2'],
       ['Jet Franc', 'green', 'A1', 'MT1'], ['Continuité', 'red', 'A2', 'MT2'], ['Exécution du Jet', 'green', 'A2', 'MT1'],
       ['Protocole', 'green', 'A1', 'MT2']].forEach(x => add(...x));
    });
    await p.evaluate(() => { document.getElementById('AO')?.classList.remove('on'); window.endMatch(); }); await p.waitForTimeout(500);
    const card = p.locator('#db-radar');
    await card.scrollIntoViewIfNeeded();
    ok(await card.locator('svg.db-radar-svg').count() === 1, n + ' radar affiché en fin de match');
    ok(await card.locator('.rd-area').count() === 2 && await card.locator('.rd-lab').count() === 5, n + ' 2 courbes (Durand, Lopez) et 5 axes');
    const labels = await card.locator('.rd-t').allTextContents();
    ok(labels.join('|') === 'A1 Duels|A2 Continuité|B Joueurs|C1 Technique|C2 Décisionnel', n + ' axes ' + labels.join(', '));
    /* Duels = 4 conformes sur 7 = 57 % ; Joueurs = 2/4 = 50 % → axe le plus faible (≥ 3 obs) = B */
    ok((await card.locator('.db-radar-dt').textContent()).startsWith('B · Joueurs'), n + ' détail ouvert par défaut sur le bloc le plus faible');
    ok(await card.locator('.rd-lab.few').count() === 1 && (await card.locator('.rd-lab.few .rd-t').textContent()) === 'C2 Décisionnel', n + ' axe à moins de 3 obs. grisé');
    await card.locator('.rd-lab', { hasText: 'A1 Duels' }).click();
    const rows = await card.locator('.db-radar-tab tbody tr').allInnerTexts();
    ok(rows.length === 3 && rows.some(r => /J7M\s+3\s+0 %\s+100 %\s+33 %/.test(r)), n + ' détail A1 : J7M 3 obs., Durand 0 %, Lopez 100 %, total 33 % ' + JSON.stringify(rows));
    await card.locator('.db-seg-b', { hasText: 'Lopez' }).click(); await p.waitForTimeout(100);
    ok(await card.locator('.rd-area').count() === 1 && await card.locator('.rd-area.rd-a2').count() === 1, n + ' filtre arbitre : courbe de Lopez seule');
    /* v1.18.3 : tableau de détail → seule la colonne de Lopez, nombres de Lopez (J7M : 1 obs., 100 %) */
    const th = (await card.locator('.db-radar-tab th').allTextContents()).join('|');
    const rowsL = await card.locator('.db-radar-tab tbody tr').allInnerTexts();
    ok(th === 'Catégorie|Obs.|Lopez|Total' && rowsL.some(r => /J7M\s+1\s+100 %\s+100 %/.test(r)), n + ' filtre Lopez : colonne Durand masquée ' + th + ' ' + JSON.stringify(rowsL));
    await card.locator('.db-seg-b', { hasText: 'Tous' }).first().click();
    await card.locator('.db-seg-b', { hasText: 'MT2' }).click(); await p.waitForTimeout(100);
    ok((await card.locator('.rd-n').allTextContents()).join(',') === '3 obs.,1 obs.,2 obs.,2 obs.,1 obs.', n + ' filtre période MT2 : obs. par axe ' + (await card.locator('.rd-n').allTextContents()).join(','));
    await card.locator('.db-seg-b', { hasText: 'Tous' }).nth(1).click();
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), n + ' pas de débordement');
    await card.locator('xpath=..').screenshot({ path: OUT + 'radar_' + n + '.png' });
    ok(!errs.length, n + ' aucune erreur JS ' + errs.join(' | '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? fails + ' ÉCHEC(S)' : 'TOUS LES TESTS PASSENT');
  process.exit(fails ? 1 : 0);
})();
