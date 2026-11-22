/* v1.18.0 : « Autre » se classe dans un groupe (A1, A2, B, C1, C2) — saisie, modification, tableau, radar, préparation. */
const { chromium } = require('playwright');
const { SUPA_STUB, OUT } = require('./helpers');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  for (const [n, vp] of [['ipad', { width: 1180, height: 820 }], ['iph', { width: 430, height: 932 }]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: n === 'iph' ? 2 : 1, locale: 'fr-FR' });
    await ctx.route('**/*supabase*', r => r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }));
    await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/, r => r.request().url().includes('supabase') ? r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }) : r.abort());
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', x => errs.push(x.message));
    await p.goto('http://localhost:8123/index.html'); await p.waitForTimeout(800);
    await p.evaluate(() => { HomeS.style.display = 'none'; tA.value = 'Toulouse'; tB.value = 'Nîmes'; a1.value = 'Durand'; a2.value = 'Lopez'; window.startMatch(); });
    await p.waitForTimeout(300); await p.locator('#_paramsOk').click(); await p.waitForTimeout(300);
    const obs = () => p.evaluate(async () => JSON.parse(JSON.stringify((await import('/js/state.js')).S.obs)));

    /* Saisie : choix du groupe, A1 par défaut */
    await p.click('[aria-label="Autre non conforme"]');
    ok(await p.isVisible('#detailGrpZone') && await p.locator('#detailGrpBtns .qn-tag').count() === 5, n + ' Autre : 5 groupes proposés');
    ok(await p.locator('#detailGrpBtns .qn-tag.selected').getAttribute('data-grp') === 'A1' && (await p.textContent('#detailTitle')).startsWith('Autre (A1)'), n + ' A1 sélectionné par défaut');
    await p.click('#detailGrpBtns [data-grp="C2"]');
    ok((await p.textContent('#detailTitle')).startsWith('Autre (C2)') && await p.locator('#detailGrpBtns .qn-tag.selected').count() === 1, n + ' choix C2 (un seul groupe à la fois)');
    await p.screenshot({ path: OUT + 'autre_groupe_' + n + '.png' });
    await p.click('#detailSave_A1'); await p.waitForTimeout(200);
    let o = await obs();
    ok(o.length === 1 && o[0].grp === 'C2', n + ' obs.grp = C2 enregistré');
    ok((await p.locator('#OTB tr').first().innerText()).includes('Autre (C2)'), n + ' tableau : « Autre (C2) »');

    /* Autres catégories : pas de choix de groupe, pas de grp */
    await p.click('[aria-label="J7M non conforme"]');
    ok(!(await p.isVisible('#detailGrpZone')), n + ' J7M : pas de choix de groupe');
    await p.click('#detailSave_A1'); await p.waitForTimeout(200);
    o = await obs(); ok(!('grp' in o[1]), n + ' J7M : pas de champ grp');

    /* Modification : le groupe est repris, puis changé en B */
    await p.evaluate(() => window.editObservation(0)); await p.waitForTimeout(200);
    ok(await p.locator('#detailGrpBtns .qn-tag.selected').getAttribute('data-grp') === 'C2', n + ' modification : C2 repris');
    await p.click('#detailGrpBtns [data-grp="B"]'); await p.click('#detailSave_A1'); await p.waitForTimeout(200);
    await p.click('[aria-label="Autre conforme"]'); await p.click('#detailSave_A2'); await p.waitForTimeout(200);
    o = await obs();
    ok(o.filter(x => x.cat === 'Autre').map(x => x.grp).join() === 'B,A1', n + ' groupes enregistrés : B puis A1 par défaut');

    /* Radar : Autre (B) compte dans B, Autre (A1) dans A1 */
    await p.evaluate(() => { document.getElementById('AO')?.classList.remove('on'); window.endMatch(); }); await p.waitForTimeout(500);
    const nb = await p.locator('#db-radar .rd-n').allTextContents();
    ok(nb.join(',') === '2 obs.,0 obs.,1 obs.,0 obs.,0 obs.', n + ' radar : obs. par bloc ' + nb.join(','));
    await p.locator('#db-radar .rd-lab', { hasText: 'B Joueurs' }).click();
    ok((await p.locator('#db-radar .db-radar-tab tbody').innerText()).includes('Autre'), n + ' radar B : ligne « Autre »');

    /* Préparation Suivi : Autre (B) dans B1, Autre (A1) dans A1 */
    await p.locator('#ES .btn-prep').click(); await p.waitForTimeout(300);
    const sums = await p.$$eval('#PS details.ps-det', d => d.map(x => x.dataset.det + ':' + x.querySelector('summary').textContent));
    ok(sums.join('|') === 'A1:2 actions|B1:1 action', n + ' préparation : ' + sums.join('|'));
    ok((await p.locator('[data-det="B1"] .db-cat').textContent()) === 'Autre (B)', n + ' préparation : ligne « Autre (B) »');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), n + ' pas de débordement');
    ok(!errs.length, n + ' aucune erreur JS ' + errs.join(' | '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? fails + ' ÉCHEC(S)' : 'TOUS LES TESTS PASSENT');
  process.exit(fails ? 1 : 0);
})();
