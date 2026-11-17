const { chromium } = require('playwright');
const { SUPA_STUB, OUT } = require('./helpers');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{
 const b=await chromium.launch();
 for(const [n,vp] of [['ipad',{width:1180,height:820}],['iphone',{width:390,height:844}]]){
  const ctx=await b.newContext({viewport:vp,hasTouch:true,isMobile:true,deviceScaleFactor:1,locale:'fr-FR'});
  await ctx.route('**/*supabase*',r=>r.fulfill({contentType:'application/javascript',body:SUPA_STUB}));
  await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/,r=>r.request().url().includes('supabase')?r.fulfill({contentType:'application/javascript',body:SUPA_STUB}):r.abort());
  const page=await ctx.newPage();const errs=[];page.on('pageerror',x=>errs.push(x.message));
  await page.goto('http://localhost:8123/index.html');await page.waitForTimeout(800);
  await page.evaluate(()=>{tA.value='Toulouse';tB.value='Nîmes';nA.value='1, 4 ;7';nB.value='';a1.value='Durand';a2.value='Lopez';window.startMatch();});
  await page.waitForTimeout(300);await page.locator('#_paramsOk').click();await page.waitForTimeout(500);
  ok(/^↶$/.test((await page.locator('#btnUndo').textContent()).trim())&&/^↷$/.test((await page.locator('#btnRedo').textContent()).trim()),n+' flèches seules');
  const cls=await page.evaluate(()=>[...document.querySelectorAll('.topbar button')].filter(b=>/Mi-temps|Fin de match/.test(b.textContent)).map(b=>b.className));
  ok(cls.length===2&&cls[0]===cls[1],n+' Mi-temps = même style que Fin de match '+cls);
  await page.locator('.qn-tap').first().click();await page.waitForTimeout(300);
  ok(await page.locator('#detailTeams .qn-tag').count()===5,n+' 2 équipes + 3 numéros (1,4,7)');
  ok(await page.locator('#detailTeams .qn-num:visible').count()===0,n+' numéros cachés au départ');
  await page.locator('#detailTeams .qn-tag',{hasText:'Toulouse'}).first().click();
  ok(await page.locator('#detailTeams .qn-num:visible').count()===3,n+' numéros visibles après clic équipe');
  await page.locator('#detailTeams .qn-num',{hasText:'4'}).click();
  await page.locator('#detailTeams .qn-tag',{hasText:'Nîmes'}).click();
  ok(await page.locator('#detailTeams .qn-num:visible').count()===3,n+' équipe sans n° : rien à afficher');
  await page.locator('#detailSave_A1').click();await page.waitForTimeout(300);
  const tags=await page.evaluate(async()=>(await import('/js/state.js')).S.obs[0].tags);
  ok(JSON.stringify(tags)==='["Toulouse n°4","Nîmes"]','tags enregistrés '+tags);
  await page.evaluate(()=>window.editObservation(0));await page.waitForTimeout(300);
  ok(await page.locator('#detailTeams .qn-num.selected:visible').count()===1,n+' édition : n°4 restauré et visible');
  await page.locator('#detailTeams .qn-tag',{hasText:'Toulouse'}).first().click();
  ok(await page.locator('#detailTeams .qn-num.selected').count()===0,n+' décocher équipe efface ses n°');
  await page.screenshot({path:OUT+'num_'+n+'.png'});
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));await ctx.close();
 }
 await b.close();console.log(fails?'ECHECS '+fails:'TOUS LES TESTS PASSENT');
})();
