/* v1.18.7 : temps morts d'équipe (TME) — max par période (réglage ⚙), 3 par match,
   1 seul dans les 5 dernières minutes de la dernière période, 1 par tiers-temps. */
const { chromium } = require('playwright');
const { SUPA_STUB, OUT } = require('./helpers');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  for (const [n, vp] of [['ipad', { width: 1180, height: 820 }], ['iph', { width: 430, height: 932 }]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: 1, locale: 'fr-FR' });
    await ctx.route('**/*supabase*', r => r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }));
    await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/, r => r.request().url().includes('supabase') ? r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }) : r.abort());
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', x => errs.push(x.message));
    await p.goto('http://localhost:8123/index.html'); await p.waitForTimeout(800);
    await p.evaluate(() => { HomeS.style.display = 'none'; tA.value = 'Toulouse'; tB.value = 'Nîmes'; a1.value = 'Durand'; a2.value = 'Lopez'; window.startMatch(); });
    await p.waitForTimeout(300); await p.locator('#_paramsOk').click(); await p.waitForTimeout(300);
    /* état affiché : par équipe, 3 lignes → texte de la case, 'h' (case cachée) ou 'x' (ligne retirée) */
    const rows = () => p.evaluate(() => ['A', 'B'].map(t => [0, 1, 2].map(i => {
      const c = document.getElementById('c' + t + i);
      if (c.closest('tr').style.display === 'none') return 'x';
      if (c.parentElement.style.visibility === 'hidden') return 'h';
      return c.textContent.replace('✕', '').trim();
    }).join(' ')));
    const at = (period, el, extra) => p.evaluate(async ([period, el, extra]) => {
      const { S } = await import('/js/state.js'); const { refreshTme } = await import('/js/score.js');
      S.run = false; S.period = period; S.elapsed = el; if (extra) Object.assign(S, extra); refreshTme();
    }, [period, el, extra || null]);
    const fresh = { tme: { A: { MT1: [null, null], MT2: [null, null], MT3: [null, null] }, B: { MT1: [null, null], MT2: [null, null], MT3: [null, null] } } };
    const tap = async id => { await p.click('#' + id); await p.waitForTimeout(80); };

    /* ── 2 mi-temps (2 TME par mi-temps, 3 par match) ── */
    await at('MT1', 300);
    let r = await rows();
    ok(r[0] === '+ + x', n + ' MT1 : 2 lignes, la 3e retirée (' + r[0] + ')');
    await tap('cA0');                                   /* A : 1 TME en MT1 */
    await at('MT1', 400); await tap('cB0'); await at('MT1', 500); await tap('cB1'); /* B : 2 TME en MT1 */
    await at('MT2', 600);
    r = await rows();
    ok(r[0] === '+ + x', n + ' MT2, 1 TME pris en MT1 : 2 TME possibles (' + r[0] + ')');
    ok(r[1] === '+ h x', n + ' MT2, 2 TME pris en MT1 : 1 seul TME possible (' + r[1] + ')');
    await tap('cA0');
    r = await rows();
    ok(r[0] === '10:00 + x', n + ' BUG corrigé : après le 1er TME de MT2, le 2e reste possible (' + r[0] + ')');
    await at('MT2', 720); await tap('cA1');
    r = await rows();
    ok(r[0] === '10:00 12:00 x', n + ' MT2 : 2e TME pris (3 au total) (' + r[0] + ')');
    await at('MT2', 800); await tap('cB0');
    r = await rows();
    ok(r[1] === '13:20 h x', n + ' B : quota de 3 atteint (' + r[1] + ')');

    /* ── 5 dernières minutes (à partir de 25:00) ── */
    await at('MT2', 1500, JSON.parse(JSON.stringify(fresh)));
    await p.evaluate(async () => { const { S } = await import('/js/state.js'); S.tme.A.MT1 = ['05:00', null]; });
    await at('MT2', 1500);
    r = await rows();
    ok(r[0] === '+ Bloqué x', n + ' 25:00 sans TME en MT2 : 1 seul proposé (' + r[0] + ')');
    await tap('cA0');
    r = await rows();
    ok(r[0] === '25:00 Bloqué x', n + ' 1er TME de MT2 à 25:00 → pas de 2e (' + r[0] + ')');
    await p.evaluate(async () => { const { S } = await import('/js/state.js'); S.tme.A.MT2 = ['20:00', null]; });
    await at('MT2', 1560);
    r = await rows();
    ok(r[0] === '20:00 + x', n + ' TME à 20:00 puis 26:00 : le 2e est permis (' + r[0] + ')');
    await tap('cA1');
    r = await rows();
    ok(r[0] === '20:00 26:00 x', n + ' 2e TME de MT2 pris à 26:00 (' + r[0] + ')');

    /* ── Tiers-temps : 1 TME par tiers-temps ── */
    await at('MT1', 120, Object.assign(JSON.parse(JSON.stringify(fresh)), { nbMT: 3, dureesMT: [1200, 1200, 1200], tmeMax: null }));
    r = await rows();
    ok(r[0] === '+ x x' && r[1] === '+ x x', n + ' tiers-temps : 1 seule ligne (' + r[0] + ')');
    await tap('cA0');
    await at('MT2', 60);
    r = await rows();
    ok(r[0] === '+ x x', n + ' tiers-temps : 1 TME de nouveau possible au TT2 (' + r[0] + ')');

    /* ── Réglage ⚙ « TME max par période » ── */
    await p.evaluate(() => window.sgOpen()); await p.waitForTimeout(200);
    ok(await p.locator('#sgTme1.on').count() === 1, n + ' ⚙ : 1 présélectionné en tiers-temps');
    await p.click('#sgTme2'); await p.click('.sg-save'); await p.waitForTimeout(200);
    r = await rows();
    const tm = await p.evaluate(async () => (await import('/js/state.js')).S.tmeMax);
    ok(tm === 2 && r[0] === '+ + x', n + ' ⚙ réglé à 2 : 2 lignes en TT2 (' + r[0] + ')');
    await p.evaluate(() => window.sgOpen()); await p.waitForTimeout(200);
    ok(await p.locator('#sgTme2.on').count() === 1, n + ' ⚙ : le choix 2 est retrouvé');
    await p.click('#sgTme3'); await p.click('.sg-save'); await p.waitForTimeout(200);
    r = await rows();
    ok(r[1] === '+ + +', n + ' ⚙ réglé à 3 : 3 lignes (' + r[1] + ')');
    await p.evaluate(() => window.sgOpen()); await p.waitForTimeout(200);
    await p.click('#sgTme1'); await p.click('.sg-save'); await p.waitForTimeout(200);
    ok(await p.evaluate(async () => (await import('/js/state.js')).S.tmeMax) === null, n + ' ⚙ revenu au défaut (1 en tiers-temps) → suit le format');

    /* ── Un 3e TME n'est plus effacé à la réouverture ── */
    const kept = await p.evaluate(async () => {
      const { validateSnapshot } = await import('/js/storage.js');
      const snap = { S: { tA: 'a', tB: 'b', a1: 'c', a2: 'd', obs: [], tme: { A: { MT1: ['01:00', '02:00', '03:00'], MT2: [null, null], MT3: [null, null] }, B: { MT1: [null, null], MT2: [null, null], MT3: [null, null] } } }, ans: {} };
      validateSnapshot(snap); return snap.S.tme.A.MT1.join();
    });
    ok(kept === '01:00,02:00,03:00', n + ' validation au chargement : 3 TME conservés (' + kept + ')');
    await p.locator('#tmeBody').screenshot({ path: OUT + 'tme_' + n + '.png' });
    ok(!errs.length, n + ' aucune erreur JS ' + errs.join(' | '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? fails + ' ÉCHEC(S)' : 'TOUS LES TESTS PASSENT');
  process.exit(fails ? 1 : 0);
})();
