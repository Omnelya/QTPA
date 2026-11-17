const { chromium } = require('playwright');
const { SUPA_STUB, OUT } = require('./helpers');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{
 const b=await chromium.launch();
 for(const nb of [2,3]){
  const ctx=await b.newContext({viewport:{width:1180,height:820},hasTouch:true,isMobile:true,deviceScaleFactor:1,locale:'fr-FR'});
  await ctx.route('**/*supabase*',r=>r.fulfill({contentType:'application/javascript',body:SUPA_STUB}));
  await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/,r=>r.request().url().includes('supabase')?r.fulfill({contentType:'application/javascript',body:SUPA_STUB}):r.abort());
  const page=await ctx.newPage();const errs=[];page.on('pageerror',x=>errs.push(x.message));
  await page.goto('http://localhost:8123/index.html');await page.waitForTimeout(800);
  await page.evaluate(()=>{tA.value='Toulouse';tB.value='Nîmes';nA.value='3';a1.value='Durand';a2.value='Lopez';window.startMatch();});
  await page.waitForTimeout(300);
  if(nb===3)await page.locator('#_nb3').click();
  await page.locator('#_paramsOk').click();await page.waitForTimeout(500);
  console.log('===',nb);
  const lab=await page.evaluate(()=>({btn:btnMT.textContent,badge:PBadge.textContent,opts:[...document.querySelectorAll('#fltMT option')].map(o=>o.textContent).join('|'),th:document.querySelector('.olist thead th:nth-child(2)').textContent}));
  console.log(JSON.stringify(lab));
  ok(nb===3?(lab.btn==='Tiers-temps'&&lab.badge==='TT1'&&/TT1\|TT2\|TT3/.test(lab.opts)&&lab.th==='TT'):(lab.btn==='Mi-temps'&&lab.badge==='MT1'&&lab.th==='MT'),'libellés '+nb);
  // tag unique
  await page.locator('.qn-tap').first().click();await page.waitForTimeout(300);
  await page.locator('#detailTeams .qn-tag',{hasText:'Toulouse'}).first().click();
  await page.locator('#detailTeams .qn-num',{hasText:'3'}).click();
  await page.locator('#detailSave_A1').click();await page.waitForTimeout(300);
  const tags=await page.evaluate(async()=>(await import('/js/state.js')).S.obs[0].tags);
  ok(JSON.stringify(tags)==='["Toulouse n°3"]','tag unique '+tags);
  await page.evaluate(()=>window.editObservation(0));await page.waitForTimeout(300);
  ok(await page.locator('#detailTeams .qn-num.selected:visible').count()===1,'édition restaure n°3');
  await page.locator('#detailSave_A1').click();await page.waitForTimeout(300);
  const t2=await page.evaluate(async()=>(await import('/js/state.js')).S.obs[0].tags);ok(JSON.stringify(t2)==='["Toulouse n°3"]','tag unique après réédition');
  // ajout obs dans MT1 et MT2, passage de période
  await page.evaluate(async()=>{const {S}=await import('/js/state.js');
    const O=(el,p,cat,col,flag)=>({time:'0'+el,el,period:p,arb:['A1'],an:'Durand',cat,cats:[cat],col,flag:!!flag,tags:[],cmt:''});
    S.obs.push(O(5,'MT1','Zone','red',true),O(6,'MT2','Pied','red',true),O(7,'MT2','Pied','red'));
    S.sA=7;S.sB=5;S.htA=4;S.htB=3;S.elapsed=0;S.period=S.nbMT===3?'MT2':'MT2';});
  await page.locator('#btnMT').click();await page.waitForTimeout(300);
  let body=await page.evaluate(()=>({t:mtTitle.textContent,s:mtScore.textContent,b:mtBody.innerText}));
  console.log(JSON.stringify(body).slice(0,300));
  ok(nb===3?/fin du TT1/.test(body.t)&&/3 : 4|4 : 3/.test(body.s)&&/TT/.test(body.b)&&!/MT/.test(body.b):/mi-temps/.test(body.t),'écran pause '+nb+' : période précédente par défaut');
  if(nb===3){
    await page.fill('#mtPauseNote','note TT1');
    await page.locator('#mtBody .db-seg-b',{hasText:'TT2'}).click();await page.waitForTimeout(200);
    const b2=await page.evaluate(()=>({t:mtTitle.textContent,n:mtPauseNote.value,b:mtBody.innerText}));
    ok(/fin du TT2/.test(b2.t)&&b2.n===''&&/Pied/.test(b2.b),'onglet TT2 : titre, note vide, obs TT2');
    await page.fill('#mtPauseNote','note TT2');
  }
  await page.locator('#mtOverlay .mt-close').click();
  await page.evaluate(()=>window.endMatch());await page.waitForTimeout(400);
  const es=await page.evaluate(()=>({p:document.querySelector('#db-pause .db-pause-txt').textContent,txt:document.getElementById('ES').innerText}));
  console.log(JSON.stringify(es.p));
  if(nb===3){ok(/TT1 : note TT1\nTT2 : note TT2/.test(es.p),'notes TT1/TT2 en fin de match');ok(!/\bMT[123]\b/.test(es.txt),'plus aucun « MT# » à l\'écran fin de match');}
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));await ctx.close();
 }
 await b.close();console.log(fails?'ECHECS '+fails:'TOUS LES TESTS PASSENT');
})();
