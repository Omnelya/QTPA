const { chromium } = require('playwright');
const { SUPA_STUB, OUT } = require('./helpers');
let fails=0;const ok=(c,m)=>{if(!c){console.log('FAIL '+m);fails++;}};
(async()=>{const b=await chromium.launch();
for(const [n,vp] of [['ipad',{width:1180,height:820}],['iph',{width:430,height:932}]]){
 const ctx=await b.newContext({viewport:vp,hasTouch:true,isMobile:true,deviceScaleFactor:n==='iph'?2:1,locale:'fr-FR'});
 await ctx.route('**/*supabase*',r=>r.fulfill({contentType:'application/javascript',body:SUPA_STUB}));
 await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/,r=>r.request().url().includes('supabase')?r.fulfill({contentType:'application/javascript',body:SUPA_STUB}):r.abort());
 const p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(x.message));
 await p.goto('http://localhost:8123/index.html');await p.waitForTimeout(800);
 await p.evaluate(()=>{tA.value='Toulouse';tB.value='Nîmes';nA.value='4';a1.value='Durand';a2.value='Lopez';window.startMatch();});
 await p.waitForTimeout(300);await p.locator('#_paramsOk').click();await p.waitForTimeout(500);
 const {CT,TG,GEN,cats}=await p.evaluate(async()=>{const m=await import('/js/state.js');return {CT:m.CAT_TAGS,TG:m.TAG_GROUPS,GEN:m.TAGS_GENERAUX,cats:[...m.CA,...m.CP]}});
 let menus=0,titled=0;
 for(const c of cats)for(const col of ['red','green']){
  await p.click(`.qn-tap[aria-label="${c} ${col==='red'?'non conforme':'conforme'}"]`);await p.waitForTimeout(60);
  const okT=new Set([...CT[c][col],...CT[c].both]);const groups=TG[c].map(([nm,l])=>[nm,l.filter(t=>okT.has(t))]).filter(g=>g[1].length);
  const exp=[...groups.flatMap(g=>g[1]),...GEN];const nb=groups.reduce((a,g)=>a+g[1].length,0);
  const expTitles=nb>6&&groups.some(g=>g[0])?groups.map(g=>g[0]):[];
  const got=await p.evaluate(()=>({tags:[...document.querySelectorAll('#detailTags .qn-tag')].filter(t=>!t.closest('.qn-linked')).map(t=>t.dataset.tag),titles:[...document.querySelectorAll('#detailTags > .qn-tgrp > .qn-tgrp-name')].map(x=>x.textContent)}));
  ok(JSON.stringify(got.tags)===JSON.stringify(exp),`${n} ${c} ${col} ordre ${JSON.stringify(got.tags)}`);
  ok(JSON.stringify(got.titles)===JSON.stringify(expTitles),`${n} ${c} ${col} titres ${got.titles}`);
  if(got.titles.length)titled++;menus++;
  await p.evaluate(()=>closeDetail());}
 // ordre identique au match suivant (plus de tri par fréquence)
 await p.click('.qn-tap[aria-label="SPA non conforme"]');const o1=await p.$$eval('#detailTags .qn-tag',x=>x.map(y=>y.dataset.tag));
 await p.click('#detailTags .qn-tag[data-tag="Différée"]');await p.click('#detailSave_A1');await p.waitForTimeout(150);
 await p.click('.qn-tap[aria-label="SPA non conforme"]');const o2=await p.$$eval('#detailTags .qn-tag',x=>x.map(y=>y.dataset.tag));
 ok(JSON.stringify(o1)===JSON.stringify(o2),n+' ordre inchangé après usage');await p.evaluate(()=>closeDetail());
 // tags groupés lus correctement + carte liée groupée
 await p.click('.qn-tap[aria-label="J7M non conforme"]');await p.click('#detailLinkBtns [data-link="SPA"]');
 ok(JSON.stringify(await p.$$eval('.qn-linked[data-cat="SPA"] .qn-tgrp-name',x=>x.map(y=>y.textContent)))==='["Geste","Moment","Sanction"]',n+' carte SPA liée rangée par groupes');
 await p.click('#detailTags > .qn-tgrp .qn-tag[data-tag="Arrachage bras"]');await p.click('.qn-linked[data-cat="SPA"] .qn-tag[data-tag="SPA 2"]');
 await p.screenshot({path:`${OUT}g114_${n}.png`});
 await p.click('#detailSave_A1');await p.waitForTimeout(150);
 let obs=await p.evaluate(async()=>{const m=await import('/js/state.js');return JSON.parse(JSON.stringify(m.S.obs))});
 const j=obs[obs.length-2],s=obs[obs.length-1];
 ok(j.cat==='J7M'&&JSON.stringify(j.tags)==='["Arrachage bras"]'&&s.cat==='SPA'&&JSON.stringify(s.tags)==='["SPA 2"]',n+' tags enregistrés '+JSON.stringify([j.tags,s.tags]));
 // ancien tag supprimé conservé en modification
 const idx=await p.evaluate(async()=>{const m=await import('/js/state.js');m.S.obs.push({time:'01:00',el:60,period:'MT1',arb:['A1'],an:'Durand',cat:'J7M',cats:['J7M'],col:'red',flag:false,todo:false,tags:['OMB','Retient'],cmt:''});return m.S.obs.length-1});
 await p.evaluate(i=>editObservation(i),idx);ok(await p.locator('#detailTags .qn-tag.selected[data-tag="OMB"]').count()===1,n+' ancien tag « OMB » visible en modification');
 await p.click('#detailSave_A1');await p.waitForTimeout(150);
 obs=await p.evaluate(async()=>{const m=await import('/js/state.js');return JSON.parse(JSON.stringify(m.S.obs))});
 ok(JSON.stringify(obs[obs.length-1].tags)==='["Retient","OMB"]'||JSON.stringify(obs[obs.length-1].tags.sort())==='["OMB","Retient"]',n+' ancien tag conservé '+JSON.stringify(obs[obs.length-1].tags));
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),n+' pas de débordement');
 ok(!errs.length,n+' erreurs JS '+errs.join(' | '));console.log(n,'menus',menus,'avec groupes',titled);await ctx.close();}
await b.close();console.log(fails?fails+' ÉCHEC(S)':'TOUS LES TESTS PASSENT');process.exit(fails?1:0);})();
