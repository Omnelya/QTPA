const { chromium, devices } = require('playwright');
const fs = require('fs');

const { SUPA_STUB, OUT } = require('./helpers');

const VIEWPORTS = [
  ['ipad-paysage-1180x820', { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ['ipad-portrait-820x1180', { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ['ipad-mini-paysage-1133x744', { viewport: { width: 1133, height: 744 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ['iphone-portrait-390x844', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 }],
  ['iphone-paysage-844x390', { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 }],
  ['iphone-se-375x667', { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
];

let fails = 0;
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fails++; };

async function boot(browser, ctxOpts, extra = {}) {
  const ctx = await browser.newContext({ ...ctxOpts, colorScheme: extra.colorScheme || 'light', locale: 'fr-FR' });
  if (extra.theme || extra.history) {
    await ctx.addInitScript(([theme, hist]) => {
      if (theme) localStorage.setItem('arbitres_hb_theme', theme);
      if (hist) localStorage.setItem('arbitres_hb_history', hist);
    }, [extra.theme || null, extra.history || null]);
  }
  await ctx.route('**/*supabase*', r => r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }));
  await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/, r => r.request().url().includes('supabase') ? r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }) : r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:8123/index.html');
  await page.waitForTimeout(800);
  return { ctx, page, errors };
}

async function startMatch(page) {
  await page.evaluate(() => {
    document.getElementById('tA').value = 'Toulouse';
    document.getElementById('tB').value = 'Nîmes';
    document.getElementById('a1').value = 'Durand';
    document.getElementById('a2').value = 'Lopez';
    window.startMatch();
  });
  await page.waitForTimeout(300);
  await page.locator('#_paramsOk').click();
  await page.waitForTimeout(500);
}

(async () => {
  const browser = await chromium.launch();

  /* ── 1. Mode sombre / clair ── */
  {
    const base = { viewport: { width: 1180, height: 820 } };
    let { ctx, page } = await boot(browser, base, { colorScheme: 'dark', theme: 'light' });
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const inline = await page.evaluate(() => document.documentElement.style.getPropertyValue('--bg-app'));
    ok(bg === 'rgb(245, 245, 240)', 'mode clair forcé + système sombre : fond clair (' + bg + ')');
    ok(inline === '', 'variable inline --bg-app retirée');
    await page.screenshot({ path: OUT + 'dark-system_light-app.png' });
    await ctx.close();
    ({ ctx, page } = await boot(browser, base, { colorScheme: 'dark', theme: 'dark' }));
    ok((await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === 'rgb(15, 17, 23)', 'mode sombre forcé : fond sombre');
    await ctx.close();
    ({ ctx, page } = await boot(browser, base, { colorScheme: 'dark' }));
    ok((await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === 'rgb(15, 17, 23)', 'aucun choix + système sombre : fond sombre');
    await ctx.close();
    ({ ctx, page } = await boot(browser, base, { colorScheme: 'light', theme: 'dark' }));
    await page.evaluate(() => window.toggleTheme());
    ok((await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === 'rgb(245, 245, 240)', 'bascule sombre → clair : fond clair');
    await ctx.close();
  }

  /* ── 2. Tests par appareil ── */
  for (const [name, opts] of VIEWPORTS) {
    console.log('\n=== ' + name + ' ===');
    const hist = JSON.stringify([{ id: 1, S: { obs: [
      { tags: ['Repli défensif'] }, { tags: ['Repli défensif', 'Ballon hors jeu'] }, { tags: ['Ballon hors jeu'] }, { tags: ['Ballon hors jeu'] }] } }]);
    const { ctx, page, errors } = await boot(browser, opts, { history: hist });
    await startMatch(page);
    ok(await page.isVisible('#MS'), 'écran match affiché');

    // familles = CA + CP + Autre
    const names = await page.$$eval('.qn-rname', els => els.map(e => e.textContent));
    const expected = ['SPP','SPA','J7M','Jet Franc','Continuité','Exécution du Jet','Passage en Force','Mauvais Bloc','Jeu Passif','Marcher','Pied','Reprise de dribble','Zone','Communication','Protocole','Placement','Déplacement',"Zone d'influence",'Gestion du sifflet','Gestuelle','Autre'];
    ok(names.length === 21 && expected.every(n => names.includes(n)) && new Set(names).size === 21, '21 catégories, chacune une seule fois');

    // pas de débordement horizontal
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(over <= 1, 'pas de défilement horizontal (excès ' + over + 'px)');

    // cibles tactiles : iPhone >= 44px ; iPad (choix utilisateur) boutons carrés >= 36px, Annuler/Rétablir >= 44px
    const mob = opts.viewport.width < 768;
    const small = await page.evaluate(m => [...document.querySelectorAll('.qn-tap,.qn-hbtn')].filter(b => { const r = b.getBoundingClientRect(); const min = (b.classList.contains('qn-tap') && !m) ? 35.5 : 43.5; return r.height < min || r.width < min; }).length, mob);
    ok(small === 0, 'boutons ✘ ✔ carrés (36px iPad / 44px iPhone), Annuler/Rétablir ≥ 44px');
    const sq = await page.evaluate(() => [...document.querySelectorAll('.qn-tap')].every(b => { const r = b.getBoundingClientRect(); return Math.abs(r.width - r.height) < 1; }));
    ok(sq, 'boutons ✘ ✔ carrés');
    await page.screenshot({ path: OUT + name + '_match.png', fullPage: false });

    // ── popup ──
    const marcher = page.getByRole('button', { name: 'Marcher non conforme', exact: true });
    await marcher.scrollIntoViewIfNeeded();
    await marcher.tap();
    ok(await page.isVisible('#detailOverlay .qn-sheet'), 'popup ouverte au toucher');
    ok((await page.textContent('#detailSave_A1')) === 'Durand' && (await page.textContent('#detailSave_A2')) === 'Lopez', 'boutons d’enregistrement = noms réels des arbitres');
    // sheet tient dans l'écran et boutons d'enregistrement visibles
    await page.waitForTimeout(450); /* fin de l'animation d'entrée */
    const geo = await page.evaluate(() => {
      const s = document.querySelector('#detailOverlay .qn-sheet').getBoundingClientRect();
      const b = document.getElementById('detailSave_A2').getBoundingClientRect();
      return { sTop: s.top, sBottom: s.bottom, vh: innerHeight, bTop: b.top, bBottom: b.bottom, bh: b.height };
    });
    ok(geo.sTop >= -1 && geo.sBottom <= geo.vh + 1, 'popup contenue dans l’écran');
    ok(geo.bTop >= 0 && geo.bBottom <= geo.vh + 1 && geo.bh >= 44, 'boutons d’enregistrement visibles sans défiler et ≥ 44px');
    await page.screenshot({ path: OUT + name + '_popup.png' });

    // ordre des tags généraux par fréquence : Repli défensif (2) devant les autres, Ballon hors jeu (3) en tête
    const tags = await page.$$eval('#detailTags .qn-tag', els => els.map(e => e.textContent));
    const gen = tags.filter(t => ['Contre-attaque','Montée balle rapide','Repli défensif','Attaque placée','Jeu supériorité','Jeu infériorité','Ballon hors jeu'].includes(t));
    ok(gen.slice(0, 3).join() === 'Contre-attaque,Montée balle rapide,Repli défensif', 'tags communs en ordre fixe v1.14.0 (' + gen.slice(0, 3).join(' > ') + ')');

    // drapeau + tag + note + enregistrer pour A2
    await page.locator('#detailFlag').tap();
    ok((await page.getAttribute('#detailFlag', 'aria-pressed')) === 'true', 'drapeau activé');
    await page.locator('#detailTags .qn-tag', { hasText: 'Repli défensif' }).tap();
    await page.fill('#detailNote', 'Reprise de dribble ratée');
    await page.locator('#detailSave_A2').tap();
    ok(!(await page.isVisible('#detailOverlay .qn-sheet')), 'popup fermée après enregistrement');
    let obs = await page.evaluate(() => JSON.parse(JSON.stringify(window.__S ? window.__S.obs : null)));
    if (!obs) obs = await page.evaluate(async () => (await import('./js/state.js')).S.obs);
    const o = obs[obs.length - 1];
    ok(o && o.cat === 'Marcher' && o.col === 'red' && JSON.stringify(o.arb) === '["A2"]' && o.an === 'Lopez' && o.flag === true && o.tags.includes('Repli défensif') && o.cmt === 'Reprise de dribble ratée', 'observation correcte (arbitre 2, drapeau, tag, note) ' + JSON.stringify(o));
    ok((await page.textContent('#qnStats_A2')).includes('Lopez 1✘'), 'pastille arbitre 2 mise à jour : ' + (await page.textContent('#qnStats_A2')));
    ok((await page.textContent('#qnFlags')).includes('1'), 'compteur ⚑ = 1');

    // « Les deux »
    await page.getByRole('button', { name: 'Placement conforme', exact: true }).tap();
    await page.locator('#detailSave_both').tap();
    obs = await page.evaluate(async () => (await import('./js/state.js')).S.obs);
    ok(JSON.stringify(obs[obs.length - 1].arb) === '["A1","A2"]' && obs[obs.length - 1].flag === false, '« Les deux » → arb A1+A2, sans drapeau');

    // fermer sans enregistrer ne crée rien ; Échap ferme
    const n0 = obs.length;
    await page.getByRole('button', { name: 'Zone non conforme', exact: true }).tap();
    await page.locator('#detailOverlay .qn-btn-close').tap();
    await page.getByRole('button', { name: 'Zone non conforme', exact: true }).tap();
    await page.keyboard.press('Escape');
    obs = await page.evaluate(async () => (await import('./js/state.js')).S.obs);
    ok(obs.length === n0 && !(await page.isVisible('#detailOverlay .qn-sheet')), 'Fermer / Échap n’enregistrent rien et ferment la popup');

    // tableau : colonne ⚑ + filtre
    await page.evaluate(() => { const s = document.getElementById('fltCol'); s.value = 'flag'; s.dispatchEvent(new Event('change')); });
    const rows = await page.$$eval('#OTB tr', trs => trs.map(t => t.textContent));
    ok(rows.length === 1 && rows[0].includes('⚑'), 'filtre « À revoir » : 1 ligne avec ⚑');
    await page.evaluate(() => window.resetFilters());
    ok((await page.$$('#OTB tr')).length === 2, 'reset filtres : 2 lignes');
    await page.screenshot({ path: OUT + name + '_apres.png', fullPage: true });

    // ── annuler / rétablir ──
    await page.locator('#btnUndo').tap();
    ok(await page.isVisible('#undoOverlay .qn-sheet'), 'Annuler demande une confirmation');
    await page.locator('#undoOverlay .qn-btn-cancel').tap();
    obs = await page.evaluate(async () => (await import('./js/state.js')).S.obs);
    ok(obs.length === 2, 'Non, garder : rien n’est défait');
    await page.locator('#btnUndo').tap(); await page.locator('#undoOverlay .qn-btn-delete').tap();
    await page.locator('#btnUndo').tap(); await page.locator('#undoOverlay .qn-btn-delete').tap();
    obs = await page.evaluate(async () => (await import('./js/state.js')).S.obs);
    ok(obs.length === 0 && await page.isDisabled('#btnUndo'), 'deux annulations à la suite → 0 observation, Annuler désactivé');
    await page.locator('#btnRedo').tap();
    await page.locator('#btnRedo').tap();
    obs = await page.evaluate(async () => (await import('./js/state.js')).S.obs);
    ok(obs.length === 2 && obs[0].cat === 'Marcher' && obs[1].cat === 'Placement' && await page.isDisabled('#btnRedo'), 'Rétablir ×2 sans confirmation, ordre conservé');
    // nouvelle observation invalide le rétablissement
    await page.locator('#btnUndo').tap(); await page.locator('#undoOverlay .qn-btn-delete').tap();
    ok(!(await page.isDisabled('#btnRedo')), 'Rétablir actif après annulation');
    await page.getByRole('button', { name: 'SPP conforme', exact: true }).tap();
    await page.locator('#detailSave_A1').tap();
    ok(await page.isDisabled('#btnRedo'), 'nouvelle observation → Rétablir désactivé');

    // ── édition : arbitre actuel entouré, changement d'arbitre ──
    await page.evaluate(() => window.editObservation(0));
    ok(await page.evaluate(() => document.getElementById('detailSave_A2').classList.contains('is-current')), 'édition : arbitre actuel repéré');
    ok(await page.isVisible('#detailEditControls'), 'édition : contrôle Type visible');
    await page.locator('#detailSave_A1').tap();
    obs = await page.evaluate(async () => (await import('./js/state.js')).S.obs);
    ok(JSON.stringify(obs[0].arb) === '["A1"]' && obs[0].flag === true, 'édition : arbitre changé, drapeau conservé');

    // thème sombre : capture
    await page.evaluate(() => window.toggleTheme());
    await page.getByRole('button', { name: 'Pied non conforme', exact: true }).tap();
    await page.screenshot({ path: OUT + name + '_popup_sombre.png' });
    await page.keyboard.press('Escape');
    await page.screenshot({ path: OUT + name + '_match_sombre.png' });

    ok(errors.length === 0, 'aucune erreur JavaScript' + (errors.length ? ' : ' + errors.join(' | ') : ''));
    await ctx.close();
  }

  await browser.close();
  console.log('\n' + (fails ? fails + ' ÉCHEC(S)' : 'TOUS LES TESTS PASSENT'));
  process.exit(fails ? 1 : 0);
})();
