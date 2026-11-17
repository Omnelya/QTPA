const { chromium } = require('playwright');
const { SUPA_STUB, OUT } = require('./helpers');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1180,height:820},hasTouch:true,isMobile:true,locale:'fr-FR'});
 await ctx.route('**/*supabase*',r=>r.fulfill({contentType:'application/javascript',body:SUPA_STUB}));
 await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/,r=>r.request().url().includes('supabase')?r.fulfill({contentType:'application/javascript',body:SUPA_STUB}):r.abort());
 const page=await ctx.newPage();const errs=[];page.on('pageerror',x=>errs.push(x.message));
 await page.goto('http://localhost:8123/index.html');await page.waitForTimeout(800);
 await page.evaluate(()=>{tA.value='Toulouse';tB.value='Nîmes';nA.value='3';a1.value='Durand';a2.value='Lopez';window.startMatch();});
 await page.waitForTimeout(300);await page.locator('#_paramsOk').click();await page.waitForTimeout(500);
 const S=async f=>page.evaluate(async f=>{const {S}=await import('/js/state.js');return eval(f)},f);
 // 4. recalage
 await page.evaluate(async()=>{(await import('/js/state.js')).S.elapsed=754;});
 await page.fill('#rMin','5');await page.evaluate(()=>applyRecal());
 ok(await S('Math.floor(S.elapsed)')===5*60+34,'minutes seules : 12:34 -> 05:34');
 await page.fill('#rSec','10');await page.evaluate(()=>applyRecal());
 ok(await S('Math.floor(S.elapsed)')===5*60+10,'secondes seules : 05:34 -> 05:10');
 await page.evaluate(()=>applyRecal());ok(await S('Math.floor(S.elapsed)')===310,'rien saisi : inchangé');
 await page.fill('#rMin','7');await page.fill('#rSec','45');await page.evaluate(()=>applyRecal());ok(await S('Math.floor(S.elapsed)')===465,'les deux : 07:45');
 // 1. scores MT1 consignés au démarrage de MT2
 await page.evaluate(async()=>{const {S}=await import('/js/state.js');S.sA=5;S.sB=4;S.elapsed=1799.9;S.run=false;});
 await page.evaluate(()=>{toggleChrono();});await page.waitForTimeout(600); // tick -> fin MT1 -> advPeriod
 await page.evaluate(()=>document.getElementById('AO').classList.remove('on'));let st=await S('({p:S.period,h:S.htA,run:S.run,sA:S.sA})');console.log(JSON.stringify(st));
 ok(st.p==='MT2'&&st.h===null,'fin MT1 : période MT2, score MT1 pas encore consigné');
 await page.evaluate(async()=>{const {S}=await import('/js/state.js');S.sA=6;});// but pendant la pause
 await page.evaluate(()=>toggleChrono());
 st=await S('({h:S.htA,hb:S.htB,run:S.run})');ok(st.h===6&&st.hb===4&&st.run===true,'démarrage MT2 : score MT1 = 6-4 (but de la pause inclus)');
 await page.evaluate(async()=>{const {S}=await import('/js/state.js');S.sA=9;});await page.evaluate(()=>toggleChrono());await page.evaluate(()=>toggleChrono());
 ok(await S('S.htA')===6,'reprise ultérieure : score MT1 inchangé');
 // 2. réglages
 await page.evaluate(async()=>{const {S}=await import('/js/state.js');S.obs.push({time:'01:00',el:60,period:'MT1',arb:['A1'],an:'Durand',cat:'Zone',cats:['Zone'],col:'red',flag:false,tags:['Toulouse n°3'],cmt:''});});
 await page.locator('.btn-gear').click();await page.waitForTimeout(200);
 ok(await page.locator('#sgOverlay.on').count()===1,'réglages ouverts');
 ok(await page.locator('#sgNb3').isDisabled(),'3 TT verrouillé après début MT2');
 await page.fill('#sgTA','Toulouse HB');await page.fill('#sgA1','Dupont');ok(await page.evaluate(()=>[document.getElementById('sgW0').scrollTop,document.getElementById('sgWProl').scrollTop].join())==='1160,160','roues positionnées sur 30 min et 5 min');await page.evaluate(()=>{document.getElementById('sgW0').scrollTop=24*40;document.getElementById('sgWProl').scrollTop=6*40;});await page.fill('#sgComp','N1M');
 await page.locator('.sg-save').click();await page.waitForTimeout(300);
 const r=await S('({tA:S.tA,a1:S.a1,d0:S.dureesMT[0],pr:S.dureeProl,an:S.obs[0].an,tag:S.obs[0].tags[0]})');console.log(JSON.stringify(r));
 ok(r.tA==='Toulouse HB'&&r.a1==='Dupont'&&r.d0===1500&&r.pr===420&&r.an==='Dupont'&&r.tag==='Toulouse HB n°3','réglages appliqués + observations mises à jour');
 ok(/Toulouse HB/.test(await page.locator('#topInfo').textContent())&&/Dupont/.test(await page.locator('#topInfo').textContent()),'bandeau mis à jour');
 // 3. tags
 await page.locator('.qn-tap').first().click();await page.waitForTimeout(300);
 await page.evaluate(()=>window.closeDetail&&0);
 const tags=await page.evaluate(async()=>{const m=await import('/js/state.js');return {p:m.CAT_TAGS['Protocole'].both,spp:m.CAT_TAGS['SPP'].both,spa:m.CAT_TAGS['SPA'].both.slice(-12)}}).catch(()=>null);
 console.log(JSON.stringify(tags));ok(tags&&tags.p.includes('Protocole Sanction')&&tags.p.includes('Protocole TME')&&tags.p.includes('Protocole Jet 7m')&&tags.spp.includes('Différée')&&tags.spa.includes('Différée'),'tags Protocole + Différée présents');
 ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
 await b.close();console.log(fails?'ECHECS '+fails:'TOUS LES TESTS PASSENT');})();
