/* v1.18.8 : accueil — nombre de suivis + % conforme par bloc (A1 · A2 · B · C1 · C2), qui suivent la recherche. */
const { chromium } = require('playwright');
const { SUPA_STUB: BASE_STUB, OUT } = require('./helpers');
/* les lectures Supabase renvoient window.__rows (posé avant le chargement de la page) */
const SUPA_STUB = BASE_STUB.split('r({data:[],error:null})').join('r({data:window.__rows||[],error:null})');
const O = (cat, col, extra) => Object.assign({ time: '10:00', el: 600, period: 'MT1', arb: ['A1'], an: 'x', cat, cats: [cat], col, flag: false, tags: [], cmt: '' }, extra || {});
const ROWS = [
  { id: 'r1', equipe_a: 'Lyon', equipe_b: 'Nancy', arbitre1: 'Martin', arbitre2: 'Petit', date_match: '2026-11-01', competition: 'N1', score_a: 20, score_b: 18, created_at: '2026-11-01T10:00:00Z',
    observations: [O('J7M', 'red'), O('J7M', 'green'), O('Marcher', 'green'), O('SPA', 'red'), O('Placement', 'green'), O('Autre', 'green', { grp: 'C2' })], etat: {} },
  { id: 'r2', equipe_a: 'Nîmes', equipe_b: 'Sète', arbitre1: 'Durand', arbitre2: 'Lopez', date_match: '2026-11-08', competition: 'N2', score_a: 25, score_b: 30, created_at: '2026-11-08T10:00:00Z',
    observations: [O('Continuité', 'green'), O('Jeu Passif', 'red'), O('Marcher', 'red')], etat: {} }
];
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  for (const [n, vp] of [['ipad', { width: 1180, height: 820 }], ['iph', { width: 430, height: 932 }]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: n === 'iph' ? 2 : 1, locale: 'fr-FR' });
    await ctx.addInitScript(rows => { window.__rows = rows; }, ROWS);
    await ctx.route('**/*supabase*', r => r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }));
    await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/, r => r.request().url().includes('supabase') ? r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }) : r.abort());
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', x => errs.push(x.message));
    await p.goto('http://localhost:8123/index.html'); await p.waitForTimeout(1200);
    const tiles = () => p.$$eval('#homeStats .home-stat-card', c => c.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
    let t = await tiles();
    ok(t.slice(0, 6).join(' | ') === '2 suivis | 50 % A1 Duels | 50 % A2 Continuité | 0 % B Joueurs | 100 % C1 Technique | 100 % C2 Décisionnel', n + ' tous les suivis : ' + t.join(' | '));
    ok(!t.join(' ').includes('buts') && !t.join(' ').includes('compétition'), n + ' plus de « buts moy. » ni de « compétition(s) »');
    ok(await p.locator('#homeStats [data-blk="B"] .home-stat-val.ko').count() === 1 && await p.locator('#homeStats [data-blk="C1"] .home-stat-val.ok').count() === 1 && await p.locator('#homeStats [data-blk="A1"] .home-stat-val.mid').count() === 1, n + ' couleurs : vert ≥ 70 %, orange ≥ 50 %, rouge en dessous');
    ok(/Synchronisé/.test(t.join(' ')), n + ' case « Synchronisé » gardée');
    await p.fill('#homeFilterComp', 'Durand'); await p.evaluate(() => window.applyHomeFilters()); await p.waitForTimeout(500);
    t = await tiles();
    ok(t.slice(0, 6).join(' | ') === '1 suivi | 0 % A1 Duels | 50 % A2 Continuité | – B Joueurs | – C1 Technique | – C2 Décisionnel', n + ' recherche « Durand » : ' + t.join(' | '));
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), n + ' pas de débordement');
    await p.locator('#homeStats').screenshot({ path: OUT + 'accueil_stats_' + n + '.png' });
    ok(!errs.length, n + ' aucune erreur JS ' + errs.join(' | '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? fails + ' ÉCHEC(S)' : 'TOUS LES TESTS PASSENT');
  process.exit(fails ? 1 : 0);
})();
