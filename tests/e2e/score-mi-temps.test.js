/* v1.14.3 : score de la pause figé à la fin du match si le chrono de la période suivante
   n'a jamais été relancé (avant : score de MT1 / TT2 vide). */
const { chromium } = require('playwright');
const { SUPA_STUB } = require('./helpers');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, locale: 'fr-FR' });
  await ctx.route('**/*supabase*', r => r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }));
  await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/, r => r.request().url().includes('supabase') ? r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }) : r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', x => errs.push(x.message));
  const S = expr => p.evaluate(async e => { const { S } = await import('/js/state.js'); return eval(e); }, expr);
  const start = async nb => {
    await p.goto('http://localhost:8123/index.html'); await p.waitForTimeout(800);
    await p.evaluate(() => { tA.value = 'Toulouse'; tB.value = 'Nîmes'; a1.value = 'Durand'; a2.value = 'Lopez'; window.startMatch(); });
    await p.waitForTimeout(300);
    if (nb === 3) await p.locator('#_bs3').click().catch(() => {});
    await p.locator('#_paramsOk').click(); await p.waitForTimeout(300);
    await p.evaluate(nb => import('/js/state.js').then(({ S }) => { if (nb === 3) { S.nbMT = 3; S.dureesMT = [900, 900, 900]; } }), nb);
  };
  const finPeriode = async (sA, sB) => {
    await p.evaluate(async ([a, b]) => { const { S } = await import('/js/state.js'); S.sA = a; S.sB = b; S.elapsed = S.dureesMT[['MT1', 'MT2', 'MT3'].indexOf(S.period)] - 0.1; S.run = false; }, [sA, sB]);
    await p.evaluate(() => toggleChrono()); await p.waitForTimeout(700);
    await p.evaluate(() => document.getElementById('AO')?.classList.remove('on'));
  };

  // 2 MT : fin de MT1 à 14-12, fin de match sans relancer le chrono
  await start(2);
  await finPeriode(14, 12);
  ok(await S('S.period') === 'MT2' && await S('S.htA') === null, '2 MT : en MT2, score MT1 pas encore figé');
  await p.evaluate(() => window.endMatch()); await p.waitForTimeout(300);
  ok(await S('[S.htA,S.htB].join()') === '14,12', '2 MT : fin de match → score MT1 figé à 14-12');

  // 3 TT : TT1 joué normalement (TT2 démarré), fin de TT2 à 20-19, fin sans relancer
  await p.evaluate(() => localStorage.clear());
  await start(3);
  await finPeriode(7, 6);
  await p.evaluate(() => toggleChrono()); await p.waitForTimeout(300); // démarre TT2 → fige TT1
  await p.evaluate(() => toggleChrono()); await p.waitForTimeout(200);
  ok(await S('[S.htA,S.htB].join()') === '7,6', '3 TT : score TT1 figé au démarrage de TT2');
  await finPeriode(20, 19);
  ok(await S('S.period') === 'MT3' && await S('S.ht2A') === null, '3 TT : en TT3, score TT2 pas encore figé');
  await p.evaluate(() => window.endMatch()); await p.waitForTimeout(300);
  ok(await S('[S.htA,S.htB,S.ht2A,S.ht2B].join()') === '7,6,20,19', '3 TT : fin de match → TT1 inchangé, TT2 figé à 20-19');

  // Match fini pendant MT1 : rien n'est inventé
  await p.evaluate(() => localStorage.clear());
  await start(2);
  await p.evaluate(async () => { const { S } = await import('/js/state.js'); S.sA = 3; S.sB = 2; });
  await p.evaluate(() => window.endMatch()); await p.waitForTimeout(300);
  ok(await S('S.htA') === null, 'fin pendant MT1 : pas de score de mi-temps inventé');

  ok(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await b.close();
  console.log(fails ? fails + ' ÉCHEC(S)' : 'TOUS LES TESTS PASSENT');
  process.exit(fails ? 1 : 0);
})();
