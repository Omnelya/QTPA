const { chromium } = require('playwright');
const { SUPA_STUB, OUT } = require('./helpers');
let fails=0;const ok=(c,m)=>{if(!c){console.log('FAIL '+m);fails++;}};
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1180,height:820},hasTouch:true,isMobile:true,locale:'fr-FR'});
 await ctx.route('**/*supabase*',r=>r.fulfill({contentType:'application/javascript',body:SUPA_STUB}));
 await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic/,r=>r.request().url().includes('supabase')?r.fulfill({contentType:'application/javascript',body:SUPA_STUB}):r.abort());
 const page=await ctx.newPage();const errs=[];page.on('pageerror',x=>errs.push(x.message));
 await page.goto('http://localhost:8123/index.html');await page.waitForTimeout(800);
 await page.evaluate(()=>{tA.value='Toulouse';tB.value='Nîmes';a1.value='Durand';a2.value='Lopez';window.startMatch();});
 await page.waitForTimeout(300);await page.locator('#_paramsOk').click();await page.waitForTimeout(500);
 const {CT,cats,GEN}=await page.evaluate(async()=>{const m=await import('/js/state.js');return {CT:m.CAT_TAGS,cats:[...m.CA,...m.CP],GEN:m.TAGS_GENERAUX}});
 let n=0;
 for(const cat of cats){for(const col of ['red','green']){
   await page.locator(`.qn-tap[aria-label="${cat} ${col==='red'?'non conforme':'conforme'}"]`).first().click();await page.waitForTimeout(150);
   const shown=await page.evaluate(()=>[...document.querySelectorAll('#detailTags .qn-tag')].map(t=>t.dataset.tag));
   const d=CT[cat]||{red:[],green:[],both:[]};const exp=[...new Set([...d[col],...d.both,...GEN])];
   const miss=exp.filter(t=>!shown.includes(t)), extra=shown.filter(t=>!exp.includes(t));
   ok(!miss.length&&!extra.length,`${cat} ${col} manque=${miss} en trop=${extra}`);n++;
   await page.evaluate(()=>window.closeDetail());await page.waitForTimeout(80);
 }}
 const w=await page.evaluate(()=>document.querySelector('#detailTags')!==null);
 ok(errs.length===0,'erreurs JS '+errs.join(' | '));
 console.log(fails?`${fails} ÉCHEC(S) sur ${n} menus`:`TOUS LES TESTS PASSENT (${n} menus vérifiés)`);
 // capture d'un menu chargé (Exécution du Jet) sur iPhone
 const c2=await b.newContext({viewport:{width:430,height:932},hasTouch:true,isMobile:true,deviceScaleFactor:2,locale:'fr-FR'});
 await c2.route('**/*supabase*',r=>r.fulfill({contentType:'application/javascript',body:SUPA_STUB}));
 await c2.route(/cdnjs|jsdelivr|googleapis|gstatic/,r=>r.request().url().includes('supabase')?r.fulfill({contentType:'application/javascript',body:SUPA_STUB}):r.abort());
 const p2=await c2.newPage();await p2.goto('http://localhost:8123/index.html');await p2.waitForTimeout(800);
 await p2.evaluate(()=>{tA.value='Toulouse';tB.value='Nîmes';a1.value='Durand';a2.value='Lopez';window.startMatch();});
 await p2.waitForTimeout(300);await p2.locator('#_paramsOk').click();await p2.waitForTimeout(500);
 await p2.locator('.qn-tap[aria-label="Exécution du Jet conforme"]').first().click();await p2.waitForTimeout(300);
 await p2.screenshot({path:OUT+'tags_iph.png'});
 await b.close();process.exit(fails?1:0);
})();
