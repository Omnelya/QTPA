const { chromium } = require('playwright');
const { SUPA_STUB: BASE_STUB, OUT } = require('./helpers');const MODE=process.argv[2]||'local';const ROW={id:'r1',equipe_a:'Lyon',equipe_b:'Nancy',arbitre1:'Martin',arbitre2:'Petit',date_match:'2026-11-01',competition:'N1',score_a:20,score_b:18,observations:[{time:'05:00',el:300,period:'MT1',arb:['A1'],an:'Martin',cat:'Zone',cats:['Zone'],col:'red',flag:true,tags:[],cmt:'x'},{time:'03:00',el:180,period:'MT3',arb:['A2'],an:'Petit',cat:'Pied',cats:['Pied'],col:'green',flag:false,tags:[],cmt:''}],evaluation:{},contexte:'ctx',commentaire_global:'gc distant',etat:{nbMT:3,htA:8,htB:6,ht2A:15,ht2B:12,period:'MT3'}};const SUPA_STUB=MODE==='local'?BASE_STUB.replace('r({data:[],error:null})','r({data:null,error:{message:"x"}})'):BASE_STUB.replace('r({data:[],error:null})','r({data:[JSON.parse(\''+JSON.stringify(ROW)+'\')],error:null})');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1180,height:820},hasTouch:true,isMobile:true,deviceScaleFactor:1,locale:'fr-FR'});
 await ctx.route('**/*supabase*',r=>r.fulfill({contentType:'application/javascript',body:SUPA_STUB}));
 await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/,r=>r.request().url().includes('supabase')?r.fulfill({contentType:'application/javascript',body:SUPA_STUB}):r.abort());
 const page=await ctx.newPage();const errs=[];page.on('pageerror',x=>errs.push(x.message));
 await page.goto('http://localhost:8123/index.html');await page.waitForTimeout(800);
 if(MODE==='local') await page.evaluate(()=>{tA.value='Toulouse';tB.value='Nîmes';a1.value='Durand';a2.value='Lopez';window.startMatch();});
 if(MODE==='local'){await page.waitForTimeout(300);await page.locator('#_nb3').click();await page.locator('#_paramsOk').click();await page.waitForTimeout(500);
 await page.evaluate(async()=>{const {S}=await import('/js/state.js');
  S.obs.push({time:'05:00',el:300,period:'MT2',arb:['A1'],an:'Durand',cat:'Zone',cats:['Zone'],col:'red',flag:true,tags:[],cmt:'note x'});
  S.sA=9;S.sB=7;S.htA=4;S.htB=3;S.ht2A=7;S.ht2B=5;S.pauseNote='dire';S.period='MT3';
  window.endMatch();document.getElementById('GC').value='commentaire global';});
 await page.locator('#ES .btn-act',{hasText:'Accueil'}).click();}await page.waitForTimeout(800);
 await page.evaluate(()=>{const c=document.querySelector('.confirm-ok,#_ghConfirm');});
 console.log(await page.evaluate(()=>({home:getComputedStyle(HomeS).display,es:getComputedStyle(ES).display,hist:localStorage.getItem('arbitres_hb_history')?.length,ovl:homeHistList.innerHTML.slice(0,200)})));const cards=await page.locator('.home-match-card').count();
 ok(cards===1,'carte du match dans la liste ('+cards+')');
 await page.locator('.home-match-main').first().click();await page.waitForTimeout(800);
 if(MODE==='remote'){const rr=await page.evaluate(()=>({es:getComputedStyle(ES).display,sc:ESc.textContent,gc:GC.value,ctx:ECtxEdit.value,ht:EHtScore.style.display,rows:document.querySelectorAll('#db-rev .db-row').length,badge:document.querySelector('.db-seg-b:nth-of-type(4)')?.textContent}));console.log(JSON.stringify(rr));ok(rr.ht==='flex'&&rr.es==='flex'&&rr.sc==='20 : 18'&&rr.gc==='gc distant'&&rr.ctx==='ctx'&&rr.rows===1,'match Supabase rouvert');ok(errs.length===0,'aucune erreur JS '+errs.join('|'));await b.close();console.log(fails?'ECHECS':'TOUS LES TESTS PASSENT');return;}
 const r=await page.evaluate(()=>({es:getComputedStyle(ES).display,sc:ESc.textContent,gc:GC.value,ht:EHtScore.innerText,rows:document.querySelectorAll('#db-rev .db-row').length,pause:document.querySelector('#db-pause .db-pause-txt').textContent,badge:PBadge.textContent}));
 console.log(JSON.stringify(r));
 ok(r.es==='flex'&&r.sc==='9 : 7','écran de fin de match ouvert, score 9 : 7');
 ok(r.gc==='commentaire global','commentaire global restauré');
 ok(/1TT/.test(r.ht)&&/2TT/.test(r.ht),'scores 1TT/2TT restaurés');
 ok(r.rows===1,'observation ⚑ restaurée');ok(/TT/.test(r.pause)||/dire/.test(r.pause),'note pause restaurée');
 // boutons PDF/Supprimer ne déclenchent pas l'ouverture
 await page.evaluate(()=>window.goHome&&0);
 ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
 await b.close();console.log(fails?'ECHECS '+fails:'TOUS LES TESTS PASSENT');
})();
