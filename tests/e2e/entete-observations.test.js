/* v1.18.0 : iPad — ↶ ↷ sur la même ligne que « Observations rapides » (portrait et paysage). */
const { chromium } = require('playwright');
const { SUPA_STUB, OUT } = require('./helpers');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  for (const [n, vp] of [['ipad-paysage', { width: 1180, height: 820 }], ['ipad-portrait', { width: 820, height: 1180 }], ['ipad-mini-portrait', { width: 744, height: 1133 }]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: 1, locale: 'fr-FR' });
    await ctx.route('**/*supabase*', r => r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }));
    await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/, r => r.request().url().includes('supabase') ? r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }) : r.abort());
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', x => errs.push(x.message));
    await p.goto('http://localhost:8123/index.html'); await p.waitForTimeout(800);
    await p.evaluate(() => { HomeS.style.display = 'none'; tA.value = 'Toulouse'; tB.value = 'Nîmes'; a1.value = 'Guerlach-Durand'; a2.value = 'Lopez'; window.startMatch(); });
    await p.waitForTimeout(300); await p.locator('#_paramsOk').click(); await p.waitForTimeout(300);
    /* des observations pour remplir les pastilles arbitres et ⚑ (cas le plus large) */
    for (const s of ['A1', 'A2', 'A1']) { await p.click('[aria-label="J7M non conforme"]'); await p.click('#detailFlag'); await p.click('#detailSave_' + s); await p.waitForTimeout(80); }
    const box = async sel => p.locator(sel).boundingBox();
    const [t, u, r, c, card] = [await box('#cardQuickNotes .qn-head .card-title'), await box('#btnUndo'), await box('#btnRedo'), await box('#qnStats_A1'), await box('#cardQuickNotes')];
    const mid = x => x.y + x.height / 2;
    ok(Math.abs(mid(r) - mid(t)) < 14 && Math.abs(mid(u) - mid(t)) < 14, n + ' ↶ ↷ en face du titre');
    ok(r.x + r.width <= card.x + card.width + 1, n + ' ↷ dans la carte');
    ok(r.width >= 44 && r.height >= 44, n + ' flèches toujours faciles à toucher (' + r.width + '×' + r.height + ')');
    if (n === 'ipad-paysage') ok(Math.abs(mid(c) - mid(t)) < 14, n + ' paysage : pastilles sur la même ligne (pas de ligne en plus)');
    if (n === 'ipad-portrait') ok(c.y > r.y + r.height - 4, n + ' portrait : pastilles en 2e ligne, sous les flèches');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), n + ' pas de débordement');
    await p.locator('#cardQuickNotes .qn-head').screenshot({ path: OUT + 'entete_obs_' + n + '.png' });
    ok(!errs.length, n + ' aucune erreur JS ' + errs.join(' | '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? fails + ' ÉCHEC(S)' : 'TOUS LES TESTS PASSENT');
  process.exit(fails ? 1 : 0);
})();
