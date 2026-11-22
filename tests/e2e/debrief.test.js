const { chromium } = require('playwright');
const { SUPA_STUB, OUT } = require('./helpers');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const VP=[['ipad-paysage',{width:1180,height:820}],['ipad-portrait',{width:820,height:1180}],['iphone',{width:390,height:844}],['iphone-paysage',{width:844,height:390}]];
(async()=>{
 const b=await chromium.launch();
 for(const [n,vp] of VP){
  for(const nb of [2,3]){
  if(nb===3&&n!=='ipad-paysage')continue;
  console.log('===',n,nb+'MT');
  const ctx=await b.newContext({viewport:vp,hasTouch:true,isMobile:true,deviceScaleFactor:1,locale:'fr-FR'});
  await ctx.route('**/*supabase*',r=>r.fulfill({contentType:'application/javascript',body:SUPA_STUB}));
  await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/,r=>r.request().url().includes('supabase')?r.fulfill({contentType:'application/javascript',body:SUPA_STUB}):r.abort());
  const page=await ctx.newPage();const errs=[];page.on('pageerror',x=>errs.push(x.message));
  await page.goto('http://localhost:8123/index.html');await page.waitForTimeout(800);
  await page.evaluate(()=>{tA.value='Toulouse';tB.value='Nîmes';a1.value='Durand';a2.value='Lopez';window.startMatch();});
  await page.waitForTimeout(300);await page.locator('#_paramsOk').click();await page.waitForTimeout(500);
  await page.evaluate(async(nb)=>{
    const {S}=await import('/js/state.js');
    S.nbMT=nb;S.dureesMT=nb===3?[900,900,900]:[1800,1800];
    const O=(time,el,period,arb,cat,col,flag,cmt,tags)=>({time,el,period,arb,an:arb.join('+'),cat,cats:[cat],col,flag,tags:tags||[],cmt:cmt||''});
    S.obs=[O('12:20',740,'MT1',['A1'],'Zone','red',true,'hésitation <b>x</b>'),O('18:40',1120,'MT1',['A2'],'Jeu Passif','red',false,'attaque placée'),
     O('09:31',571,'MT1',['A1'],'SPP','green',false,'bon timing'),O('10:03',603,'MT1',['A1'],'Zone','red',false,'jambe'),O('10:30',630,'MT1',['A1','A2'],'Zone','green'),
     O('11:05',665,'MT1',['A2'],'Passage en Force','red'),O('11:09',669,'MT1',['A2'],'Passage en Force','red',false,'x'),O('11:12',672,'MT1',['A2'],'Passage en Force','green'),
     O('05:05',305,nb===3?'MT2':'MT2',['A2'],'Placement','green'),O('11:00',660,'MT2',['A1'],'Jet Franc','red',true,'vidéo'),O('20:00',1200,'MT2',['A1'],'Placement','green'),O('21:00',1260,'MT2',['A1'],'Gestuelle','red')];
    S.sA=28;S.sB=25;S.htA=14;S.htB=12;if(nb===3){S.ht2A=20;S.ht2B=18;}
    window.endMatch();
  },nb);
  await page.waitForTimeout(500);
  const t=await page.evaluate(()=>({rev:document.querySelectorAll('#db-rev .db-row').length,flagFirst:document.querySelector('#db-rev .db-row')?.classList.contains('db-flag'),
    work:[...document.querySelectorAll('#db-work .db-cname')].map(x=>x.textContent),grp:[...document.querySelectorAll('#db-work .db-grp')].map(x=>x.textContent),
    strong:[...document.querySelectorAll('#db-strong .db-cname')].map(x=>x.textContent),mk:document.querySelectorAll('#db-frise .db-mk').length,
    ht:document.getElementById('EHtScore').textContent,xss:!!document.querySelector('#db-rev b'),
    over:document.documentElement.scrollWidth-innerWidth,radarHidden:getComputedStyle(document.getElementById('synCard')).display==='none',tl:document.querySelectorAll('#db-frise .db-tl').length}));
  console.log(JSON.stringify(t));
  ok(t.rev===6&&t.flagFirst,'bloc 2 : 6 lignes (2 ⚑ + 4 notes), ⚑ en premier');
  ok(!t.xss,'bloc 2 : HTML dans une note échappé');
  ok(t.work[0]==='Passage en Force'||t.work[0]==='Zone','bloc 3 : récurrents en premier');
  console.log('   ordre à travailler:',t.work.join(' > '),'|',t.grp.join(' / '));
  ok(t.grp.length===2&&t.work.includes('Gestuelle')&&t.work.includes('Jet Franc'),'bloc 3 : groupe « un seul ✘ »');
  ok(t.strong.length===4,'bloc 3B : 4 catégories avec ✔ ('+t.strong.join(',')+')');
  ok(t.mk===12,'frise : 12 repères');
  ok(t.tl===nb,'frise : '+nb+' périodes');
  ok(nb===3?/1TT[\s\S]*2TT/.test(t.ht):/Mi-temps/.test(t.ht),'score : '+t.ht);
  ok(t.over<=1,'pas de débordement horizontal ('+t.over+'px)');
  ok(t.radarHidden,'radar masqué');
  // filtres indépendants
  await page.locator('#db-work .db-seg-b',{hasText:'Lopez'}).first().click();
  const w2=await page.evaluate(()=>({w:[...document.querySelectorAll('#db-work .db-cname')].map(x=>x.textContent),r:document.querySelectorAll('#db-rev .db-row').length,f:document.querySelectorAll('#db-frise .db-mk').length}));
  ok(w2.w.join()==='Passage en Force,Jeu Passif'||w2.w.join()==='Jeu Passif,Passage en Force','filtre Lopez sur bloc 3 : '+w2.w.join(','));
  ok(w2.r===6&&w2.f===12,'les autres blocs ne bougent pas');
  await page.locator('#db-frise .db-seg-b',{hasText:/[MT]T2/}).first().click();
  ok(await page.evaluate(()=>document.querySelectorAll('#db-frise .db-mk').length)===4,'filtre MT2 sur frise : 4 repères');
  await page.locator('#db-frise .db-mk').first().click();
  ok(await page.evaluate(()=>!!document.querySelector('#db-frise .db-bubble .db-row')),'frise : bulle au clic');
  await page.locator('#db-strong .db-crow').first().click();
  ok(await page.evaluate(()=>!!document.querySelector('#db-strong .db-sub .db-row')),'3B : dépli au clic');
  /* v1.18.4 : une catégorie avec apostrophe (Zone d'influence) se déplie aussi */
  await page.evaluate(async()=>{const {S}=await import('/js/state.js');S.obs.push({time:'22:00',el:1320,period:'MT2',arb:['A1'],an:'A1',cat:"Zone d'influence",cats:["Zone d'influence"],col:'red',flag:false,tags:[],cmt:'apostrophe'});window.dbFilter('work','arb','all');window.dbFilter('work','per','all');});
  await page.locator('#db-work .db-crow',{hasText:"Zone d'influence"}).click();await page.waitForTimeout(150);
  ok(await page.evaluate(()=>[...document.querySelectorAll('#db-work .db-sub .db-row')].some(r=>r.textContent.includes('apostrophe'))),'3 : « Zone d\'influence » se déplie');
  // édition depuis une ligne
  await page.locator('#db-rev .db-row').first().click();await page.waitForTimeout(500);
  ok(await page.evaluate(()=>document.getElementById('detailOv')?.classList.contains('on')||!!document.querySelector('.qn-overlay.on')),'clic ligne : fenêtre de modification ouverte');
  await page.keyboard.press('Escape');await page.waitForTimeout(300);
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await page.evaluate(()=>{window.scrollTo(0,0)});
  await page.screenshot({path:OUT+'deb_'+n+(nb===3?'_3mt':'')+'.png',fullPage:true});
  await ctx.close();
  }
 }
 await b.close();console.log(fails?fails+' ÉCHEC(S)':'TOUS LES TESTS PASSENT');
})();
