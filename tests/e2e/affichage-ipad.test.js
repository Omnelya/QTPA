const { chromium } = require('playwright');
const { SUPA_STUB, OUT } = require('./helpers');

(async () => {
  const b = await chromium.launch();
  for (const [n, vp] of [['ipad-paysage', {width:1180,height:820}], ['ipad-mini-paysage', {width:1133,height:744}], ['ipad-portrait', {width:820,height:1180}]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: 2, locale: 'fr-FR' });
    await ctx.route('**/*supabase*', r => r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }));
    await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/, r => r.request().url().includes('supabase') ? r.fulfill({ contentType: 'application/javascript', body: SUPA_STUB }) : r.abort());
    const page = await ctx.newPage();
    await page.goto('http://localhost:8123/index.html'); await page.waitForTimeout(800);
    await page.evaluate(() => { tA.value='Toulouse'; tB.value='Nîmes'; a1.value='Durand'; a2.value='Lopez'; window.startMatch(); });
    await page.waitForTimeout(300); await page.locator('#_paramsOk').click(); await page.waitForTimeout(500);
    for (const c of ['Marcher','Pied','Zone','Placement','Gestuelle','SPP']) {
      await page.getByRole('button', { name: c + ' non conforme', exact: true }).click(); await page.waitForTimeout(450);
      await page.locator('#detailSave_A1').click(); await page.waitForTimeout(450);
    }
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#OTB tr')]; const T = document.getElementById('MS').getBoundingClientRect().top;
      const q = document.getElementById('quickNotesWrap').getBoundingClientRect();
      return { full: rows.filter(r => { const x = r.getBoundingClientRect(); return x.top - T >= 0 && x.bottom - T <= innerHeight; }).length, rows: rows.length, scroll: Math.round(document.getElementById('MS').scrollHeight - innerHeight), qTop: Math.round(q.top), qH: Math.round(q.height), firstRowTop: Math.round(rows[0].getBoundingClientRect().top - T), qRel: Math.round(q.top - T), vh: innerHeight };
    });
    console.log(n, JSON.stringify(m), m.full>=3?'PASS >=3 lignes':'FAIL <3 lignes'); if(m.full<3) process.exitCode=1;
    await page.screenshot({ path: OUT+'fit_' + n + '.png' });
    await ctx.close();
  }
  await b.close();
})();
